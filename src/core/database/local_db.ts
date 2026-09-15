/**
 * LogEasy Local Database Foundation
 * Emulates Flutter's Isar DB on the web using native IndexedDB.
 * Supports ACID transactions, indexes, and full asynchronous queries.
 */

import { logger } from '../analytics/logger';
import { AIMemory, AIEntity, AIRelationship, AIInsight, AISummary, AITask } from '../ai/ai_types';
import {
  CoachingSession,
  ConversationMessage,
  ReflectionSession,
  Goal,
  Habit,
  SmartReminder,
  GratitudeEntry,
  DecisionEntry,
  CoachingPreferences,
  DailyCheckIn
} from '../ai/coach_types';

export interface LocalJournalEntry {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  transcript: string;
  audioDuration: number; // in seconds
  audioUrl?: string; // local blob or server URL
  fileSize?: number; // in bytes
  moodScore: number; // 1 to 10
  moodLabel: string;
  emotionLabel?: string;
  insightsSummary?: string;
  aiProcessingStatus?: 'idle' | 'processing' | 'completed' | 'failed';
  categories: string[];
  tags?: string[];
  location?: string;
  favorite?: boolean;
  archived?: boolean;
  deleted?: boolean;
  pinned?: boolean;
  wordCount?: number;
  language?: string;
  syncStatus: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
  encryptionStatus?: 'plain' | 'encrypted';
  versionNumber?: number;
  metadata?: Record<string, any>;
  folderId?: string; // ID of the folder/collection it belongs to
}

export interface LocalSyncQueueItem {
  id: string;
  entryId: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: string;
  attempts: number;
}

const DB_NAME = 'LogEasyDB';
const DB_VERSION = 3;

class LocalDatabase {
  private static instance: LocalDatabase;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private constructor() {
    this.initPromise = this.initDB();
  }

