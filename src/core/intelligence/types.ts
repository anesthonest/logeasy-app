/**
 * LogEasy Personal Life Intelligence Layer
 * Unified Type Definitions across all Personal Context, Pattern Discovery,
 * Memory Reconciliation, Temporal Intelligence, Knowledge Vault, Decision Learning,
 * and Privacy Sovereignty engines.
 */

export type ContextScope =
  | 'CURRENT_DAY'
  | 'RECENT_DAYS'
  | 'CURRENT_GOALS'
  | 'CURRENT_PROJECT'
  | 'CURRENT_RELATIONSHIP'
  | 'LIFE_CHAPTER'
  | 'LONG_TERM_MEMORY'
  | 'LEGACY'
  | 'MEANING'
  | 'BODY_AND_REST'
  | 'CREATIVE_CONTEXT'
  | 'DECISION_CONTEXT';

export interface ContextRequest {
  operationId: string;
  purpose: string;
  allowedScopes: ContextScope[];
  targetId?: string;
  timeWindow?: { start?: string; end?: string };
  maxItems?: number;
  userId: string;
}

export interface ContextSlice {
  scope: ContextScope;
  items: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    date: string;
    provenance: 'user_authored' | 'ai_inferred';
    metadata?: Record<string, any>;
  }>;
  totalAvailable: number;
}

export interface ResolvedContext {
  operationId: string;
  userId: string;
  authorizedSlices: ContextSlice[];
  redactedScopes: ContextScope[];
  resolvedAt: string;
  dataFenceTokens: string; // Anti-prompt-injection boundary token
}

export type PatternCategory =
  | 'recurring_interest'
  | 'repeated_goal'
  | 'repeated_obstacle'
  | 'recurring_joy'
  | 'stress_observation'
  | 'creative_theme'
  | 'decision_pattern'
  | 'relationship_theme'
  | 'productivity_cycle'
  | 'rest_observation'
  | 'long_term_change'
  | 'returning_idea'
  | 'abandoned_idea';

export interface PatternEvidence {
  sourceId: string;
  sourceType: 'journal' | 'memory' | 'decision' | 'experiment' | 'rest' | 'goal';
  snippet: string;
  date: string;
  relevanceScore: number;
}

export interface PatternObservation {
  id: string;
  userId: string;
  category: PatternCategory;
  title: string;
  description: string;
  supportingEvidence: PatternEvidence[];
  observationCount: number;
  timeRange: { start: string; end: string };
  confidence: 'low' | 'medium' | 'high';
  alternativeInterpretation?: string;
  userStatus: 'active' | 'acknowledged' | 'snoozed' | 'dismissed' | 'bookmarked';
  userNotes?: string;
  whyAmISeeingThis: string;
  createdAt: string;
  updatedAt: string;
}

export type ContradictionCategory =
  | 'preference'
  | 'goal'
  | 'relationship'
  | 'plan'
  | 'value'
  | 'fact'
  | 'description'
  | 'circumstance';

export interface ContradictionRecord {
  id: string;
  userId: string;
  topic: string;
  category: ContradictionCategory;
  olderVersion: {
    text: string;
    date: string;
    sourceId: string;
  };
  newerVersion: {
    text: string;
    date: string;
    sourceId: string;
  };
  status: 'detected' | 'reconciled' | 'ignored' | 'dont_ask_again';
  resolution?: 'keep_newer' | 'keep_both_historically' | 'update_both' | 'dismissed';
  resolutionDate?: string;
  userNote?: string;
  whyAmISeeingThis: string;
  createdAt: string;
}

export type TemporalStatus =
  | 'past'
  | 'present'
  | 'planned_future'
  | 'possible_future'
  | 'uncertain'
  | 'archived'
  | 'superseded';

export type MemoryState =
  | 'raw'
  | 'organized'
  | 'connected'
  | 'insight'
  | 'verified_knowledge'
  | 'archived';

