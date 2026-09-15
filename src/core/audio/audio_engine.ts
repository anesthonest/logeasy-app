/**
 * LogEasy Audio & Voice Engine Foundation
 * Manages low-level browser microphone permissions, MediaRecorder state,
 * and Web Audio API AnalyserNodes for dynamic visualization support.
 */

import { logger } from '../analytics/logger';

export interface AudioMetadata {
  duration: number; // in seconds
  mimeType: string;
  blobSize: number;
  recordedAt: string;
}

class AudioEngine {
  private static instance: AudioEngine;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;

  private startTime: number = 0;
  private isRecording: boolean = false;
  private isPaused: boolean = false;
  
  private onDataAvailableListeners: ((blob: Blob, metadata: AudioMetadata) => void)[] = [];
  private onLevelListeners: ((level: number) => void)[] = [];
  private rafId: number | null = null;

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Safe permission check for Microphone access
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        logger.error('AudioEngine', 'Microphone recording not supported on this browser.');
        return false;
      }
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop stream immediately since this was just a permission check
      testStream.getTracks().forEach((track) => track.stop());
      logger.info('AudioEngine', 'Microphone permission granted.');
      return true;
    } catch (e) {
      logger.error('AudioEngine', 'Failed to request mic permissions', e);
      return false;
    }
  }

  /**
   * Start microphone capture and analysis
   */
  public async startRecording(): Promise<boolean> {
    if (this.isRecording) return false;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.startTime = Date.now();

      // Configure MediaRecorder
      const options = { mimeType: this.getSupportedMimeType() };
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: options.mimeType });
        const durationSec = Math.round((Date.now() - this.startTime) / 1000);
        
        const metadata: AudioMetadata = {
          duration: durationSec > 0 ? durationSec : 1,
          mimeType: options.mimeType,
          blobSize: audioBlob.size,
          recordedAt: new Date().toISOString(),
        };

        logger.info('AudioEngine', `Voice capture stopped. File size: ${(audioBlob.size / 1024).toFixed(1)} KB, Duration: ${durationSec}s`);
        this.onDataAvailableListeners.forEach((listener) => listener(audioBlob, metadata));
        
        this.cleanupAudioNodes();
      };

      // Set up Web Audio API Analyser for wave visuals
      this.setupAnalyser(this.stream);

      // Start recording
      this.mediaRecorder.start(250); // Emit chunks every 250ms
      this.isRecording = true;
      this.isPaused = false;
      logger.info('AudioEngine', 'Microphone recording started');
      return true;
    } catch (err) {
      logger.error('AudioEngine', 'Failed to start voice capture', err);
      this.cleanupAudioNodes();
      return false;
    }
  }

  public pauseRecording() {
    if (this.mediaRecorder && this.isRecording && !this.isPaused) {
      this.mediaRecorder.pause();
      this.isPaused = true;
      logger.info('AudioEngine', 'Recording paused.');
    }
  }

  public resumeRecording() {
    if (this.mediaRecorder && this.isRecording && this.isPaused) {
      this.mediaRecorder.resume();
      this.isPaused = false;
      logger.info('AudioEngine', 'Recording resumed.');
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.isPaused = false;
    }
  }

  public getRecordState() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
    };
  }

  /**
   * Subscribe to completed recording blobs
   */
  public subscribeToRecordings(listener: (blob: Blob, metadata: AudioMetadata) => void): () => void {
    this.onDataAvailableListeners.push(listener);
    return () => {
      this.onDataAvailableListeners = this.onDataAvailableListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Subscribe to real-time micro-level changes for level meters
   */
  public subscribeToLevel(listener: (level: number) => void): () => void {
    this.onLevelListeners.push(listener);
    return () => {
      this.onLevelListeners = this.onLevelListeners.filter((l) => l !== listener);
    };
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  private setupAnalyser(stream: MediaStream) {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyserNode);

      const bufferLength = this.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!this.isRecording || !this.analyserNode) {
          if (this.rafId) cancelAnimationFrame(this.rafId);
          return;
        }

        this.rafId = requestAnimationFrame(draw);
        this.analyserNode.getByteFrequencyData(dataArray);

        // Compute average root mean square level
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;
        const normalized = Math.min(100, Math.round((average / 255) * 100));
        
        this.onLevelListeners.forEach((listener) => listener(normalized));
      };

      draw();
    } catch (e) {
      logger.warn('AudioEngine', 'Failed to configure browser Audio Analyser context.', e);
    }
  }

  private cleanupAudioNodes() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyserNode = null;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.isRecording = false;
    this.isPaused = false;
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }
}

export const audioEngine = AudioEngine.getInstance();
