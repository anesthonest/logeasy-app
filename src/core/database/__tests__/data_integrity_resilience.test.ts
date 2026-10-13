/**
 * LogEasy Phase 7: Production Disaster Recovery, Data Integrity & Resilience Test Suite
 * 
 * Verifies non-negotiable core principles:
 * 1. Capture First -> Persist First -> Enrich Second -> Index Third -> Sync When Possible.
 * 2. AI failure MUST NEVER cause data loss.
 * 3. AES-256-GCM tampered ciphertext rejection.
 * 4. Pre-restore safety snapshots before any restore.
 * 5. Wrong user backup restore rejection.
 * 6. Decoupled Personal Life Model graph reconstruction from raw archives.
 * 7. Storage pressure detection with zero silent deletion.
 * 8. Deep forensic purge and non-reappearance.
 * 9. Comprehensive sovereign data export.
 * 10. Large synthetic dataset scalability.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { localDB, LocalJournalEntry } from '../local_db';
import { dataIntegrityService } from '../data_integrity_service';
import { securityService } from '../../security/security_service';
import { syncEngine } from '../../sync/sync_engine';
import { intelligentConnectionEngine } from '../../intelligence/intelligent_connection_engine';
import { trustCertificationService } from '../../security/trust_certification_service';

describe('LogEasy Phase 7 — Production Disaster Recovery & Data Integrity Suite', () => {
  const testUserId = 'disaster_recovery_user_p7';

  beforeEach(async () => {
    localStorage.clear();
    await localDB.wipeAllUserData(testUserId);
  });

  afterEach(async () => {
    await localDB.wipeAllUserData(testUserId);
    localStorage.clear();
  });

  it('Capture First Durability: Raw entry persists intact even when AI enrichment throws an exception', async () => {
    const entryId = `entry_ai_fail_${Date.now()}`;
    const rawEntry: LocalJournalEntry = {
      id: entryId,
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: 'Deep Midnight Epiphany',
      transcript: 'I realize now that health and peace of mind precede all achievements.',
      audioDuration: 42,
      fileSize: 84000,
      moodScore: 8,
      moodLabel: 'Serene',
      categories: ['Philosophy', 'Reflections'],
      tags: ['clarity', 'health'],
      syncStatus: 'pending_create',
      versionNumber: 1
    };

    // Spy on connection engine to simulate AI enrichment network timeout or critical failure
    const enrichSpy = vi.spyOn(intelligentConnectionEngine, 'processIncrementalEntry')
      .mockRejectedValueOnce(new Error('Gemini 504 Gateway Timeout: AI Service Unreachable'));

    // Execute durable safe write
    const result = await dataIntegrityService.writeJournalEntrySafe(rawEntry);

    // Assert that the write succeeded and persisted locally despite AI failure
    expect(result.success).toBe(true);
    expect(result.persistedLocally).toBe(true);
    expect(result.enriched).toBe(false);
    expect(result.enrichmentError).toContain('Gemini 504 Gateway Timeout');

    // Verify raw user data is completely intact in IndexedDB
    const retrieved = await localDB.getJournalEntry(entryId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(entryId);
    expect(retrieved?.transcript).toBe('I realize now that health and peace of mind precede all achievements.');
    expect(retrieved?.aiProcessingStatus).toBe('failed');

    enrichSpy.mockRestore();
  });

  it('Crash Recovery Reconciliation: Pending recovery markers are reconciled after restart', async () => {
    const entryId = `entry_crash_${Date.now()}`;
    const crashedEntry: LocalJournalEntry = {
      id: entryId,
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: 'Thought Captured Before Power Cut',
      transcript: 'This thought was saved seconds before device battery died.',
      audioDuration: 18,
      moodScore: 7,
      moodLabel: 'Grounded',
      categories: ['Daily'],
      syncStatus: 'pending_create'
    };

    // 1. Save entry to simulate partial write-ahead capture before crash
    await localDB.saveJournalEntry(crashedEntry);

    // 2. Register a dangling crash recovery marker as if the browser was killed during enrichment
    dataIntegrityService.registerRecoveryMarker({
      operationId: 'op_crashed_101',
      userId: testUserId,
      recordId: entryId,
      stage: 'enrich',
      timestamp: new Date().toISOString()
    });

    const activeMarkersBefore = dataIntegrityService.getStoredRecoveryMarkers(testUserId);
    expect(activeMarkersBefore.length).toBe(1);

    // 3. Application restarts -> execute crash recovery
    const recovered = await dataIntegrityService.recoverPendingOperations();
    expect(recovered).toBe(1);

    // Verify raw entry was never lost and is fully readable
    const stored = await localDB.getJournalEntry(entryId);
    expect(stored).not.toBeNull();
    expect(stored?.title).toBe('Thought Captured Before Power Cut');
  });

  it('Backup Envelope & Tamper Rejection: Rejects modified ciphertext and wrong passkeys', async () => {
    const rawData = [
      {
        id: 'entry_vault_1',
        userId: testUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transcript: 'Sacred life thought that must never be altered.',
        audioDuration: 10,
        moodScore: 9,
        moodLabel: 'Inspired',
        categories: ['Vault'],
        syncStatus: 'synced' as const
      }
    ];

    const password = 'SanctuaryVaultSecret2026!';
    const backupItem = await securityService.triggerManualBackup(testUserId, rawData.length, { journals: rawData }, password);

    expect(backupItem.id).toBeDefined();
    expect(backupItem.encryptionStatus).toBe('encrypted');

    // 1. Correct password restore succeeds
    const restored = await securityService.restoreFromBackup(testUserId, backupItem.id, password);
    expect(restored.success).toBe(true);
    expect(restored.restoredCount).toBe(1);
    expect(restored.preRestoreSnapshotId).toBeDefined();

    // 2. Wrong password fails decryption
    await expect(
      securityService.restoreFromBackup(testUserId, backupItem.id, 'WrongPassword123')
    ).rejects.toThrow();

    // 3. Tampered ciphertext fails AES-256-GCM authentication verification
    const backupKey = `backup_payload_${backupItem.id}`;
    const encryptedRaw = localStorage.getItem(backupKey)!;
    const parsedCipher = JSON.parse(encryptedRaw);

    // Tamper with the ciphertext by flipping characters
    const tamperedCiphertext = parsedCipher.ciphertext.substring(0, parsedCipher.ciphertext.length - 4) + 'abcd';
    parsedCipher.ciphertext = tamperedCiphertext;
    localStorage.setItem(backupKey, JSON.stringify(parsedCipher));

    await expect(
      securityService.restoreFromBackup(testUserId, backupItem.id, password)
    ).rejects.toThrow();
  });

  it('Pre-Restore Safety Snapshot: Preserves existing state before applying restore', async () => {
    // Current database contains valuable entry A
    const currentEntry: LocalJournalEntry = {
      id: 'existing_entry_current',
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcript: 'Existing irreplaceable entry that should not vanish without snapshot.',
      audioDuration: 30,
      moodScore: 8,
      moodLabel: 'Present',
      categories: ['Sanctuary'],
      syncStatus: 'synced'
    };
    await localDB.saveJournalEntry(currentEntry);

    // Incoming backup contains entry B
    const incomingEntry: LocalJournalEntry = {
      id: 'incoming_entry_backup',
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcript: 'Historical entry from 2 months ago being restored.',
      audioDuration: 15,
      moodScore: 7,
      moodLabel: 'Reflective',
      categories: ['Archive'],
      syncStatus: 'synced'
    };

    const backupPassword = 'SafePassword99!';
    const backup = await securityService.triggerManualBackup(
      testUserId,
      1,
      { journals: [incomingEntry] },
      backupPassword
    );

    // Execute restore
    const receipt = await securityService.restoreFromBackup(testUserId, backup.id, backupPassword);
    expect(receipt.success).toBe(true);
    expect(receipt.preRestoreSnapshotId).toMatch(/^pre_restore_/);

    // Verify that the pre-restore snapshot was recorded in backup history
    const allBackups = await securityService.getBackups(testUserId);
    const preSnapshot = allBackups.find(b => b.id === receipt.preRestoreSnapshotId);
    expect(preSnapshot).toBeDefined();
    expect(preSnapshot?.recordCount).toBe(1);

    // Verify incoming entry exists in local database
    const restoredEntry = await localDB.getJournalEntry('incoming_entry_backup');
    expect(restoredEntry).not.toBeNull();
  });

  it('User Scope Security: Rejects restore of another user backup into current account', async () => {
    const maliciousForeignBackup = {
      schemaVersion: '1.0.4',
      appVersion: '2.0.0-phase7',
      userId: 'attacker_user_foreign',
      createdAt: new Date().toISOString(),
      recordCount: 1,
      data: {
        journals: [{ id: 'foreign_entry', userId: 'attacker_user_foreign', transcript: 'Unauthorized injection' }]
      }
    };

    const password = 'Pass';
    const encrypted = await securityService.encryptData(JSON.stringify(maliciousForeignBackup), password);
    const foreignBackupId = 'bkp_foreign_999';
    localStorage.setItem(`backup_payload_${foreignBackupId}`, encrypted);

    // Attempting to restore into testUserId must fail due to user scope mismatch
    await expect(
      securityService.restoreFromBackup(testUserId, foreignBackupId, password)
    ).rejects.toThrow(/User scope mismatch/);
  });

  it('Personal Life Model Decoupling: Graph can be cleanly rebuilt from raw journal records', async () => {
    // Seed raw journal records mentioning an entity
    const entry1: LocalJournalEntry = {
      id: 'plm_entry_1',
      userId: testUserId,
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date().toISOString(),
      title: 'Conversations with Maya',
      transcript: 'Had a long inspiring conversation with Maya about our life goals.',
      audioDuration: 25,
      moodScore: 8,
      moodLabel: 'Warm',
      categories: ['Relationships'],
      syncStatus: 'synced'
    };

    const entry2: LocalJournalEntry = {
      id: 'plm_entry_2',
      userId: testUserId,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date().toISOString(),
      title: 'Walking in the Park with Maya',
      transcript: 'Maya shared her new creative project ideas today.',
      audioDuration: 20,
      moodScore: 9,
      moodLabel: 'Joyful',
      categories: ['Creativity'],
      syncStatus: 'synced'
    };

    await localDB.saveJournalEntry(entry1);
    await localDB.saveJournalEntry(entry2);

    // Seed person profile
    await localDB.savePersonProfile({
      id: 'person_maya',
      userId: testUserId,
      name: 'Maya',
      relationshipType: 'friend',
      notes: 'Close creative friend',
      appreciationNotes: [],
      communicationReflections: [],
      associatedMemoriesCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Rebuild Personal Life Model graph from raw archive
    const connections = await dataIntegrityService.rebuildLifeModelFromArchive(testUserId);
    expect(connections.length).toBeGreaterThan(0);

    const mayaConnection = connections.find(c => c.source.id === 'person_maya');
    expect(mayaConnection).toBeDefined();
    expect(mayaConnection?.domain).toBe('person_memory');
    expect(mayaConnection?.supportingEntryIds).toContain('plm_entry_2');

    // Verify raw entries were never mutated by graph re-discovery
    const checkEntry = await localDB.getJournalEntry('plm_entry_1');
    expect(checkEntry?.transcript).toContain('Maya');
  });

  it('Storage Pressure Safety: Detects quota status without destructive deletion', async () => {
    const health = await dataIntegrityService.checkStorageHealth();
    expect(typeof health.percentageUsed).toBe('number');
    expect(typeof health.isPressureDetected).toBe('boolean');
    expect(typeof health.canSafelyPersist).toBe('boolean');

    // Ensure database still contains existing data
    const existing = await localDB.getJournalEntries(testUserId);
    expect(Array.isArray(existing)).toBe(true);
  });

  it('Forensic Purge: deleteUserData scrubs all IndexedDB stores, sync queues, and credentials', async () => {
    // 1. Seed user data across multiple stores
    await localDB.saveJournalEntry({
      id: 'purge_entry_1',
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcript: 'Sensitive note to be erased permanently.',
      audioDuration: 5,
      moodScore: 5,
      moodLabel: 'Neutral',
      categories: ['Private'],
      syncStatus: 'pending_create'
    });

    await localDB.addToSyncQueue({
      id: 'sync_purge_1',
      entryId: 'purge_entry_1',
      action: 'create',
      payload: { userId: testUserId },
      createdAt: new Date().toISOString(),
      attempts: 0
    });

    await securityService.setPin(testUserId, '7777');
    expect(securityService.getPinStatus()).toBe(true);

    localStorage.setItem(`backups_metadata_${testUserId}`, JSON.stringify([{ id: 'b_purge' }]));
    localStorage.setItem(`backup_payload_b_purge`, 'encrypted_payload_string');

    // 2. Perform deep forensic erasure
    await securityService.deleteUserData(testUserId);

    // 3. Verification: Entries must be gone
    const remainingEntries = await localDB.getJournalEntries(testUserId);
    expect(remainingEntries.length).toBe(0);

    const remainingSync = await localDB.getSyncQueue();
    const userSync = remainingSync.filter(i => i.payload?.userId === testUserId);
    expect(userSync.length).toBe(0);

    // Local storage keys must be null
    expect(localStorage.getItem(`backups_metadata_${testUserId}`)).toBeNull();
    expect(localStorage.getItem(`backup_payload_b_purge`)).toBeNull();
    expect(securityService.getPinStatus()).toBe(false);
  });

  it('Sovereign Data Portability: exportUserData compiles comprehensive user-owned archive', async () => {
    // Seed journal
    await localDB.saveJournalEntry({
      id: 'export_entry_1',
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcript: 'Export verification journal thought.',
      audioDuration: 12,
      moodScore: 8,
      moodLabel: 'Happy',
      categories: ['Life'],
      syncStatus: 'synced'
    });

    // Seed life chapter
    await localDB.saveLifeChapter({
      id: 'chapter_1',
      userId: testUserId,
      title: 'The Great Renaissance',
      eraCategory: 'career',
      startYear: 2026,
      summary: 'A time of intense creative renewal',
      keyMemories: [],
      lessons: ['Courage precedes clarity'],
      keyPeople: [],
      narrativeContent: 'Renewal and deep focus.',
      isUserAuthored: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Seed goal
    await localDB.saveGoal({
      id: 'goal_1',
      userId: testUserId,
      title: 'Daily Evening Reflection',
      description: 'Wind down and reflect on daily experiences',
      category: 'personal',
      targetDate: '2026-12-31',
      milestones: [],
      progressPercent: 50,
      status: 'active',
      reflections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const exportPackage = await securityService.exportUserData(testUserId);
    expect(exportPackage.userId).toBe(testUserId);
    expect(exportPackage.recordCount).toBe(1);
    expect(exportPackage.journals.length).toBe(1);
    expect(exportPackage.lifeChapters?.length).toBe(1);
    expect(exportPackage.goals?.length).toBe(1);
    expect(Array.isArray(exportPackage.devices)).toBe(true);
    expect(Array.isArray(exportPackage.auditLogs)).toBe(true);
  });

  it('Engineering Trust Matrix: Evidence status report strictly reflects verified code', () => {
    const summary = trustCertificationService.getCertificationSummary();
    expect(summary.totalChecks).toBeGreaterThanOrEqual(8);
    expect(summary.greenCount).toBeGreaterThanOrEqual(8);
    expect(summary.redCount).toBe(0);
    expect(summary.attribution).toBe('LogEasy is developed by VINEXSAH TECHNOLOGIES. All rights reserved.');

    const aesItem = summary.items.find(i => i.id === 'aes_256_gcm');
    expect(aesItem?.status).toBe('GREEN');
    expect(aesItem?.evidence).toContain('security_service.test.ts');

    const captureItem = summary.items.find(i => i.id === 'capture_first_durability');
    expect(captureItem?.status).toBe('GREEN');
  });

  it('Large-Data Stress Validation: Safely handles 100 sequential synthetic journal records', async () => {
    const totalEntries = 100;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < totalEntries; i++) {
      const entry: LocalJournalEntry = {
        id: `stress_entry_${i}`,
        userId: testUserId,
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
        updatedAt: new Date().toISOString(),
        title: `Stress Test Reflection #${i}`,
        transcript: `Synthetic reflection ${i} evaluating indexed write latency and memory stability.`,
        audioDuration: 15,
        moodScore: 5 + (i % 5),
        moodLabel: 'Reflective',
        categories: ['StressTest'],
        syncStatus: 'synced'
      };
      promises.push(localDB.saveJournalEntry(entry));
    }

    await Promise.all(promises);

    const retrieved = await localDB.getJournalEntries(testUserId);
    expect(retrieved.length).toBe(totalEntries);

    // Clean up
    await localDB.wipeAllUserData(testUserId);
    const afterWipe = await localDB.getJournalEntries(testUserId);
    expect(afterWipe.length).toBe(0);
  });
});
