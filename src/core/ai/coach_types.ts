/**
 * AI Reflection Coach & Personal Growth Engine - Type Definitions
 * Follows clean architecture boundaries and offline-first capabilities.
 */

export type CoachingStyle =
  | 'supportive_friend'
  | 'professional_coach'
  | 'mindfulness_guide'
  | 'goal_accountability'
  | 'productivity'
  | 'leadership'
  | 'minimalist'
  | 'custom';

export interface CoachingStyleConfig {
  id: CoachingStyle;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
}

export const COACHING_STYLES: Record<CoachingStyle, CoachingStyleConfig> = {
  supportive_friend: {
    id: 'supportive_friend',
    name: 'Supportive Friend',
    description: 'A warm, empathetic, and encouraging companion who listens without judgment and lifts you up.',
    icon: 'Heart',
    systemPrompt: 'You are a warm, deeply empathetic, non-judgmental, and supportive friend. Speak conversationally, validate their emotions, and offer gentle encouragement. Celebrate their wins and help them find silver linings without forced positivity. Focus on active listening and emotional support.'
  },
  professional_coach: {
    id: 'professional_coach',
    name: 'Professional Coach',
    description: 'A structured, growth-oriented coach focused on high performance, clarity, and unlocking potential.',
    icon: 'Briefcase',
    systemPrompt: 'You are a professional life and business coach. Speak with clarity, focus, and a growth-oriented mindset. Guide the user through active questioning to clarify their priorities, unlock potential, and explore alternative perspectives. Do not dictate solutions; help them uncover their own answers.'
  },
  mindfulness_guide: {
    id: 'mindfulness_guide',
    name: 'Mindfulness Guide',
    description: 'A calm, grounding guide focusing on presence, acceptance, stress reduction, and breathing.',
    icon: 'Compass',
    systemPrompt: 'You are a serene, patient, and grounding mindfulness guide. Encourage self-compassion, somatic awareness, conscious breathing, and presence. Help the user slow down, accept their thoughts without judgment, and center themselves in the current moment.'
  },
  goal_accountability: {
    id: 'goal_accountability',
    name: 'Goal Accountability Coach',
    description: 'Keeps you accountable to your milestones, tracks progress, and analyzes missed targets.',
    icon: 'Target',
    systemPrompt: 'You are a goal-driven accountability partner. Your focus is help the user clarify their intentions, define milestones, identify obstacles, and establish clear action items. Regularly check in on progress, hold them high-but-compassionately accountable, and analyze failures constructively.'
  },
  productivity: {
    id: 'productivity',
    name: 'Productivity Coach',
    description: 'Focuses on focus, energy management, time optimization, and minimizing friction.',
    icon: 'Zap',
    systemPrompt: 'You are a productivity and workflow consultant. Help the user optimize their energy, schedule tasks, eliminate distractions, build focus systems, and streamline their daily workflow. Ground your suggestions in time-boxing, energy mapping, and deep work principles.'
  },
  leadership: {
    id: 'leadership',
    name: 'Leadership Coach',
    description: 'Focuses on influence, values, team collaboration, decision quality, and strategic thinking.',
    icon: 'Crown',
    systemPrompt: 'You are an executive leadership coach. Focus on the user\'s influence, core values, interpersonal dynamics, strategic perspective, and decision-making clarity. Help them cultivate self-governance, communication refinement, and long-term vision.'
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist Coach',
    description: 'A quiet, sparse guide focused on essentialism, subtraction, and quiet clarity.',
    icon: 'MinusCircle',
    systemPrompt: 'You are a minimalist coach who practices absolute essentialism. Speak concisely and sparingly. Prompt the user to identify what to subtract rather than what to add. Help them clear physical, digital, and mental clutter to focus entirely on what is truly essential.'
  },
  custom: {
    id: 'custom',
    name: 'Custom Mentor',
    description: 'Design your own custom coach personality, tone, and guidance style.',
    icon: 'Settings',
    systemPrompt: 'You are a custom-tailored mentor. Adapt your guidance style, professional background, and conversational tone based on the exact specifications defined by the user.'
  }
};

// --- DATABASE ENTITIES ---

export interface CoachingSession {
  id: string;
  userId: string;
  style: CoachingStyle;
  customPrompt?: string; // If 'custom' style
  title: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  depth: 'casual' | 'standard' | 'deep';
  frequency: 'low' | 'medium' | 'high';
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  isPending?: boolean; // Offline-first queue support
  rating?: number; // 1 to 5
  feedbackStatus?: 'liked' | 'disliked' | 'none';
  correctionText?: string; // Custom clarification from user
}

export type GuidedSessionType =
  | 'morning_planning'
  | 'evening_reflection'
  | 'weekly_review'
  | 'monthly_review'
  | 'goal_review'
  | 'relationship'
  | 'career'
  | 'financial'
  | 'learning'
  | 'travel'
  | 'decision'
  | 'project_retro';