export type KnowledgeCategory =
  | 'lesson'
  | 'principle'
  | 'preference'
  | 'strategy'
  | 'warning'
  | 'insight'
  | 'skill'
  | 'story';

export interface LifeKnowledgeItem {
  id: string;
  userId: string;
  type: KnowledgeCategory;
  title: string;
  content: string;
  contextTags: string[];
  lineage: {
    sourceIds: string[];
    sourceSnippets: string[];
    experimentId?: string;
    createdAt: string;
    approvedAt: string;
    isUserApproved: boolean;
    isUserAuthored: boolean;
  };
  temporalStatus: TemporalStatus;
  memoryState: MemoryState;
  isExcludedFromAI: boolean;
  whyAmISeeingThis: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonProposal {
  id: string;
  userId: string;
  sourceEntryId: string;
  sourceSnippet: string;
  suggestedLesson: string;
  suggestedType: KnowledgeCategory;
  context: string;
  status: 'pending' | 'saved' | 'edited' | 'dismissed';
  createdAt: string;
}

export interface OpportunityItem {
  id: string;
  userId: string;
  type: 'repeated_idea' | 'unused_skill' | 'unfinished_goal' | 'creative_thread';
  title: string;
  observation: string;
  suggestion: string;
  supportingCount: number;
  evidence: PatternEvidence[];
  status: 'suggested' | 'turned_into_project' | 'reviewed' | 'dismissed';
  whyAmISeeingThis: string;
  createdAt: string;
}

export interface UnfinishedItem {
  id: string;
  userId: string;
  itemType:
    | 'goal'
    | 'project'
    | 'idea'
    | 'decision'
    | 'letter'
    | 'reflection'
    | 'creative_work'
    | 'learning_topic';
  title: string;
  description: string;
  lastActivityDate: string;
  daysIdle: number;
  suggestedAction: 'continue' | 'archive' | 'delete' | 'remind_later' | 'ignore';
  status: 'open' | 'continued' | 'archived' | 'deleted' | 'reminded';
  whyAmISeeingThis: string;
}

export interface DecisionRecord {
  id: string;
  userId: string;
  title: string;
  date: string;
  options: string[];
  reasoning: string;
  evidence: string[];
  assumptions: string[];
  expectedOutcome: string;
  confidence: 'low' | 'medium' | 'high';
  alignedValues: string[];
  risks: string[];
  status: 'decided' | 'outcome_pending' | 'reviewed';
  actualOutcome?: {
    date: string;
    whatHappened: string;
    whatWasCorrect: string;
    whatWasWrong: string;
    whatWasUnexpected: string;
    lessonsLearned: string[];
  };
  learningTags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonalBriefing {
  id: string;
  userId: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  generatedAt: string;
  sections: {
    lookingBack?: { summary: string; evidenceIds: string[]; why: string };
    whatIsMoving?: { goalsProjects: string[]; why: string };
    whatNeedsAttention?: { items: string[]; why: string };
    whatYouLearned?: { lessons: string[]; why: string };
    people?: { moments: string[]; why: string };
    wellbeing?: { restBody: string[]; why: string };
    creativity?: { ideas: string[]; why: string };
    lookingForward?: { upcoming: string[]; why: string };
    reflection?: { question: string; context: string; why: string };
  };
  isAcknowledged: boolean;
}

export interface MemoryMoment {
  id: string;
  userId: string;
  title: string;
  description: string;
  dateOfOriginalEvent: string;
  yearsAgo: number;
  category: 'anniversary' | 'chapter_milestone' | 'achievement' | 'connection' | 'creative';
  sourceEntryId: string;
  snippet: string;
  whyAmISeeingThis: string;
  isDismissed?: boolean;
}

export interface ResurfacingRule {
  id: string;
  userId: string;
  isEnabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quiet';
  excludedTopicTags: string[];
  excludedPersonNames: string[];
  quietPeriodUntil?: string;
  allowSensitiveGrief: boolean;
}

export interface FutureSelfProfile {
  id: string;
  userId: string;
  horizonYears: number;
  scenarios: Array<{
    id: string;
    name: string;
    focusDimensions: Record<string, string>;
    assumedHabits: string[];
    potentialTradeOffs: string[];
    estimatedTrajectory: string;
  }>;
  notes: string;
  updatedAt: string;
}

export interface ScenarioSimulation {
  id: string;
  userId: string;
  prompt: string;
  knownInformation: string[];
  userAssumptions: string[];
  aiReasoning: string;
  uncertainties: string[];
  possibleOutcomes: string[];
  tradeOffAnalysis: string;
  createdAt: string;
}

export interface PersonalExperiment {
  id: string;
  userId: string;
  title: string;
  intention: string;
  targetDurationDays: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  dailyObservations: Array<{
    id: string;
    dayNumber: number;
    date: string;
    notes: string;
    score: number;
  }>;
  finalOutcomes?: string;
  lessonsExtracted: string[];
  whyAmISeeingThis: string;
  createdAt: string;
  updatedAt: string;
}

export interface LifeReviewRecord {
  id: string;
  userId: string;
  reviewType:
    | 'monthly'
    | 'yearly'
    | 'chapter'
    | 'project'
    | 'relationship'
    | 'personal_growth';
  periodLabel: string;
  whatHappened: string[];
  whatMattered: string[];
  whatChanged: string[];
  whatWasLearned: string[];
  whatMovedForward: string[];
  whatRemainsUnfinished: string[];
  whoMattered: string[];
  whatBroughtJoy: string[];
  whatDeservesAttention: string[];
  evidenceSnippets: string[];
  createdAt: string;
}

export interface AnnualLifeBook {
  id: string;
  userId: string;
  year: number;
  title: string;
  themeStatement: string;
  importantMemories: Array<{ title: string; date: string; snippet: string }>;
  majorEvents: string[];
  achievements: string[];
  lessons: string[];
  challengesOvercome: string[];
  keyPeople: string[];
  creativeWorks: string[];
  meaningfulQuotes: string[];
  userApproved: boolean;
  updatedAt: string;
}

export interface LifeChronicle {
  id: string;
  userId: string;
  title: string;
  compiledAt: string;
  chaptersSummary: string[];
  milestones: string[];
  keyPeople: string[];
  turningPoints: string[];
  coreLessons: string[];
  legacyDirectives: string[];
  isExportReady: boolean;
}

export type AIAccessCategory =
  | 'memory'
  | 'goals'
  | 'relationships'
  | 'body'
  | 'rest'
  | 'creativity'
  | 'meaning'
  | 'legacy'
  | 'grief'
  | 'professional'
  | 'voice'
  | 'location';

export type AIAccessLevel = 'allow' | 'limit' | 'deny';

export interface AIAccessPolicy {
  userId: string;
  categories: Record<AIAccessCategory, AIAccessLevel>;
  updatedDate: string;
}

export interface MemoryControlRecord {
  id: string;
  sourceTable: string;
  originalId: string;
  title: string;
  snippet: string;
  memoryState: MemoryState;
  isExcludedFromAI: boolean;
  isArchived: boolean;
  isMutedFromResurfacing: boolean;
  provenance: 'user_authored' | 'ai_inferred';
  createdAt: string;
  allowedFeatures: string[];
}

export interface DataPortabilityManifest {
  exportedAt: string;
  appVersion: string;
  userId: string;
  userAuthoredData: {
    journals: number;
    goals: number;
    habits: number;
    knowledgeItems: number;
    decisions: number;
    experiments: number;
    chapters: number;
    relationships: number;
  };
  aiInsightsAndInferences: {
    patterns: number;
    briefings: number;
    simulations: number;
  };
  metadata: {
    dataLineageTracked: boolean;
    cryptographicallySigned: boolean;
  };
  fullPayload: any;
}
