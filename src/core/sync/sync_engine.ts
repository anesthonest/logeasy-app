/**
 * LogEasy Sync Engine Foundation
 * Handles off-line queues, retry policies, conflict resolutions, and network state triggers.
 */

import { logger } from '../analytics/logger';
import { localDB, LocalJournalEntry, LocalSyncQueueItem } from '../database/local_db';
import { db, handleFirestoreError, OperationType } from '../integrations/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

export type ConflictResolutionPolicy = 'client_wins' | 'server_wins' | 'merge';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
}

class SyncEngine {
  private static instance: SyncEngine;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private lastSyncedAt: string | null = null;
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  private syncInterval: number | null = null;

  private constructor() {
    this.initNetworkMonitoring();
    this.startPeriodicSync();
  }

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  private initNetworkMonitoring() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private async handleNetworkChange(online: boolean) {
    this.isOnline = online;
    logger.info('SyncEngine', `Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
    this.notifyStatusChange();

    if (online) {
      logger.info('SyncEngine', 'Device is online. Triggering queued item processing...');
      await this.processSyncQueue();
    }
  }

  /**
   * Toggles online/offline status manually for local sandboxed simulation testing
   */
  public setOnlineStatus(online: boolean) {
    this.handleNetworkChange(online);
  }

  private startPeriodicSync() {
    // Attempt sync queue processing every 30 seconds if online
    if (typeof window !== 'undefined') {
      this.syncInterval = window.setInterval(async () => {
        if (this.isOnline && !this.isSyncing) {
          await this.processSyncQueue();
        }
      }, 30000);
    }
  }

  public getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: 0, // Calculated dynamically during logs
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    // Initial emission
    this.getPendingQueueCount().then(count => {
      listener({
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pendingCount: count,
        lastSyncedAt: this.lastSyncedAt,
      });
    });
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  private async notifyStatusChange() {
    const count = await this.getPendingQueueCount();
    const status: SyncStatus = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: count,
      lastSyncedAt: this.lastSyncedAt,
    };
    this.syncListeners.forEach((listener) => listener(status));
  }

  private async getPendingQueueCount(): Promise<number> {
    try {
      const queue = await localDB.getSyncQueue();
      return queue.length;
    } catch {
      return 0;
    }
  }

  /**
   * Main processor loop for offline sync actions
   */
  public async processSyncQueue(): Promise<boolean> {
    if (!this.isOnline) {
      logger.warn('SyncEngine', 'Cannot start synchronization while offline');
      return false;
    }
    if (this.isSyncing) {
      logger.debug('SyncEngine', 'Sync already in progress, skipping');
      return false;
    }

    try {
      this.isSyncing = true;
      await this.notifyStatusChange();
      logger.info('SyncEngine', 'Starting background synchronization...');

      const queue = await localDB.getSyncQueue();
      if (queue.length === 0) {
        logger.info('SyncEngine', 'Synchronization complete: Offline queue is empty.');
        this.lastSyncedAt = new Date().toISOString();
        this.isSyncing = false;
        await this.notifyStatusChange();
        return true;
      }

      logger.info('SyncEngine', `Found ${queue.length} items in local offline queue.`);

      // Process each queue item sequentially to avoid transaction locks
      for (const item of queue) {
        const success = await this.syncItemToServer(item);
        if (success) {
          await localDB.removeFromSyncQueue(item.id);
        } else {
          logger.warn('SyncEngine', `Failed to sync item ${item.id}. Retrying during next sync cycle.`);
          // Simple incremental backoff incrementor
          item.attempts += 1;
          await localDB.addToSyncQueue(item);
          break; // Stop syncing queue on first error to maintain correct sequence
        }
      }

      this.lastSyncedAt = new Date().toISOString();
      logger.info('SyncEngine', 'Synchronization cycle complete.');
    } catch (e) {
      logger.error('SyncEngine', 'Error during sync cycle', e);
    } finally {
      this.isSyncing = false;
      await this.notifyStatusChange();
    }
    return true;
  }

  /**
   * Push a single local record to remote cloud store
   */
  private async syncItemToServer(queueItem: LocalSyncQueueItem): Promise<boolean> {
    // Simulate real network latency (500ms)
    await new Promise((resolve) => setTimeout(resolve, 600));

    const userId = queueItem.payload?.userId || 'default_user';
    const docId = queueItem.entryId;
    const path = `users/${userId}/journal_entries/${docId}`;

    try {
      logger.info('SyncEngine', `Uploading changes for Journal ${docId} (${queueItem.action}) to Cloud Firestore...`);
      
      const localRecord = await localDB.getJournalEntry(queueItem.entryId);
      
      if (!localRecord && queueItem.action !== 'delete') {
        logger.warn('SyncEngine', `Record ${queueItem.entryId} not found locally. Skipping sync.`);
        return true; // Resolves phantom records
      }

      // Simulate/Check a conflict check
      const hasConflict = queueItem.entryId.toLowerCase().includes('conflict');
      if (hasConflict && localRecord) {
        logger.warn('SyncEngine', `Database conflict detected on Cloud for entry ${queueItem.entryId}!`);
        await this.resolveConflict(localRecord, 'client_wins'); // Default to client_wins
      }

      if (queueItem.action === 'delete') {
        try {
          await deleteDoc(doc(db, 'users', userId, 'journal_entries', docId));
          logger.info('SyncEngine', `Successfully deleted document ${docId} from Firestore.`);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else if (localRecord) {
        try {
          // Prepare payload adhering to our blueprint schema definition
          const dbPayload = {
            id: localRecord.id,
            userId: localRecord.userId,
            createdAt: localRecord.createdAt,
            updatedAt: localRecord.updatedAt,
            title: localRecord.title || '',
            transcript: localRecord.transcript,
            audioDuration: localRecord.audioDuration,
            audioUrl: localRecord.audioUrl || '',
            fileSize: localRecord.fileSize || 0,
            moodScore: localRecord.moodScore,
            moodLabel: localRecord.moodLabel,
            emotionLabel: localRecord.emotionLabel || '',
            insightsSummary: localRecord.insightsSummary || '',
            aiProcessingStatus: localRecord.aiProcessingStatus || 'idle',
            categories: localRecord.categories || [],
            tags: localRecord.tags || [],
            location: localRecord.location || '',
            favorite: !!localRecord.favorite,
            archived: !!localRecord.archived,
            deleted: !!localRecord.deleted,
            pinned: !!localRecord.pinned,
            wordCount: localRecord.wordCount || 0,
            language: localRecord.language || 'en-US',
            syncStatus: 'synced',
            encryptionStatus: localRecord.encryptionStatus || 'plain',
            versionNumber: localRecord.versionNumber || 1,
            metadata: localRecord.metadata || {},
            folderId: localRecord.folderId || ''
          };

          await setDoc(doc(db, 'users', userId, 'journal_entries', docId), dbPayload);
          logger.info('SyncEngine', `Successfully synced document ${docId} to Firestore.`);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }

      if (localRecord) {
        // Sync record's status to synced
        localRecord.syncStatus = 'synced';
        await localDB.saveJournalEntry(localRecord);
      }

      return true;
    } catch (err) {
      logger.error('SyncEngine', `Failed syncing item ${queueItem.id}`, err);
      return false;
    }
  }

  /**
   * Implements Conflict Resolution policy
   */
  public async resolveConflict(
    localRecord: LocalJournalEntry,
    policy: ConflictResolutionPolicy
  ): Promise<LocalJournalEntry> {
    logger.info('SyncEngine', `Resolving conflict on ${localRecord.id} with policy: ${policy}`);
    
    // Simulate a concurrent server state
    const serverMockRecord: LocalJournalEntry = {
      ...localRecord,
      transcript: localRecord.transcript + ' (Simulated server additions)',
      updatedAt: new Date().toISOString(),
      moodScore: Math.min(10, localRecord.moodScore + 1),
    };

    let resolvedRecord: LocalJournalEntry;

    switch (policy) {
      case 'server_wins':
        resolvedRecord = { ...serverMockRecord, syncStatus: 'synced' };
        logger.info('SyncEngine', 'Conflict resolved: Server record overwritten local copy.');
        break;
      case 'client_wins':
        resolvedRecord = { ...localRecord, syncStatus: 'synced' };
        logger.info('SyncEngine', 'Conflict resolved: Client record pushed and forced over Server.');
        break;
      case 'merge':
      default:
        resolvedRecord = {
          ...localRecord,
          transcript: `[LOCAL]: ${localRecord.transcript}\n[SERVER]: ${serverMockRecord.transcript}`,
          categories: Array.from(new Set([...localRecord.categories, ...serverMockRecord.categories])),
          moodScore: Math.round((localRecord.moodScore + serverMockRecord.moodScore) / 2),
          syncStatus: 'synced',
          updatedAt: new Date().toISOString(),
        };
        logger.info('SyncEngine', 'Conflict resolved: Combined and merged client and server fields.');
        break;
    }

    await localDB.saveJournalEntry(resolvedRecord);
    return resolvedRecord;
  }

  public destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const syncEngine = SyncEngine.getInstance();
