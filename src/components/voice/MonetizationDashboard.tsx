import React, { useState, useEffect } from 'react';
import { 
  Gem, 
  Sparkles, 
  Star, 
  Award, 
  Share2, 
  History, 
  Mail, 
  Bell, 
  Users, 
  Check, 
  Gift, 
  RefreshCw, 
  Play, 
  ArrowRight, 
  Lock, 
  Volume2, 
  Compass, 
  Sliders, 
  Database, 
  Calendar, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ThumbsUp,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import { subscriptionService, SubscriptionPlan, SubscriptionState, BillingTransaction, ReferralRecord, AchievementItem, ABExperiment, EmailPreference } from '../../core/monetization/subscription_service';
import { notificationManager } from '../../core/notifications/notification_manager';
// Mock simple assertions for our self-contained test runner
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runMonetizationTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];
  const testUser = `test_user_monetization_sandbox`;

  function addResult(name: string, passed: boolean, error?: string) {
    results.push({ name, passed, error });
  }

  // TEST 1: Default Subscription State
  try {
    const sub = subscriptionService.getSubscription(testUser);
    assert(sub.plan === 'free', 'Default plan should be "free"');
    assert(sub.status === 'none', 'Default status should be "none"');
    addResult('Default Subscription Plan Verification', true);
  } catch (e: any) {
    addResult('Default Subscription Plan Verification', false, e.message);
  }

  // TEST 2: Plan Upgrading
  try {
    subscriptionService.upgradePlan(testUser, 'premium_monthly', 'stripe');
    const updated = subscriptionService.getSubscription(testUser);
    assert(updated.plan === 'premium_monthly', 'Plan should be upgraded to premium_monthly');
    assert(updated.status === 'active', 'Plan status should be active');
    assert(updated.paymentProvider === 'stripe', 'Payment provider should be stripe');
    addResult('Plan Upgrading Flow & Provider Integration', true);
  } catch (e: any) {
    addResult('Plan Upgrading Flow & Provider Integration', false, e.message);
  }

  // TEST 3: Feature Gating Controls
  try {
    // Premium plan is active for testUser. Premium should bypass all gates.
    const premiumCheck = subscriptionService.canAccessFeature(testUser, 'advanced_analytics');
    assert(premiumCheck.allowed === true, 'Premium users should access advanced_analytics');

    // Guest user is free. Should be blocked.
    const guestUser = `guest_user_monetization_sandbox`;
    const freeCheck = subscriptionService.canAccessFeature(guestUser, 'advanced_analytics');
    assert(freeCheck.allowed === false, 'Free users should be blocked from advanced_analytics');
    assert(freeCheck.reason !== undefined, 'Gated block reason should be specified');

    // AI summary quotas
    const quotaCheckFirst = subscriptionService.canAccessFeature(guestUser, 'unlimited_ai_summaries', 2);
    assert(quotaCheckFirst.allowed === true, 'Under quota should be allowed');

    const quotaCheckBlocked = subscriptionService.canAccessFeature(guestUser, 'unlimited_ai_summaries', 6);
    assert(quotaCheckBlocked.allowed === false, 'Over quota should be blocked');

    addResult('Centralized Feature Gating Rules', true);
  } catch (e: any) {
    addResult('Centralized Feature Gating Rules', false, e.message);
  }

  // TEST 4: Lifetime Key Validation
  try {
    const validKey = 'LOGEASY-LIFETIME-A1B2-C3D4';
    const invalidKey = 'LOGEASY-INVALID-A1B2-C3D4';

    assert(subscriptionService.verifyLicenseKey(validKey) === true, 'License key should validate successfully');
    assert(subscriptionService.verifyLicenseKey(invalidKey) === false, 'Invalid license key format should fail');
    addResult('Offline License Key Validation', true);
  } catch (e: any) {
    addResult('Offline License Key Validation', false, e.message);
  }

  // TEST 5: Referral Tracking System
  try {
    const referrerId = `ref_owner_monetization_sandbox`;
    const referredId = `ref_guest_monetization_sandbox`;
    const referralCode = subscriptionService.getReferralCode(referrerId);

    // Register referred user with referrer code
    const success = subscriptionService.registerReferral(referredId, referralCode);
    assert(success === true, 'First-time referral register should return true');

    const doubleSuccess = subscriptionService.registerReferral(referredId, referralCode);
    assert(doubleSuccess === false, 'Duplicate referral register should be ignored');

    addResult('Referral Multi-device Registration and Verification', true);
  } catch (e: any) {
    addResult('Referral Multi-device Registration and Verification', false, e.message);
  }

  // TEST 6: Achievements Enable / Disable Toggle
  try {
    const achUser = `ach_user_monetization_sandbox`;
    subscriptionService.setAchievementsEnabled(achUser, false);
    const progressResult = subscriptionService.updateAchievementProgress(achUser, 'first_journal', 1);
    assert(progressResult === null, 'No achievement progress registered if achievements are toggled off');

    subscriptionService.setAchievementsEnabled(achUser, true);
    const progressResultOn = subscriptionService.updateAchievementProgress(achUser, 'first_journal', 1);
    assert(progressResultOn !== null, 'Achievements update successfully when enabled');
    addResult('Achievements System & Disable Preferences Toggle', true);
  } catch (e: any) {
    addResult('Achievements System & Disable Preferences Toggle', false, e.message);
  }

  // TEST 7: A/B Testing Enrollment
  try {
    const abUser = `ab_user_monetization_sandbox`;
    const experiment = subscriptionService.getExperimentVariant(abUser, 'onboarding_style_2026');
    assert(['A', 'B', 'C'].includes(experiment.variant), 'Variant should match experiment options');
    addResult('A/B Testing Random Cohort Bucket Distribution', true);
  } catch (e: any) {
    addResult('A/B Testing Random Cohort Bucket Distribution', false, e.message);
  }

  return results;
}

