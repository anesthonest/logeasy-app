/**
 * LogEasy Settings & Accessibility Foundation
 * Manages system preferences, localized language strings, theme choices,
 * and accessibility filters.
 */

import { logger } from '../../core/analytics/logger';
import { localDB } from '../../core/database/local_db';

export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'en' | 'es' | 'de' | 'fr';

export interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
  screenReaderSimulation: boolean;
}

export interface AppSettings {
  theme: AppTheme;
  language: AppLanguage;
  notificationsEnabled: boolean;
  syncIntervalMinutes: number;
  aiInsightsEnabled: boolean;
  aiProvider: 'gemini' | 'local';
  accessibility: AccessibilitySettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark', // Default to modern secure dark theme
  language: 'en',
  notificationsEnabled: true,
  syncIntervalMinutes: 15,
  aiInsightsEnabled: true,
  aiProvider: 'local', // Default to Local Mock offline, can be toggled to Gemini
  accessibility: {
    largeText: false,
    highContrast: false,
    screenReaderSimulation: false,
  },
};

class SettingsProvider {
  private static instance: SettingsProvider;
  private settings: AppSettings = DEFAULT_SETTINGS;
  private listeners: ((settings: AppSettings) => void)[] = [];

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): SettingsProvider {
    if (!SettingsProvider.instance) {
      SettingsProvider.instance = new SettingsProvider();
    }
    return SettingsProvider.instance;
  }

  private async loadSettings() {
    try {
      const stored = await localDB.getPreference<AppSettings>('app_settings');
      if (stored) {
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...stored,
          accessibility: {
            ...DEFAULT_SETTINGS.accessibility,
            ...(stored.accessibility || {}),
          },
        };
        logger.info('SettingsProvider', 'Successfully restored user settings from DB');
      } else {
        logger.info('SettingsProvider', 'No custom settings found. Applying system defaults.');
      }
    } catch (e) {
      logger.error('SettingsProvider', 'Failed to retrieve preferences, using fallback state', e);
    }
    this.applyThemeAndAccessibility();
    this.notifyListeners();
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public async updateSettings(newSettings: Partial<AppSettings>) {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    
    // If updating sub-objects like accessibility
    if (newSettings.accessibility) {
      this.settings.accessibility = {
        ...this.settings.accessibility,
        ...newSettings.accessibility,
      };
    }

    this.applyThemeAndAccessibility();
    this.notifyListeners();

    try {
      await localDB.setPreference('app_settings', this.settings);
      logger.debug('SettingsProvider', 'Persisted settings changes to IndexedDB preferences');
    } catch (e) {
      logger.error('SettingsProvider', 'Failed to save settings changes', e);
    }
  }

  private applyThemeAndAccessibility() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Apply Theme
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeDark =
      this.settings.theme === 'dark' ||
      (this.settings.theme === 'system' && systemPrefersDark);

    if (activeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply Accessibility Classes
    if (this.settings.accessibility.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (this.settings.accessibility.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
  }

  public subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.push(listener);
    listener(this.getSettings());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.getSettings()));
  }

  /**
   * Screen reader simulation speaking helper (accessibility)
   */
  public speakSimulation(text: string) {
    if (!this.settings.accessibility.screenReaderSimulation) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel currently active spoken lines
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
      logger.debug('SettingsProvider', `Spoke simulated screen-reader line: "${text}"`);
    }
  }
}

export const settingsProvider = SettingsProvider.getInstance();