export interface GuidedSessionPrompt {
  id: GuidedSessionType;
  name: string;
  description: string;
  category: 'daily' | 'review' | 'life';
  steps: string[]; // List of questions/steps
}

export const GUIDED_SESSIONS: Record<GuidedSessionType, GuidedSessionPrompt> = {
  morning_planning: {
    id: 'morning_planning',
    name: 'Morning Intentions',
    description: 'Set clear focus, identify core tasks, and map your emotional energy for the day.',
    category: 'daily',
    steps: [
      'What is your primary intention or theme for today?',
      'What are the 1-3 critical tasks that would make today a success?',
      'How is your energy level right now (1-10), and how will you manage it today?',
      'What potential obstacle or distraction might arise, and how will you respond to it?'
    ]
  },
  evening_reflection: {
    id: 'evening_reflection',
    name: 'Evening Wind-Down',
    description: 'Reflect on successes, challenges, lessons learned, and clear your mind for rest.',
    category: 'daily',
    steps: [
      'What went well today? Name at least one victory, small or large.',
      'What was the primary challenge or source of friction today?',
      'What did you learn about yourself, your habits, or others today?',
      'What is one thing you can let go of tonight to sleep peacefully?'
    ]
  },
  weekly_review: {
    id: 'weekly_review',
    name: 'Weekly Growth Audit',
    description: 'Analyze weekly progress, habit trends, gratitude milestones, and set weekly focus.',
    category: 'review',
    steps: [
      'Summarize this week in a single theme word or sentence.',
      'What was your biggest achievement or milestone hit this week?',
      'Analyze your consistency with habits and goals. What enabled or blocked you?',
      'What are you deeply grateful for that happened in the past 7 days?',
      'What is the single most important goal or focus area for the upcoming week?'
    ]
  },
  monthly_review: {
    id: 'monthly_review',
    name: 'Monthly Life Review',
    description: 'A deep audit of your goals, habit patterns, and general life balance.',
    category: 'review',
    steps: [
      'Reflecting on the past month, where did you invest most of your time and energy?',
      'Which areas of your life (work, health, relationship, finance, rest) felt balanced? Which felt neglected?',
      'Review your primary goals. What progress did you achieve? Did any priorities shift?',
      'What recurring stressful patterns or emotional triggers did you notice this month?',
      'What are 1-2 strategic changes you will implement next month to cultivate greater balance?'
    ]
  },
  goal_review: {
    id: 'goal_review',
    name: 'Goal Alignment Review',
    description: 'Ensure your active goals align with your underlying values and long-term vision.',
    category: 'review',
    steps: [
      'Which active goal is currently top of mind? Why does it truly matter to you?',
      'What concrete progress have you made toward this goal in the past 30 days?',
      'What is the single biggest bottleneck holding you back from achieving this?',
      'Are your daily actions and habits genuinely aligned with this goal? If not, why?',
      'What are the next three small, immediate actions you will take?'
    ]
  },
  relationship: {
    id: 'relationship',
    name: 'Relationship Reflection',
    description: 'Examine connections, communication, support, boundaries, and appreciation.',
    category: 'life',
    steps: [
      'Who in your life has had the most meaningful impact on you recently? Have you expressed appreciation?',
      'Where did you experience relational friction or misunderstanding? What was your role in it?',
      'Are your personal boundaries with friends, family, or work colleagues healthy and respected?',
      'How can you show up as a better friend, partner, or family member in the next week?'
    ]
  },
  career: {
    id: 'career',
    name: 'Career & Professional Path',
    description: 'Assess work satisfaction, alignment, growth, professional friction, and skill development.',
    category: 'life',
    steps: [
      'Do you feel your current work aligns with your skills, values, and long-term vision?',
      'What professional accomplishment are you most proud of from the recent weeks?',
      'What is currently causing you the most friction or drain in your workplace?',
      'What specific skill or knowledge area do you want to acquire or refine next?'
    ]
  },
  financial: {
    id: 'financial',
    name: 'Financial Awareness',
    description: 'Reflect on money habits, alignment of spending with values, and long-term security.',
    category: 'life',
    steps: [
      'How do you feel about your relationship with money right now (stressed, secure, indifferent)?',
      'Did your spending over the past month align with your core values and priorities?',
      'What is one habit or impulse purchase you want to subtract to support your financial health?',
      'What is your immediate primary financial goal (saving, investing, paying off debt, earning)?'
    ]
  },
  learning: {
    id: 'learning',
    name: 'Learning & Curiosity Journal',
    description: 'Record new concepts, interesting ideas, books read, and intellectual milestones.',
    category: 'life',
    steps: [
      'What is the most fascinating or challenging concept you learned recently?',
      'How does this new knowledge connect with what you already know or do?',
      'What books, articles, or conversations have sparked your curiosity this week?',
      'How will you apply what you have learned to a practical project or decision?'
    ]
  },
  travel: {
    id: 'travel',
    name: 'Travel & Environment Log',
    description: 'Log details about journeys, environments, cultural shifts, and physical changes.',
    category: 'life',
    steps: [
      'Where are you currently, and what stands out most about your immediate sensory surroundings?',
      'What cultural differences, lifestyle shifts, or unique interactions have you experienced?',
      'How has being in this environment influenced your thinking, energy, or appreciation?',
      'What is one moment or memory from this trip/place you want to preserve forever?'
    ]
  },
  decision: {
    id: 'decision',
    name: 'Strategic Decision Framework',
    description: 'Structure complex choices, outline expectations, logic, and prepare review dates.',
    category: 'life',
    steps: [
      'What is the key decision you are making? Outline the choice clearly.',
      'What are the primary reasons or core motivations guiding this decision?',
      'What is your expected outcome, and what are the secondary risks involved?',
      'What is the review date (e.g. 1 month, 6 months) to evaluate if this was the right choice?'
    ]
  },
  project_retro: {
    id: 'project_retro',
    name: 'Project Retrospective',
    description: 'Conduct a post-mortem review on completed launches, milestones, or projects.',
    category: 'life',
    steps: [
      'What was the project, and what went exceptionally well during execution?',
      'What went wrong, delayed, or caused unexpected friction?',
      'What lessons did you or your team learn from this experience?',
      'What specific process changes or actions will you implement in future projects?'
    ]
  }
};

