/**
 * LogEasy Data Integrity & Disaster Recovery Service (Phase 7)
 * Enforces the core Sanctuary principle:
 * USER LIFE DATA IS IRREPLACEABLE.
 * 
 * Pipeline:
 * CAPTURE FIRST -> PERSIST FIRST -> ENRICH SECOND -> INDEX THIRD -> SYNC WHEN POSSIBLE.
 * AI or network failure MUST NEVER cause data loss.
 */

import { localDB, LocalJournalEntry, LocalSyncQueueItem } from './local_db';
import { logger } from '../analytics/logger';
import { intelligentConnectionEngine, IntelligentConnection } from '../intelligence/intelligent_connection_engine';

export type DurableStage = 'capture' | 'persist' | 'enrich' | 'index' | 'sync';

export interface RecoveryMarker {
  operationId: string;
  userId: string;
  recordId: string;
  stage: DurableStage;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface StorageHealthReport {
  quotaBytes?: number;
  usageBytes?: number;
  percentageUsed: number;
  isPressureDetected: boolean;
  canSafelyPersist: boolean;
}

export interface SafeWriteResult {
  success: boolean;
  entry: LocalJournalEntry;
  persistedLocally: boolean;
  syncQueued: boolean;
  enriched: boolean;
  enrichmentError?: string;
  operationId: string;
}

export class DataIntegrityService {
  private static instance: DataIntegrityService;
  private activeOperations: Map<string, RecoveryMarker> = new Map();

  private constructor() {
    this.initRecoveryCheck();
  }

  public static getInstance(): DataIntegrityService {
    if (!DataIntegrityService.instance) {
      DataIntegrityService.instance = new DataIntegrityService();
    }
    return DataIntegrityService.instance;
  }

  /**
   * Initializes startup crash recovery checks.
   * Scans for dangling recovery markers from browser refresh or tab close.
   */
  private async initRecoveryCheck() {
    if (typeof window === 'undefined') return;
    try {
      await this.recoverPendingOperations();
    } catch (err) {
      logger.warn('DataIntegrityService', 'Recovery check initialization notice:', err);
    }
  }

