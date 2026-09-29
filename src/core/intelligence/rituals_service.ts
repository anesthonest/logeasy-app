/**
 * LogEasy Daily Life Rituals & Calm Recognition Service (Feature Two)
 * Coordinates gentle Morning and Evening life rituals, intention anchoring,
 * and calm micro-rewards without manipulative streaks or shame mechanics.
 */

import { localDB, LocalJournalEntry } from '../database/local_db';
import { logger } from '../analytics/logger';

export interface MorningRitual {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  energyLevel: number; // 1 to 10
  dailyIntention: string;
  gratitudeThought?: string;
  focusGoal?: string;
  audioNoteUrl?: string;
  completedAt: string;
}

export interface EveningRitual {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  howDayFelt: string;
  meaningfulMoment: string;
  difficultMoment?: string;
  lessonLearned?: string;
  unfinishedThought?: string;
  tomorrowIntention?: string;
  completedAt: string;
}

export interface CalmRecognition {
  id: string;
  type: 'returning' | 'space_for_reflection' | 'meaningful_capture' | 'self_understanding' | 'calm_presence';
  title: string;
  message: string;
  timestamp: string;
}

class RitualsService {
  private static instance: RitualsService;

  private constructor() {}

  public static getInstance(): RitualsService {
    if (!RitualsService.instance) {
      RitualsService.instance = new RitualsService();
    }
    return RitualsService.instance;
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  public getSavedMorningRitual(userId: string): MorningRitual | null {
    const raw = localStorage.getItem(`morning_ritual_${userId}_${this.getTodayString()}`);
    return raw ? JSON.parse(raw) : null;
  }

  public saveMorningRitual(userId: string, data: Omit<MorningRitual, 'id' | 'userId' | 'date' | 'completedAt'>): MorningRitual {
    const today = this.getTodayString();
    const ritual: MorningRitual = {
      id: `m_rit_${today}_${userId}`,
      userId,
      date: today,
      ...data,
      completedAt: new Date().toISOString()
    };
    localStorage.setItem(`morning_ritual_${userId}_${today}`, JSON.stringify(ritual));
    logger.info('RitualsService', `Morning ritual saved for ${today}`);

    // If an intention was provided, also save as an encrypted micro-journal entry
    if (data.dailyIntention.trim()) {
      const entry: LocalJournalEntry = {
        id: `entry_m_rit_${Date.now()}`,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: `Morning Intention (${today})`,
        transcript: `Morning Reflection: ${data.dailyIntention}${data.gratitudeThought ? ` | Gratitude: ${data.gratitudeThought}` : ''}`,
        audioDuration: 0,
        moodScore: data.energyLevel,
        moodLabel: data.energyLevel >= 7 ? 'Energized' : 'Calm',
        categories: ['Daily Rituals', 'Morning Intention'],
        tags: ['ritual', 'morning', 'intention'],
        colorTags: [{ name: 'Morning Ritual', color: '#06b6d4' }],
        syncStatus: 'pending_create'
      };
      localDB.saveJournalEntry(entry).catch(err => logger.error('RitualsService', 'Failed saving ritual entry', err));
    }

    return ritual;
  }

  public getSavedEveningRitual(userId: string): EveningRitual | null {
    const raw = localStorage.getItem(`evening_ritual_${userId}_${this.getTodayString()}`);
    return raw ? JSON.parse(raw) : null;
  }

  public saveEveningRitual(userId: string, data: Omit<EveningRitual, 'id' | 'userId' | 'date' | 'completedAt'>): EveningRitual {
    const today = this.getTodayString();
    const ritual: EveningRitual = {
      id: `e_rit_${today}_${userId}`,
      userId,
      date: today,
      ...data,
      completedAt: new Date().toISOString()
    };
    localStorage.setItem(`evening_ritual_${userId}_${today}`, JSON.stringify(ritual));
    logger.info('RitualsService', `Evening ritual saved for ${today}`);

    // Save as an encrypted micro-journal entry
    const entry: LocalJournalEntry = {
      id: `entry_e_rit_${Date.now()}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: `Evening Reflection (${today})`,
      transcript: `Day Feeling: ${data.howDayFelt}\nMeaningful Moment: ${data.meaningfulMoment}${data.lessonLearned ? `\nLesson: ${data.lessonLearned}` : ''}`,
      audioDuration: 0,
      moodScore: 8,
      moodLabel: 'Reflective',
      categories: ['Daily Rituals', 'Evening Reflection'],
      tags: ['ritual', 'evening', 'reflection'],
      colorTags: [{ name: 'Evening Reflection', color: '#8b5cf6' }],
      syncStatus: 'pending_create'
    };
    localDB.saveJournalEntry(entry).catch(err => logger.error('RitualsService', 'Failed saving ritual entry', err));

    return ritual;
  }

  /**
   * Generates calm micro-rewards acknowledging presence and returning,
   * completely avoiding toxic streak-breaking shame.
   */
  public getCalmRecognition(entries: LocalJournalEntry[]): CalmRecognition {
    if (entries.length === 0) {
      return {
        id: 'rec_first_step',
        type: 'calm_presence',
        title: 'Making Space For Yourself',
        message: 'Your sanctuary is ready whenever you feel called to capture a thought.',
        timestamp: new Date().toISOString()
      };
    }

    const now = Date.now();
    const latestTime = new Date(entries[0].createdAt).getTime();
    const daysSinceLast = (now - latestTime) / (1000 * 60 * 60 * 24);

    if (daysSinceLast > 3 && daysSinceLast < 30) {
      return {
        id: 'rec_return',
        type: 'returning',
        title: 'Returning Without Pressure',
        message: "You came back to your thoughts after a break. That is completely natural.",
        timestamp: new Date().toISOString()
      };
    }

    if (entries.length >= 5) {
      return {
        id: 'rec_space',
        type: 'space_for_reflection',
        title: 'Cultivating Self-Awareness',
        message: 'You have been making space for honest reflection lately. Your thoughts are safe here.',
        timestamp: new Date().toISOString()
      };
    }

    return {
      id: 'rec_growth',
      type: 'meaningful_capture',
      title: 'A Life Remembered With Care',
      message: 'Every vocal thought captured is a gift to your future self.',
      timestamp: new Date().toISOString()
    };
  }
}

export const ritualsService = RitualsService.getInstance();
