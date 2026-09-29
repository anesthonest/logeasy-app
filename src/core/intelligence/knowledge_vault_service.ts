/**
 * LogEasy Life Knowledge Vault Service
 * Durable layer storing user-approved life knowledge:
 * Lessons, Principles, Preferences, Strategies, Warnings, Insights, Skills, Stories.
 * "Never automatically convert a temporary reflection into permanent life knowledge."
 * Requires explicit user confirmation (SAVE, EDIT, DISMISS).
 */

import { localDB, LocalJournalEntry } from '../database/local_db';
import { logger } from '../analytics/logger';
import {
  LifeKnowledgeItem,
  LessonProposal,
  KnowledgeCategory,
  TemporalStatus,
  MemoryState
} from './types';

export class KnowledgeVaultService {
  private static instance: KnowledgeVaultService;

  private constructor() {}

  public static getInstance(): KnowledgeVaultService {
    if (!KnowledgeVaultService.instance) {
      KnowledgeVaultService.instance = new KnowledgeVaultService();
    }
    return KnowledgeVaultService.instance;
  }

  /**
   * Add a new verified knowledge item to the vault (user authored or approved).
   */
  public async addKnowledgeItem(
    userId: string,
    params: {
      type: KnowledgeCategory;
      title: string;
      content: string;
      contextTags?: string[];
      sourceEntryId?: string;
      sourceSnippet?: string;
      isUserAuthored?: boolean;
    }
  ): Promise<LifeKnowledgeItem> {
    const item: LifeKnowledgeItem = {
      id: `vault_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      type: params.type,
      title: params.title,
      content: params.content,
      contextTags: params.contextTags || [],
      lineage: {
        sourceIds: params.sourceEntryId ? [params.sourceEntryId] : [],
        sourceSnippets: params.sourceSnippet ? [params.sourceSnippet] : [],
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        isUserApproved: true,
        isUserAuthored: params.isUserAuthored ?? true
      },
      temporalStatus: 'present',
      memoryState: 'verified_knowledge',
      isExcludedFromAI: false,
      whyAmISeeingThis: params.sourceSnippet
        ? `Derived from your journal entry and confirmed into your Personal Knowledge Vault.`
        : `Directly authored and verified in your Personal Knowledge Vault.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveKnowledgeItem(item);
    logger.info('KnowledgeVaultService', `Added verified knowledge item ${item.id} (${item.type})`);
    return item;
  }

  /**
   * Scan an entry for candidate life lessons and produce LessonProposals.
   * Does NOT auto-save to vault: generates proposal for user approval.
   */
  public async scanEntryForLessons(userId: string, entry: LocalJournalEntry): Promise<LessonProposal[]> {
    const text = entry.transcript;
    const lessonIndicators = [
      'i learned that',
      'i realized that',
      'lesson learned',
      'note to self',
      'never again',
      'next time i will',
      'the key is',
      'it turns out that',
      'rule of thumb'
    ];

    const proposals: LessonProposal[] = [];

    for (const indicator of lessonIndicators) {
      const idx = text.toLowerCase().indexOf(indicator);
      if (idx !== -1) {
        const sentenceEnd = text.indexOf('.', idx);
        const snippet = sentenceEnd !== -1 ? text.slice(idx, sentenceEnd + 1) : text.slice(idx, idx + 120);

        let cleanLesson = snippet.trim();
        // Remove conversational prefixes e.g. "I realized that ", "I learned that "
        cleanLesson = cleanLesson.replace(/^(i realized that|i learned that|note to self:?|lesson learned:?)\s*/i, '');
        // Capitalize first letter
        cleanLesson = cleanLesson.charAt(0).toUpperCase() + cleanLesson.slice(1);

        const proposal: LessonProposal = {
          id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          userId,
          sourceEntryId: entry.id,
          sourceSnippet: snippet,
          suggestedLesson: cleanLesson,
          suggestedType: snippet.toLowerCase().includes('never') ? 'warning' : 'lesson',
          context: `Detected from spoken entry on ${entry.createdAt.slice(0, 10)}`,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        await localDB.saveLessonProposal(proposal);
        proposals.push(proposal);
      }
    }

    return proposals;
  }

  /**
   * Resolve proposal: SAVE (promotes to vault), EDIT, or DISMISS.
   */
  public async resolveProposal(
    userId: string,
    proposalId: string,
    action: 'save' | 'dismiss',
    customText?: string,
    customType?: KnowledgeCategory
  ): Promise<LifeKnowledgeItem | null> {
    const proposals = await localDB.getLessonProposals(userId);
    const prop = proposals.find(p => p.id === proposalId);
    if (!prop) return null;

    if (action === 'dismiss') {
      prop.status = 'dismissed';
      await localDB.saveLessonProposal(prop);
      return null;
    }

    // Promoted to verified Life Knowledge Vault
    prop.status = customText ? 'edited' : 'saved';
    await localDB.saveLessonProposal(prop);

    const vaultItem = await this.addKnowledgeItem(userId, {
      type: customType || prop.suggestedType,
      title: customText ? customText.slice(0, 50) : prop.suggestedLesson.slice(0, 50),
      content: customText || prop.suggestedLesson,
      sourceEntryId: prop.sourceEntryId,
      sourceSnippet: prop.sourceSnippet,
      isUserAuthored: false
    });

    return vaultItem;
  }

  /**
   * Update or correct a knowledge item.
   */
  public async updateKnowledgeItem(
    userId: string,
    id: string,
    updates: Partial<LifeKnowledgeItem>
  ): Promise<LifeKnowledgeItem | null> {
    const items = await localDB.getKnowledgeItems(userId);
    const target = items.find(i => i.id === id);
    if (!target) return null;

    const updated: LifeKnowledgeItem = {
      ...target,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await localDB.saveKnowledgeItem(updated);
    return updated;
  }

  /**
   * Toggle AI exclusion or delete item.
   */
  public async setExcludedFromAI(userId: string, id: string, excluded: boolean): Promise<void> {
    const items = await localDB.getKnowledgeItems(userId);
    const target = items.find(i => i.id === id);
    if (target) {
      target.isExcludedFromAI = excluded;
      target.updatedAt = new Date().toISOString();
      await localDB.saveKnowledgeItem(target);
    }
  }

  public async deleteKnowledgeItem(id: string): Promise<void> {
    await localDB.deleteKnowledgeItem(id);
  }

  public async getVerifiedKnowledge(userId: string): Promise<LifeKnowledgeItem[]> {
    return localDB.getKnowledgeItems(userId);
  }

  public async getPendingProposals(userId: string): Promise<LessonProposal[]> {
    const proposals = await localDB.getLessonProposals(userId);
    return proposals.filter(p => p.status === 'pending');
  }
}

export const knowledgeVaultService = KnowledgeVaultService.getInstance();
