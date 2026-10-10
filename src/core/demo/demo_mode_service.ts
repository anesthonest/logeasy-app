/**
 * LogEasy Demonstration Mode Service
 * 
 * Strict Privacy & Isolation Guarantee:
 * - Completely isolated fictional persona ("Maya Chen - Creative Strategist & Marathoner")
 * - Never touches or alters the user's real IndexedDB private vault
 * - Explicit demo tagging across all entities
 * - Allows visitors to experience the "Magic Moment" and Personal Life Model before capturing personal thoughts
 */

import { LocalJournalEntry, ColorTag } from '../database/local_db';
import { IntelligentConnection } from '../intelligence/intelligent_connection_engine';
import { logger } from '../analytics/logger';
import { productAnalytics } from '../analytics/product_analytics';

export interface DemoProfile {
  name: string;
  role: string;
  bio: string;
  entryCount: number;
  connectionsCount: number;
}

export const DEMO_PROFILE: DemoProfile = {
  name: 'Maya Chen',
  role: 'Creative Strategist & Amateur Marathoner',
  bio: 'Exploring balance between intense work sprints, morning trail runs, and long-term creative clarity.',
  entryCount: 6,
  connectionsCount: 3,
};

export const DEMO_JOURNAL_ENTRIES: LocalJournalEntry[] = [
  {
    id: 'demo_entry_1',
    userId: 'demo_maya_user',
    createdAt: '2026-09-28T07:15:00.000Z',
    updatedAt: '2026-09-28T07:15:00.000Z',
    title: 'Morning trail run and the quiet before work',
    transcript: 'Ran through the redwood trail at sunrise. Notice how much calmer my decisions are when I give myself forty minutes of silence before looking at any message. My breathing felt steady, and the morning mist grounded me completely.',
    audioDuration: 42,
    moodScore: 9,
    moodLabel: 'Energized',
    emotionLabel: 'Clarity & Renewal',
    insightsSummary: 'Physical movement in nature consistently correlates with lower afternoon anxiety.',
    categories: ['Nature & Rest', 'Habits'],
    tags: ['Running', 'Mental Health', 'Morning Ritual'],
    colorTags: [
      { name: 'Running', color: '#10b981' },
      { name: 'Mental Health', color: '#06b6d4' }
    ],
    syncStatus: 'synced',
    aiProcessingStatus: 'completed',
  },
  {
    id: 'demo_entry_2',
    userId: 'demo_maya_user',
    createdAt: '2026-10-02T19:40:00.000Z',
    updatedAt: '2026-10-02T19:40:00.000Z',
    title: 'Post-client pitch tension and letting go of control',
    transcript: 'The presentation went well, but I caught myself obsessing over one minor slide transition that lagged. Why do I anchor on the 2% flaw instead of the 98% resonance? Reminding myself: excellence does not require perfection.',
    audioDuration: 55,
    moodScore: 5,
    moodLabel: 'Reflective',
    emotionLabel: 'High Expectations',
    insightsSummary: 'Cognitive pattern: Catastrophizing minor flaws after high-stakes creative deliverables.',
    categories: ['Decisions & Future', 'Career'],
    tags: ['Work', 'Perfectionism', 'Letting Go'],
    colorTags: [
      { name: 'Work', color: '#f59e0b' },
      { name: 'Perfectionism', color: '#ec4899' }
    ],
    syncStatus: 'synced',
    aiProcessingStatus: 'completed',
  },
  {
    id: 'demo_entry_3',
    userId: 'demo_maya_user',
    createdAt: '2026-10-04T14:10:00.000Z',
    updatedAt: '2026-10-04T14:10:00.000Z',
    title: 'Sunday coffee conversation with David',
    transcript: 'David asked me what my creative work would look like if money were completely off the table. It took me five full minutes to answer. That hesitation spoke volumes. I want to build things that people cherish ten years from now, not just fast campaigns.',
    audioDuration: 64,
    moodScore: 8,
    moodLabel: 'Satisfied',
    emotionLabel: 'Long-term Purpose',
    insightsSummary: 'Deep relational conversations act as a compass re-alignment for core career values.',
    categories: ['Relationships', 'Meaning & Values'],
    tags: ['Friendship', 'Purpose', 'Values'],
    colorTags: [
      { name: 'Friendship', color: '#6366f1' },
      { name: 'Purpose', color: '#8b5cf6' }
    ],
    syncStatus: 'synced',
    aiProcessingStatus: 'completed',
  },
  {
    id: 'demo_entry_4',
    userId: 'demo_maya_user',
    createdAt: '2026-10-07T08:00:00.000Z',
    updatedAt: '2026-10-07T08:00:00.000Z',
    title: 'Gentle recovery: Missing a run without guilt',
    transcript: 'My hamstring felt tight this morning. A year ago, I would have forced myself to run 10K anyway and injured myself. Today I rolled out a yoga mat, stretched for 20 minutes, and made tea. Listening to the body is wisdom, not failure.',
    audioDuration: 38,
    moodScore: 8,
    moodLabel: 'Centered',
    emotionLabel: 'Self-Compassion',
    insightsSummary: 'Shift from punitive adherence to intuitive bodily care.',
    categories: ['Body & Rest', 'Gentle Habits'],
    tags: ['Rest', 'Compassion', 'Recovery'],
    colorTags: [
      { name: 'Rest', color: '#10b981' },
      { name: 'Compassion', color: '#06b6d4' }
    ],
    syncStatus: 'synced',
    aiProcessingStatus: 'completed',
  },
  {
    id: 'demo_entry_5',
    userId: 'demo_maya_user',
    createdAt: '2026-10-09T22:15:00.000Z',
    updatedAt: '2026-10-09T22:15:00.000Z',
    title: 'Late night quiet: What mattered this week',
    transcript: 'Closing out Friday. The week was noisy, but looking back at my spoken notes, the moments that mattered were: the morning run mist, David challenge to build for the long-term, and choosing recovery over injury. Small shifts compound.',
    audioDuration: 49,
    moodScore: 9,
    moodLabel: 'Grounded',
    emotionLabel: 'Integration & Peace',
    insightsSummary: 'Weekly synthesis reveals strong alignment between intention and physical well-being.',
    categories: ['Personal Growth', 'Life Story'],
    tags: ['Weekly Review', 'Integration'],
    colorTags: [
      { name: 'Integration', color: '#8b5cf6' }
    ],
    syncStatus: 'synced',
    aiProcessingStatus: 'completed',
  },
  {
    id: 'demo_entry_6',
    userId: 'demo_maya_user',
    createdAt: '2026-10-10T07:45:00.000Z',
    updatedAt: '2026-10-10T07:45:00.000Z',
    title: 'Saturday morning intentions for the autumn season',
    transcript: 'Setting an intention for the next three months: Protect evening wind-down time, write more long-form reflections, and keep the marathon training playful rather than rigid.',
    audioDuration: 35,
    moodScore: 8,
    moodLabel: 'Optimistic',
    emotionLabel: 'Forward Clarity',
    insightsSummary: 'Forward-looking intention setting rooted in recent recovery lessons.',
    categories: ['Decisions & Future', 'Goals'],
    tags: ['Autumn', 'Intentions', 'Marathon'],
    colorTags: [
      { name: 'Intentions', color: '#06b6d4' }
    ],
    syncStatus: 'synced',
    aiProcessingStatus: 'completed',
  }
];

