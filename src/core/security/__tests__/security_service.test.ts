import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach } from 'vitest';
import { securityService } from '../security_service';
import { securityManager } from '../security_manager';
import { syncEngine } from '../../sync/sync_engine';
import { LocalJournalEntry } from '../../database/local_db';

describe('LogEasy Security & Reliability Subsystem Tests', () => {
  const testUserId = 'reliability_test_user';

  beforeEach(() => {
    localStorage.clear();
  });

  test('Encryption Layer: AES symmetrical protection handles payloads correctly', () => {
    const plainText = 'Extremely private voice transcript of life goals.';
    const cipherText = securityManager.encrypt(plainText);
    
    expect(cipherText).not.toBe(plainText);
    
    const decrypted = securityManager.decrypt(cipherText);
    expect(decrypted).toBe(plainText);
  });

  test('Audit Logging: Sensitive operations trigger verified trace records', async () => {
    const log = await securityService.logOperation(
      testUserId,
      'export',
      'Encrypted JSON database export initiated'
    );

    expect(log.action).toBe('export');
    expect(log.status).toBe('success');
    expect(log.details).toContain('Encrypted JSON');

    const logs = await securityService.getAuditLogs(testUserId);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].id).toBe(log.id);
  });

  test('PIN Authentication: Validates set and verification lifecycle', async () => {
    await securityService.setPin(testUserId, '4892');
    expect(securityService.getPinStatus()).toBe(true);
    
    expect(await securityService.verifyPin('4892')).toBe(true);
    expect(await securityService.verifyPin('0000')).toBe(false);

    await securityService.setPin(testUserId, null);
    expect(securityService.getPinStatus()).toBe(false);
  });

  test('Device Management: Trust revocation enforces restriction parameters', async () => {
    const devices = await securityService.getDevices(testUserId);
    expect(devices.length).toBe(3);

    const currentDevice = devices.find(d => d.isCurrent);
    expect(currentDevice).toBeDefined();

    // Current device removal should raise an error
    await expect(securityService.removeDevice(testUserId, currentDevice!.id)).rejects.toThrow();

    const mobileDevice = devices.find(d => d.type === 'mobile');
    expect(mobileDevice).toBeDefined();

    const success = await securityService.removeDevice(testUserId, mobileDevice!.id);
    expect(success).toBe(true);

    const remaining = await securityService.getDevices(testUserId);
    expect(remaining.some(d => d.id === mobileDevice!.id)).toBe(false);
  });

  test('Backup & Disaster Recovery: Snapshot, encryption and restore compilation', async () => {
    const mockData = { journal_entries: [{ id: '1', transcript: 'Walking in nature' }] };
    
    const backupMetadata = await securityService.triggerManualBackup(testUserId, 1, mockData);
    expect(backupMetadata.encryptionStatus).toBe('encrypted');
    expect(backupMetadata.recordCount).toBe(1);

    const restoredData = await securityService.restoreFromBackup(testUserId, backupMetadata.id);
    expect(restoredData.journal_entries[0].transcript).toBe('Walking in nature');
  });

  test('Conflict Resolution Engine: Resolves server vs client edits based on policy settings', async () => {
    const localRecord: LocalJournalEntry = {
      id: 'conflict_entry_1',
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcript: 'I think client wins here.',
      audioDuration: 42,
      moodScore: 7,
      moodLabel: 'Productive',
      categories: ['career'],
      syncStatus: 'pending_update'
    };

    const resolvedServerWins = await syncEngine.resolveConflict(localRecord, 'server_wins');
    expect(resolvedServerWins.transcript).toContain('Simulated server additions');

    const resolvedMerge = await syncEngine.resolveConflict(localRecord, 'merge');
    expect(resolvedMerge.transcript).toContain('[LOCAL]: I think client wins here.');
  });
});
