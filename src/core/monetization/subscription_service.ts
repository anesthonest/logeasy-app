import { logger } from '../analytics/logger';
import { notificationManager } from '../notifications/notification_manager';

// ============================================================================
// DATA STRUCTURES & INTERFACES
// ============================================================================

export type SubscriptionPlan = 
  | 'free' 
  | 'premium_monthly' 
  | 'premium_annual' 
  | 'lifetime' 
  | 'family' 
  | 'student' 
  | 'gift';

export interface SubscriptionState {
  plan: SubscriptionPlan;
  status: 'active' | 'canceled' | 'expired' | 'none';
  startDate: string;
  endDate: string | null; // null for lifetime
  autoRenew: boolean;
  paymentProvider: 'apple' | 'google' | 'stripe' | 'manual' | 'none';
  familyOwnerId?: string;
  familyMembers?: string[]; // up to 5 members
  giftedBy?: string;
}

export interface BillingTransaction {
  id: string;
  amount: number;
  currency: string;
  plan: SubscriptionPlan;
  date: string;
  status: 'paid' | 'refunded' | 'failed';
  invoiceUrl?: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  joinedAt: string;
  rewardStatus: 'pending' | 'unlocked' | 'claimed';
  rewardDaysGranted: number;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  category: 'streak' | 'journal_count' | 'coaching' | 'goals' | 'referrals' | 'premium';
  conditionType: string;
  threshold: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface ABExperiment {
  id: string; // e.g. "onboarding_style_2026"
  name: string;
  variant: 'A' | 'B' | 'C'; // A = Control, B = Interactive/AI, C = Immediate Paywall
  joinedAt: string;
  converted: boolean;
}

export interface RemoteConfig {
  prices: {
    premium_monthly: number;
    premium_annual: number;
    lifetime: number;
    family_monthly: number;
  };
  features: Record<string, boolean>; // global feature flags
  onboardingStyle: 'detailed' | 'quick' | 'interactive';
  experimentRollout: Record<string, number>; // variant weightings
  notificationIntervalHours: number;
}

export interface EmailPreference {
  welcome: boolean;
  verification: boolean;
  subscriptionUpdates: boolean;
  weeklySummaries: boolean;
  monthlySummaries: boolean;
  marketingOptIn: boolean;
}

export interface EngagementMetric {
  dauCount: number;
  wauCount: number;
  mauCount: number;
  sessionLengthSeconds: number;
  journalFrequencyPerWeek: number;
  aiUsageCount: number;
  featureAdoption: Record<string, number>;
}

// ============================================================================
// SERVICE CLASS DEFINITION
// ============================================================================

class SubscriptionService {
  private static instance: SubscriptionService;

  // Remote config defaults
  private remoteConfig: RemoteConfig = {
    prices: {
      premium_monthly: 9.99,
      premium_annual: 79.99,
      lifetime: 149.99,
      family_monthly: 14.99,
    },
    features: {
      ai_coaching: true,
      advanced_analytics: true,
      audio_recaps: true,
      knowledge_graph: true,
      referral_system: true,
    },
    onboardingStyle: 'interactive',
    experimentRollout: {
      A: 33, // Control
      B: 34, // Interactive Tutorials
      C: 33, // Paywall first
    },
    notificationIntervalHours: 24,
  };

  private constructor() {
    this.initializeDefaults();
  }

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  private initializeDefaults() {
    // Standard initialization check
  }

