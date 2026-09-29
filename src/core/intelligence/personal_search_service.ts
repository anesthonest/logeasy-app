/**
 * LogEasy Conversational Personal Search Assistant
 * Grounds natural language queries across the user's Life Model.
 * Examples:
 * - "Find the first time I wrote about..."
 * - "What did I learn about focus and morning routines?"
 * - "When did I change my mind about remote work?"
 * - "What decisions did I make regarding career in 2025?"
 * Strict principle: Every answer links to verified evidence snippets. Never hallucinate.
 */

import { localDB } from '../database/local_db';
import { logger } from '../analytics/logger';
import { PatternEvidence } from './types';

export interface SearchAnswer {
  query: string;
  summary: string;
  evidence: PatternEvidence[];
  relatedKnowledge: string[];
  firstMentionDate?: string;
  latestMentionDate?: string;
  temporalEvolution?: string;
}

export class PersonalSearchService {
  private static instance: PersonalSearchService;

  private constructor() {}

  public static getInstance(): PersonalSearchService {
    if (!PersonalSearchService.instance) {
      PersonalSearchService.instance = new PersonalSearchService();
    }
    return PersonalSearchService.instance;
  }

  /**
   * Search across journals, knowledge vault, decisions, and goals.
   */
  public async searchLifeModel(userId: string, query: string): Promise<SearchAnswer> {
    logger.info('PersonalSearchService', `Querying life model: "${query}" for user ${userId}`);

    const [journals, vaultItems, decisions, goals] = await Promise.all([
      localDB.getJournalEntries(userId),
      localDB.getKnowledgeItems(userId),
      localDB.getDecisionRecords(userId),
      localDB.getGoals(userId)
    ]);

    const activeJournals = journals.filter(j => !j.deleted && !(j.tags || []).includes('exclude_from_ai'));
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    const matches: Array<{
      sourceId: string;
      sourceType: 'journal' | 'memory' | 'decision' | 'goal';
      snippet: string;
      date: string;
      score: number;
    }> = [];

    // Search journals (sorted chronologically)
    const sortedJournals = [...activeJournals].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const j of sortedJournals) {
      const fullText = `${j.title || ''} ${j.transcript}`.toLowerCase();
      let matchCount = 0;
      for (const term of terms) {
        if (fullText.includes(term)) matchCount++;
      }

      if (matchCount > 0) {
        // Find best snippet
        const firstTerm = terms.find(t => fullText.includes(t)) || terms[0];
        const idx = fullText.indexOf(firstTerm);
        const start = Math.max(0, idx - 40);
        const end = Math.min(j.transcript.length, idx + 100);
        const snippet = (start > 0 ? '...' : '') + j.transcript.slice(start, end) + (end < j.transcript.length ? '...' : '');

        const score = (matchCount / terms.length) + (fullText.includes(query.toLowerCase()) ? 0.5 : 0);
        matches.push({
          sourceId: j.id,
          sourceType: 'journal',
          snippet,
          date: j.createdAt.slice(0, 10),
          score
        });
      }
    }

    // Search Knowledge Vault
    for (const v of vaultItems) {
      if (v.isExcludedFromAI) continue;
      const text = `${v.title} ${v.content}`.toLowerCase();
      let matchCount = 0;
      for (const term of terms) {
        if (text.includes(term)) matchCount++;
      }
      if (matchCount > 0) {
        const score = (matchCount / terms.length) + (text.includes(query.toLowerCase()) ? 0.5 : 0);
        matches.push({
          sourceId: v.id,
          sourceType: 'memory',
          snippet: `[Vault ${v.type.toUpperCase()}] ${v.title}: ${v.content}`,
          date: v.createdAt.slice(0, 10),
          score
        });
      }
    }

    // Search Decisions
    for (const d of decisions) {
      const text = `${d.title} ${d.reasoning} ${d.expectedOutcome}`.toLowerCase();
      let matchCount = 0;
      for (const term of terms) {
        if (text.includes(term)) matchCount++;
      }
      if (matchCount > 0) {
        const score = (matchCount / terms.length) + (text.includes(query.toLowerCase()) ? 0.5 : 0);
        matches.push({
          sourceId: d.id,
          sourceType: 'decision',
          snippet: `[Decision] ${d.title}: ${d.reasoning.slice(0, 120)}`,
          date: d.date || d.createdAt.slice(0, 10),
          score
        });
      }
    }

    // Sort by relevance score desc, then by date desc
    matches.sort((a, b) => b.score - a.score);

    const evidence: PatternEvidence[] = matches.slice(0, 5).map(m => ({
      sourceId: m.sourceId,
      sourceType: m.sourceType as any,
      snippet: m.snippet,
      date: m.date,
      relevanceScore: m.score
    }));

    // Identify first and latest mention
    const journalMatches = matches.filter(m => m.sourceType === 'journal');
    const firstMention = journalMatches.length > 0 ? journalMatches[0].date : undefined;
    const latestMention = journalMatches.length > 0 ? journalMatches[journalMatches.length - 1].date : undefined;

    let summary = '';
    if (evidence.length === 0) {
      summary = `No explicit journal entries or life model records matched "${query}".`;
    } else {
      summary = `Found ${matches.length} references across your journals and knowledge vault. First recorded on ${firstMention || 'an earlier date'}, with latest reflection on ${latestMention || 'recent date'}.`;
    }

    const relatedVaultItems = vaultItems
      .filter(v => terms.some(t => v.content.toLowerCase().includes(t)))
      .map(v => `(${v.type}) ${v.title}`);

    return {
      query,
      summary,
      evidence,
      relatedKnowledge: relatedVaultItems,
      firstMentionDate: firstMention,
      latestMentionDate: latestMention,
      temporalEvolution: firstMention && latestMention && firstMention !== latestMention
        ? `Perspective evolved between ${firstMention} and ${latestMention}.`
        : undefined
    };
  }
}

export const personalSearchService = PersonalSearchService.getInstance();
