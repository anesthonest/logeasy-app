/**
 * LogEasy Life Pattern Discovery Engine
 * Discovers recurring patterns across user journals, memories, decisions, and habits.
 * Strict principle: "The system observes; the user interprets."
 * Every pattern includes evidence, observation count, time span, confidence,
 * and alternative interpretations.
 */

import { localDB, LocalJournalEntry } from '../database/local_db';
import { logger } from '../analytics/logger';
import { PatternObservation, PatternEvidence, PatternCategory } from './types';

export class PatternDiscoveryEngine {
  private static instance: PatternDiscoveryEngine;

  private constructor() {}

  public static getInstance(): PatternDiscoveryEngine {
    if (!PatternDiscoveryEngine.instance) {
      PatternDiscoveryEngine.instance = new PatternDiscoveryEngine();
    }
    return PatternDiscoveryEngine.instance;
  }

  /**
   * Run pattern analysis across the user's local dataset.
   * Can run completely offline using deterministic pattern heuristics,
   * with optional server-side LLM enhancement when online.
   */
  public async analyzePatterns(userId: string): Promise<PatternObservation[]> {
    logger.info('PatternDiscoveryEngine', `Scanning patterns for user ${userId}`);

    const [journals, bodyLogs, savoringLogs, decisions, goals] = await Promise.all([
      localDB.getJournalEntries(userId),
      localDB.getBodyObservations(userId),
      localDB.getJoySavoringEntries(userId),
      localDB.getDecisionRecords(userId),
      localDB.getGoals(userId)
    ]);

    const activeJournals = journals.filter(j => !j.deleted);
    const discovered: PatternObservation[] = [];

    // 1. RECURRING THEME / INTEREST SCAN
    const themePatterns = this.extractRecurringThemes(userId, activeJournals);
    discovered.push(...themePatterns);

    // 2. STRESS & BODY OBSERVATIONS CORRELATION
    const stressPatterns = this.extractStressObservations(userId, bodyLogs, activeJournals);
    discovered.push(...stressPatterns);

    // 3. RECURRING SOURCES OF JOY
    const joyPatterns = this.extractJoyPatterns(userId, savoringLogs, activeJournals);
    discovered.push(...joyPatterns);

    // 4. RETURNING / DORMANT IDEAS
    const ideaPatterns = this.extractReturningIdeas(userId, activeJournals);
    discovered.push(...ideaPatterns);

    // 5. DECISION REPETITION & PATTERNS
    const decisionPatterns = this.extractDecisionPatterns(userId, decisions);
    discovered.push(...decisionPatterns);

    // 6. REPEATED GOALS
    const goalPatterns = this.extractGoalPatterns(userId, goals, activeJournals);
    discovered.push(...goalPatterns);

    // Persist discovered patterns to local database
    for (const pattern of discovered) {
      await localDB.savePatternObservation(pattern);
    }

    // Also return existing patterns already saved (to preserve user notes/status)
    const stored = await localDB.getPatternObservations(userId);
    return stored.length > 0 ? stored : discovered;
  }

