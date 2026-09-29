/**
 * LogEasy Opportunity & Unfinished Business Engine
 * Detects opportunities implied by the user's own journals, ideas, and goals.
 * Surfaces dormant projects, unfinished letters, open decisions, and unreviewed goals.
 * Principles:
 * - Suggests, never pressures
 * - Does not optimize for engagement or dopamine loops
 * - Options: CONTINUE, ARCHIVE, DELETE, REMIND ME LATER, IGNORE
 */

import { localDB } from '../database/local_db';
import { logger } from '../analytics/logger';
import { OpportunityItem, UnfinishedItem, PatternEvidence } from './types';

export class OpportunityAndUnfinishedEngine {
  private static instance: OpportunityAndUnfinishedEngine;

  private constructor() {}

  public static getInstance(): OpportunityAndUnfinishedEngine {
    if (!OpportunityAndUnfinishedEngine.instance) {
      OpportunityAndUnfinishedEngine.instance = new OpportunityAndUnfinishedEngine();
    }
    return OpportunityAndUnfinishedEngine.instance;
  }

  /**
   * Discovers implied opportunities from user data.
   */
  public async discoverOpportunities(userId: string): Promise<OpportunityItem[]> {
    logger.info('OpportunityEngine', `Discovering opportunities for user ${userId}`);

    const [journals, goals, creativeWorks, existingOpportunities] = await Promise.all([
      localDB.getJournalEntries(userId),
      localDB.getGoals(userId),
      localDB.getCreativityWorks(userId),
      localDB.getOpportunityItems(userId)
    ]);

    const activeJournals = journals.filter(j => !j.deleted);
    const discovered: OpportunityItem[] = [];

    // 1. Repeated Idea -> Project Opportunity
    const recurringIdeas = activeJournals.filter(j => {
      const text = j.transcript.toLowerCase();
      return text.includes('app') || text.includes('project') || text.includes('book') || text.includes('podcast') || text.includes('architecture') || text.includes('system') || text.includes('craft') || text.includes('tool');
    });

    if (recurringIdeas.length >= 2) {
      const oppId = 'opp_repeated_creative_project';
      if (!existingOpportunities.some(o => o.id === oppId)) {
        const evidence: PatternEvidence[] = recurringIdeas.slice(0, 3).map(j => ({
          sourceId: j.id,
          sourceType: 'journal',
          snippet: j.transcript.slice(0, 120),
          date: j.createdAt.slice(0, 10),
          relevanceScore: 0.85
        }));

        discovered.push({
          id: oppId,
          userId,
          type: 'repeated_idea',
          title: 'Turn Recurring Conceptual Notes into an Active Project',
          observation: `You have mentioned project ideas across ${recurringIdeas.length} different spoken entries.`,
          suggestion: 'Would you like to formalize this into a dedicated Goal Workspace with defined milestones?',
          supportingCount: recurringIdeas.length,
          evidence,
          status: 'suggested',
          whyAmISeeingThis: `Observed ${recurringIdeas.length} journal notes discussing project concepts.`,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 2. Creative Thread -> Essay or Story Development
    if (creativeWorks.length >= 1) {
      const oppId = 'opp_creative_thread_expansion';
      if (!existingOpportunities.some(o => o.id === oppId)) {
        const work = creativeWorks[0];
        discovered.push({
          id: oppId,
          userId,
          type: 'creative_thread',
          title: `Expand Creative Draft: "${work.title}"`,
          observation: `You started the piece "${work.title}" in your creative space.`,
          suggestion: 'A quiet 30-minute drafting session could complete the narrative arc.',
          supportingCount: 1,
          evidence: [{
            sourceId: work.id,
            sourceType: 'journal',
            snippet: work.content.slice(0, 100),
            date: work.createdAt.slice(0, 10),
            relevanceScore: 0.9
          }],
          status: 'suggested',
          whyAmISeeingThis: `Identified active creative draft created on ${work.createdAt.slice(0, 10)}.`,
          createdAt: new Date().toISOString()
        });
      }
    }

    for (const opp of discovered) {
      await localDB.saveOpportunityItem(opp);
    }

    const all = await localDB.getOpportunityItems(userId);
    return all.length > 0 ? all : discovered;
  }

  /**
   * Scan for unfinished business (goals, open decisions, drafts).
   */
  public async scanUnfinishedBusiness(userId: string): Promise<UnfinishedItem[]> {
    logger.info('UnfinishedBusinessEngine', `Scanning unfinished items for user ${userId}`);

    const [goals, decisions, creativeWorks, existingItems] = await Promise.all([
      localDB.getGoals(userId),
      localDB.getDecisionRecords(userId),
      localDB.getCreativityWorks(userId),
      localDB.getUnfinishedItems(userId)
    ]);

    const now = Date.now();
    const discovered: UnfinishedItem[] = [];

    // 1. Inactive goals (< 100% progress)
    for (const goal of goals) {
      const progress = goal.progressPercent ?? 0;
      if (goal.status !== 'completed' && progress < 100) {
        const daysIdle = Math.floor((now - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysIdle >= 5) {
          const itemId = `unfinished_goal_${goal.id}`;
          if (!existingItems.some(i => i.id === itemId)) {
            discovered.push({
              id: itemId,
              userId,
              itemType: 'goal',
              title: `Ongoing Goal: "${goal.title}"`,
              description: `Current progress: ${progress}%. Last active ${daysIdle} days ago.`,
              lastActivityDate: goal.createdAt.slice(0, 10),
              daysIdle,
              suggestedAction: 'continue',
              status: 'open',
              whyAmISeeingThis: `Goal is at ${progress}% completion with no updates in ${daysIdle} days.`
            });
          }
        }
      }
    }

    // 2. Open decisions without recorded actual outcomes
    for (const decision of decisions) {
      if (decision.status === 'decided' && !decision.actualOutcome) {
        const daysIdle = Math.floor((now - new Date(decision.date || decision.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const itemId = `unfinished_decision_${decision.id}`;
        if (!existingItems.some(i => i.id === itemId)) {
          discovered.push({
            id: itemId,
            userId,
            itemType: 'decision',
            title: `Review Decision: "${decision.title}"`,
            description: `Decided on ${decision.date || decision.createdAt.slice(0, 10)}. Expected outcome: "${decision.expectedOutcome}". Ready for post-decision review.`,
            lastActivityDate: (decision.date || decision.createdAt).slice(0, 10),
            daysIdle,
            suggestedAction: 'continue',
            status: 'open',
            whyAmISeeingThis: daysIdle > 0
              ? `Decision was finalized ${daysIdle} days ago without an Expected vs Actual outcome review.`
              : `Decision is finalized and awaiting periodic review of expected vs actual outcomes.`
          });
        }
      }
    }

    // 3. Creative works
    for (const piece of creativeWorks) {
      const daysIdle = Math.floor((now - new Date(piece.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysIdle >= 3) {
        const itemId = `unfinished_creative_${piece.id}`;
        if (!existingItems.some(i => i.id === itemId)) {
          discovered.push({
            id: itemId,
            userId,
            itemType: 'creative_work',
            title: `Creative Draft: "${piece.title}"`,
            description: `Draft created ${daysIdle} days ago under ${piece.category}.`,
            lastActivityDate: piece.createdAt.slice(0, 10),
            daysIdle,
            suggestedAction: 'continue',
            status: 'open',
            whyAmISeeingThis: `Unfinished draft remaining in creative workspace.`
          });
        }
      }
    }

    for (const item of discovered) {
      await localDB.saveUnfinishedItem(item);
    }

    const all = await localDB.getUnfinishedItems(userId);
    return all.length > 0 ? all : discovered;
  }

  /**
   * Action on unfinished item: CONTINUE, ARCHIVE, DELETE, REMIND_LATER, IGNORE
   */
  public async handleUnfinishedAction(
    userId: string,
    itemId: string,
    action: 'continue' | 'archive' | 'delete' | 'remind_later' | 'ignore'
  ): Promise<void> {
    if (action === 'delete') {
      await localDB.deleteUnfinishedItem(itemId);
      return;
    }

    const items = await localDB.getUnfinishedItems(userId);
    const target = items.find(i => i.id === itemId);
    if (target) {
      target.status = action === 'continue' ? 'continued' : action === 'archive' ? 'archived' : 'reminded';
      target.suggestedAction = action;
      await localDB.saveUnfinishedItem(target);
    }
  }
}

export const opportunityAndUnfinishedEngine = OpportunityAndUnfinishedEngine.getInstance();
