import { localDB, LocalJournalEntry } from '../../database/local_db';
import { aiIntelligenceEngine } from '../ai_intelligence_engine';

// Simple unit tests validating the AI Intelligence Engine rule-based extractor
describe('AI Intelligence Engine - Core Logic Rules', () => {
  let mockEntry: LocalJournalEntry;

  beforeEach(() => {
    mockEntry = {
      id: 'entry_test_ai_1',
      userId: 'test_user',
      title: 'Lunch with Alice at Starbucks',
      transcript: 'Today I met with Alice at Starbucks in London. We discussed finishing our Project Alpha. I felt happy and optimistic about our roadmap!',
      audioDuration: 60,
      moodScore: 9,
      moodLabel: 'Happy',
      categories: ['Work', 'Social'],
      tags: ['alice', 'starbucks', 'london', 'work'],
      syncStatus: 'synced',
      createdAt: '2026-07-11T12:00:00.000Z',
      updatedAt: '2026-07-11T12:00:00.000Z'
    };
  });

  test('Heuristic extractor should correctly isolate names of people, locations, and project contexts from spoken journal logs', async () => {
    // Inject and save local mock entry to DB first to have evidence linked
    await localDB.saveJournalEntry(mockEntry);

    // Run local intelligence extraction Heuristics
    await aiIntelligenceEngine.analyzeJournalEntry(mockEntry, { forceLocal: true });

    // Retrieve extracted elements
    const memories = await localDB.getAIMemories('test_user');
    const entities = await localDB.getAIEntities('test_user');
    const insights = await localDB.getAIInsights('test_user');

    // Verify people matching heuristics
    const personEntity = entities.find(e => e.type === 'person' && e.name === 'Alice');
    expect(personEntity).toBeDefined();
    expect(personEntity?.supportingEntryIds).toContain('entry_test_ai_1');

    // Verify places matching heuristics
    const placeEntity = entities.find(e => e.type === 'place' && e.name === 'Starbucks');
    expect(placeEntity).toBeDefined();

    // Verify Project matching heuristics
    const projectEntity = entities.find(e => e.type === 'project' && e.name.toLowerCase().includes('project alpha'));
    expect(projectEntity).toBeDefined();

    // Verify positive mood surge insight
    const moodInsight = insights.find(i => i.category === 'achievement');
    expect(moodInsight).toBeDefined();
    expect(moodInsight?.confidenceScore).toBeGreaterThanOrEqual(90);
  });

  test('Semantic query matching should parse natural keywords and extract supporting nodes and references accurately', async () => {
    await localDB.saveJournalEntry(mockEntry);
    await aiIntelligenceEngine.analyzeJournalEntry(mockEntry, { forceLocal: true });

    // Execute semantic memory search
    const results = await aiIntelligenceEngine.performAIQuery('test_user', 'Who is Alice');

    expect(results.query).toBe('Who is Alice');
    expect(results.matchingEntities.length).toBeGreaterThanOrEqual(1);
    expect(results.matchingEntities[0].name).toBe('Alice');
    expect(results.matchingEntryIds).toContain('entry_test_ai_1');
    expect(results.summary).toContain('Alice');
  });
});