  public static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase();
    }
    return LocalDatabase.instance;
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB is only available in browser environments'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Journal entries store
        if (!db.objectStoreNames.contains('journal_entries')) {
          const entryStore = db.createObjectStore('journal_entries', { keyPath: 'id' });
          entryStore.createIndex('userId', 'userId', { unique: false });
          entryStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          entryStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Offline Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          queueStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Generic key-value preferences store (simulates safe encrypted metadata)
        if (!db.objectStoreNames.contains('app_preferences')) {
          db.createObjectStore('app_preferences', { keyPath: 'key' });
        }

        // AI Memories store
        if (!db.objectStoreNames.contains('ai_memories')) {
          const store = db.createObjectStore('ai_memories', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }

        // AI Entities store
        if (!db.objectStoreNames.contains('ai_entities')) {
          const store = db.createObjectStore('ai_entities', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }

        // AI Relationships store
        if (!db.objectStoreNames.contains('ai_relationships')) {
          const store = db.createObjectStore('ai_relationships', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('sourceId', 'sourceId', { unique: false });
          store.createIndex('targetId', 'targetId', { unique: false });
        }

        // AI Insights store
        if (!db.objectStoreNames.contains('ai_insights')) {
          const store = db.createObjectStore('ai_insights', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('feedbackStatus', 'feedbackStatus', { unique: false });
        }

        // AI Summaries store
        if (!db.objectStoreNames.contains('ai_summaries')) {
          const store = db.createObjectStore('ai_summaries', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('scope', 'scope', { unique: false });
        }

        // AI Tasks store
        if (!db.objectStoreNames.contains('ai_tasks')) {
          const store = db.createObjectStore('ai_tasks', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        // Coaching Sessions store
        if (!db.objectStoreNames.contains('coaching_sessions')) {
          const store = db.createObjectStore('coaching_sessions', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
        }

        // Conversation Messages store
        if (!db.objectStoreNames.contains('conversation_messages')) {
          const store = db.createObjectStore('conversation_messages', { keyPath: 'id' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
        }

        // Reflection Sessions store (Guided Journaling)
        if (!db.objectStoreNames.contains('reflection_sessions')) {
          const store = db.createObjectStore('reflection_sessions', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
        }

        // Goals store
        if (!db.objectStoreNames.contains('goals')) {
          const store = db.createObjectStore('goals', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
        }

        // Habits store
        if (!db.objectStoreNames.contains('habits')) {
          const store = db.createObjectStore('habits', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
        }

        // Reminders store
        if (!db.objectStoreNames.contains('reminders')) {
          const store = db.createObjectStore('reminders', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
        }

        // Decision Journal store
        if (!db.objectStoreNames.contains('decision_journal')) {
          const store = db.createObjectStore('decision_journal', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
        }

        // Gratitude Entries store
        if (!db.objectStoreNames.contains('gratitude_entries')) {
          const store = db.createObjectStore('gratitude_entries', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
        }

        // Coaching Preferences store
        if (!db.objectStoreNames.contains('coaching_preferences')) {
          db.createObjectStore('coaching_preferences', { keyPath: 'userId' });
        }

        // Daily Checkins store
        if (!db.objectStoreNames.contains('daily_checkins')) {
          const store = db.createObjectStore('daily_checkins', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        logger.info('LocalDatabase', 'Database tables / stores created successfully.');
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        logger.info('LocalDatabase', 'Database connection opened.');
        resolve(this.db);
      };

      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        logger.error('LocalDatabase', 'Failed to open local database.', error);
        reject(error);
      };
    });
  }

  public async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initDB();
    return this.initPromise;
  }

  // --- JOURNAL ENTRIES OPERATIONS ---

  public async saveJournalEntry(entry: LocalJournalEntry): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('journal_entries', 'readwrite');
      const store = transaction.objectStore('journal_entries');
      const request = store.put(entry);

      request.onsuccess = () => {
        logger.debug('LocalDatabase', `Saved journal entry: ${entry.id} (Status: ${entry.syncStatus})`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public async getJournalEntries(userId: string): Promise<LocalJournalEntry[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('journal_entries', 'readonly');
      const store = transaction.objectStore('journal_entries');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        // Sort newest first
        const results = (request.result as LocalJournalEntry[]) || [];
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public async getJournalEntry(id: string): Promise<LocalJournalEntry | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('journal_entries', 'readonly');
      const store = transaction.objectStore('journal_entries');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public async deleteJournalEntry(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('journal_entries', 'readwrite');
      const store = transaction.objectStore('journal_entries');
      const request = store.delete(id);

      request.onsuccess = () => {
        logger.info('LocalDatabase', `Deleted journal entry locally: ${id}`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // --- SYNC QUEUE OPERATIONS ---

  public async addToSyncQueue(item: LocalSyncQueueItem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.put(item);

      request.onsuccess = () => {
        logger.info('LocalDatabase', `Added to sync queue: ${item.action} on ${item.entryId}`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public async getSyncQueue(): Promise<LocalSyncQueueItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as LocalSyncQueueItem[]) || [];
        results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(results);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public async removeFromSyncQueue(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.delete(id);

      request.onsuccess = () => {
        logger.debug('LocalDatabase', `Removed from sync queue: ${id}`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // --- APP PREFERENCES OPERATIONS ---

  public async setPreference(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('app_preferences', 'readwrite');
      const store = transaction.objectStore('app_preferences');
      const request = store.put({ key, value });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public async getPreference<T>(key: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('app_preferences', 'readonly');
      const store = transaction.objectStore('app_preferences');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? (request.result.value as T) : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // --- AI INTEL STORE HELPERS ---

  private async saveToStore<T>(storeName: string, item: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getByUserIdFromStore<T>(storeName: string, userId: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index('userId');
      const request = index.getAll(userId);
      request.onsuccess = () => resolve((request.result as T[]) || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromStore(storeName: string, id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // AI Memories
  public async saveAIMemory(memory: AIMemory): Promise<void> {
    await this.saveToStore('ai_memories', memory);
  }
  public async getAIMemories(userId: string): Promise<AIMemory[]> {
    return this.getByUserIdFromStore<AIMemory>('ai_memories', userId);
  }
  public async deleteAIMemory(id: string): Promise<void> {
    await this.deleteFromStore('ai_memories', id);
  }

  // AI Entities
  public async saveAIEntity(entity: AIEntity): Promise<void> {
    await this.saveToStore('ai_entities', entity);
  }
  public async getAIEntities(userId: string): Promise<AIEntity[]> {
    return this.getByUserIdFromStore<AIEntity>('ai_entities', userId);
  }
  public async deleteAIEntity(id: string): Promise<void> {
    await this.deleteFromStore('ai_entities', id);
  }

  // AI Relationships
  public async saveAIRelationship(relationship: AIRelationship): Promise<void> {
    await this.saveToStore('ai_relationships', relationship);
  }
  public async getAIRelationships(userId: string): Promise<AIRelationship[]> {
    return this.getByUserIdFromStore<AIRelationship>('ai_relationships', userId);
  }
  public async deleteAIRelationship(id: string): Promise<void> {
    await this.deleteFromStore('ai_relationships', id);
  }

  // AI Insights
  public async saveAIInsight(insight: AIInsight): Promise<void> {
    await this.saveToStore('ai_insights', insight);
  }
  public async getAIInsights(userId: string): Promise<AIInsight[]> {
    return this.getByUserIdFromStore<AIInsight>('ai_insights', userId);
  }
  public async deleteAIInsight(id: string): Promise<void> {
    await this.deleteFromStore('ai_insights', id);
  }

  // AI Summaries
  public async saveAISummary(summary: AISummary): Promise<void> {
    await this.saveToStore('ai_summaries', summary);
  }
  public async getAISummaries(userId: string): Promise<AISummary[]> {
    return this.getByUserIdFromStore<AISummary>('ai_summaries', userId);
  }
  public async deleteAISummary(id: string): Promise<void> {
    await this.deleteFromStore('ai_summaries', id);
  }

  // AI Tasks
  public async saveAITask(task: AITask): Promise<void> {
    await this.saveToStore('ai_tasks', task);
  }
  public async getAITasks(userId: string): Promise<AITask[]> {
    return this.getByUserIdFromStore<AITask>('ai_tasks', userId);
  }
  public async deleteAITask(id: string): Promise<void> {
    await this.deleteFromStore('ai_tasks', id);
  }

  // --- REFLCOACH STORE HELPERS ---

  // Coaching Sessions
  public async saveCoachingSession(session: CoachingSession): Promise<void> {
    await this.saveToStore('coaching_sessions', session);
  }
  public async getCoachingSessions(userId: string): Promise<CoachingSession[]> {
    return this.getByUserIdFromStore<CoachingSession>('coaching_sessions', userId);
  }
  public async deleteCoachingSession(id: string): Promise<void> {
    await this.deleteFromStore('coaching_sessions', id);
  }

  // Conversation Messages
  public async saveConversationMessage(message: ConversationMessage): Promise<void> {
    await this.saveToStore('conversation_messages', message);
  }
  public async getConversationMessagesForSession(sessionId: string): Promise<ConversationMessage[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('conversation_messages', 'readonly');
      const store = transaction.objectStore('conversation_messages');
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);
      request.onsuccess = () => {
        const msgs = (request.result as ConversationMessage[]) || [];
        msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(msgs);
      };
      request.onerror = () => reject(request.error);
    });
  }
  public async deleteConversationMessage(id: string): Promise<void> {
    await this.deleteFromStore('conversation_messages', id);
  }

  // Reflection Sessions (Guided Journaling)
  public async saveReflectionSession(session: ReflectionSession): Promise<void> {
    await this.saveToStore('reflection_sessions', session);
  }
  public async getReflectionSessions(userId: string): Promise<ReflectionSession[]> {
    return this.getByUserIdFromStore<ReflectionSession>('reflection_sessions', userId);
  }
  public async deleteReflectionSession(id: string): Promise<void> {
    await this.deleteFromStore('reflection_sessions', id);
  }

  // Goals
  public async saveGoal(goal: Goal): Promise<void> {
    await this.saveToStore('goals', goal);
  }
  public async getGoals(userId: string): Promise<Goal[]> {
    return this.getByUserIdFromStore<Goal>('goals', userId);
  }
  public async deleteGoal(id: string): Promise<void> {
    await this.deleteFromStore('goals', id);
  }

  // Habits
  public async saveHabit(habit: Habit): Promise<void> {
    await this.saveToStore('habits', habit);
  }
  public async getHabits(userId: string): Promise<Habit[]> {
    return this.getByUserIdFromStore<Habit>('habits', userId);
  }
  public async deleteHabit(id: string): Promise<void> {
    await this.deleteFromStore('habits', id);
  }

  // Reminders
  public async saveReminder(reminder: SmartReminder): Promise<void> {
    await this.saveToStore('reminders', reminder);
  }
  public async getReminders(userId: string): Promise<SmartReminder[]> {
    return this.getByUserIdFromStore<SmartReminder>('reminders', userId);
  }
  public async deleteReminder(id: string): Promise<void> {
    await this.deleteFromStore('reminders', id);
  }

  // Decision Journal
  public async saveDecisionEntry(entry: DecisionEntry): Promise<void> {
    await this.saveToStore('decision_journal', entry);
  }
  public async getDecisionEntries(userId: string): Promise<DecisionEntry[]> {
    return this.getByUserIdFromStore<DecisionEntry>('decision_journal', userId);
  }
  public async deleteDecisionEntry(id: string): Promise<void> {
    await this.deleteFromStore('decision_journal', id);
  }

  // Gratitude Entries
  public async saveGratitudeEntry(entry: GratitudeEntry): Promise<void> {
    await this.saveToStore('gratitude_entries', entry);
  }
  public async getGratitudeEntries(userId: string): Promise<GratitudeEntry[]> {
    return this.getByUserIdFromStore<GratitudeEntry>('gratitude_entries', userId);
  }
  public async deleteGratitudeEntry(id: string): Promise<void> {
    await this.deleteFromStore('gratitude_entries', id);
  }

  // Coaching Preferences
  public async saveCoachingPreferences(preferences: CoachingPreferences): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('coaching_preferences', 'readwrite');
      const store = transaction.objectStore('coaching_preferences');
      const request = store.put(preferences);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  public async getCoachingPreferences(userId: string): Promise<CoachingPreferences | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('coaching_preferences', 'readonly');
      const store = transaction.objectStore('coaching_preferences');
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Daily Check-ins
  public async saveDailyCheckIn(checkin: DailyCheckIn): Promise<void> {
    await this.saveToStore('daily_checkins', checkin);
  }
  public async getDailyCheckIns(userId: string): Promise<DailyCheckIn[]> {
    return this.getByUserIdFromStore<DailyCheckIn>('daily_checkins', userId);
  }
  public async deleteDailyCheckIn(id: string): Promise<void> {
    await this.deleteFromStore('daily_checkins', id);
  }

  // Clear all AI Data (Privacy Compliant)
  public async clearAllAIData(userId: string): Promise<void> {
    logger.info('LocalDatabase', `Purging all AI Intelligence records for user: ${userId}`);
    const db = await this.getDB();
    const stores = ['ai_memories', 'ai_entities', 'ai_relationships', 'ai_insights', 'ai_summaries', 'ai_tasks'];
    
    for (const storeName of stores) {
      const items = await this.getByUserIdFromStore<{ id: string }>(storeName, userId);
      if (items.length > 0) {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        for (const item of items) {
          store.delete(item.id);
        }
      }
    }
    logger.info('LocalDatabase', 'AI records purged completely.');
  }
}

export const localDB = LocalDatabase.getInstance();
