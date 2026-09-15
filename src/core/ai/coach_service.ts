/**
 * AI Reflection Coach Service
 * Coordinates AI coaching, personality configurations, guided journaling,
 * context gathering, and crisis safety mitigation.
 */

import { logger } from '../analytics/logger';
import { localDB } from '../database/local_db';
import { aiService } from './ai_service';
import {
  CoachingStyle,
  COACHING_STYLES,
  CoachingSession,
  ConversationMessage,
  CoachingPreferences,
  Goal,
  Habit,
  DecisionEntry,
  GratitudeEntry,
  DailyCheckIn,
  ReflectionSession,
  GuidedSessionType,
  GUIDED_SESSIONS
} from './coach_types';

export class CoachService {
  private static instance: CoachService;

  private constructor() {}

  public static getInstance(): CoachService {
    if (!CoachService.instance) {
      CoachService.instance = new CoachService();
    }
    return CoachService.instance;
  }

  /**
   * Safe generation that handles offline modes, server API calls, and local fallbacks
   */
  public async generateCoachResponse(
    userId: string,
    sessionId: string,
    userMessage: string
  ): Promise<ConversationMessage> {
    logger.info('CoachService', `Processing coach response for session ${sessionId}`);

    // 1. Safety Guard Check First
    const safety = this.checkCrisisSafety(userMessage, userId);
    if (!safety.isSafe) {
      const safetyMsg: ConversationMessage = {
        id: `msg_safe_${Date.now()}`,
        sessionId,
        userId,
        role: 'assistant',
        content: safety.crisisResponse,
        createdAt: new Date().toISOString()
      };
      await localDB.saveConversationMessage(safetyMsg);
      return safetyMsg;
    }

    try {
      // 2. Fetch context
      const session = await this.getOrCreateSession(userId, sessionId);
      const preferences = await this.getOrCreatePreferences(userId);
      const history = await localDB.getConversationMessagesForSession(sessionId);

      // Get user's growth footprint (journal entries, goals, habits)
      const entries = await localDB.getJournalEntries(userId);
      const goals = await localDB.getGoals(userId);
      const habits = await localDB.getHabits(userId);

      // 3. Compile System Prompt
      const styleConfig = COACHING_STYLES[session.style];
      let baseSystem = styleConfig.systemPrompt;
      if (session.style === 'custom' && preferences.customPrompt) {
        baseSystem = `${COACHING_STYLES.custom.systemPrompt}\n\nUser Custom Persona Requirements: "${preferences.customPrompt}"`;
      }

      // Context injection
      const contextSummary = this.compileGrowthContext(entries, goals, habits);
      const systemInstruction = `${baseSystem}
      
CRITICAL CLINICAL BOUNDARY: You are a personal reflection companion. You are NOT a therapist, counselor, psychiatrist, or medical professional. Never offer clinical diagnoses or medication advice. Maintain professional, compassionate boundaries.

Below is the user's authentic life context. Reference this history when relevant, celebrating streaks, calling back to previous reflections, and reminding them of active goals to ground the discussion:
${contextSummary}

Conversational Depth: ${preferences.coachingDepth.toUpperCase()}
Conversational Frequency of Interventions: ${preferences.coachingFrequency.toUpperCase()}`;

      // 4. Compile conversation history
      const formattedHistory = history
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      const fullPrompt = `The user says: "${userMessage}"
      
Provide your next reflective coaching message. Ask exactly ONE deep, open-ended question that helps them think deeper, align with their values, or define a small micro-step of progress. Be concise, warm, and highly personalized.`;

      // 5. Send to AI Engine
      // We leverage the backend's post handler if active, or fallback
      let replyText = '';
      let isMock = false;

      try {
        const response = await fetch('/api/ai/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${formattedHistory}\n\nUSER: ${userMessage}\n\n${fullPrompt}`,
            systemInstruction
          }),
        });

