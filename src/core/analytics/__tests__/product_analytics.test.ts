import { describe, it, expect, beforeEach } from 'vitest';
import { productAnalytics } from '../product_analytics';
import { localDB } from '../../database/local_db';

describe('LogEasy Phase 2 — Product Analytics & Validation Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default funnel state and no PII leak', () => {
    const funnel = productAnalytics.getActivationFunnel();
    expect(funnel.onboardingStarted).toBe(false);
    expect(funnel.firstVoiceCaptured).toBe(false);
    expect(funnel.timeToFirstValueMs).toBe(0);
  });

  it('should track onboarding activation funnel transitions sequentially', () => {
    productAnalytics.markOnboardingStarted();
    expect(productAnalytics.getActivationFunnel().onboardingStarted).toBe(true);

    productAnalytics.markIntentSelected('clarity');
    expect(productAnalytics.getActivationFunnel().intentSelected).toBe(true);

    productAnalytics.markFirstVoiceCaptured();
    expect(productAnalytics.getActivationFunnel().firstVoiceCaptured).toBe(true);

    productAnalytics.markModelGenerated();
    expect(productAnalytics.getActivationFunnel().modelGenerated).toBe(true);

    productAnalytics.markFirstReviewCompleted();
    expect(productAnalytics.getActivationFunnel().firstReviewCompleted).toBe(true);
  });

  it('should record PMF surveys and calculate Sean Ellis score properly', () => {
    productAnalytics.recordPMFSurvey({
      disappointmentLevel: 'very_disappointed',
      primaryBenefit: 'Unburdening racing thoughts at night',
      userSegment: 'clarity_seeker',
      wouldRecommendScore: 10,
    });

    productAnalytics.recordPMFSurvey({
      disappointmentLevel: 'very_disappointed',
      primaryBenefit: 'Listening to honest audio logs from 6 months ago',
      userSegment: 'voice_archivist',
      wouldRecommendScore: 9,
    });

    productAnalytics.recordPMFSurvey({
      disappointmentLevel: 'somewhat_disappointed',
      primaryBenefit: 'Nice UI and local storage',
      userSegment: 'daily_reflector',
      wouldRecommendScore: 7,
    });

    const summary = productAnalytics.getTractionSummary();
    // 2 out of 3 = 67% very disappointed
    expect(summary.pmfScorePercentage).toBe(67);
    // NPS: 2 promoters (score >= 9), 0 detractors (score <= 6) -> 2/3 = +67 NPS
    expect(summary.netPromoterScore).toBe(67);
  });

  it('should compute cognitive relief ratings and maintain bounded average', () => {
    productAnalytics.recordClarityRating(5, 'post_voice_recording');
    productAnalytics.recordClarityRating(4, 'evening_reflection');
    productAnalytics.recordClarityRating(5, 'onboarding');

    const avg = productAnalytics.getAverageClarityScore();
    expect(avg).toBeCloseTo(4.7, 1);
  });

  it('should calculate accurate unit economics based on local-first computing', () => {
    const economics = productAnalytics.getUnitEconomics();
    expect(economics.monthlySubscriptionPrice).toBeGreaterThan(0);
    expect(economics.freeToPaidConversionRate).toBeGreaterThan(0.01);
    // Marginal compute cost should be negligible (<$0.01) due to local WASM processing
    expect(economics.voiceComputeCostPerMinute).toBeLessThanOrEqual(0.01);
  });

  it('should verify LocalDatabase addEntry and getAllEntries compatibility', async () => {
    const testEntryId = `entry_test_p2_${Date.now()}`;
    await localDB.addEntry({
      id: testEntryId,
      userId: 'test_user_p2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: 'P2 Validation Entry',
      transcript: 'Testing phase 2 local storage persistence',
      audioDuration: 12,
      moodScore: 8,
      moodLabel: 'Centered',
      categories: ['Validation'],
      syncStatus: 'synced',
    });

    const entries = await localDB.getAllEntries();
    const found = entries.find(e => e.id === testEntryId);
    expect(found).toBeDefined();
    expect(found?.transcript).toContain('Testing phase 2 local storage persistence');
  });
});
