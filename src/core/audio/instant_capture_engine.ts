/**
 * LogEasy Instant Capture Engine (Feature Three)
 * Enforces the "Capture Now, Organize in Background" philosophy.
 * Saves entries to IndexedDB within milliseconds before dispatching
 * asynchronous background transcription and intelligence enrichment.
 */

import { localDB, LocalJournalEntry } from '../database/local_db';
import { logger } from '../analytics/logger';
import { backgroundJobEngine } from '../intelligence/background_job_engine';
import { intelligentConnectionEngine } from '../intelligence/intelligent_connection_engine';
import { transcriptionQueueManager } from './transcription_queue';

export type CaptureType = 'text' | 'voice' | 'quick_note' | 'photo_screenshot';

export interface InstantCapturePayload {
  userId: string;
  type: CaptureType;
  text?: string;
  audioBlob?: Blob;
  audioDurationSeconds?: number;
  imageBlob?: Blob;
  imageUrl?: string;
  title?: string;
  tags?: string[];
  moodScore?: number;
}

export class InstantCaptureEngine {
  private static instance: InstantCaptureEngine;

  private constructor() {
    this.registerBackgroundHandlers();
  }

  public static getInstance(): InstantCaptureEngine {
    if (!InstantCaptureEngine.instance) {
      InstantCaptureEngine.instance = new InstantCaptureEngine();
    }
    return InstantCaptureEngine.instance;
  }

  private registerBackgroundHandlers() {
    // Background enrichment worker
    backgroundJobEngine.registerHandler('enrich_capture_entry', async (payload: { userId: string; entryId: string }) => {
      logger.info('InstantCaptureEngine', `Background enrichment running for entry ${payload.entryId}`);
      const entry = await localDB.getJournalEntry(payload.entryId);
      if (!entry) return;

      // Incrementally update intelligent connection engine
      await intelligentConnectionEngine.processIncrementalEntry(payload.userId, entry);
      logger.info('InstantCaptureEngine', `Enrichment finished for ${payload.entryId}`);
    });
  }

  /**
   * Captures thought immediately.
   * Saves to local IndexedDB and resolves in < 50ms, then enqueues background processing.
   */
  public async captureImmediately(payload: InstantCapturePayload): Promise<LocalJournalEntry> {
    const entryId = `entry_instant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    let objectAudioUrl: string | undefined = undefined;
    if (payload.audioBlob) {
      objectAudioUrl = URL.createObjectURL(payload.audioBlob);
    }

    const newEntry: LocalJournalEntry = {
      id: entryId,
      userId: payload.userId,
      createdAt: nowIso,
      updatedAt: nowIso,
      title: payload.title || (payload.type === 'voice' ? 'Instant Vocal Log' : 'Instant Thought'),
      transcript: payload.text || (payload.type === 'voice' ? 'Audio recorded. Queued for background transcription.' : ''),
      audioDuration: payload.audioDurationSeconds || 0,
      audioUrl: objectAudioUrl,
      fileSize: payload.audioBlob?.size || payload.imageBlob?.size || 0,
      moodScore: payload.moodScore || 7,
      moodLabel: 'Reflective',
      aiProcessingStatus: payload.type === 'voice' ? 'processing' : 'completed',
      categories: [payload.type === 'voice' ? 'Voice Journal' : 'Quick Capture'],
      tags: payload.tags || ['instant_capture', payload.type],
      colorTags: [
        { name: payload.type === 'voice' ? 'Voice Log' : 'Instant Note', color: '#06b6d4' }
      ],
      syncStatus: 'pending_create',
      versionNumber: 1
    };

    // 1. Instant local persistence (NEVER BLOCK ON NETWORK OR AI)
    await localDB.saveJournalEntry(newEntry);
    logger.info('InstantCaptureEngine', `Entry ${entryId} persisted instantly into IndexedDB.`);

    // 2. Queue non-blocking background intelligence job
    backgroundJobEngine.enqueueJob(
      'enrich_capture_entry',
      { userId: payload.userId, entryId: newEntry.id },
      'P2'
    );

    // 3. For voice captures, enqueue to offline durable transcription queue
    if (payload.type === 'voice' && payload.audioBlob) {
      transcriptionQueueManager.enqueue({
        entryId: newEntry.id,
        userId: payload.userId,
        audioBlob: payload.audioBlob,
        audioDurationSeconds: payload.audioDurationSeconds || 0,
      });
    }

    return newEntry;
  }
}

export const instantCaptureEngine = InstantCaptureEngine.getInstance();
