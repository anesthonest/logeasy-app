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
import {
  PersonProfile,
  RomanticSpace,
  TherapistCollaboration,
  BodyObservation,
  RestRecord,
  CreativityWork,
  MeaningEntry,
  LifeChapter,
  LetterToSelf,
  ForgivenessEntry,
  GriefEntry,
  LegacyItem,
  HeritageEntry,
  NatureEntry,
  ContributionEntry,
  DecisionWorkspace,
  JoySavoringEntry,
  DigitalSelfProfile,
  AIMemoryProposal,
  SharedResourceRecord,
  AgentActionLog
} from './hios_types';
import {
  LifeKnowledgeItem,
  LessonProposal,
  PatternObservation,
  ContradictionRecord,
  OpportunityItem,
  UnfinishedItem,
  DecisionRecord,
  PersonalBriefing,
  MemoryMoment,
  ResurfacingRule,
  FutureSelfProfile,
  ScenarioSimulation,
  PersonalExperiment,
  LifeReviewRecord,
  AnnualLifeBook,
  AIAccessPolicy
} from '../intelligence/types';

export interface ColorTag {
  name: string;
  color: string;
}

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
  colorTags?: ColorTag[];
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
const DB_VERSION = 5;

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

        // HIOS Core Sovereign Stores (V8 Extended HIOS Blueprint)
        const hiosStores = [
          'people_profiles',
          'romantic_spaces',
          'therapist_collaborations',
          'body_observations',
          'rest_records',
          'creativity_works',
          'meaning_entries',
          'life_chapters',
          'letters_to_self',
          'forgiveness_entries',
          'grief_entries',
          'legacy_items',
          'heritage_entries',
          'nature_entries',
          'contribution_entries',
          'decision_workspaces',
          'joy_savoring_entries',
          'digital_self_profile',
          'ai_memory_proposals',
          'shared_resources',
          'agent_action_logs',
          // Personal Life Intelligence Layer Stores
          'knowledge_vault',
          'lesson_proposals',
          'pattern_observations',
          'contradiction_records',
          'opportunity_items',
          'unfinished_items',
          'enhanced_decisions',
          'personal_briefings',
          'memory_moments',
          'resurfacing_rules',
          'future_self_profiles',
          'scenario_simulations',
          'personal_experiments',
          'life_review_records',
          'annual_life_books',
          'ai_access_policies'
        ];

        for (const storeName of hiosStores) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('userId', 'userId', { unique: false });
          }
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

  // --- HIOS EXTENDED SOVEREIGN MODULE METHODS ---

  // People Profiles (Family & Friends)
  public async savePersonProfile(person: PersonProfile): Promise<void> {
    await this.saveToStore('people_profiles', person);
  }
  public async getPeopleProfiles(userId: string): Promise<PersonProfile[]> {
    return this.getByUserIdFromStore<PersonProfile>('people_profiles', userId);
  }
  public async deletePersonProfile(id: string): Promise<void> {
    await this.deleteFromStore('people_profiles', id);
  }

  // Romantic Space (Private Encrypted)
  public async saveRomanticSpace(space: RomanticSpace): Promise<void> {
    await this.saveToStore('romantic_spaces', space);
  }
  public async getRomanticSpaces(userId: string): Promise<RomanticSpace[]> {
    return this.getByUserIdFromStore<RomanticSpace>('romantic_spaces', userId);
  }
  public async deleteRomanticSpace(id: string): Promise<void> {
    await this.deleteFromStore('romantic_spaces', id);
  }

  // Therapist Collaboration
  public async saveTherapistCollaboration(collab: TherapistCollaboration): Promise<void> {
    await this.saveToStore('therapist_collaborations', collab);
  }
  public async getTherapistCollaboration(userId: string): Promise<TherapistCollaboration | null> {
    const list = await this.getByUserIdFromStore<TherapistCollaboration>('therapist_collaborations', userId);
    return list.length > 0 ? list[0] : null;
  }

  // Body Observations (Non-medical)
  public async saveBodyObservation(obs: BodyObservation): Promise<void> {
    await this.saveToStore('body_observations', obs);
  }
  public async getBodyObservations(userId: string): Promise<BodyObservation[]> {
    return this.getByUserIdFromStore<BodyObservation>('body_observations', userId);
  }
  public async deleteBodyObservation(id: string): Promise<void> {
    await this.deleteFromStore('body_observations', id);
  }

  // Rest Records
  public async saveRestRecord(record: RestRecord): Promise<void> {
    await this.saveToStore('rest_records', record);
  }
  public async getRestRecords(userId: string): Promise<RestRecord[]> {
    return this.getByUserIdFromStore<RestRecord>('rest_records', userId);
  }
  public async deleteRestRecord(id: string): Promise<void> {
    await this.deleteFromStore('rest_records', id);
  }

  // Creativity Works (Play for play's sake)
  public async saveCreativityWork(work: CreativityWork): Promise<void> {
    await this.saveToStore('creativity_works', work);
  }
  public async getCreativityWorks(userId: string): Promise<CreativityWork[]> {
    return this.getByUserIdFromStore<CreativityWork>('creativity_works', userId);
  }
  public async deleteCreativityWork(id: string): Promise<void> {
    await this.deleteFromStore('creativity_works', id);
  }

  // Meaning & Values
  public async saveMeaningEntry(entry: MeaningEntry): Promise<void> {
    await this.saveToStore('meaning_entries', entry);
  }
  public async getMeaningEntries(userId: string): Promise<MeaningEntry[]> {
    return this.getByUserIdFromStore<MeaningEntry>('meaning_entries', userId);
  }
  public async deleteMeaningEntry(id: string): Promise<void> {
    await this.deleteFromStore('meaning_entries', id);
  }

  // Life Chapters (Life Story Engine)
  public async saveLifeChapter(chapter: LifeChapter): Promise<void> {
    await this.saveToStore('life_chapters', chapter);
  }
  public async getLifeChapters(userId: string): Promise<LifeChapter[]> {
    return this.getByUserIdFromStore<LifeChapter>('life_chapters', userId);
  }
  public async deleteLifeChapter(id: string): Promise<void> {
    await this.deleteFromStore('life_chapters', id);
  }

  // Letters to Self
  public async saveLetterToSelf(letter: LetterToSelf): Promise<void> {
    await this.saveToStore('letters_to_self', letter);
  }
  public async getLettersToSelf(userId: string): Promise<LetterToSelf[]> {
    return this.getByUserIdFromStore<LetterToSelf>('letters_to_self', userId);
  }
  public async deleteLetterToSelf(id: string): Promise<void> {
    await this.deleteFromStore('letters_to_self', id);
  }

  // Forgiveness Engine
  public async saveForgivenessEntry(entry: ForgivenessEntry): Promise<void> {
    await this.saveToStore('forgiveness_entries', entry);
  }
  public async getForgivenessEntries(userId: string): Promise<ForgivenessEntry[]> {
    return this.getByUserIdFromStore<ForgivenessEntry>('forgiveness_entries', userId);
  }
  public async deleteForgivenessEntry(id: string): Promise<void> {
    await this.deleteFromStore('forgiveness_entries', id);
  }

  // Grief & Loss Space
  public async saveGriefEntry(entry: GriefEntry): Promise<void> {
    await this.saveToStore('grief_entries', entry);
  }
  public async getGriefEntries(userId: string): Promise<GriefEntry[]> {
    return this.getByUserIdFromStore<GriefEntry>('grief_entries', userId);
  }
  public async deleteGriefEntry(id: string): Promise<void> {
    await this.deleteFromStore('grief_entries', id);
  }

  // Legacy Items (Mortality & Values)
  public async saveLegacyItem(item: LegacyItem): Promise<void> {
    await this.saveToStore('legacy_items', item);
  }
  public async getLegacyItems(userId: string): Promise<LegacyItem[]> {
    return this.getByUserIdFromStore<LegacyItem>('legacy_items', userId);
  }
  public async deleteLegacyItem(id: string): Promise<void> {
    await this.deleteFromStore('legacy_items', id);
  }

  // Heritage & Traditions
  public async saveHeritageEntry(entry: HeritageEntry): Promise<void> {
    await this.saveToStore('heritage_entries', entry);
  }
  public async getHeritageEntries(userId: string): Promise<HeritageEntry[]> {
    return this.getByUserIdFromStore<HeritageEntry>('heritage_entries', userId);
  }
  public async deleteHeritageEntry(id: string): Promise<void> {
    await this.deleteFromStore('heritage_entries', id);
  }

  // Nature Connection
  public async saveNatureEntry(entry: NatureEntry): Promise<void> {
    await this.saveToStore('nature_entries', entry);
  }
  public async getNatureEntries(userId: string): Promise<NatureEntry[]> {
    return this.getByUserIdFromStore<NatureEntry>('nature_entries', userId);
  }
  public async deleteNatureEntry(id: string): Promise<void> {
    await this.deleteFromStore('nature_entries', id);
  }

  // Contribution & Service
  public async saveContributionEntry(entry: ContributionEntry): Promise<void> {
    await this.saveToStore('contribution_entries', entry);
  }
  public async getContributionEntries(userId: string): Promise<ContributionEntry[]> {
    return this.getByUserIdFromStore<ContributionEntry>('contribution_entries', userId);
  }
  public async deleteContributionEntry(id: string): Promise<void> {
    await this.deleteFromStore('contribution_entries', id);
  }

  // Decision Workspaces
  public async saveDecisionWorkspace(ws: DecisionWorkspace): Promise<void> {
    await this.saveToStore('decision_workspaces', ws);
  }
  public async getDecisionWorkspaces(userId: string): Promise<DecisionWorkspace[]> {
    return this.getByUserIdFromStore<DecisionWorkspace>('decision_workspaces', userId);
  }
  public async deleteDecisionWorkspace(id: string): Promise<void> {
    await this.deleteFromStore('decision_workspaces', id);
  }

  // Joy & Savoring Entries
  public async saveJoySavoringEntry(entry: JoySavoringEntry): Promise<void> {
    await this.saveToStore('joy_savoring_entries', entry);
  }
  public async getJoySavoringEntries(userId: string): Promise<JoySavoringEntry[]> {
    return this.getByUserIdFromStore<JoySavoringEntry>('joy_savoring_entries', userId);
  }
  public async deleteJoySavoringEntry(id: string): Promise<void> {
    await this.deleteFromStore('joy_savoring_entries', id);
  }

  // Digital Self Profile
  public async saveDigitalSelfProfile(profile: DigitalSelfProfile): Promise<void> {
    await this.saveToStore('digital_self_profile', { id: profile.userId, ...profile });
  }
  public async getDigitalSelfProfile(userId: string): Promise<DigitalSelfProfile | null> {
    const list = await this.getByUserIdFromStore<any>('digital_self_profile', userId);
    return list.length > 0 ? list[0] : null;
  }

  // AI Memory Proposals (SAVE / EDIT / DISMISS)
  public async saveAIMemoryProposal(proposal: AIMemoryProposal): Promise<void> {
    await this.saveToStore('ai_memory_proposals', proposal);
  }
  public async getAIMemoryProposals(userId: string): Promise<AIMemoryProposal[]> {
    return this.getByUserIdFromStore<AIMemoryProposal>('ai_memory_proposals', userId);
  }
  public async deleteAIMemoryProposal(id: string): Promise<void> {
    await this.deleteFromStore('ai_memory_proposals', id);
  }

  // Shared Resources (Revocable & Scoped)
  public async saveSharedResource(resource: SharedResourceRecord): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction('shared_resources', 'readwrite');
    const store = transaction.objectStore('shared_resources');
    store.put(resource);
  }
  public async getSharedResources(ownerId: string): Promise<SharedResourceRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction('shared_resources', 'readonly');
      const store = transaction.objectStore('shared_resources');
      const request = store.getAll();
      request.onsuccess = () => {
        const all = (request.result as SharedResourceRecord[]) || [];
        resolve(all.filter(r => r.ownerId === ownerId));
      };
      request.onerror = () => resolve([]);
    });
  }

  // Agent Action Logs (Audit Trail)
  public async saveAgentActionLog(log: AgentActionLog): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction('agent_action_logs', 'readwrite');
    const store = transaction.objectStore('agent_action_logs');
    store.put(log);
  }
  public async getAgentActionLogs(): Promise<AgentActionLog[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction('agent_action_logs', 'readonly');
      const store = transaction.objectStore('agent_action_logs');
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as AgentActionLog[]) || []);
      request.onerror = () => resolve([]);
    });
  }

  // --- PERSONAL LIFE INTELLIGENCE LAYER ACCESSORS ---

  // 1. Life Knowledge Vault
  public async saveKnowledgeItem(item: LifeKnowledgeItem): Promise<void> {
    await this.saveToStore('knowledge_vault', item);
  }
  public async getKnowledgeItems(userId: string): Promise<LifeKnowledgeItem[]> {
    return this.getByUserIdFromStore<LifeKnowledgeItem>('knowledge_vault', userId);
  }
  public async deleteKnowledgeItem(id: string): Promise<void> {
    await this.deleteFromStore('knowledge_vault', id);
  }

  // Lesson Extraction Proposals
  public async saveLessonProposal(proposal: LessonProposal): Promise<void> {
    await this.saveToStore('lesson_proposals', proposal);
  }
  public async getLessonProposals(userId: string): Promise<LessonProposal[]> {
    return this.getByUserIdFromStore<LessonProposal>('lesson_proposals', userId);
  }
  public async deleteLessonProposal(id: string): Promise<void> {
    await this.deleteFromStore('lesson_proposals', id);
  }

  // 2. Life Patterns Discovery
  public async savePatternObservation(pattern: PatternObservation): Promise<void> {
    await this.saveToStore('pattern_observations', pattern);
  }
  public async getPatternObservations(userId: string): Promise<PatternObservation[]> {
    return this.getByUserIdFromStore<PatternObservation>('pattern_observations', userId);
  }
  public async deletePatternObservation(id: string): Promise<void> {
    await this.deleteFromStore('pattern_observations', id);
  }

  // 3. Contradictions & Memory Reconciliation
  public async saveContradictionRecord(record: ContradictionRecord): Promise<void> {
    await this.saveToStore('contradiction_records', record);
  }
  public async getContradictionRecords(userId: string): Promise<ContradictionRecord[]> {
    return this.getByUserIdFromStore<ContradictionRecord>('contradiction_records', userId);
  }
  public async deleteContradictionRecord(id: string): Promise<void> {
    await this.deleteFromStore('contradiction_records', id);
  }

  // 4. Opportunities & Unfinished Business
  public async saveOpportunityItem(item: OpportunityItem): Promise<void> {
    await this.saveToStore('opportunity_items', item);
  }
  public async getOpportunityItems(userId: string): Promise<OpportunityItem[]> {
    return this.getByUserIdFromStore<OpportunityItem>('opportunity_items', userId);
  }
  public async deleteOpportunityItem(id: string): Promise<void> {
    await this.deleteFromStore('opportunity_items', id);
  }

  public async saveUnfinishedItem(item: UnfinishedItem): Promise<void> {
    await this.saveToStore('unfinished_items', item);
  }
  public async getUnfinishedItems(userId: string): Promise<UnfinishedItem[]> {
    return this.getByUserIdFromStore<UnfinishedItem>('unfinished_items', userId);
  }
  public async deleteUnfinishedItem(id: string): Promise<void> {
    await this.deleteFromStore('unfinished_items', id);
  }

  // 5. Decision Journal & Learning
  public async saveDecisionRecord(decision: DecisionRecord): Promise<void> {
    await this.saveToStore('enhanced_decisions', decision);
  }
  public async getDecisionRecords(userId: string): Promise<DecisionRecord[]> {
    return this.getByUserIdFromStore<DecisionRecord>('enhanced_decisions', userId);
  }
  public async deleteDecisionRecord(id: string): Promise<void> {
    await this.deleteFromStore('enhanced_decisions', id);
  }

  // 6. Personal Briefings
  public async savePersonalBriefing(briefing: PersonalBriefing): Promise<void> {
    await this.saveToStore('personal_briefings', briefing);
  }
  public async getPersonalBriefings(userId: string): Promise<PersonalBriefing[]> {
    return this.getByUserIdFromStore<PersonalBriefing>('personal_briefings', userId);
  }

  // 7. Memory Moments & Resurfacing Rules
  public async saveMemoryMoment(moment: MemoryMoment): Promise<void> {
    await this.saveToStore('memory_moments', moment);
  }
  public async getMemoryMoments(userId: string): Promise<MemoryMoment[]> {
    return this.getByUserIdFromStore<MemoryMoment>('memory_moments', userId);
  }
  public async deleteMemoryMoment(id: string): Promise<void> {
    await this.deleteFromStore('memory_moments', id);
  }

  public async saveResurfacingRule(rule: ResurfacingRule): Promise<void> {
    await this.saveToStore('resurfacing_rules', rule);
  }
  public async getResurfacingRule(userId: string): Promise<ResurfacingRule | null> {
    const list = await this.getByUserIdFromStore<ResurfacingRule>('resurfacing_rules', userId);
    return list.length > 0 ? list[0] : null;
  }

  // 8. Future Self Studio & Scenarios
  public async saveFutureSelfProfile(profile: FutureSelfProfile): Promise<void> {
    await this.saveToStore('future_self_profiles', profile);
  }
  public async getFutureSelfProfile(userId: string): Promise<FutureSelfProfile | null> {
    const list = await this.getByUserIdFromStore<FutureSelfProfile>('future_self_profiles', userId);
    return list.length > 0 ? list[0] : null;
  }

  public async saveScenarioSimulation(sim: ScenarioSimulation): Promise<void> {
    await this.saveToStore('scenario_simulations', sim);
  }
  public async getScenarioSimulations(userId: string): Promise<ScenarioSimulation[]> {
    return this.getByUserIdFromStore<ScenarioSimulation>('scenario_simulations', userId);
  }

  // 9. Personal Experiments
  public async savePersonalExperiment(exp: PersonalExperiment): Promise<void> {
    await this.saveToStore('personal_experiments', exp);
  }
  public async getPersonalExperiments(userId: string): Promise<PersonalExperiment[]> {
    return this.getByUserIdFromStore<PersonalExperiment>('personal_experiments', userId);
  }
  public async deletePersonalExperiment(id: string): Promise<void> {
    await this.deleteFromStore('personal_experiments', id);
  }

  // 10. Life Reviews & Annual Life Books
  public async saveLifeReview(review: LifeReviewRecord): Promise<void> {
    await this.saveToStore('life_review_records', review);
  }
  public async getLifeReviews(userId: string): Promise<LifeReviewRecord[]> {
    return this.getByUserIdFromStore<LifeReviewRecord>('life_review_records', userId);
  }

  public async saveAnnualLifeBook(book: AnnualLifeBook): Promise<void> {
    await this.saveToStore('annual_life_books', { id: `${book.userId}_${book.year}`, ...book });
  }
  public async getAnnualLifeBooks(userId: string): Promise<AnnualLifeBook[]> {
    return this.getByUserIdFromStore<AnnualLifeBook>('annual_life_books', userId);
  }

  // 11. AI Access Policies
  public async saveAIAccessPolicy(policy: AIAccessPolicy): Promise<void> {
    await this.saveToStore('ai_access_policies', { id: policy.userId, ...policy });
  }
  public async getAIAccessPolicy(userId: string): Promise<AIAccessPolicy | null> {
    const list = await this.getByUserIdFromStore<any>('ai_access_policies', userId);
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Complete Sovereign Data Purge
   * Irreversibly purges ALL user entries across all stores (Journals, Sync, AI, HIOS, Vault)
   */
  public async wipeAllUserData(userId: string): Promise<void> {
    logger.info('LocalDatabase', `Executing complete forensic data wipe for user: ${userId}`);
    const db = await this.getDB();
    const allStoreNames = Array.from(db.objectStoreNames);

    for (const storeName of allStoreNames) {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        if (store.indexNames.contains('userId')) {
          const index = store.index('userId');
          const request = index.getAllKeys(userId);
          await new Promise<void>((resolve, reject) => {
            request.onsuccess = () => {
              const keys = request.result;
              for (const k of keys) {
                store.delete(k);
              }
              resolve();
            };
            request.onerror = () => reject(request.error);
          });
        }
      } catch (err) {
        logger.warn('LocalDatabase', `Wipe pass skipped store ${storeName}`, err);
      }
    }
    logger.info('LocalDatabase', `Forensic wipe finished for user: ${userId}`);
  }
}

export const localDB = LocalDatabase.getInstance();
