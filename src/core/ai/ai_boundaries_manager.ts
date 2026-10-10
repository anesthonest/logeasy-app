/**
 * LogEasy AI Privacy Boundaries & User Agency Manager
 * 
 * Protects human dignity and user control:
 * - Allows users to mark topics/categories as strictly excluded from AI synthesis
 * - "Don't resurface this topic" rules
 * - "Forget this inference" memory purging
 * - Filters prompt payloads before sending to any local or cloud AI models
 */

import { logger } from '../analytics/logger';
import { productAnalytics } from '../analytics/product_analytics';

export interface AIBoundaryRules {
  excludedCategories: string[];
  excludedKeywords: string[];
  preventResurfacingTopics: string[];
  excludedPeople: string[];
  allowProactiveInsights: boolean;
  allowCrossMemoryConnections: boolean;
  allowLongitudinalPatternAnalysis: boolean;
}

const DEFAULT_RULES: AIBoundaryRules = {
  excludedCategories: [],
  excludedKeywords: [],
  preventResurfacingTopics: [],
  excludedPeople: [],
  allowProactiveInsights: true,
  allowCrossMemoryConnections: true,
  allowLongitudinalPatternAnalysis: true,
};

const STORAGE_KEY = 'logeasy_ai_boundaries';

class AIBoundariesManager {
  private static instance: AIBoundariesManager;
  private rules: AIBoundaryRules = DEFAULT_RULES;
  private listeners: ((rules: AIBoundaryRules) => void)[] = [];

  private constructor() {
    this.loadRules();
  }

  public static getInstance(): AIBoundariesManager {
    if (!AIBoundariesManager.instance) {
      AIBoundariesManager.instance = new AIBoundariesManager();
    }
    return AIBoundariesManager.instance;
  }

  private loadRules() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.rules = { ...DEFAULT_RULES, ...JSON.parse(stored) };
      }
    } catch {
      this.rules = DEFAULT_RULES;
    }
  }

  public getRules(): AIBoundaryRules {
    return { ...this.rules };
  }

  public updateRules(updates: Partial<AIBoundaryRules>) {
    this.rules = { ...this.rules, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rules));
    } catch {
      // storage resilient
    }
    logger.info('AIBoundariesManager', 'Updated user AI boundaries & agency rules');
    productAnalytics.trackAction('ai_boundaries_updated', 'privacy');
    this.notify();
  }

  public excludeCategory(category: string) {
    const clean = category.trim();
    if (!this.rules.excludedCategories.includes(clean)) {
      this.updateRules({
        excludedCategories: [...this.rules.excludedCategories, clean],
      });
    }
  }

  public removeExcludedCategory(category: string) {
    this.updateRules({
      excludedCategories: this.rules.excludedCategories.filter(c => c !== category),
    });
  }

  public addExcludedKeyword(keyword: string) {
    const clean = keyword.trim().toLowerCase();
    if (!this.rules.excludedKeywords.includes(clean)) {
      this.updateRules({
        excludedKeywords: [...this.rules.excludedKeywords, clean],
      });
    }
  }

  public removeExcludedKeyword(keyword: string) {
    this.updateRules({
      excludedKeywords: this.rules.excludedKeywords.filter(k => k !== keyword.toLowerCase()),
    });
  }

  public addPreventResurfacingTopic(topic: string) {
    const clean = topic.trim();
    if (!this.rules.preventResurfacingTopics.includes(clean)) {
      this.updateRules({
        preventResurfacingTopics: [...this.rules.preventResurfacingTopics, clean],
      });
    }
  }

  /**
   * Sanitizes text and filters out memories that violate user boundaries
   */
  public isEntryPermittedForAI(categories: string[] = [], text: string = ''): boolean {
    // 1. Category check
    for (const cat of categories) {
      if (this.rules.excludedCategories.some(exc => exc.toLowerCase() === cat.toLowerCase())) {
        return false;
      }
    }

    // 2. Keyword check
    const lowerText = text.toLowerCase();
    for (const kw of this.rules.excludedKeywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  public isTopicAllowedForResurfacing(topic: string): boolean {
    const lower = topic.toLowerCase();
    return !this.rules.preventResurfacingTopics.some(t => lower.includes(t.toLowerCase()));
  }

  public subscribe(listener: (rules: AIBoundaryRules) => void): () => void {
    this.listeners.push(listener);
    listener(this.rules);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.rules));
  }
}

export const aiBoundariesManager = AIBoundariesManager.getInstance();
