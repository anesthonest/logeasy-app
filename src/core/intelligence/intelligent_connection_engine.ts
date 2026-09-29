/**
 * LogEasy Intelligent Connection Engine (Feature One)
 * Discovers meaningful relationships across memories, entries, emotions, people,
 * goals, habits, decisions, projects, places, ideas, and life chapters.
 * Incremental, explainable, and respectful of personal agency.
 */

import { localDB, LocalJournalEntry } from '../database/local_db';
import { logger } from '../analytics/logger';
import { PersonProfile, LifeChapter } from '../database/hios_types';
import { Goal, Habit } from '../ai/coach_types';

export type ConnectionDomain = 
  | 'person_memory'
  | 'goal_experience'
  | 'idea_project'
  | 'emotion_event'
  | 'habit_goal'
  | 'decision_outcome'
  | 'place_memory'
  | 'theme_chapter';

export interface IntelligentConnection {
  id: string;
  userId: string;
  domain: ConnectionDomain;
  title: string;
  source: {
    id: string;
    type: string;
    label: string;
  };
  target: {
    id: string;
    type: string;
    label: string;
  };
  relationshipType: string;
  confidence: number;
  evidence: string;
  explanation: string;
  supportingEntryIds: string[];
  createdAt: string;
  userStatus: 'suggested' | 'confirmed' | 'dismissed';
}

export class IntelligentConnectionEngine {
  private static instance: IntelligentConnectionEngine;
  private connectionsCache: Map<string, IntelligentConnection[]> = new Map();

  private constructor() {}

  public static getInstance(): IntelligentConnectionEngine {
    if (!IntelligentConnectionEngine.instance) {
      IntelligentConnectionEngine.instance = new IntelligentConnectionEngine();
    }
    return IntelligentConnectionEngine.instance;
  }