export const DEMO_CONNECTIONS: IntelligentConnection[] = [
  {
    id: 'demo_conn_1',
    userId: 'demo_maya_user',
    domain: 'habit_goal',
    title: 'Trail Running correlates directly with Calm Executive Decisions',
    source: { id: 'demo_entry_1', type: 'habit', label: 'Morning Trail Run' },
    target: { id: 'demo_entry_2', type: 'experience', label: 'Executive Presentation' },
    relationshipType: 'supports_resilience',
    confidence: 0.94,
    evidence: 'Lower anxiety logged across subsequent client presentations',
    explanation: 'Whenever you log a morning run in nature (such as Sept 28), subsequent reflections on work pitches report 35% higher emotional resilience and faster recovery from stress.',
    supportingEntryIds: ['demo_entry_1', 'demo_entry_2'],
    createdAt: '2026-09-28T07:15:00.000Z',
    userStatus: 'confirmed',
  },
  {
    id: 'demo_conn_2',
    userId: 'demo_maya_user',
    domain: 'person_memory',
    title: 'Conversations with David trigger Core Purpose Re-evaluations',
    source: { id: 'person_david', type: 'person', label: 'David' },
    target: { id: 'demo_entry_3', type: 'memory', label: 'Long-term Purpose' },
    relationshipType: 'inspires_direction',
    confidence: 0.91,
    evidence: 'Multiple entries referencing long-term legacy after talks with David',
    explanation: 'Conversations with David consistently prompt reflections on long-term 10-year creative legacy rather than short-term deliverables.',
    supportingEntryIds: ['demo_entry_3', 'demo_entry_5'],
    createdAt: '2026-10-04T14:10:00.000Z',
    userStatus: 'confirmed',
  },
  {
    id: 'demo_conn_3',
    userId: 'demo_maya_user',
    domain: 'emotion_event',
    title: 'Self-Compassion breakthrough: Rest chosen over Compulsive Training',
    source: { id: 'demo_entry_4', type: 'rest', label: 'Physical Recovery' },
    target: { id: 'demo_entry_2', type: 'pattern', label: 'Burnout Prevention' },
    relationshipType: 'counters_perfectionism',
    confidence: 0.88,
    evidence: 'Intentional pause without guilt breaks 6-month perfectionist streak',
    explanation: 'On Oct 7, you opted for stretching and self-compassion instead of injury-inducing running. This marks a shift away from perfectionist burnout patterns observed in previous quarters.',
    supportingEntryIds: ['demo_entry_2', 'demo_entry_4'],
    createdAt: '2026-10-07T08:00:00.000Z',
    userStatus: 'suggested',
  }
];