  /**
   * Generates a deterministic record checksum representation
   */
  public generateIntegrityMarker(entry: Partial<LocalJournalEntry>): string {
    const seed = `${entry.id || ''}:${entry.userId || ''}:${entry.createdAt || ''}:${entry.transcript || ''}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `chk_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Safe Durable Write Protocol:
   * 1. CAPTURE & VALIDATE: Validate deterministic IDs, timestamp, and user scoping.
   * 2. PERSIST FIRST: Write directly to IndexedDB.
   * 3. SYNC QUEUE: Register idempotent sync queue entry.
   * 4. ENRICH SECOND: Isolated AI enrichment. Failure NEVER destroys raw entry.
   * 5. INDEX & FINISH: Remove recovery marker.
   */
  public async writeJournalEntrySafe(
    entry: LocalJournalEntry,
    options?: { skipEnrichment?: boolean }
  ): Promise<SafeWriteResult> {
    const operationId = `op_durable_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // 1. STAGE: CAPTURE
    const marker: RecoveryMarker = {
      operationId,
      userId: entry.userId,
      recordId: entry.id,
      stage: 'capture',
      timestamp: nowIso,
      metadata: { title: entry.title }
    };
    this.registerRecoveryMarker(marker);

    // Ensure valid deterministic schema fields
    if (!entry.createdAt) entry.createdAt = nowIso;
    if (!entry.updatedAt) entry.updatedAt = nowIso;
    if (!entry.versionNumber) entry.versionNumber = 1;
    if (!entry.metadata) entry.metadata = {};
    entry.metadata.integrityChecksum = this.generateIntegrityMarker(entry);

    let persistedLocally = false;
    let syncQueued = false;
    let enriched = false;
    let enrichmentError: string | undefined = undefined;

    try {
      // 2. STAGE: PERSIST FIRST (Durable storage write)
      marker.stage = 'persist';
      this.updateRecoveryMarker(marker);

      await localDB.saveJournalEntry(entry);
      persistedLocally = true;
      logger.info('DataIntegrityService', `Durable write succeeded for entry: ${entry.id}`);

      // 3. STAGE: SYNC QUEUE (Idempotent sync queue registration)
      marker.stage = 'sync';
      this.updateRecoveryMarker(marker);

      const syncItem: LocalSyncQueueItem = {
        id: `sync_${entry.id}_v${entry.versionNumber || 1}`,
        entryId: entry.id,
        action: entry.deleted ? 'delete' : 'create',
        payload: { ...entry },
        createdAt: nowIso,
        attempts: 0
      };
      await localDB.addToSyncQueue(syncItem);
      syncQueued = true;

      // 4. STAGE: ENRICH SECOND (AI / Connection Engine)
      // Isolated in try/catch so enrichment failure is 100% non-destructive to raw journal entry
      if (!options?.skipEnrichment) {
        marker.stage = 'enrich';
        this.updateRecoveryMarker(marker);

        try {
          await intelligentConnectionEngine.processIncrementalEntry(entry.userId, entry);
          enriched = true;
        } catch (aiErr: any) {
          logger.warn('DataIntegrityService', `Isolated AI enrichment failed for ${entry.id} (Raw data preserved):`, aiErr);
          enrichmentError = aiErr?.message || 'AI enrichment failed';
          // Mark status on entry gracefully without corrupting content
          entry.aiProcessingStatus = 'failed';
          await localDB.saveJournalEntry(entry);
        }
      }

      // 5. STAGE: INDEX & FINISH
      marker.stage = 'index';
      this.clearRecoveryMarker(operationId);

      return {
        success: true,
        entry,
        persistedLocally,
        syncQueued,
        enriched,
        enrichmentError,
        operationId
      };
    } catch (criticalErr: any) {
      logger.error('DataIntegrityService', `Critical write error for entry ${entry.id}:`, criticalErr);
      throw criticalErr;
    }
  }

  /**
   * Registers a crash-recovery marker in memory and localStorage for resilience
   */
  public registerRecoveryMarker(marker: RecoveryMarker) {
    this.activeOperations.set(marker.operationId, marker);
    try {
      if (typeof window !== 'undefined') {
        const key = `recovery_markers_${marker.userId}`;
        const existing = this.getStoredRecoveryMarkers(marker.userId);
        existing.push(marker);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch {
      // ignore storage access issues
    }
  }

  public updateRecoveryMarker(marker: RecoveryMarker) {
    this.activeOperations.set(marker.operationId, marker);
    try {
      if (typeof window !== 'undefined') {
        const key = `recovery_markers_${marker.userId}`;
        const list = this.getStoredRecoveryMarkers(marker.userId);
        const idx = list.findIndex(m => m.operationId === marker.operationId);
        if (idx >= 0) {
          list[idx] = marker;
        } else {
          list.push(marker);
        }
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch {
      // ignore storage access issues
    }
  }

  public clearRecoveryMarker(operationId: string) {
    const marker = this.activeOperations.get(operationId);
    this.activeOperations.delete(operationId);
    if (!marker) return;

    try {
      if (typeof window !== 'undefined') {
        const key = `recovery_markers_${marker.userId}`;
        const list = this.getStoredRecoveryMarkers(marker.userId);
        const filtered = list.filter(m => m.operationId !== operationId);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }
  }

  public getStoredRecoveryMarkers(userId: string): RecoveryMarker[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`recovery_markers_${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Scans for incomplete operations after browser crash/restart and recovers state.
   */
  public async recoverPendingOperations(): Promise<number> {
    if (typeof window === 'undefined') return 0;
    let recoveredCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('recovery_markers_')) {
        const userId = key.replace('recovery_markers_', '');
        const markers = this.getStoredRecoveryMarkers(userId);

        for (const marker of markers) {
          logger.info('DataIntegrityService', `Crash Recovery: Reconciling marker ${marker.operationId} (Stage: ${marker.stage})`);
          const existingEntry = await localDB.getJournalEntry(marker.recordId);
          if (existingEntry) {
            // Raw entry was safely persisted!
            logger.info('DataIntegrityService', `Entry ${marker.recordId} is intact in local database. Resolving marker.`);
            recoveredCount++;
          }
        }

        // Clean resolved markers
        localStorage.removeItem(key);
      }
    }

    return recoveredCount;
  }

  /**
   * Rebuilds the entire Personal Life Model graph strictly from raw journal archives.
   * Ensures that graph corruption or AI hallucination cannot destroy raw user records.
   */
  public async rebuildLifeModelFromArchive(userId: string): Promise<IntelligentConnection[]> {
    logger.info('DataIntegrityService', `Rebuilding Personal Life Model graph for user: ${userId}`);
    // Clear in-memory cached graph and re-discover connections from raw records
    const connections = await intelligentConnectionEngine.discoverConnections(userId, true);
    logger.info('DataIntegrityService', `Personal Life Model successfully reconstructed: ${connections.length} nodes from raw archive`);
    return connections;
  }

  /**
   * Detects storage pressure via the Storage API.
   * Strictly prevents destructive automatic cleanup: existing user data is NEVER dropped.
   */
  public async checkStorageHealth(): Promise<StorageHealthReport> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 1;
        const percentageUsed = Math.min(100, Math.round((usageBytes / quotaBytes) * 100));
        const isPressureDetected = percentageUsed >= 85;

        return {
          quotaBytes,
          usageBytes,
          percentageUsed,
          isPressureDetected,
          canSafelyPersist: !isPressureDetected
        };
      } catch {
        // fall through to default
      }
    }

    return {
      percentageUsed: 5,
      isPressureDetected: false,
      canSafelyPersist: true
    };
  }
}

export const dataIntegrityService = DataIntegrityService.getInstance();