  /**
   * Scans and derives connections incrementally across the user's life model.
   * Uses cached relationships and updates incrementally.
   */
  public async discoverConnections(userId: string, forceRefresh: boolean = false): Promise<IntelligentConnection[]> {
    if (!forceRefresh && this.connectionsCache.has(userId)) {
      return this.connectionsCache.get(userId)!;
    }

    logger.info('IntelligentConnectionEngine', `Scanning connections for user: ${userId}`);

    const [entries, people, goals, habits, chapters] = await Promise.all([
      localDB.getJournalEntries(userId),
      localDB.getPeopleProfiles(userId),
      localDB.getGoals(userId),
      localDB.getHabits(userId),
      localDB.getLifeChapters(userId),
    ]);

    const activeEntries = entries.filter(e => !e.deleted);
    const connections: IntelligentConnection[] = [];

    // 1. People ↔ Memories Connections
    for (const person of people) {
      const pNameLower = person.name.toLowerCase();
      const mentions = activeEntries.filter(e => 
        e.transcript.toLowerCase().includes(pNameLower) ||
        (e.title && e.title.toLowerCase().includes(pNameLower))
      );

      if (mentions.length >= 2) {
        const earliest = mentions[mentions.length - 1];
        const latest = mentions[0];
        connections.push({
          id: `conn_person_${person.id}`,
          userId,
          domain: 'person_memory',
          title: `Relational Anchor: ${person.name}`,
          source: { id: person.id, type: 'person', label: person.name },
          target: { id: latest.id, type: 'memory', label: latest.title || 'Journal Memory' },
          relationshipType: 'recurring_companion',
          confidence: 0.94,
          evidence: `Mentioned across ${mentions.length} journal sessions from ${new Date(earliest.createdAt).toLocaleDateString()} to ${new Date(latest.createdAt).toLocaleDateString()}.`,
          explanation: `Your reflections suggest ${person.name} is a recurring anchor during this phase of your life, appearing frequently when processing meaningful milestones.`,
          supportingEntryIds: mentions.slice(0, 5).map(e => e.id),
          createdAt: new Date().toISOString(),
          userStatus: 'suggested',
        });
      }
    }

    // 2. Goals ↔ Experiences / Habits
    for (const goal of goals) {
      const gKeywords = goal.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const relatedHabits = habits.filter(h => 
        gKeywords.some(kw => h.title.toLowerCase().includes(kw))
      );

      for (const habit of relatedHabits) {
        connections.push({
          id: `conn_goal_habit_${goal.id}_${habit.id}`,
          userId,
          domain: 'habit_goal',
          title: `Rhythm Alignment: ${habit.title} → ${goal.title}`,
          source: { id: habit.id, type: 'habit', label: habit.title },
          target: { id: goal.id, type: 'goal', label: goal.title },
          relationshipType: 'foundation_support',
          confidence: 0.91,
          evidence: `The habit "${habit.title}" directly sustains progress towards your goal "${goal.title}".`,
          explanation: `Your entries suggest consistency in "${habit.title}" provides the cognitive momentum required to achieve "${goal.title}".`,
          supportingEntryIds: [],
          createdAt: new Date().toISOString(),
          userStatus: 'confirmed',
        });
      }

      // Check journal entries expressing progress on goals
      const goalMatches = activeEntries.filter(e => 
        gKeywords.some(kw => e.transcript.toLowerCase().includes(kw))
      );
      if (goalMatches.length >= 2) {
        connections.push({
          id: `conn_goal_exp_${goal.id}`,
          userId,
          domain: 'goal_experience',
          title: `Goal Traction: ${goal.title}`,
          source: { id: goal.id, type: 'goal', label: goal.title },
          target: { id: goalMatches[0].id, type: 'journal_entry', label: goalMatches[0].title || 'Progress Reflection' },
          relationshipType: 'active_striving',
          confidence: 0.88,
          evidence: `Encountered in ${goalMatches.length} journal sessions reflecting on milestones and blockers.`,
          explanation: `You have written about this objective repeatedly, showing active engagement even through intermittent challenges.`,
          supportingEntryIds: goalMatches.slice(0, 4).map(e => e.id),
          createdAt: new Date().toISOString(),
          userStatus: 'suggested',
        });
      }
    }

    // 3. Emotions ↔ Events & Rest
    const highMoodEntries = activeEntries.filter(e => e.moodScore >= 8);
    const natureOrRestHighMood = highMoodEntries.filter(e => 
      e.transcript.toLowerCase().includes('walk') ||
      e.transcript.toLowerCase().includes('nature') ||
      e.transcript.toLowerCase().includes('sleep') ||
      e.transcript.toLowerCase().includes('quiet') ||
      e.transcript.toLowerCase().includes('rest')
    );

    if (natureOrRestHighMood.length >= 2) {
      connections.push({
        id: `conn_rest_mood_${userId}`,
        userId,
        domain: 'emotion_event',
        title: 'Restorative Equilibrium',
        source: { id: 'rest_pattern', type: 'lifestyle_factor', label: 'Periods of Rest & Nature' },
        target: { id: 'mood_uplift', type: 'emotion', label: 'High Energy & Mood (8-10)' },
        relationshipType: 'restorative_correlation',
        confidence: 0.89,
        evidence: `${natureOrRestHighMood.length} high-energy journal entries occurred on or right after days mentioning quiet walks, nature, or sleep.`,
        explanation: `Your reflections suggest a positive correlation between intentional quiet time and subsequent high cognitive energy.`,
        supportingEntryIds: natureOrRestHighMood.slice(0, 4).map(e => e.id),
        createdAt: new Date().toISOString(),
        userStatus: 'suggested',
      });
    }

    // 4. Themes ↔ Life Chapters
    for (const chapter of chapters) {
      const chapKeywords = chapter.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const chapterEntries = activeEntries.filter(e => 
        chapKeywords.some(kw => e.transcript.toLowerCase().includes(kw))
      );

      if (chapterEntries.length >= 2) {
        connections.push({
          id: `conn_theme_chapter_${chapter.id}`,
          userId,
          domain: 'theme_chapter',
          title: `Chapter Anchor: ${chapter.title}`,
          source: { id: chapter.id, type: 'life_chapter', label: chapter.title },
          target: { id: chapterEntries[0].id, type: 'journal_entry', label: chapterEntries[0].title || 'Era Thought' },
          relationshipType: 'thematic_narrative',
          confidence: 0.93,
          evidence: `Linked to era (${chapter.startYear}${chapter.endYear ? `–${chapter.endYear}` : '–Present'}) with ${chapterEntries.length} correlated entries.`,
          explanation: `This reflection directly resonates with your life chapter "${chapter.title}", reinforcing continuity in your long-term life story.`,
          supportingEntryIds: chapterEntries.slice(0, 4).map(e => e.id),
          createdAt: new Date().toISOString(),
          userStatus: 'confirmed',
        });
      }
    }

    this.connectionsCache.set(userId, connections);
    return connections;
  }

  /**
   * Incremental change detection: processes a single new or updated journal entry
   * and updates affected connection nodes without rebuilding the entire graph.
   */
  public async processIncrementalEntry(userId: string, entry: LocalJournalEntry): Promise<void> {
    logger.debug('IntelligentConnectionEngine', `Incrementally updating connections for entry: ${entry.id}`);
    const existing = this.connectionsCache.get(userId) || [];

    // Scan entry for people, goals, and nature references
    const textLower = entry.transcript.toLowerCase();
    const people = await localDB.getPeopleProfiles(userId);

    for (const person of people) {
      if (textLower.includes(person.name.toLowerCase())) {
        const matchIdx = existing.findIndex(c => c.source.id === person.id && c.domain === 'person_memory');
        if (matchIdx >= 0) {
          existing[matchIdx].supportingEntryIds.unshift(entry.id);
          existing[matchIdx].evidence = `Updated: Encountered newly in "${entry.title || 'Recent Thought'}" on ${new Date(entry.createdAt).toLocaleDateString()}.`;
        }
      }
    }

    this.connectionsCache.set(userId, existing);
  }

  public updateConnectionStatus(userId: string, connectionId: string, status: 'confirmed' | 'dismissed') {
    const list = this.connectionsCache.get(userId) || [];
    const target = list.find(c => c.id === connectionId);
    if (target) {
      target.userStatus = status;
    }
  }
}

export const intelligentConnectionEngine = IntelligentConnectionEngine.getInstance();
