import { describe, test, expect, beforeEach } from 'vitest';
import { subscriptionService } from '../subscription_service';

describe('Subscription Service & Monetization System', () => {
  const testUser = `test_user_monetization`;

  test('Default Subscription State', () => {
    const sub = subscriptionService.getSubscription(testUser);
    expect(sub.plan).toBe('free');
    expect(sub.status).toBe('none');
  });

  test('Plan Upgrading', () => {
    subscriptionService.upgradePlan(testUser, 'premium_monthly', 'stripe');
    const updated = subscriptionService.getSubscription(testUser);
    expect(updated.plan).toBe('premium_monthly');
    expect(updated.status).toBe('active');
    expect(updated.paymentProvider).toBe('stripe');
  });

  test('Feature Gating Controls', () => {
    // Premium plan is active for testUser. Premium should bypass all gates.
    const premiumCheck = subscriptionService.canAccessFeature(testUser, 'advanced_analytics');
    expect(premiumCheck.allowed).toBe(true);

    // Guest user is free. Should be blocked.
    const guestUser = `guest_user_${Date.now()}`;
    const freeCheck = subscriptionService.canAccessFeature(guestUser, 'advanced_analytics');
    expect(freeCheck.allowed).toBe(false);
    expect(freeCheck.reason).toBeDefined();

    // AI summary quotas
    const quotaCheckFirst = subscriptionService.canAccessFeature(guestUser, 'unlimited_ai_summaries', 2);
    expect(quotaCheckFirst.allowed).toBe(true);

    const quotaCheckBlocked = subscriptionService.canAccessFeature(guestUser, 'unlimited_ai_summaries', 6);
    expect(quotaCheckBlocked.allowed).toBe(false);
  });

  test('Offline License Key Validation', () => {
    const validKey = 'LOGEASY-LIFETIME-A1B2-C3D4';
    const invalidKey = 'LOGEASY-INVALID-A1B2-C3D4';

    expect(subscriptionService.verifyLicenseKey(validKey)).toBe(true);
    expect(subscriptionService.verifyLicenseKey(invalidKey)).toBe(false);
  });

  test('Referral Tracking System', async () => {
    const referrerId = `ref_owner_${Date.now()}`;
    const referredId = `ref_guest_${Date.now()}`;
    const referralCode = subscriptionService.getReferralCode(referrerId);

    // Register referred user with referrer code
    const success = subscriptionService.registerReferral(referredId, referralCode);
    expect(success).toBe(true);

    const doubleSuccess = subscriptionService.registerReferral(referredId, referralCode);
    expect(doubleSuccess).toBe(false);

    const list = await subscriptionService.getReferrals(referrerId);
    expect(list).toBeDefined();
  });

  test('Achievements Enable / Disable Toggle', () => {
    const achUser = `ach_user_${Date.now()}`;
    subscriptionService.setAchievementsEnabled(achUser, false);
    const progressResult = subscriptionService.updateAchievementProgress(achUser, 'first_journal', 1);
    expect(progressResult).toBeNull();

    subscriptionService.setAchievementsEnabled(achUser, true);
    const progressResultOn = subscriptionService.updateAchievementProgress(achUser, 'first_journal', 1);
    expect(progressResultOn).not.toBeNull();
  });

  test('A/B Testing Enrollment', () => {
    const abUser = `ab_user_${Date.now()}`;
    const experiment = subscriptionService.getExperimentVariant(abUser, 'onboarding_style_2026');
    expect(['A', 'B', 'C']).toContain(experiment.variant);
  });
});