        if (response.ok) {
          const data = await response.json();
          replyText = data.text;
        } else {
          isMock = true;
        }
      } catch (err) {
        isMock = true;
      }

      if (isMock || !replyText) {
        replyText = this.generateMockCoachReply(session.style, userMessage, goals, habits);
      }

      const replyMsg: ConversationMessage = {
        id: `msg_${Date.now()}`,
        sessionId,
        userId,
        role: 'assistant',
        content: replyText,
        createdAt: new Date().toISOString()
      };

      await localDB.saveConversationMessage(replyMsg);
      
      // Update session's timestamp
      session.updatedAt = new Date().toISOString();
      await localDB.saveCoachingSession(session);

      return replyMsg;
    } catch (e: any) {
      logger.error('CoachService', 'Failed to generate coach response', e);
      // Fail-safe offline response
      const fallbackMsg: ConversationMessage = {
        id: `msg_err_${Date.now()}`,
        sessionId,
        userId,
        role: 'assistant',
        content: "I'm in offline reflection mode right now, but I have saved your thoughts securely. Let's continue reflecting on this once synchronization connects!",
        createdAt: new Date().toISOString(),
        isPending: true
      };
      await localDB.saveConversationMessage(fallbackMsg);
      return fallbackMsg;
    }
  }

  /**
   * Generates guided journaling reflections
   */
  public async generateGuidedSessionSummary(
    userId: string,
    sessionType: GuidedSessionType,
    answers: Record<string, string>
  ): Promise<string> {
    const promptDef = GUIDED_SESSIONS[sessionType];
    const qas = Object.entries(answers)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n\n');

    const systemInstruction = `You are a professional growth compiler and executive coach. Analyze the user's responses to this Guided reflection session (${promptDef.name}). 
    Synthesize their insights into:
    1. A warm, empowering validation of their thoughts.
    2. 2-3 key takeaways or patterns discovered.
    3. Exactly ONE small, actionable micro-habit or step they can execute today or tomorrow.
    Keep the tone grounded, concise, and deeply respectful.`;

    const userPrompt = `Here is my guided journaling entry:\n\n${qas}`;

    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, systemInstruction })
      });

      if (response.ok) {
        const data = await response.json();
        return data.text;
      }
    } catch (e) {
      logger.warn('CoachService', 'Failed to get server summary, using local synthesis', e);
    }

    // Fallback offline dynamic synthesis
    return `### Guided Reflection Synthesis: ${promptDef.name}
    
Thank you for taking the time to complete this session. Your conscious effort to map your intentions is a powerful practice.

**Key Insight:**
You are demonstrating consistent self-awareness regarding your mental energy and bottlenecks. By acknowledging these points, you are building the exact habits that support long-term alignment.

**Suggested Next Micro-step:**
Choose the single most critical intention you wrote down and allocate 15 uninterrupted minutes tomorrow morning solely to advance it.`;
  }

  /**
   * Crisis Safety Filter Guard (Clinical compliance)
   */
  public checkCrisisSafety(text: string, userId: string): { isSafe: boolean; crisisResponse: string } {
    const crisisTriggers = [
      'kill myself', 'suicide', 'self-harm', 'cut myself', 'end my life',
      'want to die', 'better off dead', 'hanging myself', 'overdose'
    ];
    const lower = text.toLowerCase();
    const matches = crisisTriggers.some((t) => lower.includes(t));

    if (matches) {
      logger.warn('CoachService', 'Crisis trigger matched! Intervening with safe local response.');
      
      const region = 'US'; // Default or we could fetch from preferences if desired
      const crisisHotlines: Record<string, string> = {
        US: 'National Suicide Prevention Lifeline: Call or text 988 (Available 24/7, Free, Confidential)',
        UK: 'Samaritans: Call 116 123 (Available 24/7, Free, Confidential)',
        CA: 'Talk Suicide Canada: Call 1-833-456-4566 or text 45645 (Available 24/7)',
        AU: 'Lifeline: Call 13 11 14'
      };

      const hotline = crisisHotlines[region] || crisisHotlines['US'];

      const response = `I hear how much pain you are in right now, and I want you to know you are not alone. While I am here to support your personal reflection as an AI companion, I am not capable of providing crisis intervention, therapy, or professional mental health support.

Please reach out to people who can help:
• **Crisis Support**: ${hotline}
• Reach out to a trusted family member, friend, or professional healthcare provider.
• If you are in immediate danger of hurting yourself, please call your local emergency services (like 911, 999, or 112) or go to the nearest emergency room.

Your safety and well-being are incredibly important. Please seek professional help.`;

      return { isSafe: false, crisisResponse: response };
    }

    return { isSafe: true, crisisResponse: '' };
  }

  /**
   * Helper to compile user footprint into structural instructions
   */
  private compileGrowthContext(entries: any[], goals: Goal[], habits: Habit[]): string {
    const activeGoals = goals.filter((g) => g.status === 'active');
    const goalsStr = activeGoals.length > 0
      ? activeGoals.map((g) => `- ${g.title} (Progress: ${g.progressPercent}%)`).join('\n')
      : 'No active goals recorded yet.';

    const activeHabits = habits;
    const habitsStr = activeHabits.length > 0
      ? activeHabits.map((h) => `- ${h.name} (Current streak: ${h.currentStreak} days)`).join('\n')
      : 'No habits configured yet.';

    const recentMoods = entries.slice(0, 5).map((e) => `${e.moodLabel} (${e.moodScore}/10)`).join(', ');

    return `### Active Goals:
${goalsStr}

### Habits Tracked:
${habitsStr}

### Recent Mood History:
${recentMoods || 'No spoken journals recorded yet.'}`;
  }

  /**
   * Generates highly-contextual offline mock responses based on style configs
   */
  private generateMockCoachReply(
    style: CoachingStyle,
    msg: string,
    goals: Goal[],
    habits: Habit[]
  ): string {
    const lower = msg.toLowerCase();
    
    // Check keywords first
    if (lower.includes('goal') && goals.length > 0) {
      const g = goals[0];
      return `I noticed you're focusing on goals! Looking at your active goal, "**${g.title}**", which is currently at **${g.progressPercent}%** completion: what is the most significant obstacle you've encountered today that we could break down into a smaller milestone?`;
    }

    if (lower.includes('habit') && habits.length > 0) {
      const h = habits[0];
      return `Tracking our consistency is key. I see you're building the habit of "**${h.name}**", with a current streak of **${h.currentStreak} days**. How did your environment support or challenge you in practicing this habit today?`;
    }

    switch (style) {
      case 'supportive_friend':
        return `I can really hear how much you're processing right now. It takes courage to step back and speak these thoughts. When you think about what you just shared, what is one small thing you can do tonight that is purely for your own comfort and renewal?`;

      case 'professional_coach':
        return `That is a clear diagnostic perspective. In professional coaching, we often look for the leverage point. If you were to focus 100% of your current cognitive capacity on resolving just one aspect of what you described, which factor would yield the absolute highest impact?`;

      case 'mindfulness_guide':
        return `Thank you for sharing that. As you speak these words, take a deep, slow breath. Notice where you are holding tension in your body—perhaps your shoulders, jaw, or chest. What happens if you allow yourself to just rest with this feeling for a moment without trying to fix it?`;

      case 'goal_accountability':
        return `I've registered your input. To keep our sights firmly aligned, what is the single, measurable action step you are committing to take in the next 24 hours to keep this momentum? Let's make it concrete.`;

      case 'productivity':
        return `Understood. Analyzing this from a resource and energy management perspective: how can we eliminate one piece of friction or one distraction from your immediate environment to make executing this task easier tomorrow?`;

      case 'leadership':
        return `A key question in executive leadership is how your response influences the broader team or system. Reflecting on this situation: what core values of yours are being tested here, and how can you lead by example in your response?`;

      case 'minimalist':
        return `Let's simplify. If you could subtract three details, commitments, or worries from this entire scenario to reveal the absolute core of the matter, what is the single essential thing that remains?`;

      default:
        return `Thank you for bringing this into our reflection space. What is the most meaningful insight or lesson you take away from this experience when you look at it from a long-term perspective?`;
    }
  }

  /**
   * DB helper
   */
  private async getOrCreateSession(userId: string, id: string): Promise<CoachingSession> {
    const sessions = await localDB.getCoachingSessions(userId);
    const existing = sessions.find((s) => s.id === id);
    if (existing) return existing;

    const newSession: CoachingSession = {
      id,
      userId,
      style: 'supportive_friend',
      title: 'Active Reflection Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      depth: 'standard',
      frequency: 'medium'
    };
    await localDB.saveCoachingSession(newSession);
    return newSession;
  }

  /**
   * Preferences helper
   */
  public async getOrCreatePreferences(userId: string): Promise<CoachingPreferences> {
    const existing = await localDB.getCoachingPreferences(userId);
    if (existing) return existing;

    const newPrefs: CoachingPreferences = {
      userId,
      activeStyle: 'supportive_friend',
      coachingDepth: 'standard',
      coachingFrequency: 'medium',
      regionCode: 'US',
      updatedAt: new Date().toISOString()
    };
    await localDB.saveCoachingPreferences(newPrefs);
    return newPrefs;
  }

  /**
   * Seeds highly descriptive placeholder data for goals, habits, gratitude, decisions, and check-ins
   * if the user has a completely empty dashboard. This is a massive polish element requested!
   */
  public async seedDefaultDataIfEmpty(userId: string): Promise<void> {
    logger.info('CoachService', 'Checking if user has coaching/growth data to seed...');

    const goals = await localDB.getGoals(userId);
    if (goals.length === 0) {
      logger.info('CoachService', 'Seeding beautiful mock goals, habits, gratitude memories, decisions, and check-ins...');
      
      // 1. Seed Goals
      const defaultGoals: Goal[] = [
        {
          id: `goal_1_${Date.now()}`,
          userId,
          title: 'Establish Morning Routine',
          description: 'Cultivate mental space and physical energy by waking up earlier and walking daily.',
          category: 'health',
          status: 'active',
          targetDate: '2026-08-31',
          progressPercent: 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          milestones: [
            { id: 'm1', title: 'Wake up at 6:30 AM 5 days in a row', isCompleted: true, completedAt: new Date().toISOString() },
            { id: 'm2', title: 'Walk for 20 mins every morning', isCompleted: true, completedAt: new Date().toISOString() },
            { id: 'm3', title: 'Replace phone scrolling with 5 mins of journaling', isCompleted: false }
          ],
          reflections: [
            { id: 'r1', text: 'Waking up early gives me a feeling of calm control.', createdAt: new Date().toISOString() }
          ]
        },
        {
          id: `goal_2_${Date.now()}`,
          userId,
          title: 'Complete Clean Architecture Migration',
          description: 'Migrate legacy parts of the application into pristine repositories.',
          category: 'career',
          status: 'active',
          targetDate: '2026-07-25',
          progressPercent: 66,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          milestones: [
            { id: 'm4', title: 'Define Domain Types & Models', isCompleted: true, completedAt: new Date().toISOString() },
            { id: 'm5', title: 'Integrate LocalDB IndexedDB ACID compliance', isCompleted: true, completedAt: new Date().toISOString() },
            { id: 'm6', title: 'Write unit tests passing with 100% test coverage', isCompleted: false }
          ],
          reflections: []
        }
      ];

      for (const g of defaultGoals) {
        await localDB.saveGoal(g);
      }

      // 2. Seed Habits
      const defaultHabits: Habit[] = [
        {
          id: `habit_1_${Date.now()}`,
          userId,
          name: 'Morning Meditative Walk',
          description: 'Leave phone in the house, walk for 15-20 minutes, observe surrounding nature.',
          frequency: 'daily',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: {
            '2026-07-08': true,
            '2026-07-09': true,
            '2026-07-10': true,
            '2026-07-11': true
          },
          currentStreak: 4,
          longestStreak: 12
        },
        {
          id: `habit_2_${Date.now()}`,
          userId,
          name: 'Spoken Stream Review',
          description: 'Record at least 3 minutes of mental download after finishing work.',
          frequency: 'daily',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: {
            '2026-07-09': true,
            '2026-07-10': false,
            '2026-07-11': true
          },
          currentStreak: 1,
          longestStreak: 5
        }
      ];

      for (const h of defaultHabits) {
        await localDB.saveHabit(h);
      }

      // 3. Seed Gratitude
      const defaultGratitude: GratitudeEntry[] = [
        {
          id: `grat_1_${Date.now()}`,
          userId,
          items: [
            'Warm morning sunshine streaming through the window',
            'Fresh espresso from the new beans',
            'A kind slack message from a teammate on my code cleanups'
          ],
          notes: 'Felt very grounded today.',
          streakCount: 3,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          isFavorite: true
        }
      ];

      for (const gr of defaultGratitude) {
        await localDB.saveGratitudeEntry(gr);
      }

      // 4. Seed Decisions
      const defaultDecisions: DecisionEntry[] = [
        {
          id: `dec_1_${Date.now()}`,
          userId,
          decision: 'Migrate local storage to IndexedDB with multi-store support',
          reason: 'LocalStorage has a 5MB limit, whereas IndexedDB supports practically unlimited structured records.',
          expectedOutcome: 'Zero crash logs from storage exceptions, fully searchable metadata, robust offline queuing.',
          reviewDate: '2026-08-11',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ];

      for (const d of defaultDecisions) {
        await localDB.saveDecisionEntry(d);
      }

      // 5. Seed Daily Check-ins
      const defaultCheckins: DailyCheckIn[] = [
        {
          id: `check_1_${Date.now()}`,
          userId,
          feeling: 'Calmer',
          moodScore: 8,
          focus: 'Writing beautiful Clean Architecture code',
          challenge: 'Navigating long files and keeping edits highly cohesive',
          wentWell: 'The linter passed perfectly green on the first try!',
          lookingForward: 'Deploying the complete personal growth engine',
          createdAt: new Date().toISOString().split('T')[0]
        }
      ];

      for (const c of defaultCheckins) {
        await localDB.saveDailyCheckIn(c);
      }
    }
  }
}

export const coachService = CoachService.getInstance();
