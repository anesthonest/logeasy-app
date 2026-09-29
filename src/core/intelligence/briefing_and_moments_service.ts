/**
 * LogEasy Personal Briefing & Memory Moments Service
 * Generates Daily, Weekly, and Monthly briefings with transparent section-level explainability.
 * Resurfaces memory moments (anniversaries, chapter milestones) respecting quiet periods and sensitive exclusions.
 */

import { localDB, LocalJournalEntry } from '../database/local_db';
import { logger } from '../analytics/logger';
import {
  PersonalBriefing,
  MemoryMoment,
  ResurfacingRule
} from './types';

export class BriefingAndMomentsService {
  private static instance: BriefingAndMomentsService;

  private constructor() {}

  public static getInstance(): BriefingAndMomentsService {
    if (!BriefingAndMomentsService.instance) {
      BriefingAndMomentsService.instance = new BriefingAndMomentsService();
    }
    return BriefingAndMomentsService.instance;
  }

  /**
   * Generate an explainable Personal Briefing (Daily, Weekly, or Monthly).
   */
  public async generateBriefing(
    userId: string,
    cadence: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<PersonalBriefing> {
    logger.info('BriefingService', `Generating ${cadence} briefing for user ${userId}`);

    const [journals, goals, people, bodyLogs, vaultItems] = await Promise.all([
      localDB.getJournalEntries(userId),
      localDB.getGoals(userId),
      localDB.getPeopleProfiles(userId),
      localDB.getBodyObservations(userId),
      localDB.getKnowledgeItems(userId)
    ]);

    const activeJournals = journals.filter(j => !j.deleted);
    const recentEntry = activeJournals[0];
    const activeGoals = goals.filter(g => g.status !== 'completed' && (g.progressPercent ?? 0) < 100);
    const recentLessons = vaultItems.filter(v => v.type === 'lesson').slice(0, 2);

    const briefing: PersonalBriefing = {
      id: `briefing_${Date.now()}_${cadence}`,
      userId,
      cadence,
      generatedAt: new Date().toISOString(),
      sections: {
        lookingBack: recentEntry
          ? {
              summary: `Your last spoken entry reflected on "${recentEntry.title || 'daily thoughts'}" (${recentEntry.transcript.slice(0, 100)}...).`,
              evidenceIds: [recentEntry.id],
              why: `Surfaced because this was your most recent authorized journal entry on ${recentEntry.createdAt.slice(0, 10)}.`
            }
          : undefined,

        whatIsMoving: activeGoals.length > 0
          ? {
              goalsProjects: activeGoals.slice(0, 3).map(g => `${g.title} (${g.progressPercent ?? 0}% complete)`),
              why: `Surfaced from your active Goal & Project registers.`
            }
          : undefined,

        whatNeedsAttention: activeGoals.filter(g => (g.progressPercent ?? 0) < 30).length > 0
          ? {
              items: activeGoals.filter(g => (g.progressPercent ?? 0) < 30).map(g => `Goal "${g.title}" is in early progress (${g.progressPercent ?? 0}%).`),
              why: `Highlighted because progress has remained in the introductory phase.`
            }
          : undefined,

        whatYouLearned: recentLessons.length > 0
          ? {
              lessons: recentLessons.map(l => l.content),
              why: `Retrieved from your verified Personal Knowledge Vault.`
            }
          : undefined,

        people: people.length > 0
          ? {
              moments: [`You have meaningful connections with ${people.slice(0, 2).map(p => p.name).join(' and ')}.`],
              why: `Retrieved from your active relationship profiles.`
            }
          : undefined,

        wellbeing: bodyLogs.length > 0
          ? {
              restBody: [`Latest body check reported energy at ${bodyLogs[0].energyLevel}/10 and sleep duration of ${bodyLogs[0].sleepHours}h.`],
              why: `Derived from your latest physical sensation log on ${bodyLogs[0].createdAt.slice(0, 10)}.`
            }
          : undefined,

        reflection: {
          question: 'What is one priority today that, if completed with care, makes you feel peaceful tonight?',
          context: 'Grounded intentionality',
          why: 'Daily grounding practice to protect psychological clarity.'
        }
      },
      isAcknowledged: false
    };

    await localDB.savePersonalBriefing(briefing);
    return briefing;
  }

  /**
   * Resurface Memory Moments (Anniversaries, Chapter milestones).
   */
  public async getMemoryMoments(userId: string): Promise<MemoryMoment[]> {
    logger.info('MemoryMomentsService', `Evaluating memory moments for user ${userId}`);

    const rule = await this.getOrCreateResurfacingRule(userId);
    if (!rule.isEnabled || rule.frequency === 'quiet') {
      return [];
    }

    if (rule.quietPeriodUntil && new Date(rule.quietPeriodUntil) > new Date()) {
      return [];
    }

    const [journals, chapters] = await Promise.all([
      localDB.getJournalEntries(userId),
      localDB.getLifeChapters(userId)
    ]);

    const activeJournals = journals.filter(j => !j.deleted);
    const moments: MemoryMoment[] = [];
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Check for "On This Day" or past meaningful entries
    for (const entry of activeJournals) {
      // Check excluded topic tags
      const entryTags = [...(entry.categories || []), ...(entry.tags || [])];
      const hasExcludedTopic = entryTags.some(t => rule.excludedTopicTags.includes(t.toLowerCase()));
      if (hasExcludedTopic) continue;

      const entryDate = new Date(entry.createdAt);
      const entryYear = entryDate.getFullYear();
      const yearsAgo = today.getFullYear() - entryYear;

      // Check anniversary or simply older meaningful entries (> 7 days ago)
      const isAnniversary = (entryDate.getMonth() + 1 === currentMonth && entryDate.getDate() === currentDay && yearsAgo >= 1);
      const isOlderReflective = (today.getTime() - entryDate.getTime() > 1000 * 60 * 60 * 24 * 30 && (entry.moodScore || 0) >= 7);

      if (isAnniversary || (moments.length < 2 && isOlderReflective)) {
        moments.push({
          id: `moment_${entry.id}`,
          userId,
          title: isAnniversary ? `${yearsAgo} Year${yearsAgo > 1 ? 's' : ''} Ago Today` : `Looking Back at ${entry.createdAt.slice(0, 10)}`,
          description: entry.title || 'A reflective moment in your journey',
          dateOfOriginalEvent: entry.createdAt.slice(0, 10),
          yearsAgo: yearsAgo > 0 ? yearsAgo : 0,
          category: isAnniversary ? 'anniversary' : 'achievement',
          sourceEntryId: entry.id,
          snippet: entry.transcript.slice(0, 150) + (entry.transcript.length > 150 ? '...' : ''),
          whyAmISeeingThis: isAnniversary
            ? `It has been exactly ${yearsAgo} year${yearsAgo > 1 ? 's' : ''} since you recorded this entry on ${entry.createdAt.slice(0, 10)}.`
            : `Resurfaced because you recorded high clarity/mood during this period.`
        });
      }
    }

    // Chapters milestone
    for (const chapter of chapters) {
      if (chapter.startYear && today.getFullYear() - chapter.startYear >= 1) {
        moments.push({
          id: `moment_chapter_${chapter.id}`,
          userId,
          title: `Life Chapter Milestone: "${chapter.title}"`,
          description: `Chapter spanning ${chapter.startYear}${chapter.endYear ? ` to ${chapter.endYear}` : ' (ongoing)'}.`,
          dateOfOriginalEvent: `${chapter.startYear}-01-01`,
          yearsAgo: today.getFullYear() - chapter.startYear,
          category: 'chapter_milestone',
          sourceEntryId: chapter.id,
          snippet: chapter.summary,
          whyAmISeeingThis: `Milestone recognition from your Personal Life Model life chapters.`
        });
      }
    }

    return moments;
  }

  public async getOrCreateResurfacingRule(userId: string): Promise<ResurfacingRule> {
    const existing = await localDB.getResurfacingRule(userId);
    if (existing) return existing;

    const defaultRule: ResurfacingRule = {
      id: `rule_${userId}`,
      userId,
      isEnabled: true,
      frequency: 'daily',
      excludedTopicTags: ['grief', 'breakup', 'medical_crisis'],
      excludedPersonNames: [],
      allowSensitiveGrief: false
    };

    await localDB.saveResurfacingRule(defaultRule);
    return defaultRule;
  }

  public async updateResurfacingRule(userId: string, updates: Partial<ResurfacingRule>): Promise<ResurfacingRule> {
    const current = await this.getOrCreateResurfacingRule(userId);
    const updated = { ...current, ...updates };
    await localDB.saveResurfacingRule(updated);
    return updated;
  }
}

export const briefingAndMomentsService = BriefingAndMomentsService.getInstance();
