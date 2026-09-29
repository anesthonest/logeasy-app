/**
 * LogEasy Context Retrieval & Optimization Engine
 * Implements the 5-Level Memory Hierarchy to prevent context bloat,
 * reduce token waste, and accelerate AI response generation.
 */

import { LocalJournalEntry, localDB } from '../database/local_db';
import { LifeKnowledgeItem } from '../intelligence/types';
import { logger } from '../analytics/logger';

export interface CompressedContext {
  tokenBudgetEstimate: number;
  level1Current: string;
  level2Recent: string[];
  level3RelevantMemories: string[];
  level4VerifiedKnowledge: string[];
  level5DeepHistory: string[];
  compiledPromptContext: string;
}

export class ContextRetrievalEngine {
  private static instance: ContextRetrievalEngine;

  private constructor() {}

  public static getInstance(): ContextRetrievalEngine {
    if (!ContextRetrievalEngine.instance) {
      ContextRetrievalEngine.instance = new ContextRetrievalEngine();
    }
    return ContextRetrievalEngine.instance;
  }

  /**
   * Builds an optimized 5-Level Memory Context for an incoming user input.
   * Ensures maximum relevancy with bounded token footprint.
   */
  public async buildOptimizedContext(
    userId: string,
    currentInput: string,
    maxTokens: number = 800
  ): Promise<CompressedContext> {
    const inputWords = currentInput.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // Fetch local user items
    const [entries, vaultItems, chapters] = await Promise.all([
      localDB.getJournalEntries(userId),
      localDB.getKnowledgeItems(userId),
      localDB.getLifeChapters(userId),
    ]);

    // LEVEL 1: Current Input
    const level1Current = currentInput.trim();

    // LEVEL 2: Recent Context (Entries from last 5 days, max 3)
    const now = Date.now();
    const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000;
    const level2Recent = entries
      .filter(e => !e.deleted && new Date(e.createdAt).getTime() >= fiveDaysAgo)
      .slice(0, 3)
      .map(e => `[${new Date(e.createdAt).toLocaleDateString()}] ${e.transcript.slice(0, 100)}...`);

    // LEVEL 3: Relevant Memories (Matching keywords in transcript/tags)
    const level3RelevantMemories: string[] = [];
    for (const e of entries) {
      if (level3RelevantMemories.length >= 3) break;
      const tLower = e.transcript.toLowerCase();
      const isMatch = inputWords.some(w => tLower.includes(w));
      if (isMatch) {
        level3RelevantMemories.push(
          `[Memory ${new Date(e.createdAt).toLocaleDateString()}]: "${e.transcript.slice(0, 120)}..."`
        );
      }
    }

    // LEVEL 4: Verified Knowledge (from Knowledge Vault)
    const level4VerifiedKnowledge: string[] = vaultItems
      .filter(item => item.status === 'verified')
      .slice(0, 2)
      .map(item => `Core Lesson: ${item.principle}`);

    // LEVEL 5: Deep Historical Context (Current Life Chapter)
    const activeChapter = chapters.find(c => !c.endYear);
    const level5DeepHistory: string[] = activeChapter
      ? [`Active Era: "${activeChapter.title}" (${activeChapter.startYear}-Present)`]
      : [];

    // Synthesize compact bounded prompt string
    const sections: string[] = [];
    if (level5DeepHistory.length > 0) {
      sections.push(`Life Chapter: ${level5DeepHistory.join(' | ')}`);
    }
    if (level4VerifiedKnowledge.length > 0) {
      sections.push(`Verified Principles:\n${level4VerifiedKnowledge.map(k => `- ${k}`).join('\n')}`);
    }
    if (level3RelevantMemories.length > 0) {
      sections.push(`Relevant Memories:\n${level3RelevantMemories.map(m => `- ${m}`).join('\n')}`);
    }
    if (level2Recent.length > 0) {
      sections.push(`Recent Context:\n${level2Recent.map(r => `- ${r}`).join('\n')}`);
    }
    sections.push(`Current Thought:\n"${level1Current}"`);

    const compiledPromptContext = sections.join('\n\n');
    const estimatedTokens = Math.round(compiledPromptContext.length / 4);

    logger.debug('ContextRetrievalEngine', `Context synthesized in ${estimatedTokens} estimated tokens.`);

    return {
      tokenBudgetEstimate: estimatedTokens,
      level1Current,
      level2Recent,
      level3RelevantMemories,
      level4VerifiedKnowledge,
      level5DeepHistory,
      compiledPromptContext,
    };
  }
}

export const contextRetrievalEngine = ContextRetrievalEngine.getInstance();
