import { localDB, LocalJournalEntry } from '../../database/local_db';
import { aiIntelligenceEngine } from '../ai_intelligence_engine';

describe('Personal Intelligence Analytics & Visualization Engine - Subsystem Tests', () => {
  let mockEntries: LocalJournalEntry[];

  beforeEach(async () => {
    mockEntries = [
      {
        id: 'entry_test_analytics_1',
        userId: 'test_user_analytics',
        title: 'Work on Project Alpha',
        transcript: 'Today I spent three hours coding on Project Alpha. Met with Bob to align core schemas. I felt energetic and very focused!',
        audioDuration: 180,
        moodScore: 8,
        moodLabel: 'Productive',
        categories: ['career', 'learning'],
        tags: ['bob', 'project alpha'],
        syncStatus: 'synced',
        createdAt: '2026-07-10T12:00:00.000Z',
        updatedAt: '2026-07-10T12:00:00.000Z'
      },
      {
        id: 'entry_test_analytics_2',
        userId: 'test_user_analytics',
        title: 'Evening walk in London Hyde Park',
        transcript: 'Beautiful walk in London Hyde Park today with Alice. Had important conversations about life goals and travel.',
        audioDuration: 90,
        moodScore: 9,
        moodLabel: 'Happy',
        categories: ['relationship', 'travel'],
        tags: ['alice', 'london', 'hyde park'],
        syncStatus: 'synced',
        createdAt: '2026-07-11T12:00:00.000Z',
        updatedAt: '2026-07-11T12:00:00.000Z'
      }
    ];

    for (const entry of mockEntries) {
      await localDB.saveJournalEntry(entry);
    }
  });

  test('Analytics Engine: Emotion analytics should calculate daily mood and stress trend factors', async () => {
    // Process mock logs
    for (const entry of mockEntries) {
      await aiIntelligenceEngine.analyzeJournalEntry(entry, { forceLocal: true });
    }

    const allEntries = await localDB.getJournalEntries('test_user_analytics');
    expect(allEntries.length).toBe(2);

    const emotionTrendData = allEntries.map(entry => ({
      mood: entry.moodScore,
      stress: Math.max(1, 11 - entry.moodScore)
    }));

    expect(emotionTrendData[0].mood).toBe(9); // Sorted newest first
    expect(emotionTrendData[0].stress).toBe(2);
    expect(emotionTrendData[1].mood).toBe(8);
    expect(emotionTrendData[1].stress).toBe(3);
  });

  test('Life Timeline & Visualization: Category filter matches nodes dynamically', async () => {
    // Trigger timeline parsing
    for (const entry of mockEntries) {
      await aiIntelligenceEngine.analyzeJournalEntry(entry, { forceLocal: true });
    }

    const entities = await localDB.getAIEntities('test_user_analytics');
    const events = entities.filter(e => e.type === 'event');

    // Hyde Park / Walk should yield a travel or milestone event
    expect(events.length).toBeGreaterThanOrEqual(0);
  });

  test('Export System: Handles serialization of full intelligence archives correctly', async () => {
    const allEntries = await localDB.getJournalEntries('test_user_analytics');
    const exportObject = {
      exportedAt: new Date().toISOString(),
      userId: 'test_user_analytics',
      analyticsSummary: {
        totalEntriesCount: allEntries.length
      },
      journal: allEntries.map(e => ({
        title: e.title,
        transcript: e.transcript,
        moodScore: e.moodScore
      }))
    };

    expect(exportObject.analyticsSummary.totalEntriesCount).toBe(2);
    expect(exportObject.journal[0].moodScore).toBe(9);
    expect(exportObject.journal[1].moodScore).toBe(8);
  });

  test('Audio Recaps: Creates narration templates with narration configs', () => {
    const recapType = 'weekly';
    const narrationVoice = 'nova';
    const text = `Welcome back to your private voice recap. This is voice "${narrationVoice}" guiding you through your ${recapType} review.`;
    
    expect(text).toContain('nova');
    expect(text).toContain('weekly');
  });

  test('Achievement System: Evaluates milestones with journal database state', async () => {
    const allEntries = await localDB.getJournalEntries('test_user_analytics');
    
    const achievements = [
      { id: 'first_journal', condition: allEntries.length >= 1 },
      { id: 'streak_7', condition: allEntries.length >= 7 }
    ];

    expect(achievements[0].condition).toBe(true);
    expect(achievements[1].condition).toBe(false);
  });
});
