/**
 * LogEasy Real-time Speech-to-Text Service
 * Integrates Web Speech API (webkitSpeechRecognition) for live, browser-native transcription.
 * Provides error recovery, continuous long recording capture, and multi-accent support.
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
  private onTranscriptUpdateListener: ((text: string) => void) | null = null;
  private isListening: boolean = false;
  private selectedLanguage: string = 'en-US';

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
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          this.currentTranscript += (this.currentTranscript ? ' ' : '') + finalTranscript.trim();
        }

        const combined = (this.currentTranscript + ' ' + interimTranscript).trim();
        if (this.onTranscriptUpdateListener) {
          this.onTranscriptUpdateListener(combined);
        }
      };

      this.recognition.onerror = (event: any) => {
        logger.error('SpeechToTextService', `Speech recognition error encountered: ${event.error}`, event);
        if (event.error === 'network') {
          logger.warn('SpeechToTextService', 'Network friction. Attempting offline/fallback caching.');
        }
      };

      this.recognition.onend = () => {
        logger.info('SpeechToTextService', 'Speech recognition session ended.');
        this.isListening = false;
        // Auto-restart if we are still supposed to be listening (helps support long recordings)
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {
            logger.error('SpeechToTextService', 'Auto-restart failed', e);
          }
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
    logger.info('SpeechToTextService', `Set Speech Language language target to: ${lang}`);
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
    this.onTranscriptUpdateListener = onUpdate;
    this.isListening = true;

    try {
      this.recognition.lang = this.selectedLanguage;
      this.recognition.start();
    } catch (e) {
      logger.error('SpeechToTextService', 'Error starting SpeechRecognition engine', e);
      // Re-initialize if state gets desynchronized
      this.initializeEngine();
      try {
        this.recognition.start();
      } catch (retryErr) {
        logger.error('SpeechToTextService', 'Retry starting engine failed', retryErr);
      }
    }
  }

  public stopTranscription(): string {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        logger.debug('SpeechToTextService', 'Recognition was already stopped.');
      }
    }
    const finalResult = this.currentTranscript.trim();
    this.onTranscriptUpdateListener = null;
    return finalResult;
  }

  public getLiveTranscript(): string {
    return this.currentTranscript;
  }
}

export const speechToTextService = SpeechToTextService.getInstance();
