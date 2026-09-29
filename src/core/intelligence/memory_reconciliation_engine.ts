/**
 * LogEasy Contradiction & Memory Reconciliation Engine
 * Detects divergences between past declarations and present state across
 * preferences, goals, plans, values, relationships, and habits.
 * "I found two different versions of this information. Which should LogEasy treat as current?"
 * Respects human growth: people change, and evolution is not an error.
 */

import { localDB, LocalJournalEntry } from '../database/local_db';
import { logger } from '../analytics/logger';
import { ContradictionRecord, ContradictionCategory } from './types';

export class MemoryReconciliationEngine {
  private static instance: MemoryReconciliationEngine;

  private constructor() {}

  public static getInstance(): MemoryReconciliationEngine {
    if (!MemoryReconciliationEngine.instance) {
      MemoryReconciliationEngine.instance = new MemoryReconciliationEngine();
    }
    return MemoryReconciliationEngine.instance;
  }

  /**
   * Scans journal entries, knowledge items, and preferences to discover divergences.
   */
  public async scanForContradictions(userId: string): Promise<ContradictionRecord[]> {
    logger.info('MemoryReconciliationEngine', `Scanning contradictions for user ${userId}`);

    const [journals, knowledgeItems, existingRecords] = await Promise.all([
      localDB.getJournalEntries(userId),
      localDB.getKnowledgeItems(userId),
      localDB.getContradictionRecords(userId)
    ]);

    const activeJournals = journals.filter(j => !j.deleted).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const discovered: ContradictionRecord[] = [];

    // Scan for classic divergent topics:
    // 1. Work style / location preferences (remote vs in-person)
    // 2. Caffeine / diet preferences
    // 3. Sleep / morning routine intentions
    // 4. Social battery & solitude vs gathering

    const contradictionPairs = [
      {
        topic: 'Work Environment Preference',
        category: 'preference' as ContradictionCategory,
        triggerA: ['prefer remote', 'work from home', 'hate the office', 'never commuting again'],
        triggerB: ['love the office', 'energized by teammates in person', 'working on site', 'coworking space']
      },
      {
        topic: 'Caffeine & Stimulant Preference',
        category: 'preference' as ContradictionCategory,
        triggerA: ['quit coffee', 'no caffeine', 'caffeine makes me anxious', 'zero coffee'],
        triggerB: ['morning espresso', 'coffee was amazing', 'drinking coffee', 'cappuccino']
      },
      {
        topic: 'Early Morning Routine vs Night Rhythm',
        category: 'habit' as any,
        triggerA: ['waking up at 5am', 'early morning runner', '5:30 am club'],
        triggerB: ['night owl', 'working late into the night', 'staying up until 1am']
      },
      {
        topic: 'Social Energy & Solitude',
        category: 'preference' as ContradictionCategory,
        triggerA: ['need absolute solitude', 'avoiding all social events', 'social battery depleted'],
        triggerB: ['craving community', 'hosted friends for dinner', 'loving large gatherings']
      }
    ];

    for (const rule of contradictionPairs) {
      let olderMatch: { entry: LocalJournalEntry; snippet: string } | null = null;
      let newerMatch: { entry: LocalJournalEntry; snippet: string } | null = null;

      for (const entry of activeJournals) {
        const text = entry.transcript.toLowerCase();
        for (const wordA of rule.triggerA) {
          if (text.includes(wordA) && !olderMatch) {
            olderMatch = {
              entry,
              snippet: entry.transcript.slice(0, 140)
            };
            break;
          }
        }
      }

      // Check for newer divergent match occurring after olderMatch
      if (olderMatch) {
        for (const entry of activeJournals) {
          if (new Date(entry.createdAt).getTime() > new Date(olderMatch.entry.createdAt).getTime()) {
            const text = entry.transcript.toLowerCase();
            for (const wordB of rule.triggerB) {
              if (text.includes(wordB)) {
                newerMatch = {
                  entry,
                  snippet: entry.transcript.slice(0, 140)
                };
                break;
              }
            }
          }
        }
      }

      if (olderMatch && newerMatch) {
        const recordId = `contradiction_${(rule.topic || 'topic').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        // Check if already reconciled or ignored
        const alreadyRecorded = existingRecords.find(r => r.id === recordId);
        if (!alreadyRecorded) {
          const newRecord: ContradictionRecord = {
            id: recordId,
            userId,
            topic: rule.topic,
            category: rule.category,
            olderVersion: {
              text: olderMatch.snippet,
              date: olderMatch.entry.createdAt.slice(0, 10),
              sourceId: olderMatch.entry.id
            },
            newerVersion: {
              text: newerMatch.snippet,
              date: newerMatch.entry.createdAt.slice(0, 10),
              sourceId: newerMatch.entry.id
            },
            status: 'detected',
            whyAmISeeingThis: `Observed contrasting perspectives on "${rule.topic}" between ${olderMatch.entry.createdAt.slice(0, 10)} and ${newerMatch.entry.createdAt.slice(0, 10)}.`,
            createdAt: new Date().toISOString()
          };

          await localDB.saveContradictionRecord(newRecord);
          discovered.push(newRecord);
        }
      }
    }

    const all = await localDB.getContradictionRecords(userId);
    return all;
  }

  /**
   * User applies resolution to a detected contradiction.
   */
  public async resolveContradiction(
    userId: string,
    recordId: string,
    resolution: 'keep_newer' | 'keep_both_historically' | 'update_both' | 'dismissed',
    userNote?: string
  ): Promise<ContradictionRecord | null> {
    const existing = await localDB.getContradictionRecords(userId);
    const target = existing.find(r => r.id === recordId);
    if (!target) return null;

    target.status = resolution === 'dismissed' ? 'ignored' : 'reconciled';
    target.resolution = resolution;
    target.resolutionDate = new Date().toISOString();
    target.userNote = userNote || target.userNote;

    await localDB.saveContradictionRecord(target);
    logger.info('MemoryReconciliationEngine', `Reconciled contradiction ${recordId} as ${resolution}`);
    return target;
  }
}

export const memoryReconciliationEngine = MemoryReconciliationEngine.getInstance();
