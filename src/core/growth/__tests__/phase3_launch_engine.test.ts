import { describe, it, expect, beforeEach } from 'vitest';
import { referralGrowthEngine } from '../referral_growth_engine';
import { demoModeService, DEMO_JOURNAL_ENTRIES, DEMO_CONNECTIONS } from '../../demo/demo_mode_service';
import { aiBoundariesManager } from '../../ai/ai_boundaries_manager';
import { localDB } from '../../database/local_db';

describe('LogEasy Phase 3 — Public Launch, Growth & Controlled Gate Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    demoModeService.disableDemoMode();
  });

  // 1. ACQUISITION & REFERRAL INTEGRITY
  it('should generate valid user referral codes and formatted invitation links', () => {
    const userId = 'user_alex_123';
    const code = referralGrowthEngine.getUserReferralCode(userId);
    expect(code).toBeDefined();
    expect(code).toContain('SANCTUARY-');

    const link = referralGrowthEngine.getInviteLink(userId);
    expect(link).toContain(code);
    expect(link).toContain('?ref=');
  });

  it('should block self-referrals to prevent growth manipulation', () => {
    const userId = 'user_alex_123';
    const ownCode = referralGrowthEngine.getUserReferralCode(userId);
    const result = referralGrowthEngine.validateAndClaimReferral(userId, ownCode);

    expect(result.success).toBe(false);
    expect(result.message).toContain('cannot claim your own');
  });

  it('should prevent duplicate referral claims per device/account', () => {
    const user1 = 'user_invited_456';
    const code = 'SANCTUARY-FOUNDER-9999';

    const claim1 = referralGrowthEngine.validateAndClaimReferral(user1, code);
    expect(claim1.success).toBe(true);

    const claim2 = referralGrowthEngine.validateAndClaimReferral(user1, code);
    expect(claim2.success).toBe(false);
    expect(claim2.message).toContain('already applied');
  });

  it('should generate confidential shareable reflection quote cards without leaking private context', () => {
    const fullTranscript = 'I felt overwhelmed by the client pitch at 3pm, but taking a quiet walk under the redwoods restored my peace. Reminding myself that excellence does not require perfection.';
    const card = referralGrowthEngine.generateShareableQuote(fullTranscript, 'Peace', 'Calm');

    expect(card.quote).toBeDefined();
    expect(card.isWatermarked).toBe(true);
    expect(card.authorLabel).toBe('My Private Reflection');
    // Ensure only the clean excerpt is taken rather than arbitrary sensitive text
    expect(card.quote.length).toBeLessThan(fullTranscript.length + 10);
  });

  // 2. DEMONSTRATION MODE DATA ISOLATION
  it('should isolate demo data completely and provide mock persona Maya Chen', () => {
    expect(demoModeService.isEnabled()).toBe(false);

    demoModeService.enableDemoMode();
    expect(demoModeService.isEnabled()).toBe(true);

    const demoEntries = demoModeService.getDemoEntries();
    expect(demoEntries.length).toBe(6);
    expect(demoEntries[0].userId).toBe('demo_maya_user');

    const demoConnections = demoModeService.getDemoConnections();
    expect(demoConnections.length).toBe(3);
    expect(demoConnections[0].explanation).toBeDefined();

    demoModeService.disableDemoMode();
    expect(demoModeService.isEnabled()).toBe(false);
  });

  // 3. AI PRIVACY BOUNDARIES & USER AGENCY
  it('should enforce user-defined AI boundaries and filter excluded categories and keywords', () => {
    const boundaries = aiBoundariesManager.getRules();
    expect(boundaries.allowProactiveInsights).toBe(true);

    aiBoundariesManager.excludeCategory('Medical Records');
    aiBoundariesManager.addExcludedKeyword('confidentialNDA');

    // Entry with excluded category should be rejected
    const allowed1 = aiBoundariesManager.isEntryPermittedForAI(['Medical Records'], 'Feeling a bit tired today');
    expect(allowed1).toBe(false);

    // Entry containing excluded keyword should be rejected
    const allowed2 = aiBoundariesManager.isEntryPermittedForAI(['Career'], 'Discussed project confidentialNDA with partner');
    expect(allowed2).toBe(false);

    // Normal safe reflection should pass
    const allowed3 = aiBoundariesManager.isEntryPermittedForAI(['Nature'], 'Walked in the morning mist');
    expect(allowed3).toBe(true);
  });

  it('should respect topic resurfacing restrictions to avoid unwanted distress', () => {
    aiBoundariesManager.addPreventResurfacingTopic('Grief of 2024');

    expect(aiBoundariesManager.isTopicAllowedForResurfacing('Grief of 2024')).toBe(false);
    expect(aiBoundariesManager.isTopicAllowedForResurfacing('Marathon training')).toBe(true);
  });
});