class DemoModeService {
  private static instance: DemoModeService;
  private isDemoActive: boolean = false;
  private listeners: ((isActive: boolean) => void)[] = [];

  private constructor() {
    this.isDemoActive = localStorage.getItem('logeasy_demo_mode') === 'true';
  }

  public static getInstance(): DemoModeService {
    if (!DemoModeService.instance) {
      DemoModeService.instance = new DemoModeService();
    }
    return DemoModeService.instance;
  }

  public isEnabled(): boolean {
    return this.isDemoActive;
  }

  public enableDemoMode() {
    this.isDemoActive = true;
    localStorage.setItem('logeasy_demo_mode', 'true');
    logger.info('DemoModeService', 'Demonstration mode activated (Isolated Fictional Persona: Maya Chen)');
    productAnalytics.trackAction('demo_mode_activated', 'discovery');
    this.notify();
  }

  public disableDemoMode() {
    this.isDemoActive = false;
    localStorage.removeItem('logeasy_demo_mode');
    logger.info('DemoModeService', 'Demonstration mode disabled. Returned to Private Vault.');
    productAnalytics.trackAction('demo_mode_exited', 'discovery');
    this.notify();
  }

  public subscribe(listener: (isActive: boolean) => void): () => void {
    this.listeners.push(listener);
    listener(this.isDemoActive);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.isDemoActive));
  }

  public getDemoEntries(): LocalJournalEntry[] {
    return [...DEMO_JOURNAL_ENTRIES];
  }

  public getDemoConnections(): IntelligentConnection[] {
    return [...DEMO_CONNECTIONS];
  }
}

export const demoModeService = DemoModeService.getInstance();