  // ----------------------------------------------------
  // SUBSCRIPTION & BILLING ENGINE
  // ----------------------------------------------------
  public getSubscription(userId: string): SubscriptionState {
    const key = `sub_state_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      const defaultState: SubscriptionState = {
        plan: 'free',
        status: 'none',
        startDate: new Date().toISOString(),
        endDate: null,
        autoRenew: false,
        paymentProvider: 'none',
      };
      localStorage.setItem(key, JSON.stringify(defaultState));
      return defaultState;
    }
    return JSON.parse(raw);
  }

  public updateSubscription(userId: string, update: Partial<SubscriptionState>): SubscriptionState {
    const current = this.getSubscription(userId);
    const updated = { ...current, ...update };
    localStorage.setItem(`sub_state_${userId}`, JSON.stringify(updated));
    logger.info('SubscriptionService', `Subscription updated for ${userId}: ${updated.plan} (${updated.status})`);
    return updated;
  }

  public async upgradePlan(
    userId: string, 
    plan: SubscriptionPlan, 
    provider: SubscriptionState['paymentProvider']
  ): Promise<SubscriptionState> {
    const durationDays = plan === 'premium_monthly' || plan === 'family' ? 30 : 365;
    const endDate = plan === 'lifetime' 
      ? null 
      : new Date(Date.now() + 3600000 * 24 * durationDays).toISOString();

    const result = this.updateSubscription(userId, {
      plan,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate,
      autoRenew: plan !== 'lifetime',
      paymentProvider: provider,
    });

    // Add Billing Transaction Record
    const priceMap: Record<SubscriptionPlan, number> = {
      free: 0,
      premium_monthly: this.remoteConfig.prices.premium_monthly,
      premium_annual: this.remoteConfig.prices.premium_annual,
      lifetime: this.remoteConfig.prices.lifetime,
      family: this.remoteConfig.prices.family_monthly,
      student: this.remoteConfig.prices.premium_monthly * 0.5, // 50% discount
      gift: 0
    };

    await this.addTransaction(userId, {
      id: `tx_${Math.random().toString(36).substring(2, 11)}`,
      amount: priceMap[plan],
      currency: 'USD',
      plan,
      date: new Date().toISOString(),
      status: 'paid',
      invoiceUrl: `https://logeasy.app/receipts/${Math.random().toString(36).substring(2, 9)}.pdf`
    });

    // Track retention/conversion conversion
    this.trackABConversion(userId);

    // Fire Sync & Upgrade Notifications
    notificationManager.addNotification({
      title: '👑 Premium Plan Unlocked!',
      body: `Thank you for upgrading! Enjoy unlimited AI coaching, semantic search and weekly audio summaries.`,
      type: 'system',
    });

