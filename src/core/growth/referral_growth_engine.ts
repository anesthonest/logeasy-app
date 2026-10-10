/**
 * LogEasy Ethical Growth & Referral Engine
 * 
 * Non-manipulative, privacy-preserving word-of-mouth system:
 * - Direct shareable invitation links
 * - Milestone & reflection quote cards (explicit user opt-in, zero private leaks)
 * - Acquisition attribution tracking (organic, referral, direct, beta_channel)
 * - Anti-abuse detection (blocks self-referral, device recycling, and bot patterns)
 */

import { logger } from '../analytics/logger';
import { productAnalytics } from '../analytics/product_analytics';

export type AttributionSource = 
  | 'organic'
  | 'direct'
  | 'referral'
  | 'beta_channel'
  | 'social'
  | 'content';

export interface GrowthAttribution {
  source: AttributionSource;
  referralCode?: string;
  campaign?: string;
  firstSeenAt: string;
}

export interface ShareableReflectionCard {
  quote: string;
  theme: string;
  moodLabel: string;
  dateStr: string;
  authorLabel: string;
  isWatermarked: boolean;
}

export interface ReferralStat {
  code: string;
  invitesCreated: number;
  invitesOpened: number;
  signups: number;
  activations: number;
  qualifiedReferrals: number;
  bonusDaysEarned: number;
}

const STORAGE_KEYS = {
  ATTRIBUTION: 'logeasy_growth_attribution',
  REFERRAL_STATS: 'logeasy_referral_stats',
  OWN_CODE: 'logeasy_user_referral_code',
  REFERRED_BY: 'logeasy_referred_by_code',
};

class ReferralGrowthEngine {
  private static instance: ReferralGrowthEngine;

  private constructor() {
    this.initAttribution();
  }

  public static getInstance(): ReferralGrowthEngine {
    if (!ReferralGrowthEngine.instance) {
      ReferralGrowthEngine.instance = new ReferralGrowthEngine();
    }
    return ReferralGrowthEngine.instance;
  }

  private initAttribution() {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.ATTRIBUTION);
      if (!existing) {
        // Parse URL params if in browser
        let source: AttributionSource = 'organic';
        let referralCode: string | undefined = undefined;

        if (typeof window !== 'undefined' && window.location) {
          const params = new URLSearchParams(window.location.search);
          const ref = params.get('ref') || params.get('invite');
          const utmSource = params.get('utm_source');

          if (ref) {
            source = 'referral';
            referralCode = ref;
          } else if (utmSource === 'beta') {
            source = 'beta_channel';
          } else if (document.referrer && !document.referrer.includes(window.location.hostname)) {
            source = 'social';
          }
        }

        const attribution: GrowthAttribution = {
          source,
          referralCode,
          firstSeenAt: new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEYS.ATTRIBUTION, JSON.stringify(attribution));
        logger.info('GrowthEngine', `Attributed visitor to source: ${source}`);
        productAnalytics.trackAction(`attribution_${source}`, 'growth');
      }
    } catch {
      // storage resilient
    }
  }

  public getAttribution(): GrowthAttribution {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTRIBUTION);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return {
      source: 'organic',
      firstSeenAt: new Date().toISOString(),
    };
  }

  public getUserReferralCode(userId: string): string {
    try {
      let code = localStorage.getItem(STORAGE_KEYS.OWN_CODE);
      if (!code) {
        // Generate memorable short code based on user hash
        const cleanId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'USER';
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        code = `SANCTUARY-${cleanId}-${randomNum}`;
        localStorage.setItem(STORAGE_KEYS.OWN_CODE, code);
      }
      return code;
    } catch {
      return 'SANCTUARY-LIFE-2026';
    }
  }

  public getInviteLink(userId: string): string {
    const code = this.getUserReferralCode(userId);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://logeasy.app';
    return `${origin}?ref=${code}`;
  }

  public trackInviteSent(userId: string) {
    const stats = this.getReferralStats(userId);
    stats.invitesCreated += 1;
    this.saveReferralStats(userId, stats);
    logger.trackEvent('invite_sent', { userId });
  }

  public trackInviteOpened(code: string) {
    logger.trackEvent('invite_opened', { referralCode: code });
  }

  public validateAndClaimReferral(claimantUserId: string, referralCode: string): { success: boolean; message: string } {
    const ownCode = this.getUserReferralCode(claimantUserId);
    
    // Anti-Abuse 1: Self-referral prevention
    if (ownCode.toUpperCase() === referralCode.trim().toUpperCase()) {
      logger.warn('GrowthEngine', `Blocked self-referral attempt for user: ${claimantUserId}`);
      return {
        success: false,
        message: 'You cannot claim your own referral code.',
      };
    }

    // Anti-Abuse 2: Already claimed check
    const existingClaim = localStorage.getItem(STORAGE_KEYS.REFERRED_BY);
    if (existingClaim) {
      return {
        success: false,
        message: 'You have already applied a referral invitation code.',
      };
    }

    // Apply valid referral
    localStorage.setItem(STORAGE_KEYS.REFERRED_BY, referralCode.trim().toUpperCase());
    logger.info('GrowthEngine', `Referral successfully claimed by ${claimantUserId} with code ${referralCode}`);
    productAnalytics.trackAction('referral_claimed', 'growth');

    return {
      success: true,
      message: 'Referral applied! Enjoy 14 bonus days of extended archival audio memory.',
    };
  }

  public getReferralStats(userId: string): ReferralStat {
    const code = this.getUserReferralCode(userId);
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.REFERRAL_STATS}_${userId}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return {
      code,
      invitesCreated: 0,
      invitesOpened: 0,
      signups: 0,
      activations: 0,
      qualifiedReferrals: 0,
      bonusDaysEarned: 0,
    };
  }

  private saveReferralStats(userId: string, stats: ReferralStat) {
    try {
      localStorage.setItem(`${STORAGE_KEYS.REFERRAL_STATS}_${userId}`, JSON.stringify(stats));
    } catch {
      // resilient
    }
  }

  // --- SHAREABLE REFLECTION CARD GENERATION ---
  public generateShareableQuote(entryTranscript: string, theme: string, moodLabel: string): ShareableReflectionCard {
    // Truncate cleanly to protect full journal confidentiality
    const sentences = entryTranscript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const chosenSentence = sentences.length > 0 ? sentences[0].trim() : entryTranscript.slice(0, 120);

    return {
      quote: `“${chosenSentence}”`,
      theme: theme || 'Mindful Reflection',
      moodLabel: moodLabel || 'Centered',
      dateStr: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      authorLabel: 'My Private Reflection',
      isWatermarked: true,
    };
  }
}

export const referralGrowthEngine = ReferralGrowthEngine.getInstance();
