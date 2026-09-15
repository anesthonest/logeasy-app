/**
 * LogEasy AI Layer Abstraction
 * Follows provider-agnostic Clean Architecture.
 * Supports caching, prompt compilation, safety filters, and usage metrics.
 */

import { logger } from '../analytics/logger';

export interface AIResponse {
  text: string;
  tokensUsed: number;
  provider: string;
  cached: boolean;
  safetyClean: boolean;
}

export interface AIUsageRecord {
  totalRequests: number;
  totalTokens: number;
  byProvider: Record<string, { requests: number; tokens: number }>;
}

export interface IAIServiceProvider {
  name: string;
  generateInsights(prompt: string, options?: Record<string, any>): Promise<AIResponse>;
}

// 1. PROMPT MANAGEMENT
export type PromptType = 'summarize_journal' | 'emotional_analysis' | 'pattern_discovery' | 'coaching_feedback';

export interface PromptTemplate {
  type: PromptType;
  systemInstruction: string;
  userTemplate: (inputs: Record<string, string>) => string;
}

export const PROMPT_REGISTRY: Record<PromptType, PromptTemplate> = {
  summarize_journal: {
    type: 'summarize_journal',
    systemInstruction: 'You are an empathetic, clinical journaling assistant. Summarize the user\'s spoken stream of consciousness into structural milestones, bullet points, and key memories.',
    userTemplate: (inputs) => `Please summarize this transcription: "${inputs.transcript}"`,
  },
  emotional_analysis: {
    type: 'emotional_analysis',
    systemInstruction: 'You are an AI emotional intelligence coach. Analyze the emotional tone, sentiment shifts, and core triggers of the user\'s entry. Return a primary mood label, mood intensity score (1 to 10), and empathetic suggestions.',
    userTemplate: (inputs) => `Analyze the emotions in this text: "${inputs.transcript}"`,
  },
  pattern_discovery: {
    type: 'pattern_discovery',
    systemInstruction: 'You are an expert cognitive behavioral therapist. Analyze recurring themes, habit shifts, or repeating conflicts across these multiple entries to uncover lifestyle patterns.',
    userTemplate: (inputs) => `Uncover recurring patterns across these entries: "${inputs.entries}"`,
  },
  coaching_feedback: {
    type: 'coaching_feedback',
    systemInstruction: 'You are a warm, non-judgmental reflective coach. Generate supportive, thought-provoking open-ended questions based on the journal entry to help the user grow.',
    userTemplate: (inputs) => `Provide reflective coaching for this entry: "${inputs.transcript}"`,
  }
};

// 2. PROVIDER IMPLEMENTATIONS
export class GeminiProvider implements IAIServiceProvider {
  public name = 'Google Gemini 2.5';

  public async generateInsights(prompt: string, options?: Record<string, any>): Promise<AIResponse> {
    logger.info('GeminiProvider', 'Sending prompt to backend Gemini API proxy...');
    
    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemInstruction: options?.systemInstruction }),
      });

      if (!response.ok) {
        throw new Error(`Server returned code ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.text,
        tokensUsed: data.tokensUsed || 180,
        provider: this.name,
        cached: false,
        safetyClean: true,
      };
    } catch (err: any) {
      logger.error('GeminiProvider', 'Gemini API failed, falling back to secure simulated processor', err);
      // Fallback to simulated local model
      return new LocalMockProvider().generateInsights(prompt, options);
    }
  }
}

export class LocalMockProvider implements IAIServiceProvider {
  public name = 'On-Device Local AI (Offline)';

  public async generateInsights(prompt: string, options?: Record<string, any>): Promise<AIResponse> {
    logger.info('LocalMockProvider', 'Processing transcription with on-device mock LLM...');
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulating inference

    // Deterministic mock generation based on keywords
    let responseText = '';
    const lowPrompt = prompt.toLowerCase();

    if (lowPrompt.includes('summarize')) {
      responseText = `## Key Spoken Milestones\n- **Daily Focus**: Expressed thoughts about organizing schedules and managing time.\n- **Challenges**: Mentioned minor friction with tasks, but showed resilience.\n\n### Summary Recommendation\nContinue using voice logs to offload transient stress. High clarity of speech.`;
    } else if (lowPrompt.includes('emotions') || lowPrompt.includes('analyze')) {
      responseText = `### Emotional Profile\n- **Primary Tone**: Reflective & Positive\n- **Intensity Score**: 7/10\n- **Identified Triggers**: Discussing growth milestones and organizing structural layouts.\n\n### Supportive Insights\nYou seem to feel energized when planning. Incorporate more structuring elements into your routines to reduce ambient anxiety.`;
    } else {
      responseText = `### Dynamic Reflective Feedback\n- This entry presents a valuable perspective on your daily routine.\n- **Reflective Question**: How does writing down or speaking these ideas help clear your focus for the afternoon?`;
    }

    return {
      text: responseText,
      tokensUsed: 120,
      provider: this.name,
      cached: false,
      safetyClean: true,
    };
  }
}