    return result;
  }

  public async downgradeToFree(userId: string): Promise<SubscriptionState> {
    const result = this.updateSubscription(userId, {
      plan: 'free',
      status: 'none',
      endDate: null,
      autoRenew: false,
      paymentProvider: 'none',
    });

    notificationManager.addNotification({
      title: 'Subscription Downgraded',
      body: 'Your premium features have expired. You have been switched back to the Free tier.',
      type: 'system',
    });

    return result;
  }

  // Family plan member management
  public async addFamilyMember(userId: string, memberEmail: string): Promise<boolean> {
    const sub = this.getSubscription(userId);
    if (sub.plan !== 'family' || sub.status !== 'active') {
      throw new Error('Only active Family Plan subscribers can add members.');
    }

    const members = sub.familyMembers || [];
    if (members.length >= 5) {
      throw new Error('Family Plan member limit reached (max 5 accounts).');
    }

    const mockId = `user_${Math.random().toString(36).substring(2, 8)}`;
    members.push(mockId);
    this.updateSubscription(userId, { familyMembers: members });

    // Instantly upgrade the member account
    this.updateSubscription(mockId, {
      plan: 'family',
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: sub.endDate,
      autoRenew: false,
      paymentProvider: 'none',
      familyOwnerId: userId,
    });

    logger.info('SubscriptionService', `Added family member ${memberEmail} (Id: ${mockId}) to subscription of owner ${userId}`);
    return true;
  }

  // Transactions list
  public async getTransactions(userId: string): Promise<BillingTransaction[]> {
    const key = `billing_history_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      const defaultTx: BillingTransaction[] = [
        {
          id: 'tx_welcome_free',
          amount: 0,
          currency: 'USD',
          plan: 'free',
          date: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
          status: 'paid',
        }
      ];
      localStorage.setItem(key, JSON.stringify(defaultTx));
      return defaultTx;
    }
    return JSON.parse(raw);
  }

  private async addTransaction(userId: string, tx: BillingTransaction) {
    const list = await this.getTransactions(userId);
    list.unshift(tx);
    localStorage.setItem(`billing_history_${userId}`, JSON.stringify(list));
  }

  // Offline Lifetime License Verification Code
  public verifyLicenseKey(licenseKey: string): boolean {
    // Performs validation of keys, e.g. "LOGEASY-LIFETIME-XXXX-XXXX"
    if (!licenseKey.startsWith('LOGEASY-LIFETIME-')) return false;
    const parts = licenseKey.split('-');
    if (parts.length !== 4) return false;
    return parts[2].length === 4 && parts[3].length === 4;
  }

  // ----------------------------------------------------
  // CENTRALIZED FEATURE GATE ENGINE
  // ----------------------------------------------------
  public canAccessFeature(userId: string, featureKey: string, currentUsageCount: number = 0): {
    allowed: boolean;
    reason?: string;
    limitRemaining?: number;
  } {
    // Check global admin feature toggles first
    if (this.remoteConfig.features[featureKey] === false) {
      return { allowed: false, reason: 'This feature is currently disabled by administrators.' };
    }

    const sub = this.getSubscription(userId);
    const isPremium = sub.status === 'active' && [
      'premium_monthly', 'premium_annual', 'lifetime', 'family', 'student', 'gift'
    ].includes(sub.plan);

    // If premium, always unlock everything
    if (isPremium) {
      return { allowed: true };
    }

    // Free Gating limitations
    const limits: Record<string, number> = {
      ai_summaries: 5, // 5 summaries per month
      ai_coaching: 3,  // 3 coaching sessions per month
      analytics_reports: 1, // 1 simple report
    };

    if (featureKey === 'unlimited_ai_summaries') {
      const allowed = currentUsageCount < limits.ai_summaries;
      return {
        allowed,
        reason: allowed ? undefined : 'AI summary quota reached (5 per month on Free plan). Please upgrade to Premium!',
        limitRemaining: Math.max(0, limits.ai_summaries - currentUsageCount)
      };
    }

    if (featureKey === 'unlimited_ai_coaching') {
      const allowed = currentUsageCount < limits.ai_coaching;
      return {
        allowed,
        reason: allowed ? undefined : 'AI reflection coaching limits reached (3 per month on Free plan). Please upgrade to Premium!',
        limitRemaining: Math.max(0, limits.ai_coaching - currentUsageCount)
      };
    }

    // Features completely locked out on Free Tier
    const premiumOnlyFeatures = [
      'advanced_analytics',
      'advanced_exports',
      'knowledge_graph',
      'audio_recaps',
      'goal_habit_intelligence',
      'multi_device_sync',
      'premium_themes'
    ];

    if (premiumOnlyFeatures.includes(featureKey)) {
      return {
        allowed: false,
        reason: 'This feature is a Premium exclusive. Upgrade your vault now to gain access!'
      };
    }

    return { allowed: true };
  }

  // ----------------------------------------------------
  // ONBOARDING & PERSONALIZATION PREFERENCES
  // ----------------------------------------------------
  public getOnboardingComplete(userId: string): boolean {
    return localStorage.getItem(`onboarding_done_${userId}`) === 'true';
  }

  public setOnboardingComplete(userId: string, done: boolean) {
    localStorage.setItem(`onboarding_done_${userId}`, String(done));
    if (done) {
      this.logEngagementEvent(userId, 'onboarding_completed');
      logger.info('SubscriptionService', `User completed onboarding preferences: ${userId}`);
    }
  }

  // ----------------------------------------------------
  // REFERRAL TRACKING ENGINE
  // ----------------------------------------------------
  public getReferralCode(userId: string): string {
    return `EASY-${userId.substring(0, 5).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  }

  public async getReferrals(userId: string): Promise<ReferralRecord[]> {
    const key = `referral_records_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      const defaults: ReferralRecord[] = [];
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw);
  }

  public registerReferral(userId: string, referrerCode: string): boolean {
    // Resolve referrer id from mock code
    const mockReferrerId = `user_${referrerCode.split('-')[1]?.toLowerCase() || 'admin'}`;
    
    const key = `referral_records_${mockReferrerId}`;
    const raw = localStorage.getItem(key);
    const list: ReferralRecord[] = raw ? JSON.parse(raw) : [];

    // Check duplicate
    if (list.some(r => r.referredUserId === userId)) {
      return false;
    }

    const newRecord: ReferralRecord = {
      id: `ref_${Math.random().toString(36).substring(2, 11)}`,
      referrerId: mockReferrerId,
      referredUserId: userId,
      joinedAt: new Date().toISOString(),
      rewardStatus: 'unlocked',
      rewardDaysGranted: 10, // 10 Free Premium days granted to referrer
    };

    list.push(newRecord);
    localStorage.setItem(key, JSON.stringify(list));

    // Grant premium bonus to referrer
    const sub = this.getSubscription(mockReferrerId);
    if (sub.plan === 'free') {
      this.updateSubscription(mockReferrerId, {
        plan: 'gift',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000 * 24 * 10).toISOString(),
      });
    }

    // Award unlock achievement
    this.updateAchievementProgress(mockReferrerId, 'invite_friend', 1);

    logger.info('SubscriptionService', `Registered referral from ${mockReferrerId} to ${userId}. Granted 10 days of Premium bonus.`);
    return true;
  }

  // ----------------------------------------------------
  // ROBUST ACHIEVEMENT & RECONCILIATION ENGINE
  // ----------------------------------------------------
  public getAchievementsEnabled(userId: string): boolean {
    return localStorage.getItem(`achievements_enabled_${userId}`) !== 'false';
  }

  public setAchievementsEnabled(userId: string, enabled: boolean) {
    localStorage.setItem(`achievements_enabled_${userId}`, String(enabled));
  }

  public getAchievements(userId: string): AchievementItem[] {
    const key = `achievements_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initialAchievements: AchievementItem[] = [
        {
          id: 'first_journal',
          title: 'First Thought',
          description: 'Save your first voice journal entry in IndexedDB.',
          category: 'journal_count',
          conditionType: 'entries',
          threshold: 1,
          progress: 0,
          unlocked: false,
        },
        {
          id: 'streak_3',
          title: 'Mindfulness Trio',
          description: 'Maintain a 3-day voice reflection streak.',
          category: 'streak',
          conditionType: 'streak_days',
          threshold: 3,
          progress: 0,
          unlocked: false,
        },
        {
          id: 'ai_coach_first',
          title: 'Vocal Therapist',
          description: 'Initiate a comprehensive reflective coaching conversation with Gemini.',
          category: 'coaching',
          conditionType: 'ai_chats',
          threshold: 1,
          progress: 0,
          unlocked: false,
        },
        {
          id: 'invite_friend',
          title: 'Growth Evangelist',
          description: 'Invite a friend to log their thoughts using your unique referral ID.',
          category: 'referrals',
          conditionType: 'referral_count',
          threshold: 1,
          progress: 0,
          unlocked: false,
        },
        {
          id: 'premium_membership',
          title: 'Ultimate Explorer',
          description: 'Unlock unlimited processing access with premium licensing.',
          category: 'premium',
          conditionType: 'premium_status',
          threshold: 1,
          progress: 0,
          unlocked: false,
        }
      ];
      localStorage.setItem(key, JSON.stringify(initialAchievements));
      return initialAchievements;
    }
    return JSON.parse(raw);
  }

  public updateAchievementProgress(userId: string, id: string, incrementalVal: number): AchievementItem | null {
    if (!this.getAchievementsEnabled(userId)) return null;

    const achievements = this.getAchievements(userId);
    const item = achievements.find(a => a.id === id);
    if (!item || item.unlocked) return null;

    item.progress = Math.min(item.threshold, item.progress + incrementalVal);
    if (item.progress >= item.threshold) {
      item.unlocked = true;
      item.unlockedAt = new Date().toISOString();

      // Trigger user achievement notification
      notificationManager.addNotification({
        title: `🏆 Achievement Unlocked: ${item.title}!`,
        body: item.description,
        type: 'system',
      });
    }

    localStorage.setItem(`achievements_${userId}`, JSON.stringify(achievements));
    return item;
  }

  // ----------------------------------------------------
  // A/B TESTING FOUNDATION & EXPERIMENTS
  // ----------------------------------------------------
  public getExperimentVariant(userId: string, experimentId: string): ABExperiment {
    const key = `experiment_${experimentId}_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Pick random variant based on remote config weightings
      const roll = Math.random() * 100;
      let variant: 'A' | 'B' | 'C' = 'A';
      
      if (roll <= this.remoteConfig.experimentRollout.A) {
        variant = 'A';
      } else if (roll <= this.remoteConfig.experimentRollout.A + this.remoteConfig.experimentRollout.B) {
        variant = 'B';
      } else {
        variant = 'C';
      }

      const exp: ABExperiment = {
        id: experimentId,
        name: 'Growth Conversion Funnel 2026',
        variant,
        joinedAt: new Date().toISOString(),
        converted: false,
      };

      localStorage.setItem(key, JSON.stringify(exp));
      logger.info('SubscriptionService', `User ${userId} enrolled in experiment ${experimentId} with variant ${variant}`);
      return exp;
    }
    return JSON.parse(raw);
  }

  public trackABConversion(userId: string) {
    const experimentId = 'onboarding_style_2026';
    const key = `experiment_${experimentId}_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const exp: ABExperiment = JSON.parse(raw);
      if (!exp.converted) {
        exp.converted = true;
        localStorage.setItem(key, JSON.stringify(exp));
        this.logEngagementEvent(userId, 'conversion_success', { variant: exp.variant });
        logger.info('SubscriptionService', `A/B conversion successfully recorded for user ${userId} under variant ${exp.variant}`);
      }
    }
  }

  // ----------------------------------------------------
  // RETENTION ANALYTICS LOGGER
  // ----------------------------------------------------
  public logEngagementEvent(userId: string, eventName: string, metadata: Record<string, any> = {}) {
    const key = `engagement_analytics_${userId}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];

    const newEvent = {
      id: `evt_${Math.random().toString(36).substring(2, 9)}`,
      eventName,
      timestamp: new Date().toISOString(),
      metadata,
    };

    list.push(newEvent);
    localStorage.setItem(key, JSON.stringify(list.slice(-200))); // Keep last 200 events
  }

  public getRetentionCohortSummary(userId: string): EngagementMetric {
    const key = `engagement_analytics_${userId}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];

    // Calculate simulated cohorts
    const aiUsage = list.filter((e: any) => e.eventName.includes('ai')).length;
    const frequency = list.filter((e: any) => e.eventName === 'journal_saved').length;

    return {
      dauCount: 4120, // Global app statistics
      wauCount: 15300,
      mauCount: 45000,
      sessionLengthSeconds: 180,
      journalFrequencyPerWeek: Math.max(1, frequency),
      aiUsageCount: aiUsage,
      featureAdoption: {
        voice_recording: 92,
        ai_coaching: 54,
        analytics: 42,
        secure_backups: 28,
      }
    };
  }

  // ----------------------------------------------------
  // EMAIL ENGINE TEMPLATE ARCHITECTURE
  // ----------------------------------------------------
  public getEmailPreferences(userId: string): EmailPreference {
    const key = `email_prefs_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      const defaults: EmailPreference = {
        welcome: true,
        verification: true,
        subscriptionUpdates: true,
        weeklySummaries: true,
        monthlySummaries: false,
        marketingOptIn: false,
      };
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw);
  }

  public updateEmailPreferences(userId: string, prefs: Partial<EmailPreference>) {
    const current = this.getEmailPreferences(userId);
    const updated = { ...current, ...prefs };
    localStorage.setItem(`email_prefs_${userId}`, JSON.stringify(updated));
    this.logEngagementEvent(userId, 'email_preferences_updated');
  }

  public triggerEmailSimulation(userId: string, templateType: keyof EmailPreference, customTitle?: string) {
    const prefs = this.getEmailPreferences(userId);
    if (!prefs[templateType] && templateType !== 'verification') {
      logger.warn('SubscriptionService', `Simulation aborted. User ${userId} has marketing/subscription preferences disabled for email category: ${templateType}`);
      return false;
    }

    logger.info('SubscriptionService', `EMAIL SENT: Simulated email transmission matching template [${templateType}] to registered address for user ${userId}. Subject: "${customTitle || 'Welcome to LogEasy Premium'}"`);
    return true;
  }
}

export const subscriptionService = SubscriptionService.getInstance();
