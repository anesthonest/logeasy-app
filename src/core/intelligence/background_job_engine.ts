/**
 * LogEasy Asynchronous Background Job Engine
 * Runs expensive intelligence extraction, connection mapping, and pattern updates
 * in the background so the user interface never freezes.
 */

import { logger } from '../analytics/logger';
import { AgentPriority } from '../ai/agent_orchestrator';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'retrying' | 'cancelled';

export interface BackgroundJob {
  id: string;
  type: string;
  priority: AgentPriority;
  status: JobStatus;
  payload: any;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  progress: number; // 0 to 100
  error?: string;
}

export type JobHandler = (payload: any, onProgress: (pct: number) => void) => Promise<any>;

class BackgroundJobEngine {
  private static instance: BackgroundJobEngine;
  private jobs: Map<string, BackgroundJob> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private listeners: Array<(job: BackgroundJob) => void> = [];
  private isProcessing = false;

  private constructor() {
    // Start queue processor tick
    if (typeof window !== 'undefined') {
      window.setInterval(() => this.processNext(), 1500);
    }
  }

  public static getInstance(): BackgroundJobEngine {
    if (!BackgroundJobEngine.instance) {
      BackgroundJobEngine.instance = new BackgroundJobEngine();
    }
    return BackgroundJobEngine.instance;
  }

  public registerHandler(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  public subscribe(listener: (job: BackgroundJob) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(job: BackgroundJob) {
    this.listeners.forEach(l => {
      try {
        l(job);
      } catch (e) {
        // ignore listener errors
      }
    });
  }

  public enqueueJob(type: string, payload: any, priority: AgentPriority = 'P2'): BackgroundJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: BackgroundJob = {
      id,
      type,
      priority,
      status: 'queued',
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      progress: 0,
    };

    this.jobs.set(id, job);
    this.notify(job);
    logger.info('BackgroundJobEngine', `Enqueued [${type}] job ${id} (Priority: ${priority})`);

    // Trigger process tick
    setTimeout(() => this.processNext(), 20);
    return job;
  }

  private async processNext() {
    if (this.isProcessing) return;

    // Pick highest priority queued job (P0 > P1 > P2 > P3)
    const priorityWeight: Record<AgentPriority, number> = { P0: 4, P1: 3, P2: 2, P3: 1 };
    const queuedJobs = Array.from(this.jobs.values())
      .filter(j => j.status === 'queued' || j.status === 'retrying')
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    if (queuedJobs.length === 0) return;

    const job = queuedJobs[0];
    const handler = this.handlers.get(job.type);

    if (!handler) {
      job.status = 'failed';
      job.error = `No registered handler for job type: ${job.type}`;
      job.completedAt = new Date().toISOString();
      this.notify(job);
      return;
    }

    this.isProcessing = true;
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    this.notify(job);

    try {
      await handler(job.payload, (pct: number) => {
        job.progress = Math.min(100, Math.max(0, pct));
        this.notify(job);
      });

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date().toISOString();
      logger.info('BackgroundJobEngine', `Job ${job.id} [${job.type}] finished successfully.`);
    } catch (err: any) {
      logger.error('BackgroundJobEngine', `Job ${job.id} [${job.type}] execution failed:`, err);
      job.error = err.message || 'Execution failed';

      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = 'retrying';
        logger.warn('BackgroundJobEngine', `Scheduling retry ${job.retryCount}/${job.maxRetries} for job ${job.id}`);
      } else {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
      }
    } finally {
      this.notify(job);
      this.isProcessing = false;
      // Continue next if any queued
      this.processNext();
    }
  }

  public getJobs(): BackgroundJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (job && (job.status === 'queued' || job.status === 'retrying')) {
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      this.notify(job);
      return true;
    }
    return false;
  }
}

export const backgroundJobEngine = BackgroundJobEngine.getInstance();