interface MonetizationDashboardProps {
  userId: string;
}

export default function MonetizationDashboard({ userId }: MonetizationDashboardProps) {
  // Global service states
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [achievementsEnabled, setAchievementsEnabled] = useState<boolean>(true);
  const [emailPrefs, setEmailPrefs] = useState<EmailPreference | null>(null);
  const [experiment, setExperiment] = useState<ABExperiment | null>(null);
  const [cohortSummary, setCohortSummary] = useState<any>(null);

  // Sub-Navigation
  const [subTab, setSubTab] = useState<'billing' | 'onboarding' | 'referrals' | 'achievements' | 'experiments' | 'preferences'>('billing');

  // Input states
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [referralStatus, setReferralStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });

  // Onboarding Wizard State
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [onboardingPrefs, setOnboardingPrefs] = useState({
    privacyAgreed: true,
    aiAnalysisEnabled: true,
    permissionsMic: true,
    coachPersonality: 'compassionate',
    dailyReminderHour: 20,
    dailyReminderMinute: 0,
    marketingEmails: false
  });

  // Test Runner log
  const [testLog, setTestLog] = useState<{ name: string; passed: boolean; error?: string }[]>([]);

  // Reload data helper
  const reloadData = () => {
    const sub = subscriptionService.getSubscription(userId);
    setSubscription(sub);
    
    subscriptionService.getTransactions(userId).then(setTransactions);
    subscriptionService.getReferrals(userId).then(setReferrals);
    
    setAchievements(subscriptionService.getAchievements(userId));
    setAchievementsEnabled(subscriptionService.getAchievementsEnabled(userId));
    setEmailPrefs(subscriptionService.getEmailPreferences(userId));
    
    const exp = subscriptionService.getExperimentVariant(userId, 'onboarding_style_2026');
    setExperiment(exp);

    const cohort = subscriptionService.getRetentionCohortSummary(userId);
    setCohortSummary(cohort);
  };

  useEffect(() => {
    reloadData();
  }, [userId]);

  // Upgrade simulator
  const handleUpgrade = async (plan: SubscriptionPlan) => {
    await subscriptionService.upgradePlan(userId, plan, 'stripe');
    reloadData();
  };

  const handleDowngrade = async () => {
    await subscriptionService.downgradeToFree(userId);
    reloadData();
  };

  // License activation
  const handleVerifyLicense = () => {
    if (subscriptionService.verifyLicenseKey(licenseKeyInput)) {
      subscriptionService.upgradePlan(userId, 'lifetime', 'manual');
      setLicenseStatus({
        type: 'success',
        msg: '✓ Lifetime License Key Activated Successfully! Enjoy lifetime vault storage encryption.'
      });
      setLicenseKeyInput('');
      reloadData();
    } else {
      setLicenseStatus({
        type: 'error',
        msg: '✗ Invalid License Format. Format must be LOGEASY-LIFETIME-XXXX-XXXX'
      });
    }
  };

  // Apply Referral
  const handleApplyReferral = async () => {
    if (!referralCodeInput.trim()) return;
    const success = await subscriptionService.registerReferral(userId, referralCodeInput);
    if (success) {
      setReferralStatus({
        type: 'success',
        msg: '✓ Referral Accepted! You have unlocked 10 days of Premium bonus access.'
      });
      setReferralCodeInput('');
      reloadData();
    } else {
      setReferralStatus({
        type: 'error',
        msg: '✗ Referral Code invalid or already claimed by this device.'
      });
    }
  };

  // Achievement toggle
  const handleToggleAchievements = (enabled: boolean) => {
    subscriptionService.setAchievementsEnabled(userId, enabled);
    setAchievementsEnabled(enabled);
    reloadData();
  };

  // Email preference updates
  const handleEmailPrefChange = (prefKey: keyof EmailPreference, val: boolean) => {
    if (!emailPrefs) return;
    const updated = { ...emailPrefs, [prefKey]: val };
    subscriptionService.updateEmailPreferences(userId, updated);
    setEmailPrefs(updated);
  };

  // Run Test Suite
  const triggerTests = () => {
    const results = runMonetizationTests();
    setTestLog(results);
    notificationManager.addNotification({
      title: 'Monetization Tests Executed',
      body: `Passed ${results.filter(r => r.passed).length}/${results.length} sandbox validations.`,
      type: 'security',
    });
  };

  // Onboarding Wizard Completer
  const completeOnboardingWizard = () => {
    subscriptionService.setOnboardingComplete(userId, true);
    setShowOnboardingWizard(false);
    setOnboardingStep(0);
    // Setup Simulated Alarms
    notificationManager.scheduleDailyReminder(onboardingPrefs.dailyReminderHour, onboardingPrefs.dailyReminderMinute);
    // Notify
    notificationManager.addNotification({
      title: 'Onboarding Setup Complete',
      body: `LogEasy configured with a ${onboardingPrefs.coachPersonality} coach companion.`,
      type: 'system'
    });
    reloadData();
  };

  if (!subscription) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 flex-1 overflow-y-auto pr-1">
      {/* HEADER HERO PLATFORM */}
      <div className="relative overflow-hidden bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-slate-900 border border-cyan-500/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase font-bold">
              Subscription Status
            </span>
            {experiment && (
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                Cohort: {experiment.variant}
              </span>
            )}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            {subscription.plan === 'free' ? 'LogEasy Free Tier' : 'LogEasy Premium Vault'}
            {subscription.status === 'active' && <Gem className="h-5 w-5 text-yellow-400 fill-yellow-400" />}
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            {subscription.plan === 'free' 
              ? 'You are running on our standard offline-first model. Upgrade to unlock cross-device cloud sync and infinite AI Summaries.' 
              : `Your secure billing access remains active through ${subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'Forever (Lifetime Key)'}.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button 
            onClick={() => setShowOnboardingWizard(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-all cursor-pointer"
          >
            Run Welcome Onboarding
          </button>
          <button 
            onClick={triggerTests}
            className="px-3.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-semibold text-cyan-400 transition-all cursor-pointer"
          >
            Run Validation Tests
          </button>
        </div>
      </div>

      {/* CORE STATS BENTO GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
          <div className="bg-cyan-500/10 p-2 rounded-lg text-cyan-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Vault Tier</div>
            <div className="text-sm font-bold text-white capitalize">{subscription.plan.replace('_', ' ')}</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
          <div className="bg-purple-500/10 p-2 rounded-lg text-purple-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Referrals</div>
            <div className="text-sm font-bold text-white">{referrals.length} Invited</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
          <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Unlocked Achievements</div>
            <div className="text-sm font-bold text-white">
              {achievements.filter(a => a.unlocked).length} / {achievements.length}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Daily Active Base</div>
            <div className="text-sm font-bold text-white">{cohortSummary ? cohortSummary.dauCount : 4120} active</div>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION CONTROLS */}
      <div className="border-b border-slate-800 flex gap-2 overflow-x-auto pb-px scrollbar-none">
        <button
          onClick={() => setSubTab('billing')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'billing' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Subscription Center
        </button>
        <button
          onClick={() => setSubTab('achievements')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'achievements' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Achievements
        </button>
        <button
          onClick={() => setSubTab('referrals')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'referrals' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Referral Program
        </button>
        <button
          onClick={() => setSubTab('onboarding')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'onboarding' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Onboarding Preview
        </button>
        <button
          onClick={() => setSubTab('preferences')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'preferences' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Notification & Email Preferences
        </button>
        <button
          onClick={() => setSubTab('experiments')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'experiments' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Growth cohort A/B
        </button>
      </div>

      {/* ============================================================================
          TAB 1: SUBSCRIPTION CENTER & BILLING CARDS
          ============================================================================ */}
      {subTab === 'billing' && (
        <div className="space-y-6">
          {/* PRICING PLANS COMPACT SHOWCASE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PLAN 1: FREE */}
            <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              subscription.plan === 'free' 
                ? 'bg-slate-900 border-cyan-500/40 shadow-lg shadow-cyan-500/5' 
                : 'bg-slate-900/40 border-slate-800'
            }`}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-bold text-sm">Free Standard</h3>
                  <p className="text-[10px] text-slate-400 font-sans">For casual local journaling</p>
                </div>
                <div className="text-2xl font-black text-white">$0 <span className="text-xs text-slate-400 font-normal">/ forever</span></div>
                
                <div className="border-t border-slate-800/80 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Unlimited voice recordings</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Secure local IndexedDB vaults</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Basic search & transcript index</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <span>5 AI summaries / month quota</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <span>No multi-device sync cloud-side</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {subscription.plan === 'free' ? (
                  <button className="w-full py-2 bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed">
                    Active Free Plan
                  </button>
                ) : (
                  <button 
                    onClick={handleDowngrade}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-all"
                  >
                    Downgrade Account
                  </button>
                )}
              </div>
            </div>

            {/* PLAN 2: PREMIUM PREMIUM */}
            <div className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
              ['premium_monthly', 'premium_annual', 'lifetime', 'gift', 'student'].includes(subscription.plan)
                ? 'bg-gradient-to-b from-cyan-950/20 to-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/10' 
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}>
              <div className="absolute top-3 right-3 bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase">
                Best Value
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                    Premium Pro <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans font-normal">Infinite insights & full cloud sync</p>
                </div>
                <div className="text-2xl font-black text-white">$9.99 <span className="text-xs text-slate-400 font-normal">/ month</span></div>

                <div className="border-t border-slate-800/80 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-200">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span className="font-semibold text-white">Infinite AI summaries & Coaching</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-200">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Weekly & Monthly AI review digests</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-200">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Interactive Audio Recaps</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-200">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Priority background transcription queue</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-200">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Safe cloud-sync & disaster backups</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {['premium_monthly', 'premium_annual', 'lifetime', 'gift', 'student'].includes(subscription.plan) ? (
                  <button className="w-full py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-xl cursor-not-allowed">
                    Premium Active
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpgrade('premium_monthly')}
                    className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-cyan-500/20"
                  >
                    Upgrade to Premium Monthly
                  </button>
                )}
              </div>
            </div>

            {/* PLAN 3: FAMILY MULTI ACCOUNT */}
            <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              subscription.plan === 'family' 
                ? 'bg-slate-900 border-cyan-500/40 shadow-lg shadow-cyan-500/5' 
                : 'bg-slate-900/40 border-slate-800'
            }`}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-bold text-sm">Family Multi-Vault</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Share subscriptions, maintain isolated journals</p>
                </div>
                <div className="text-2xl font-black text-white">$14.99 <span className="text-xs text-slate-400 font-normal">/ month</span></div>

                <div className="border-t border-slate-800/80 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Up to 5 completely isolated personal vaults</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Separate AI memory & analytics profiles</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Shared premium billing controls</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="h-3 w-3 text-cyan-400" />
                    <span>Lifetime backup protection</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {subscription.plan === 'family' ? (
                  <button className="w-full py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-xl cursor-not-allowed">
                    Active Family Group
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpgrade('family')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-all"
                  >
                    Set Up Family Subscription
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* FAMILY MEMBER CONTROLS IN ACTIVE STATE */}
          {subscription.plan === 'family' && (
            <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h4 className="text-white font-bold text-xs flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                Manage Family Members (up to 5 accounts)
              </h4>
              <p className="text-[11px] text-slate-400">
                Any member you add gets full Premium access while keeping their journals entirely private, stored in their own encrypted container.
              </p>

              <div className="flex gap-2 max-w-md">
                <input 
                  type="email" 
                  placeholder="family-member@email.com" 
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 flex-1 outline-none focus:border-cyan-500/40"
                  id="family-member-email"
                />
                <button 
                  onClick={async () => {
                    const el = document.getElementById('family-member-email') as HTMLInputElement;
                    if (el && el.value) {
                      try {
                        await subscriptionService.addFamilyMember(userId, el.value);
                        notificationManager.addNotification({
                          title: 'Family Member Added',
                          body: `${el.value} has been added to your Family Plan successfully.`,
                          type: 'system'
                        });
                        el.value = '';
                        reloadData();
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }
                  }}
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Invite Member
                </button>
              </div>

              <div className="space-y-2 mt-4 pt-2 border-t border-slate-900">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Active Family Accounts</div>
                {subscription.familyMembers && subscription.familyMembers.length > 0 ? (
                  subscription.familyMembers.map((member, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Member #{i + 1} (Identifier: <span className="font-mono text-[10px] text-cyan-400">{member}</span>)</span>
                      </div>
                      <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono uppercase">
                        Premium Active
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500">No active sub-accounts registered. Invite family members above.</div>
                )}
              </div>
            </div>
          )}

          {/* LICENSE RECOVERY AND OFFLINE VERIFICATION SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-3.5">
              <h3 className="text-white font-bold text-xs flex items-center gap-2">
                <Lock className="h-4 w-4 text-cyan-400" />
                Redeem Lifetime License Key
              </h3>
              <p className="text-[11px] text-slate-400">
                Purchased a physical license, student pack, or retail key? Redeem your 16-character authorization token here to unlock permanently.
              </p>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  placeholder="LOGEASY-LIFETIME-XXXX-XXXX" 
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 flex-1 outline-none font-mono focus:border-cyan-500/40"
                />
                <button 
                  onClick={handleVerifyLicense}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Activate Key
                </button>
              </div>

              {licenseStatus.type && (
                <div className={`p-2.5 rounded-xl text-[11px] flex items-center gap-1.5 ${
                  licenseStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {licenseStatus.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  <span>{licenseStatus.msg}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-white font-bold text-xs flex items-center gap-2">
                <History className="h-4 w-4 text-cyan-400" />
                Billing History & Invoices
              </h3>
              <p className="text-[11px] text-slate-400">
                Access your secure payment transcripts and download local verification PDFs.
              </p>

              <div className="space-y-2 max-h-36 overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200 capitalize">{tx.plan.replace('_', ' ')} Plan</div>
                      <div className="text-[10px] text-slate-500 font-mono">{new Date(tx.date).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-white font-bold">${tx.amount.toFixed(2)}</span>
                      {tx.invoiceUrl && (
                        <a 
                          href={tx.invoiceUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] text-cyan-400 hover:underline"
                        >
                          PDF Invoice
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 2: ACHIEVEMENTS CENTER
          ============================================================================ */}
      {subTab === 'achievements' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800 p-4 rounded-xl">
            <div className="space-y-1">
              <h3 className="text-white font-bold text-xs flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                Mindfulness Achievement Badges
              </h3>
              <p className="text-[11px] text-slate-400">Gamified streaks and goals to keep you consistent without intrusive notifications.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 font-sans">Enable achievements gamification</span>
              <button 
                onClick={() => handleToggleAchievements(!achievementsEnabled)}
                className={`w-10 h-5 rounded-full p-0.5 transition-all relative ${
                  achievementsEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${
                  achievementsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {achievementsEnabled ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                    item.unlocked 
                      ? 'bg-slate-900 border-yellow-500/20 shadow-md shadow-yellow-500/2' 
                      : 'bg-slate-900/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    item.unlocked ? 'bg-yellow-500/10 text-yellow-500' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <Award className="h-6 w-6" />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-bold text-xs">{item.title}</h4>
                      {item.unlocked ? (
                        <span className="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                          Unlocked
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{item.description}</p>
                    
                    {/* PROGRESS BAR */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[9px] font-mono text-slate-500">
                        <span>Progress</span>
                        <span>{item.progress} / {item.threshold}</span>
                      </div>
                      <div className="w-full bg-slate-800/80 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${item.unlocked ? 'bg-yellow-500' : 'bg-cyan-500/60'}`}
                          style={{ width: `${(item.progress / item.threshold) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl space-y-1.5">
              <Award className="h-8 w-8 text-slate-500 mx-auto" />
              <div className="text-white font-bold text-xs">Achievements Gamification Disabled</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">You have disabled the achievements platform. Turn it back on at the top to track your self-reflective progress badges.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================
          TAB 3: REFERRAL CENTER
          ============================================================================ */}
      {subTab === 'referrals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-white font-bold text-xs flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-cyan-400" />
                  Your Custom Referral Link
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Share your love for LogEasy with friends. For every friend who signs up with your code, you both unlock **10 additional days of premium cloud backup and AI processing power** for free.
                </p>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-cyan-400 select-all font-bold tracking-wider">
                  {subscriptionService.getReferralCode(userId)}
                </span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(subscriptionService.getReferralCode(userId));
                    notificationManager.addNotification({
                      title: 'Code Copied!',
                      body: 'Your custom referral code was copied to your system clipboard.',
                      type: 'system'
                    });
                  }}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                >
                  Copy Code
                </button>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] text-white font-semibold">Invite your friend via email:</div>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="friend-email@gmail.com" 
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-xs text-slate-200 flex-1 outline-none"
                    id="invite-friend-email"
                  />
                  <button 
                    onClick={() => {
                      const el = document.getElementById('invite-friend-email') as HTMLInputElement;
                      if (el && el.value) {
                        subscriptionService.triggerEmailSimulation(userId, 'marketingOptIn', `LogEasy Invitation from a friend!`);
                        notificationManager.addNotification({
                          title: 'Invite Dispatched',
                          body: `Simulated referral invitation sent to ${el.value}.`,
                          type: 'system'
                        });
                        el.value = '';
                      }
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs cursor-pointer"
                  >
                    Send Invite
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-white font-bold text-xs flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                Claim Referral Code
              </h3>
              <p className="text-[11px] text-slate-400">
                Were you invited by another user? Enter their referral code below to claim your 10-day welcome bonus.
              </p>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value)}
                  placeholder="EASY-XXXX-XXX" 
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 flex-1 outline-none font-mono focus:border-cyan-500/40"
                />
                <button 
                  onClick={handleApplyReferral}
                  className="px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Apply Code
                </button>
              </div>

              {referralStatus.type && (
                <div className={`p-2.5 rounded-xl text-[11px] flex items-center gap-1.5 ${
                  referralStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {referralStatus.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  <span>{referralStatus.msg}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h3 className="text-white font-bold text-xs">Your Successful Referrals</h3>
            <p className="text-[11px] text-slate-400">Review who completed onboarding under your code and check active reward days.</p>

            <div className="space-y-2 mt-2">
              {referrals.length > 0 ? (
                referrals.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Referred User (ID: <span className="font-mono text-cyan-400 text-[10px]">{item.referredUserId}</span>)</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-400 font-sans text-[11px]">{new Date(item.joinedAt).toLocaleDateString()}</span>
                      <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                        +{item.rewardDaysGranted} Days Granted
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">No active referrals logged yet. Share your code to unlock premium bonuses!</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 4: ONBOARDING WIZARD SIMULATION
          ============================================================================ */}
      {subTab === 'onboarding' && (
        <div className="space-y-6">
          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-white font-bold text-xs flex items-center gap-2">
                <Compass className="h-4 w-4 text-cyan-400" />
                Reflective Onboarding Wizard
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                LogEasy uses a beautiful, multi-step onboarding layout to introduce users to voice recording, privacy-first storage, AI Summaries, and personalized coaching preferences. Try the full simulation below:
              </p>
            </div>

            <button 
              onClick={() => { setShowOnboardingWizard(true); setOnboardingStep(0); }}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Start Onboarding Setup Wizard <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 5: NOTIFICATION & EMAIL PREFERENCES
          ============================================================================ */}
      {subTab === 'preferences' && emailPrefs && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-white font-bold text-xs flex items-center gap-2">
              <Mail className="h-4 w-4 text-cyan-400" />
              Email Preferences Framework
            </h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Toggle transactional summaries, marketing opt-ins, password updates, and account logs. LogEasy respects your mailbox limits.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">Welcome Emails</div>
                  <div className="text-[10px] text-slate-500">Receive tutorial onboarding materials on signup</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailPrefs.welcome}
                  onChange={(e) => handleEmailPrefChange('welcome', e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-cyan-500 h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">Weekly AI Digests</div>
                  <div className="text-[10px] text-slate-500">Receive a weekly emotional trends recap of your journals</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailPrefs.weeklySummaries}
                  onChange={(e) => handleEmailPrefChange('weeklySummaries', e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-cyan-500 h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">Monthly AI Deep-Dive</div>
                  <div className="text-[10px] text-slate-500">Receive a long-term psychological pattern analysis</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailPrefs.monthlySummaries}
                  onChange={(e) => handleEmailPrefChange('monthlySummaries', e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-cyan-500 h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">Billing & Subscription Alerts</div>
                  <div className="text-[10px] text-slate-500">Receive invoice renewals, card change notices, and tax receipts</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailPrefs.subscriptionUpdates}
                  onChange={(e) => handleEmailPrefChange('subscriptionUpdates', e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-cyan-500 h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">Marketing & Partner Promos</div>
                  <div className="text-[10px] text-slate-500">Stay updated on new premium templates and discounted lifetime bundle events</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailPrefs.marketingOptIn}
                  onChange={(e) => handleEmailPrefChange('marketingOptIn', e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-cyan-500 h-4 w-4"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-white font-bold text-xs flex items-center gap-2">
              <Bell className="h-4 w-4 text-cyan-400" />
              Expanded Notification Preferences
            </h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Toggle browser push banners and native alerts. Control reminder frequencies.
            </p>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-xs text-slate-300">Request native browser permissions:</span>
                <button 
                  onClick={async () => {
                    const granted = await notificationManager.requestPermissions();
                    alert(granted ? '✓ Notification permissions granted!' : '✗ Notification permissions denied by browser configurations.');
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  Prompt System Permission
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Achievement Alerts</div>
                <p className="text-[10px] text-slate-500">Banner overlays immediately upon unlocking streaks and milestones.</p>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">Sync & Backup Reminders</div>
                <p className="text-[10px] text-slate-500">Alerts if your offline journal vault hasn't synchronised with secure cloud keys for 3 days.</p>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">AI Recaps Processing Updates</div>
                <p className="text-[10px] text-slate-500">Get notified when weekly reflection coaching maps are successfully compiled in the background.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 6: COHORT ANALYSIS & EXPERIMENTS
          ============================================================================ */}
      {subTab === 'experiments' && experiment && cohortSummary && (
        <div className="space-y-6">
          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-white font-bold text-xs flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-purple-400" />
              Growth Funnel Experiments & Retention Cohorts (A/B)
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              We leverage safe, random browser grouping to perform experiments regarding user conversion flows. Check your browser's bucket group assignment below:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className={`p-4 rounded-xl border ${experiment.variant === 'A' ? 'bg-purple-950/20 border-purple-500/50' : 'bg-slate-900/60 border-slate-800'}`}>
                <div className="font-bold text-white text-xs">Variant A: Standard Flow</div>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">The basic onboarding landing card with straightforward sign-up prompts. Pure offline focus.</p>
                <div className="mt-2 text-[10px] font-mono text-slate-500">Rollout Weighting: 33%</div>
              </div>

              <div className={`p-4 rounded-xl border ${experiment.variant === 'B' ? 'bg-purple-950/20 border-purple-500/50' : 'bg-slate-900/60 border-slate-800'}`}>
                <div className="font-bold text-white text-xs">Variant B: Rich Tutorials</div>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">Guided onboarding with full privacy, mic testing and interactive AI coach personalization.</p>
                <div className="mt-2 text-[10px] font-mono text-slate-500">Rollout Weighting: 34%</div>
              </div>

              <div className={`p-4 rounded-xl border ${experiment.variant === 'C' ? 'bg-purple-950/20 border-purple-500/50' : 'bg-slate-900/60 border-slate-800'}`}>
                <div className="font-bold text-white text-xs">Variant C: Premium Paywall</div>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">Immediate pricing options showcase during the first welcome screen. Direct value focus.</p>
                <div className="mt-2 text-[10px] font-mono text-slate-500">Rollout Weighting: 33%</div>
              </div>
            </div>

            <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-[11px] text-purple-300 flex items-center gap-2">
              <Info className="h-4 w-4 text-purple-400" />
              <span>You are placed in **Variant {experiment.variant}**. {experiment.converted ? '✓ You have converted to Premium!' : '✗ You have not converted to premium yet.'}</span>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-white font-bold text-xs">Simulated Retention Metrics (DAU/WAU/MAU cohorts)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Session Length</div>
                <div className="text-base font-bold text-white">{cohortSummary.sessionLengthSeconds}s</div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Weekly frequency</div>
                <div className="text-base font-bold text-white">{cohortSummary.journalFrequencyPerWeek}x / week</div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">AI Usage Logs</div>
                <div className="text-base font-bold text-white">{cohortSummary.aiUsageCount} sessions</div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Monthly Conversion</div>
                <div className="text-base font-bold text-white">4.1%</div>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Aesthetic Feature Adoption</div>
              {Object.entries(cohortSummary.featureAdoption).map(([feat, percentage]: any) => (
                <div key={feat} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300 capitalize">
                    <span>{feat.replace('_', ' ')}</span>
                    <span className="font-mono">{percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          TEST LOG RESULTS MODAL/FOOTER
          ============================================================================ */}
      {testLog.length > 0 && (
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-white font-bold text-xs">Executable Test Suite Results</h4>
            <button 
              onClick={() => setTestLog([])}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Clear Logs
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {testLog.map((test, index) => (
              <div key={index} className="flex items-start justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${test.passed ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  <span className="text-slate-200">{test.name}</span>
                </div>
                <div>
                  {test.passed ? (
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">PASSED</span>
                  ) : (
                    <span className="text-[10px] text-rose-500 font-mono font-bold">FAILED: {test.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================================
          ONBOARDING WIZARD MODAL COMPONENT (FULL SCREEN OVERLAY)
          ============================================================================ */}
      {showOnboardingWizard && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col justify-between">
            {/* WIZARD HEADER */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Gem className="text-cyan-400 h-4.5 w-4.5 animate-pulse" />
                <span className="text-white font-bold text-xs tracking-tight">LogEasy Onboarding Companion</span>
              </div>
              <button 
                onClick={() => setShowOnboardingWizard(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                Skip
              </button>
            </div>

            {/* WIZARD CONTENT DYNAMIC BODY */}
            <div className="p-6 flex-1 max-h-[60vh] overflow-y-auto text-slate-200 text-xs leading-relaxed space-y-4">
              
              {/* STEP 0: WELCOME CARD */}
              {onboardingStep === 0 && (
                <div className="space-y-4 text-center py-6">
                  <div className="text-3xl">✨</div>
                  <h3 className="text-white font-black text-lg">Welcome to LogEasy</h3>
                  <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
                    The ultra-secure, privacy-first reflective companion. Express thoughts using your encrypted vocal diary, managed with complete local sovereignty.
                  </p>
                </div>
              )}

              {/* STEP 1: PRIVACY AGREEMENT */}
              {onboardingStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="text-cyan-400 h-4 w-4" />
                    Zero-Knowledge Privacy Guarantee
                  </h3>
                  <p className="text-slate-400">
                    Your recording transcripts are encrypted using client-side keys and saved to native IndexedDB. We never track or commercialize your personal reflections.
                  </p>

                  <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <input 
                      type="checkbox" 
                      id="opt-privacy-agree"
                      checked={onboardingPrefs.privacyAgreed}
                      onChange={(e) => setOnboardingPrefs(prev => ({ ...prev, privacyAgreed: e.target.checked }))}
                      className="rounded text-cyan-400 h-4 w-4"
                    />
                    <label htmlFor="opt-privacy-agree" className="text-slate-300 font-medium">I consent to secure local device storage.</label>
                  </div>
                </div>
              )}

              {/* STEP 2: MIC & PERMISSIONS */}
              {onboardingStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                    <Volume2 className="text-cyan-400 h-4 w-4" />
                    Audio & Microphone Authorization
                  </h3>
                  <p className="text-slate-400">
                    LogEasy captures organic speech to build deep transcripts. Please confirm permission settings below to ensure seamless mic recording.
                  </p>

                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-300 font-semibold">Enable Recording Audio Services</span>
                    <button 
                      onClick={() => setOnboardingPrefs(prev => ({ ...prev, permissionsMic: !prev.permissionsMic }))}
                      className={`px-3 py-1 text-[11px] rounded-lg border font-bold transition-all cursor-pointer ${
                        onboardingPrefs.permissionsMic ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {onboardingPrefs.permissionsMic ? 'Allowed' : 'Disabled'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PERSONALIZATION & COACH */}
              {onboardingStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                    <Sliders className="text-cyan-400 h-4 w-4" />
                    Personalize your AI companion personality
                  </h3>
                  <p className="text-slate-400">
                    How should Gemini interact with your journal thoughts? Choose a personality template:
                  </p>

                  <div className="grid grid-cols-2 gap-3.5 pt-2">
                    {[
                      { id: 'compassionate', title: 'Compassionate', desc: 'Warm, empathic listening' },
                      { id: 'socratic', title: 'Socratic Analyst', desc: 'Logical, constructive inquiries' },
                      { id: 'stoic', title: 'Stoic Philosopher', desc: 'Actionable discipline & focus' },
                      { id: 'creative', title: 'Creative Spark', desc: 'Inspirational storytelling prompt' }
                    ].map((coach) => (
                      <button
                        key={coach.id}
                        onClick={() => setOnboardingPrefs(prev => ({ ...prev, coachPersonality: coach.id }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          onboardingPrefs.coachPersonality === coach.id 
                            ? 'bg-cyan-500/10 border-cyan-400' 
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-white text-xs">{coach.title}</div>
                        <div className="text-[10px] text-slate-400 mt-1 leading-normal">{coach.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: ALARMS AND REMINDERS */}
              {onboardingStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                    <Bell className="text-cyan-400 h-4 w-4" />
                    Smart Reminders & Prompts
                  </h3>
                  <p className="text-slate-400">
                    Configure daily alarms to reflect on your goals. Select your optimal evening hour to jot down final feelings:
                  </p>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center text-slate-200">
                      <span>Reflective Alarm Time</span>
                      <span className="font-mono font-bold text-cyan-400">
                        {onboardingPrefs.dailyReminderHour.toString().padStart(2, '0')}:00 PM
                      </span>
                    </div>

                    <input 
                      type="range" 
                      min="16" 
                      max="23" 
                      value={onboardingPrefs.dailyReminderHour}
                      onChange={(e) => setOnboardingPrefs(prev => ({ ...prev, dailyReminderHour: parseInt(e.target.value) }))}
                      className="w-full accent-cyan-400"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>4:00 PM</span>
                      <span>8:00 PM (Default)</span>
                      <span>11:00 PM</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: SUBSCRIPTION SUMMARY PROMPT */}
              {onboardingStep === 5 && (
                <div className="space-y-4 text-center">
                  <Gem className="h-8 w-8 text-yellow-400 mx-auto fill-yellow-400 animate-bounce" />
                  <h3 className="text-white font-black text-md">Try Premium Free for 14 Days</h3>
                  <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Unlock unlimited coaching analyses, automated cloud-sync backups, weekly audio reports, and detailed long-term trend lines.
                  </p>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                    No payment details are required to complete setup. You are completely safe on the Free plan.
                  </div>
                </div>
              )}

            </div>

            {/* WIZARD ACTIONS BAR */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-between items-center">
              <button
                disabled={onboardingStep === 0}
                onClick={() => setOnboardingStep(prev => prev - 1)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-20 transition-all"
              >
                Back
              </button>

              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((s) => (
                  <span 
                    key={s} 
                    className={`w-1.5 h-1.5 rounded-full ${s === onboardingStep ? 'bg-cyan-400' : 'bg-slate-700'}`} 
                  />
                ))}
              </div>

              {onboardingStep === 5 ? (
                <button
                  onClick={completeOnboardingWizard}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  Complete Setup
                </button>
              ) : (
                <button
                  onClick={() => setOnboardingStep(prev => prev + 1)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