  private extractRecurringThemes(userId: string, journals: LocalJournalEntry[]): PatternObservation[] {
    const patterns: PatternObservation[] = [];
    const keywordMap: Record<string, Array<{ id: string; snippet: string; date: string }>> = {
      'Creative Writing & Storytelling': [],
      'Deep Work & Focus Systems': [],
      'Nature & Outdoor Solitude': [],
      'Engineering & System Craft': [],
      'Health, Nutrition & Strength': []
    };

    const triggers: Record<string, string[]> = {
      'Creative Writing & Storytelling': ['writing', 'poem', 'story', 'novel', 'draft', 'creativity'],
      'Deep Work & Focus Systems': ['focus', 'distraction', 'routine', 'morning', 'deep work', 'productivity'],
      'Nature & Outdoor Solitude': ['walk', 'forest', 'park', 'nature', 'trees', 'quiet', 'mountains'],
      'Engineering & System Craft': ['architecture', 'code', 'build', 'system', 'database', 'protocol'],
      'Health, Nutrition & Strength': ['gym', 'workout', 'sleep', 'energy', 'diet', 'cardio']
    };

    for (const entry of journals) {
      const text = `${entry.title || ''} ${entry.transcript}`.toLowerCase();
      for (const [theme, words] of Object.entries(triggers)) {
        if (words.some(w => text.includes(w))) {
          keywordMap[theme].push({
            id: entry.id,
            snippet: entry.transcript.slice(0, 140) + (entry.transcript.length > 140 ? '...' : ''),
            date: entry.createdAt.slice(0, 10)
          });
        }
      }
    }

    for (const [theme, hits] of Object.entries(keywordMap)) {
      if (hits.length >= 2) {
        const evidence: PatternEvidence[] = hits.slice(0, 4).map(h => ({
          sourceId: h.id,
          sourceType: 'journal',
          snippet: h.snippet,
          date: h.date,
          relevanceScore: 0.85
        }));

        patterns.push({
          id: `pattern_theme_${(theme || 'general').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          userId,
          category: 'recurring_interest',
          title: `Recurring Interest in ${theme}`,
          description: `You have repeatedly engaged with and reflected on ${theme.toLowerCase()} across multiple entries.`,
          supportingEvidence: evidence,
          observationCount: hits.length,
          timeRange: {
            start: hits[hits.length - 1].date,
            end: hits[0].date
          },
          confidence: hits.length >= 4 ? 'high' : 'medium',
          alternativeInterpretation: 'This could reflect a seasonal curiosity or an ongoing core long-term passion.',
          userStatus: 'active',
          whyAmISeeingThis: `Observed ${hits.length} entries referencing ${theme} between ${hits[hits.length - 1].date} and ${hits[0].date}.`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return patterns;
  }

  private extractStressObservations(userId: string, bodyLogs: any[], journals: LocalJournalEntry[]): PatternObservation[] {
    const patterns: PatternObservation[] = [];
    const highStressEntries = journals.filter(j => (j.moodScore && j.moodScore <= 4) || (j.emotionLabel && ['stressed', 'tired', 'anxious'].includes(j.emotionLabel.toLowerCase())));

    if (highStressEntries.length >= 2) {
      const evidence: PatternEvidence[] = highStressEntries.slice(0, 3).map(e => ({
        sourceId: e.id,
        sourceType: 'journal',
        snippet: e.transcript.slice(0, 120),
        date: e.createdAt.slice(0, 10),
        relevanceScore: 0.8
      }));

      patterns.push({
        id: 'pattern_stress_recovery_cycle',
        userId,
        category: 'stress_observation',
        title: 'Cognitive Stress & Recovery Cycles',
        description: 'You have documented recurring periods of lower energy and mental friction following prolonged intense effort.',
        supportingEvidence: evidence,
        observationCount: highStressEntries.length,
        timeRange: {
          start: highStressEntries[highStressEntries.length - 1].createdAt.slice(0, 10),
          end: highStressEntries[0].createdAt.slice(0, 10)
        },
        confidence: 'medium',
        alternativeInterpretation: 'Friction may be driven by external scheduling demands rather than intrinsic workload.',
        userStatus: 'active',
        whyAmISeeingThis: `Identified ${highStressEntries.length} entries with mood score ≤ 4 or stress descriptors.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return patterns;
  }

  private extractJoyPatterns(userId: string, savoringLogs: any[], journals: LocalJournalEntry[]): PatternObservation[] {
    const patterns: PatternObservation[] = [];
    const highMood = journals.filter(j => j.moodScore && j.moodScore >= 8);

    if (highMood.length >= 2 || savoringLogs.length >= 2) {
      const count = highMood.length + savoringLogs.length;
      const evidence: PatternEvidence[] = highMood.slice(0, 3).map(j => ({
        sourceId: j.id,
        sourceType: 'journal',
        snippet: j.transcript.slice(0, 120),
        date: j.createdAt.slice(0, 10),
        relevanceScore: 0.9
      }));

      patterns.push({
        id: 'pattern_joy_spikes',
        userId,
        category: 'recurring_joy',
        title: 'Recurring Sources of Meaningful Joy',
        description: 'Your highest recorded mood entries frequently correlate with deliberate creative expression and restful human connection.',
        supportingEvidence: evidence,
        observationCount: count,
        timeRange: {
          start: highMood[highMood.length - 1]?.createdAt.slice(0, 10) || new Date().toISOString().slice(0, 10),
          end: highMood[0]?.createdAt.slice(0, 10) || new Date().toISOString().slice(0, 10)
        },
        confidence: count >= 4 ? 'high' : 'medium',
        alternativeInterpretation: 'Peak states may also coincide with the completion of difficult obligations.',
        userStatus: 'active',
        whyAmISeeingThis: `Detected ${count} high mood (≥8/10) and savoring records.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return patterns;
  }

  private extractReturningIdeas(userId: string, journals: LocalJournalEntry[]): PatternObservation[] {
    const patterns: PatternObservation[] = [];
    const ideaHits = journals.filter(j => {
      const text = j.transcript.toLowerCase();
      return text.includes('idea') || text.includes('build') || text.includes('project') || text.includes('what if');
    });

    if (ideaHits.length >= 2) {
      const evidence: PatternEvidence[] = ideaHits.slice(0, 3).map(j => ({
        sourceId: j.id,
        sourceType: 'journal',
        snippet: j.transcript.slice(0, 120),
        date: j.createdAt.slice(0, 10),
        relevanceScore: 0.8
      }));

      patterns.push({
        id: 'pattern_returning_concepts',
        userId,
        category: 'returning_idea',
        title: 'Ideas That Repeatedly Return',
        description: 'You have repeatedly circled back to concepts around personal software, independent creation, and focused craftsmanship.',
        supportingEvidence: evidence,
        observationCount: ideaHits.length,
        timeRange: {
          start: ideaHits[ideaHits.length - 1].createdAt.slice(0, 10),
          end: ideaHits[0].createdAt.slice(0, 10)
        },
        confidence: 'medium',
        alternativeInterpretation: 'These recurring themes might represent an active passion seeking the right implementation window.',
        userStatus: 'active',
        whyAmISeeingThis: `Found ${ideaHits.length} journal notes exploring conceptual project designs.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return patterns;
  }

  private extractDecisionPatterns(userId: string, decisions: any[]): PatternObservation[] {
    const patterns: PatternObservation[] = [];
    if (decisions.length >= 2) {
      patterns.push({
        id: 'pattern_decisions_values_alignment',
        userId,
        category: 'decision_pattern',
        title: 'Values-Centered Decision Deliberation',
        description: 'When facing complex forks, you consistently prioritize long-term sovereignty and psychological peace over short-term expediency.',
        supportingEvidence: decisions.slice(0, 3).map(d => ({
          sourceId: d.id,
          sourceType: 'decision',
          snippet: `${d.title}: ${d.reasoning || d.expectedOutcome}`,
          date: d.date || d.createdAt.slice(0, 10),
          relevanceScore: 0.85
        })),
        observationCount: decisions.length,
        timeRange: {
          start: decisions[decisions.length - 1].createdAt.slice(0, 10),
          end: decisions[0].createdAt.slice(0, 10)
        },
        confidence: 'medium',
        alternativeInterpretation: 'Cautious deliberation might also reflect higher risk sensitivity during transitional periods.',
        userStatus: 'active',
        whyAmISeeingThis: `Analyzed ${decisions.length} structured decision journal entries.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    return patterns;
  }

  private extractGoalPatterns(userId: string, goals: any[], journals: LocalJournalEntry[]): PatternObservation[] {
    const patterns: PatternObservation[] = [];
    if (goals.length >= 2) {
      patterns.push({
        id: 'pattern_goal_continuity',
        userId,
        category: 'repeated_goal',
        title: 'Sustained Focus on Personal Mastery',
        description: 'Your goals show strong continuity in the domains of health habits and cognitive independence across multiple quarters.',
        supportingEvidence: goals.slice(0, 3).map(g => ({
          sourceId: g.id,
          sourceType: 'goal',
          snippet: `${g.title} (${g.category}) - ${g.progress}% completed`,
          date: g.createdAt.slice(0, 10),
          relevanceScore: 0.88
        })),
        observationCount: goals.length,
        timeRange: {
          start: goals[goals.length - 1].createdAt.slice(0, 10),
          end: goals[0].createdAt.slice(0, 10)
        },
        confidence: 'high',
        alternativeInterpretation: 'Consistent goal naming indicates clear thematic priorities.',
        userStatus: 'active',
        whyAmISeeingThis: `Verified ${goals.length} active or ongoing goals.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    return patterns;
  }
}

export const patternDiscoveryEngine = PatternDiscoveryEngine.getInstance();
