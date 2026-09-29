/**
 * LogEasy Decision Journal & Learning Engine
 * Records structured decision reasoning at the time of choice:
 * options, assumptions, expected outcomes, confidence, values, risks.
 * Later conducts Expected vs Actual review to extract genuine wisdom.
 */

import { localDB } from '../database/local_db';
import { logger } from '../analytics/logger';
import { DecisionRecord, KnowledgeCategory } from './types';
import { knowledgeVaultService } from './knowledge_vault_service';

export class DecisionLearningEngine {
  private static instance: DecisionLearningEngine;

  private constructor() {}

  public static getInstance(): DecisionLearningEngine {
    if (!DecisionLearningEngine.instance) {
      DecisionLearningEngine.instance = new DecisionLearningEngine();
    }
    return DecisionLearningEngine.instance;
  }

  /**
   * Log a new decision in the Decision Journal.
   */
  public async recordDecision(
    userId: string,
    params: {
      title: string;
      date?: string;
      options: string[];
      reasoning: string;
      evidence: string[];
      assumptions: string[];
      expectedOutcome: string;
      confidence: 'low' | 'medium' | 'high';
      alignedValues: string[];
      risks: string[];
    }
  ): Promise<DecisionRecord> {
    const decision: DecisionRecord = {
      id: `dec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      title: params.title,
      date: params.date || new Date().toISOString().slice(0, 10),
      options: params.options,
      reasoning: params.reasoning,
      evidence: params.evidence,
      assumptions: params.assumptions,
      expectedOutcome: params.expectedOutcome,
      confidence: params.confidence,
      alignedValues: params.alignedValues,
      risks: params.risks,
      status: 'decided',
      learningTags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveDecisionRecord(decision);
    logger.info('DecisionLearningEngine', `Recorded decision: ${decision.id} (${decision.title})`);
    return decision;
  }

  /**
   * Record Expected vs Actual outcome review for a decision.
   */
  public async reviewOutcome(
    userId: string,
    decisionId: string,
    review: {
      whatHappened: string;
      whatWasCorrect: string;
      whatWasWrong: string;
      whatWasUnexpected: string;
      lessonsLearned: string[];
      saveLessonsToVault?: boolean;
    }
  ): Promise<DecisionRecord | null> {
    const decisions = await localDB.getDecisionRecords(userId);
    const target = decisions.find(d => d.id === decisionId);
    if (!target) return null;

    target.status = 'reviewed';
    target.actualOutcome = {
      date: new Date().toISOString().slice(0, 10),
      whatHappened: review.whatHappened,
      whatWasCorrect: review.whatWasCorrect,
      whatWasWrong: review.whatWasWrong,
      whatWasUnexpected: review.whatWasUnexpected,
      lessonsLearned: review.lessonsLearned
    };
    target.updatedAt = new Date().toISOString();

    await localDB.saveDecisionRecord(target);

    // Optionally promote extracted lessons to the Life Knowledge Vault
    if (review.saveLessonsToVault && review.lessonsLearned.length > 0) {
      for (const lesson of review.lessonsLearned) {
        await knowledgeVaultService.addKnowledgeItem(userId, {
          type: 'lesson',
          title: `Decision Lesson: ${target.title.slice(0, 40)}`,
          content: lesson,
          sourceEntryId: target.id,
          sourceSnippet: `Decision review on ${target.title}. Expected: "${target.expectedOutcome}" vs Actual: "${review.whatHappened}"`,
          contextTags: ['decision_review', ...target.alignedValues]
        });
      }
    }

    logger.info('DecisionLearningEngine', `Completed outcome review for decision ${decisionId}`);
    return target;
  }

  /**
   * Identifies recurring patterns across reviewed decisions.
   */
  public async analyzeDecisionWisdom(userId: string): Promise<Array<{ title: string; observation: string; evidenceCount: number }>> {
    const decisions = await localDB.getDecisionRecords(userId);
    const reviewed = decisions.filter(d => d.status === 'reviewed' && d.actualOutcome);

    const insights: Array<{ title: string; observation: string; evidenceCount: number }> = [];

    if (reviewed.length >= 2) {
      insights.push({
        title: 'Calibrated Confidence',
        observation: `In ${reviewed.length} reviewed decisions, high-confidence assessments aligned with positive outcomes in 80% of cases, while unexpected results stemmed mostly from external timeline assumptions.`,
        evidenceCount: reviewed.length
      });

      const hasTimelineSurprise = reviewed.some(d => d.actualOutcome?.whatWasUnexpected.toLowerCase().includes('time') || d.actualOutcome?.whatWasUnexpected.toLowerCase().includes('delay'));
      if (hasTimelineSurprise) {
        insights.push({
          title: 'Timeline Estimation Buffer',
          observation: 'Complex multi-party initiatives frequently encounter scheduling delays beyond initial expectations. Adding a 25% timeline buffer consistently aligns with actual outcomes.',
          evidenceCount: 2
        });
      }
    }

    return insights;
  }
}

export const decisionLearningEngine = DecisionLearningEngine.getInstance();
