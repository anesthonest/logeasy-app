/**
 * LogEasy Personal Life Intelligence Initializer
 * Seeds foundational records into the Life Model so the user can immediately
 * explore pattern discovery, contradiction reconciliation, decision learning,
 * and the Life Knowledge Vault.
 */

import { localDB } from '../database/local_db';
import { logger } from '../analytics/logger';
import { knowledgeVaultService } from './knowledge_vault_service';
import { decisionLearningEngine } from './decision_learning_engine';
import { futureAndExperimentsEngine } from './future_and_experiments_engine';
import { briefingAndMomentsService } from './briefing_and_moments_service';
import { LessonProposal } from './types';

export async function seedIntelligenceLayerIfEmpty(userId: string): Promise<void> {
  logger.info('IntelligenceSeed', `Checking intelligence initialization for ${userId}`);

  const [journals, vaultItems, decisions, experiments] = await Promise.all([
    localDB.getJournalEntries(userId),
    localDB.getKnowledgeItems(userId),
    localDB.getDecisionRecords(userId),
    localDB.getPersonalExperiments(userId)
  ]);

  // 1. Seed Journals if user has fewer than 3 entries
  if (journals.length < 3) {
    const sampleJournals = [
      {
        id: `entry_seed_hist_1_${userId}`,
        userId,
        createdAt: '2024-03-15T09:30:00.000Z',
        updatedAt: '2024-03-15T09:30:00.000Z',
        title: 'Remote Deep Work & Solitude',
        transcript: 'I realized that I prefer remote work from home over anything else. Absolute quiet and uninterrupted focus is how I produce my best engineering craft.',
        audioDuration: 75,
        moodScore: 8,
        moodLabel: 'Focused',
        emotionLabel: 'Peaceful',
        insightsSummary: 'Strong preference for remote solitude and quiet uninterrupted focus.',
        categories: ['Deep Work', 'Career'],
        tags: ['focus', 'remote', 'craft']
      },
      {
        id: `entry_seed_hist_2_${userId}`,
        userId,
        createdAt: '2025-11-20T17:45:00.000Z',
        updatedAt: '2025-11-20T17:45:00.000Z',
        title: 'In-Person Creative Momentum',
        transcript: 'Spent the day in the collaborative studio with the team. Love the office when collaborating face to face; energized by teammates in person in ways remote calls can never replicate.',
        audioDuration: 92,
        moodScore: 9,
        moodLabel: 'Energized',
        emotionLabel: 'Connected',
        insightsSummary: 'High energy derived from physical presence and shared collaborative whiteboard sessions.',
        categories: ['Collaboration', 'Creative'],
        tags: ['team', 'office', 'energy']
      },
      {
        id: `entry_seed_recent_3_${userId}`,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: 'Morning Quiet & System Invariants',
        transcript: 'Early morning coffee on the balcony. I realized that keeping core system invariants simple and local prevents 90% of architectural debt. Note to self: always write invariants before drafting complex state machines.',
        audioDuration: 80,
        moodScore: 8,
        moodLabel: 'Calm',
        emotionLabel: 'Clear',
        insightsSummary: 'Observation on writing invariants before complex state modeling.',
        categories: ['Engineering', 'Wisdom'],
        tags: ['architecture', 'focus', 'clarity']
      }
    ];

    for (const j of sampleJournals) {
      await localDB.saveJournalEntry(j as any);
    }
  }

  // 2. Seed Verified Life Knowledge Vault
  if (vaultItems.length === 0) {
    await knowledgeVaultService.addKnowledgeItem(userId, {
      type: 'principle',
      title: 'Sovereignty Over Convenience',
      content: 'Store user data locally, encrypted at rest, with transparent lineage. Never compromise personal privacy for convenience.',
      contextTags: ['privacy', 'architecture', 'values'],
      isUserAuthored: true
    });

    await knowledgeVaultService.addKnowledgeItem(userId, {
      type: 'warning',
      title: 'Avoid Major Decisions When Fatigued',
      content: 'When physical and mental battery is below 4/10, postpone non-reversible commitments by at least 24 hours.',
      contextTags: ['rest', 'decision_making'],
      isUserAuthored: true
    });

    await knowledgeVaultService.addKnowledgeItem(userId, {
      type: 'strategy',
      title: 'Morning Ring-Fenced Focus Blocks',
      content: 'First 90 minutes of the morning are dedicated exclusively to high-cognitive creation without message notifications.',
      contextTags: ['productivity', 'habits'],
      isUserAuthored: true
    });

    // Seed pending Lesson Proposal
    const pendingProp: LessonProposal = {
      id: `prop_seed_${userId}`,
      userId,
      sourceEntryId: `entry_seed_recent_3_${userId}`,
      sourceSnippet: 'I realized that keeping core system invariants simple and local prevents 90% of architectural debt.',
      suggestedLesson: 'Keeping core system invariants simple and local prevents architectural debt.',
      suggestedType: 'lesson',
      context: 'Spoken journal reflection on systems architecture.',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await localDB.saveLessonProposal(pendingProp);
  }

  // 3. Seed Decision in Decision Journal
  if (decisions.length === 0) {
    await decisionLearningEngine.recordDecision(userId, {
      title: 'Migrate to Offline-First Local IndexedDB Architecture',
      options: ['Full cloud backend', 'Local-first IndexedDB with optional background sync', 'Client-only in-memory state'],
      reasoning: 'Guarantees sovereign privacy, instantaneous UI responsiveness, and zero cloud lock-in for personal memories.',
      evidence: [
        'User research indicating high sensitivity around voice journaling privacy',
        'Performance benchmarks showing sub-5ms local transactions'
      ],
      assumptions: [
        'Users frequently journal in airplane mode or while walking outdoors without stable connection'
      ],
      expectedOutcome: 'Zero lag audio capture, 100% data durability across restarts, high trust.',
      confidence: 'high',
      alignedValues: ['sovereignty', 'craftsmanship', 'privacy'],
      risks: ['Browser storage quota eviction on unbookmarked web domains']
    });
  }

  // 4. Seed Personal Experiment
  if (experiments.length === 0) {
    const exp = await futureAndExperimentsEngine.startExperiment(userId, {
      title: 'Evening Digital Shutdown at 9:00 PM',
      intention: 'Evaluate impact of zero screens after 9pm on deep sleep quality and morning focus.',
      targetDurationDays: 14
    });

    await futureAndExperimentsEngine.logExperimentDay(
      userId,
      exp.id,
      'Read paper book for 45 minutes by warm lamp. Fell asleep within 10 minutes.',
      9
    );
  }

  // 5. Initialize Future Self Studio Profile & Resurfacing Rules
  await futureAndExperimentsEngine.getFutureSelfProfile(userId);
  await briefingAndMomentsService.getOrCreateResurfacingRule(userId);

  logger.info('IntelligenceSeed', 'Intelligence layer initialized successfully.');
}
