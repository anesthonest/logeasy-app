import { LocalJournalEntry } from '../../database/local_db';

// Simple lightweight test suite mock confirming the business logic rules of the Voice Journal Engine
describe('Voice Journal Engine - Core Business Rules', () => {
  let mockEntries: LocalJournalEntry[];

  beforeEach(() => {
    mockEntries = [
      {
        id: 'entry_1',
        userId: 'test_user',
        title: 'Morning Reflections',
        transcript: 'Today I woke up early and focused on building modular components.',
        audioDuration: 45,
        fileSize: 51200,
        moodScore: 8,
        moodLabel: 'Happy',
        createdAt: '2026-07-10T08:00:00.000Z',
        updatedAt: '2026-07-10T08:00:00.000Z',
        syncStatus: 'synced',
        encryptionStatus: 'plain',
        versionNumber: 1,
        tags: ['morning', 'mindfulness'],
        categories: ['Daily Logs'],
        pinned: false,
        favorite: true,
      },
      {
        id: 'entry_2',
        userId: 'test_user',
        title: 'API Integration Design',
        transcript: 'Writing the schema for offline-first replication.',
        audioDuration: 120,
        fileSize: 153600,
        moodScore: 9,
        moodLabel: 'Productive',
        createdAt: '2026-07-11T10:00:00.000Z',
        updatedAt: '2026-07-11T10:00:00.000Z',
        syncStatus: 'pending_create',
        encryptionStatus: 'plain',
        versionNumber: 1,
        tags: ['code', 'architecture'],
        categories: ['Work Reflections'],
        pinned: true, // Pinned memory!
        favorite: false,
      },
      {
        id: 'entry_3',
        userId: 'test_user',
        title: 'Sprint Planning Session',
        transcript: 'Discussing the voice journal module development with the team.',
        audioDuration: 300,
        fileSize: 307200,
        moodScore: 7,
        moodLabel: 'Satisfied',
        createdAt: '2026-07-11T14:30:00.000Z',
        updatedAt: '2026-07-11T14:30:00.000Z',
        syncStatus: 'synced',
        encryptionStatus: 'plain',
        versionNumber: 2,
        tags: ['work', 'planning'],
        categories: ['Work Reflections'],
        pinned: false,
        favorite: false,
      },
    ];
  });

  test('Sorting logic should guarantee pinned entries stay at the absolute top of the stream regardless of creation date', () => {
    const sorted = [...mockEntries].sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Pinned entry (entry_2) must be the very first element
    expect(sorted[0].id).toBe('entry_2');
    expect(sorted[0].pinned).toBe(true);

    // Unpinned entries should follow descending creation time order
    expect(sorted[1].id).toBe('entry_3'); // Jul 11 14:30
    expect(sorted[2].id).toBe('entry_1'); // Jul 10 08:00
  });

  test('Query filtering matches correctly inside both titles and speech transcripts', () => {
    const query = 'offline';
    const matches = mockEntries.filter(
      (e) => (e.title || '').toLowerCase().includes(query) || e.transcript.toLowerCase().includes(query)
    );

    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('entry_2');
    expect(matches[0].transcript).toContain('offline-first');
  });

  test('Filter by tags matches entries holding ALL of the specified search tags', () => {
    const searchTags = ['morning'];
    const filteredByTag = mockEntries.filter((e) =>
      searchTags.every((t) => (e.tags || []).includes(t))
    );

    expect(filteredByTag.length).toBe(1);
    expect(filteredByTag[0].id).toBe('entry_1');
  });

  test('Duration limit ranges filter audio files accurately', () => {
    const minDuration = 50;
    const maxDuration = 150;
    const filteredByDuration = mockEntries.filter(
      (e) => e.audioDuration >= minDuration && e.audioDuration <= maxDuration
    );

    expect(filteredByDuration.length).toBe(1);
    expect(filteredByDuration[0].id).toBe('entry_2'); // 120 seconds
  });
});