// 3. SERVICE CONTEXT WITH CACHING & SAFETY FILTERING
class AIService {
  private static instance: AIService;
  private currentProvider: IAIServiceProvider;
  private providers: Record<string, IAIServiceProvider> = {};
  private cache: Record<string, { response: AIResponse; expiresAt: number }> = {};
  private usage: AIUsageRecord = {
    totalRequests: 0,
    totalTokens: 0,
    byProvider: {},
  };

  private constructor() {
    this.providers['gemini'] = new GeminiProvider();
    this.providers['local'] = new LocalMockProvider();
    // Default to Gemini (will fallback to Mock if key is missing/inactive)
    this.currentProvider = this.providers['gemini'];
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public setProvider(key: 'gemini' | 'local') {
    if (this.providers[key]) {
      this.currentProvider = this.providers[key];
      logger.info('AIService', `Switched active AI Provider to: ${this.currentProvider.name}`);
    }
  }

  public getActiveProviderName(): string {
    return this.currentProvider.name;
  }

  /**
   * Safety Guard filter (Moderation)
   */
  public performSafetyCheck(text: string): { isSafe: boolean; reason?: string } {
    const sensitiveKeywords = ['self-harm', 'suicide', 'bomb', 'kill myself'];
    const lower = text.toLowerCase();
    
    for (const kw of sensitiveKeywords) {
      if (lower.includes(kw)) {
        logger.warn('AIService', `Safety Filter flagged input containing sensitive trigger word: "${kw}"`);
        return { isSafe: false, reason: 'Flagged by sensitive triggers protection.' };
      }
    }
    return { isSafe: true };
  }

  /**
   * Safe AI Insight dispatching with built-in Safety Check, Caching and Usage tracking
   */
  public async generateInsightsForPrompt(
    promptType: PromptType,
    inputs: Record<string, string>,
    bypassCache: boolean = false
  ): Promise<AIResponse> {
    const template = PROMPT_REGISTRY[promptType];
    const compiledPrompt = template.userTemplate(inputs);

    // 1. Safety Filter Guard
    const safety = this.performSafetyCheck(compiledPrompt);
    if (!safety.isSafe) {
      return {
        text: `[SAFETY EXCEPTION]: This request could not be processed because it contains concepts related to: ${safety.reason}. If you are struggling, please reach out to professional support networks.`,
        tokensUsed: 0,
        provider: this.currentProvider.name,
        cached: false,
        safetyClean: false,
      };
    }

    // 2. Cache Check
    const cacheKey = `${this.currentProvider.name}_${promptType}_${JSON.stringify(inputs)}`;
    const cachedItem = this.cache[cacheKey];
    if (cachedItem && cachedItem.expiresAt > Date.now() && !bypassCache) {
      logger.info('AIService', `Returning CACHED response for prompt type: ${promptType}`);
      const responseCopy = { ...cachedItem.response, cached: true };
      return responseCopy;
    }

    // 3. Execution
    try {
      const response = await this.currentProvider.generateInsights(compiledPrompt, {
        systemInstruction: template.systemInstruction
      });

      // Update Caching
      this.cache[cacheKey] = {
        response,
        expiresAt: Date.now() + 10 * 60 * 1000, // Cache for 10 minutes
      };

      // Update Usage Tracker
      this.trackUsage(response);

      return response;
    } catch (e: any) {
      logger.error('AIService', `Error generating insights with provider: ${this.currentProvider.name}`, e);
      throw e;
    }
  }

  private trackUsage(response: AIResponse) {
    this.usage.totalRequests += 1;
    this.usage.totalTokens += response.tokensUsed;

    const providerKey = response.provider;
    if (!this.usage.byProvider[providerKey]) {
      this.usage.byProvider[providerKey] = { requests: 0, tokens: 0 };
    }
    this.usage.byProvider[providerKey].requests += 1;
    this.usage.byProvider[providerKey].tokens += response.tokensUsed;

    logger.debug('AIService', `Usage tracked. Total requests: ${this.usage.totalRequests}, Total tokens: ${this.usage.totalTokens}`);
  }

  public getUsageMetrics(): AIUsageRecord {
    return { ...this.usage };
  }

  public clearCache() {
    this.cache = {};
    logger.info('AIService', 'AI response cache cleared.');
  }
}

export const aiService = AIService.getInstance();
