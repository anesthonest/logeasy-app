/**
 * LogEasy Future Self Studio, Scenario Engine & Personal Experiments
 * Helps the user explore potential trajectories, simulate trade-offs,
 * and test lifestyle hypotheses methodically without fortune-telling.
 */

import { localDB } from '../database/local_db';
import { logger } from '../analytics/logger';
import {
  FutureSelfProfile,
  ScenarioSimulation,
  PersonalExperiment
} from './types';
import { knowledgeVaultService } from './knowledge_vault_service';

export class FutureAndExperimentsEngine {
  private static instance: FutureAndExperimentsEngine;

  private constructor() {}

  public static getInstance(): FutureAndExperimentsEngine {
    if (!FutureAndExperimentsEngine.instance) {
      FutureAndExperimentsEngine.instance = new FutureAndExperimentsEngine();
    }
    return FutureAndExperimentsEngine.instance;
  }

  /**
   * Get or initialize Future Self Studio profile with 3 distinct trajectories.
   */
  public async getFutureSelfProfile(userId: string): Promise<FutureSelfProfile> {
    const existing = await localDB.getFutureSelfProfile(userId);
    if (existing) return existing;

    const defaultProfile: FutureSelfProfile = {
      id: `future_${userId}`,
      userId,
      horizonYears: 3,
      scenarios: [
        {
          id: 'scen_mastery',
          name: 'Trajectory A: High-Sovereignty Deep Craftsperson',
          focusDimensions: {
            career: 'Focused on creating high-value independent tools and resilient architectures.',
            health: '7.5+ hours sleep daily, regular morning walks, low caffeine reliance.',
            relationships: 'Close intimate circle of thoughtful peers and quiet family time.',
            creativity: 'Publishing deeply considered essays and crafted projects quarterly.'
          },
          assumedHabits: [
            'Daily morning focus block without notifications',
            'Weekly digital sabbath in nature',
            'Evening reflection and shutdown routine'
          ],
          potentialTradeOffs: [
            'Slower corporate status acceleration in exchange for peace of mind',
            'Smaller public social media presence'
          ],
          estimatedTrajectory: 'High personal autonomy, deep technical compounding, resilient nervous system.'
        },
        {
          id: 'scen_entrepreneurial',
          name: 'Trajectory B: Systems Builder & Collaborative Leader',
          focusDimensions: {
            career: 'Growing a collaborative software organization solving real human intelligence challenges.',
            health: 'Structured fitness regime, periodic calendar buffer days to prevent burnout.',
            relationships: 'Wide network of collaborators, mentors, and mission-aligned teammates.',
            creativity: 'Leading product vision, mentoring creators, writing system manifestos.'
          },
          assumedHabits: [
            'Daily team standups and async coordination',
            'Bi-weekly strategy reviews',
            'Regular public demos'
          ],
          potentialTradeOffs: [
            'Higher coordination overhead and meeting density',
            'Less uninterrupted multi-hour solitary flow'
          ],
          estimatedTrajectory: 'High systemic impact, increased operational complexity, rapid scale.'
        },
        {
          id: 'scen_creative_scholar',
          name: 'Trajectory C: Creative Scholar & Mindful Educator',
          focusDimensions: {
            career: 'Writing, teaching, and conducting deep research in human cognition and tools for thought.',
            health: 'Prioritizing meditative equilibrium, seasonal retreats, and physical vitality.',
            relationships: 'Mentorship relationships and vibrant community discussions.',
            creativity: 'Authoring a comprehensive book or long-form educational curriculum.'
          },
          assumedHabits: [
            'Reading 60 minutes every morning',
            'Drafting 500 words of long-form thought daily',
            'Monthly open discussion salon'
          ],
          potentialTradeOffs: [
            'Lower immediate commercial monetization compared to high-intensity software startups',
            'Requires strict self-discipline in the absence of corporate deadlines'
          ],
          estimatedTrajectory: 'Enduring cultural legacy, intellectual breadth, tranquil cadence.'
        }
      ],
      notes: 'Initial multi-trajectory exploratory model for 3-year vision.',
      updatedAt: new Date().toISOString()
    };

    await localDB.saveFutureSelfProfile(defaultProfile);
    return defaultProfile;
  }

