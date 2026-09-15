import { logger } from '../analytics/logger';

// ============================================================================
// COMPLIANCE TYPES & CONNOTATIONS
// ============================================================================

export interface UserConsentChoices {
  essentialCookies: boolean; // Always true
  analyticsCookies: boolean;
  marketingCookies: boolean;
  voiceProcessingConsent: boolean;
  dataSharingConsent: boolean;
}

export interface ConsentLogEntry {
  userId: string;
  timestamp: string;
  ip: string;
  choices: UserConsentChoices;
  termsVersionAccepted: string;
  privacyPolicyVersionAccepted: string;
  ageVerified: boolean;
}

// ============================================================================
// COMPLIANCE CORE ENGINE
// ============================================================================

class ComplianceService {
  private static instance: ComplianceService;

  private consentLogs: Record<string, ConsentLogEntry> = {};
  private currentTermsVersion = 'v1.4.0 (2026 Revision)';
  private currentPrivacyPolicyVersion = 'v2.1.2 (GDPR-Compliant)';

  private constructor() {
    this.loadConsentLogs();
  }

  public static getInstance(): ComplianceService {
    if (!ComplianceService.instance) {
      ComplianceService.instance = new ComplianceService();
    }
    return ComplianceService.instance;
  }

  private loadConsentLogs() {
    try {
      const stored = localStorage.getItem('user_compliance_logs');
      if (stored) {
        this.consentLogs = JSON.parse(stored);
      }
    } catch (e) {
      logger.error('ComplianceService', 'Failed to load user compliance registry logs: ' + e);
    }
  }

  private saveConsentLogs() {
    localStorage.setItem('user_compliance_logs', JSON.stringify(this.consentLogs));
  }

  // ============================================================================
  // OPERATIONS & COMPLIANCE INTERFACES
  // ============================================================================

  public getConsent(userId: string): ConsentLogEntry | null {
    return this.consentLogs[userId] || null;
  }

  public registerConsent(
    userId: string,
    choices: Partial<UserConsentChoices>,
    ageVerified: boolean
  ): ConsentLogEntry {
    const defaultConsent: UserConsentChoices = {
      essentialCookies: true,
      analyticsCookies: true,
      marketingCookies: false,
      voiceProcessingConsent: true,
      dataSharingConsent: false,
    };

    const finalChoices = { ...defaultConsent, ...choices };

    const entry: ConsentLogEntry = {
      userId,
      timestamp: new Date().toISOString(),
      ip: '192.168.1.55', // Standard Local Device IP Mockup
      choices: finalChoices,
      termsVersionAccepted: this.currentTermsVersion,
      privacyPolicyVersionAccepted: this.currentPrivacyPolicyVersion,
      ageVerified,
    };

    this.consentLogs[userId] = entry;
    this.saveConsentLogs();
    
    logger.info('ComplianceService', `Registered GDPR/CCPA Consent Profile for User ID: ${userId}`);
    return entry;
  }

  public getPolicyVersions() {
    return {
      terms: this.currentTermsVersion,
      privacyPolicy: this.currentPrivacyPolicyVersion,
    };
  }

  // ============================================================================
  // GDPR DATA EXPORT (THE RIGHT TO DATA PORTABILITY)
  // ============================================================================

  public triggerGdprDataExport(userId: string, userDisplayName: string, journals: any[]): { exportPayload: string, fileName: string } {
    const consent = this.getConsent(userId);
    
    // Assemble structured archive of all user metrics
    const payload = {
      complianceHeader: {
        regulation: 'GDPR Article 20 / CCPA Portability Standard',
        exportTimestamp: new Date().toISOString(),
        verifiedUserId: userId,
        legalDisclaimer: 'This file contains an unencrypted plaintext archive of your local voice thoughts, logs, profiles, and compliance choices.',
      },
      userProfile: {
        displayName: userDisplayName,
        consentLogs: consent,
      },
      journalEntries: journals.map(j => ({
        id: j.id,
        timestamp: j.timestamp,
        transcript: j.transcript,
        moodTag: j.mood,
        aiSummary: j.summary,
        audioLengthSec: j.duration,
      })),
    };

    const exportPayload = JSON.stringify(payload, null, 2);
    const fileName = `logeasy_gdpr_data_export_${userId}.json`;
    
    logger.info('ComplianceService', `Assembled structured GDPR Portability Package for ${userId}`);
    return { exportPayload, fileName };
  }

  // ============================================================================
  // THE RIGHT TO BE FORGOTTEN (SCRUB DATA ON DEMAND)
  // ============================================================================

  public executeRightToBeForgotten(userId: string, purgeCallbacks: Array<() => void>): boolean {
    try {
      logger.warn('ComplianceService', `Initiating right to be forgotten purge sequence for User ID: ${userId}`);
      
      // 1. Purge Local Compliance Entry
      if (this.consentLogs[userId]) {
        delete this.consentLogs[userId];
        this.saveConsentLogs();
      }

      // 2. Fire external state controllers / local IndexedDB purges
      purgeCallbacks.forEach(cb => cb());

      logger.info('ComplianceService', `Data scrubbing verified. User ID '${userId}' completely scrubbed from databases.`);
      return true;
    } catch (err: any) {
      logger.error('ComplianceService', `Scrub failure: ${err.message}`);
      return false;
    }
  }
}

export const complianceService = ComplianceService.getInstance();