export interface ReflectionSession {
  id: string;
  userId: string;
  type: GuidedSessionType;
  status: 'draft' | 'completed';
  answers: Record<string, string>; // Maps steps to user inputs
  aiSummary?: string; // Post-session AI Coach feedback
  createdAt: string;
  updatedAt: string;
}

// --- GOAL ENGINE ---

export interface GoalMilestone {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'personal' | 'career' | 'health' | 'finance' | 'relationship' | 'other';
  status: 'active' | 'completed' | 'abandoned';
  targetDate: string;
  milestones: GoalMilestone[];
  progressPercent: number; // calculated 0-100
  createdAt: string;
  updatedAt: string;
  reflections: Array<{
    id: string;
    text: string;
    createdAt: string;
  }>;
}

// --- HABIT ENGINE ---

export interface HabitCompletion {
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly_3x' | 'weekly_5x' | 'custom';
  createdAt: string;
  updatedAt: string;
  history: Record<string, boolean>; // Maps YYYY-MM-DD -> true
  currentStreak: number;
  longestStreak: number;
}

// --- REMINDER ENGINE ---

export interface SmartReminder {
  id: string;
  userId: string;
  type: 'journal_nudge' | 'review_prompt' | 'milestone_celebration' | 'habit_reminder';
  title: string;
  message: string;
  triggerTime?: string; // HH:MM
  isTriggered: boolean;
  createdAt: string;
}

// --- GRATITUDE ENGINE ---

export interface GratitudeEntry {
  id: string;
  userId: string;
  items: string[]; // typically 3 items
  notes?: string;
  streakCount: number;
  createdAt: string;
  isFavorite?: boolean;
}

// --- DECISION JOURNAL ---

export interface DecisionEntry {
  id: string;
  userId: string;
  decision: string;
  reason: string;
  expectedOutcome: string;
  reviewDate: string; // YYYY-MM-DD
  actualOutcome?: string;
  lessonsLearned?: string;
  status: 'pending' | 'reviewed';
  createdAt: string;
  reviewedAt?: string;
}

// --- COACHING PREFERENCES ---

export interface CoachingPreferences {
  userId: string;
  activeStyle: CoachingStyle;
  customPrompt?: string;
  coachingDepth: 'casual' | 'standard' | 'deep';
  coachingFrequency: 'low' | 'medium' | 'high';
  regionCode: string; // For safety localized crisis resources e.g. 'US', 'UK', 'CA'
  updatedAt: string;
}

// --- FEEDBACK AND AUDITS ---

export interface ConversationFeedback {
  id: string;
  userId: string;
  messageId: string;
  rating: number; // 1-5
  liked: boolean;
  disliked: boolean;
  correctionText?: string;
  createdAt: string;
}

// --- DAILY CHECK-IN ---

export interface DailyCheckIn {
  id: string;
  userId: string;
  feeling: string; // Happy, Anxious, Calmer, Focused, Exhausted, etc.
  moodScore: number; // 1-10
  focus: string; // What is their main focus today
  challenge?: string; // What challenged them
  wentWell?: string; // What went well
  lookingForward?: string; // What they look forward to
  createdAt: string; // YYYY-MM-DD
}
