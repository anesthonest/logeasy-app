/**
 * LogEasy Human Intelligence Operating System (HIOS)
 * Core Data Models across all 20 sovereign human dimensions.
 */

export interface PersonProfile {
  id: string;
  userId: string;
  name: string;
  relationshipType: 'family' | 'friend' | 'romantic' | 'mentor' | 'colleague' | 'community';
  birthday?: string;
  notes: string;
  appreciationNotes: string[];
  communicationReflections: Array<{ id: string; date: string; reflection: string }>;
  associatedMemoriesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RomanticSpace {
  id: string;
  userId: string;
  partnerName: string;
  anniversary?: string;
  sharedGoals: string[];
  gratitudeItems: string[];
  conflictReflections: Array<{ id: string; date: string; context: string; insight: string }>;
  relationshipMemories: string[];
  isPrivateEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TherapistCollaboration {
  id: string;
  userId: string;
  isEnabled: boolean;
  therapistName?: string;
  sessionPrepNotes: string[];
  preparedTopics: string[];
  selectedSummaryIds: string[];
  disclaimerAcknowledged: boolean;
  accessExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BodyObservation {
  id: string;
  userId: string;
  date: string;
  energyLevel: number; // 1 to 10
  sleepHours: number;
  sleepQuality: number; // 1 to 10
  physicalSensations: string[];
  tensionAreas: string[];
  movementNotes: string;
  appetiteNotes: string;
  environmentalNotes: string;
  notes: string;
  nonMedicalDisclaimerAcknowledged: boolean;
  createdAt: string;
}

export interface RestRecord {
  id: string;
  userId: string;
  date: string;
  restType: 'sleep' | 'quiet_time' | 'mental_decompression' | 'recreation' | 'nature_walk';
  durationMinutes: number;
  mentalLoadLevel: number; // 1 to 10
  recoveryRating: number; // 1 to 10
  notes: string;
  createdAt: string;
}

export interface CreativityWork {
  id: string;
  userId: string;
  title: string;
  category: 'writing' | 'poetry' | 'story' | 'idea' | 'sketch' | 'music_concept' | 'play_experiment';
  content: string;
  inspiration: string;
  isProductivityFree: boolean; // "Create simply because you enjoy creating"
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MeaningEntry {
  id: string;
  userId: string;
  title: string;
  category: 'belief' | 'value' | 'spiritual_practice' | 'philosophical_thought' | 'tradition' | 'existential_question' | 'purpose';
  content: string;
  reflections: string[];
  questions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LifeChapter {
  id: string;
  userId: string;
  title: string;
  eraCategory: 'childhood' | 'adolescence' | 'education' | 'career' | 'relationships' | 'achievements' | 'turning_points' | 'difficult_period' | 'current' | 'future_vision';
  startYear: number;
  endYear?: number;
  summary: string;
  keyMemories: string[];
  lessons: string[];
  keyPeople: string[];
  narrativeContent: string;
  isUserAuthored: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LetterToSelf {
  id: string;
  userId: string;
  title: string;
  recipientType: 'younger_self' | 'future_self' | 'unsent_letter' | 'gratitude_letter' | 'forgiveness_letter' | 'goodbye_letter' | 'legacy_letter';
  targetAgeOrDate?: string;
  content: string;
  isEncrypted: boolean;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForgivenessEntry {
  id: string;
  userId: string;
  subject: string;
  targetType: 'self' | 'other' | 'past_circumstance';
  narrative: string;
  resentmentLevelBefore: number; // 1 to 10
  peaceLevelAfter: number; // 1 to 10
  unsentMessage?: string;
  lessonsLearned: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GriefEntry {
  id: string;
  userId: string;
  honoredPerson: string;
  relationship: string;
  birthDate?: string;
  passingDate?: string;
  memories: string[];
  stories: string[];
  whatTheyTaughtMe: string[];
  thingsIWishICouldSay: string;
  memorialDateReminders: string[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyItem {
  id: string;
  userId: string;
  title: string;
  category: 'message' | 'family_history' | 'life_lesson' | 'core_value' | 'story' | 'instruction' | 'future_message';
  content: string;
  designatedRecipients: string[];
  accessPolicy: 'immediate' | 'future_date' | 'explicit_authorization' | 'trusted_delegate';
  releaseDate?: string;
  isCryptographicallyLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HeritageEntry {
  id: string;
  userId: string;
  title: string;
  category: 'family_story' | 'tradition' | 'language_phrase' | 'cultural_memory' | 'recipe' | 'song_saying' | 'historical_note';
  content: string;
  originPlace?: string;
  generationsPassed: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NatureEntry {
  id: string;
  userId: string;
  title: string;
  locationName: string;
  date: string;
  weatherConditions?: string;
  observations: string;
  floraFaunaSeen: string[];
  outdoorActivity: string;
  reflections: string;
  moodElevationScore: number; // 1 to 10
  createdAt: string;
}

export interface ContributionEntry {
  id: string;
  userId: string;
  title: string;
  category: 'helping_friend' | 'volunteering' | 'community' | 'mentoring' | 'environmental' | 'kindness_act';
  description: string;
  beneficiaries: string;
  impactReflection: string;
  date: string;
  createdAt: string;
}

export interface DecisionOption {
  id: string;
  title: string;
  pros: string[];
  cons: string[];
  risks: string[];
  benefits: string[];
  score?: number;
}

export interface DecisionWorkspace {
  id: string;
  userId: string;
  decisionTitle: string;
  status: 'deliberating' | 'decided' | 'reviewed';
  priorities: string[];
  constraints: string[];
  options: DecisionOption[];
  knownFacts: string[];
  assumptions: string[];
  uncertainties: string[];
  valuesAlignment: string;
  outcomeReflection?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JoySavoringEntry {
  id: string;
  userId: string;
  title: string;
  category: 'laughter' | 'beauty' | 'achievement' | 'gratitude' | 'place' | 'small_win' | 'connection';
  details: string;
  savoringDepth: number; // 1 to 10
  recurringSourceTag?: string;
  createdAt: string;
}

export interface DigitalSelfProfile {
  userId: string;
  coreValues: string[];
  recurringThemes: string[];
  declaredInterests: string[];
  lifeMotto: string;
  communicationPreferences: string;
  privacyLevel: 'strictly_local' | 'encrypted_sync';
  inspectableDataApproved: boolean;
  lastUpdated: string;
}

export interface AIMemoryProposal {
  id: string;
  userId: string;
  memoryText: string;
  inferredCategory: string;
  confidenceScore: number;
  sourceEntryId?: string;
  sourceSnippet?: string;
  status: 'pending' | 'saved' | 'edited' | 'dismissed';
  createdAt: string;
}

export interface SharedResourceRecord {
  id: string;
  ownerId: string;
  resourceType: 'memory' | 'journal' | 'chapter' | 'reflection_summary' | 'therapy_prep';
  resourceId: string;
  recipientEmail: string;
  permissions: 'read_only' | 'time_limited';
  expiresAt?: string;
  isRevoked: boolean;
  accessLog: Array<{ timestamp: string; ip: string; action: string }>;
  createdAt: string;
}

export type AgentScope = 
  | 'memory.read'
  | 'memory.write'
  | 'relationships.read'
  | 'relationships.write'
  | 'health_observation.read'
  | 'goals.read'
  | 'goals.write'
  | 'legacy.read'
  | 'legacy.write'
  | 'AI.analysis'
  | 'AI.generation'
  | 'sharing.create'
  | 'sharing.revoke';

export interface AgentActionLog {
  id: string;
  agentName: string;
  authorizedScopes: AgentScope[];
  action: string;
  sourceAttribution?: string;
  timestamp: string;
  status: 'allowed' | 'denied';
}
