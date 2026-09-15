/**
 * LogEasy AI Intelligence Engine Types
 * Follows Clean Architecture conventions.
 */

export interface AIMemory {
  id: string;
  userId: string;
  category: 'person' | 'place' | 'project' | 'goal' | 'habit' | 'health' | 'finance' | 'travel' | 'milestone' | 'preference' | 'other';
  keyName: string; // e.g. "John Doe", "Project Alpha", "Gym Routine"
  detail: string;
  confidence: number;
  supportingEntryIds: string[];
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIEntity {
  id: string;
  userId: string;
  type: 'person' | 'place' | 'company' | 'project' | 'goal' | 'habit' | 'health' | 'event' | 'preference' | 'relationship';
  name: string;
  description: string;
  tags: string[];
  supportingEntryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AIRelationship {
  id: string;
  userId: string;
  sourceId: string; // references AIEntity.id
  targetId: string; // references AIEntity.id
  type: string; // e.g., "colleague", "spouse", "friend", "subproject_of", "part_of"
  description: string;
  supportingEntryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AIInsight {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'habit_positive' | 'habit_negative' | 'concern' | 'achievement' | 'productivity' | 'emotion' | 'relationship' | 'reflection';
  confidenceScore: number; // 1 to 100
  dateRangeStart: string;
  dateRangeEnd: string;
  reasoningSummary: string;
  evidenceCount: number;
  supportingEntryIds: string[];
  feedbackStatus: 'pending' | 'approved' | 'rejected';
  userCorrection?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AISummary {
  id: string;
  userId: string;
  scope: 'entry' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'goal' | 'project' | 'relationship';
  targetId?: string; // references entryId or entityId
  title: string;
  content: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  supportingEntryIds: string[];
  createdAt: string;
}

export interface AITask {
  id: string;
  userId: string;
  action: 'analyze_entry' | 'update_knowledge_graph' | 'generate_weekly_insights' | 'semantic_search';
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AISemanticQueryResult {
  query: string;
  summary: string;
  relevanceScore: number;
  matchingEntities: AIEntity[];
  matchingInsights: AIInsight[];
  matchingEntryIds: string[];
  reasoning: string;
}