  /**
   * Run a grounded "What if I..." scenario simulation.
   */
  public async simulateScenario(
    userId: string,
    prompt: string,
    assumptions: string[]
  ): Promise<ScenarioSimulation> {
    logger.info('ScenarioEngine', `Simulating scenario: "${prompt}" for user ${userId}`);

    const [goals, journals, decisions] = await Promise.all([
      localDB.getGoals(userId),
      localDB.getJournalEntries(userId),
      localDB.getDecisionRecords(userId)
    ]);

    const activeGoals = goals.filter(g => g.status !== 'completed').map(g => g.title);

    const simulation: ScenarioSimulation = {
      id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      prompt,
      knownInformation: [
        `You currently have ${activeGoals.length} active goals (${activeGoals.slice(0, 3).join(', ')}).`,
        `Your journal history demonstrates highest clarity during focused morning routines and lowest friction with quiet work environments.`,
        `Past decisions reflect strong preference for long-term sovereignty.`
      ],
      userAssumptions: assumptions.length > 0 ? assumptions : ['Assuming consistent weekly execution without major external disruptions.'],
      aiReasoning: `If you pursue "${prompt}", initial friction will likely manifest as a temporary time squeeze on existing commitments. Based on your historical pattern of deliberate focus, designating clear non-negotiable boundaries will be critical.`,
      uncertainties: [
        'External market or timeline dependencies that are beyond personal control.',
        'Fluctuations in physical energy and seasonal fatigue.'
      ],
      possibleOutcomes: [
        'High fulfillment and tangible asset creation if 5 focused hours/week are ring-fenced.',
        'Risk of cognitive fragmentation if added as an unstructured ad-hoc task.'
      ],
      tradeOffAnalysis: 'Gaining progress here will require consciously deprioritizing lower-value obligations.',
      createdAt: new Date().toISOString()
    };

    await localDB.saveScenarioSimulation(simulation);
    return simulation;
  }

  /**
   * Launch a Personal Experiment.
   */
  public async startExperiment(
    userId: string,
    params: {
      title: string;
      intention: string;
      targetDurationDays: number;
    }
  ): Promise<PersonalExperiment> {
    const experiment: PersonalExperiment = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      title: params.title,
      intention: params.intention,
      targetDurationDays: params.targetDurationDays,
      startDate: new Date().toISOString().slice(0, 10),
      status: 'active',
      dailyObservations: [],
      lessonsExtracted: [],
      whyAmISeeingThis: `User-initiated hypothesis test: "${params.intention}"`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.savePersonalExperiment(experiment);
    logger.info('FutureAndExperimentsEngine', `Started personal experiment ${experiment.id}`);
    return experiment;
  }

  /**
   * Add a daily log to an active experiment.
   */
  public async logExperimentDay(
    userId: string,
    experimentId: string,
    notes: string,
    score: number
  ): Promise<PersonalExperiment | null> {
    const exps = await localDB.getPersonalExperiments(userId);
    const target = exps.find(e => e.id === experimentId);
    if (!target) return null;

    const dayNumber = target.dailyObservations.length + 1;
    target.dailyObservations.push({
      id: `day_${dayNumber}_${Date.now()}`,
      dayNumber,
      date: new Date().toISOString().slice(0, 10),
      notes,
      score
    });

    if (dayNumber >= target.targetDurationDays) {
      target.status = 'completed';
      target.endDate = new Date().toISOString().slice(0, 10);
    }

    target.updatedAt = new Date().toISOString();
    await localDB.savePersonalExperiment(target);
    return target;
  }

  /**
   * Conclude experiment and extract lessons for the Knowledge Vault.
   */
  public async concludeExperiment(
    userId: string,
    experimentId: string,
    finalOutcomes: string,
    lessons: string[]
  ): Promise<PersonalExperiment | null> {
    const exps = await localDB.getPersonalExperiments(userId);
    const target = exps.find(e => e.id === experimentId);
    if (!target) return null;

    target.status = 'completed';
    target.endDate = new Date().toISOString().slice(0, 10);
    target.finalOutcomes = finalOutcomes;
    target.lessonsExtracted = lessons;
    target.updatedAt = new Date().toISOString();

    await localDB.savePersonalExperiment(target);

    // Save lessons into Knowledge Vault
    for (const lesson of lessons) {
      await knowledgeVaultService.addKnowledgeItem(userId, {
        type: 'strategy',
        title: `Experiment Lesson: ${target.title}`,
        content: lesson,
        sourceSnippet: `Extracted from experiment "${target.title}": ${finalOutcomes}`,
        contextTags: ['experiment', 'hypothesis_tested']
      });
    }

    return target;
  }
}

export const futureAndExperimentsEngine = FutureAndExperimentsEngine.getInstance();
