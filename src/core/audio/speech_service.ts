/**
 * LogEasy Real-time Speech-to-Text Service (Path A)
 * Hardened Web Speech API integration:
 * - Proper auto-restart logic preventing infinite loop crashes
 * - Explicit final vs interim transcript separation preventing duplicate text duplication
 * - Permission & microphone disconnection recovery
 * - Graceful fallback without ever failing audio capture
 */

import { logger } from '../analytics/logger';

export interface SpeechRecognitionResult {
  text: string;
  isFinal: boolean;
}

class SpeechToTextService {
  private static instance: SpeechToTextService;
  private recognition: any = null;
  private currentTranscript: string = '';
  private interimTranscript: string = '';
  private onTranscriptUpdateListener: ((text: string) => void) | null = null;
  private isListening: boolean = false;
  private shouldBeListening: boolean = false;
  private selectedLanguage: string = 'en-US';
  private restartCount: number = 0;
  private readonly MAX_RESTARTS = 10;
  private restartTimeout: any = null;

  private constructor() {
    this.initializeEngine();
  }

  public static getInstance(): SpeechToTextService {
    if (!SpeechToTextService.instance) {
      SpeechToTextService.instance = new SpeechToTextService();
    }
    return SpeechToTextService.instance;
  }

  private initializeEngine() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logger.warn('SpeechToTextService', 'Web Speech API (SpeechRecognition) is not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.selectedLanguage;

      this.recognition.onstart = () => {
        logger.info('SpeechToTextService', `Speech recognition session started in: ${this.selectedLanguage}`);
        this.isListening = true;
        this.restartCount = 0;
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let newlyFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            newlyFinal += (res[0]?.transcript || '');
          } else {
            interim += (res[0]?.transcript || '');
          }
        }

        if (newlyFinal.trim()) {
          const cleaned = newlyFinal.trim();
          if (!this.currentTranscript.endsWith(cleaned)) {
            this.currentTranscript = (this.currentTranscript ? `${this.currentTranscript} ${cleaned}` : cleaned).trim();
          }
        }

        this.interimTranscript = interim.trim();
        const combined = (this.currentTranscript + (this.interimTranscript ? ` ${this.interimTranscript}` : '')).trim();

        if (this.onTranscriptUpdateListener) {
          this.onTranscriptUpdateListener(combined);
        }
      };

      this.recognition.onerror = (event: any) => {
        logger.warn('SpeechToTextService', `Speech recognition warning: ${event.error}`);
        if (event.error === 'not-allowed') {
          this.shouldBeListening = false;
          this.isListening = false;
        }
      };

      this.recognition.onend = () => {
        logger.debug('SpeechToTextService', 'Speech recognition session paused/ended.');
        this.isListening = false;
        
        // Auto-restart if we should still be listening (supports long recording sessions safely)
        if (this.shouldBeListening && this.restartCount < this.MAX_RESTARTS) {
          this.restartCount += 1;
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.shouldBeListening && !this.isListening) {
              try {
                this.recognition.start();
              } catch (e) {
                logger.debug('SpeechToTextService', 'Safe restart ignored (already active)');
              }
            }
          }, 200);
        }
      };
    } catch (e) {
      logger.error('SpeechToTextService', 'Failed to configure browser SpeechRecognition instance', e);
    }
  }

  public setLanguage(lang: string) {
    this.selectedLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
    logger.info('SpeechToTextService', `Set Speech Language target to: ${lang}`);
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public startTranscription(onUpdate: (text: string) => void) {
    if (!this.isSupported()) {
      logger.warn('SpeechToTextService', 'Speech recognition ignored (unsupported browser).');
      return;
    }

    this.currentTranscript = '';
    this.interimTranscript = '';
    this.onTranscriptUpdateListener = onUpdate;
    this.shouldBeListening = true;
    this.restartCount = 0;

    try {
      this.recognition.lang = this.selectedLanguage;
      this.recognition.start();
    } catch (e) {
      logger.debug('SpeechToTextService', 'Error starting SpeechRecognition engine; reinitializing', e);
      this.initializeEngine();
      try {
        this.recognition.start();
      } catch (retryErr) {
        logger.warn('SpeechToTextService', 'Retry start failed', retryErr);
      }
    }
  }

  public stopTranscription(): string {
    this.shouldBeListening = false;
    this.isListening = false;
    clearTimeout(this.restartTimeout);

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        logger.debug('SpeechToTextService', 'Recognition was already stopped.');
      }
    }

    const finalResult = (this.currentTranscript + (this.interimTranscript ? ` ${this.interimTranscript}` : '')).trim();
    this.onTranscriptUpdateListener = null;
    return finalResult;
  }

  public getLiveTranscript(): string {
    return (this.currentTranscript + (this.interimTranscript ? ` ${this.interimTranscript}` : '')).trim();
  }
}

export const speechToTextService = SpeechToTextService.getInstance();
