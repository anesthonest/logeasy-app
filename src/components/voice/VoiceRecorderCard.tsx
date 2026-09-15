import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Pause, Play, Trash2, Sliders, Check, CircleAlert, Sparkles, Languages } from 'lucide-react';
import { audioEngine, AudioMetadata } from '../../core/audio/audio_engine';
import { logger } from '../../core/analytics/logger';
import { speechToTextService } from '../../core/audio/speech_service';

interface VoiceRecorderCardProps {
  onRecordComplete: (blob: Blob, metadata: AudioMetadata & { transcript?: string; language?: string }, settings: { quality: string; noiseReduction: boolean }) => void;
  onCancel: () => void;
}

export default function VoiceRecorderCard({ onRecordComplete, onCancel }: VoiceRecorderCardProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  // Recorder settings
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [noiseReduction, setNoiseReduction] = useState(true);
  const [selectedLang, setSelectedLang] = useState<string>('en-US');
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Check initial permissions if possible
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any })
        .then((result) => {
          if (result.state === 'granted') {
            setPermissionState('granted');
          } else if (result.state === 'denied') {
            setPermissionState('denied');
          }
        })
          .catch(() => {});
    }
  }, []);

  // Timer counter hook
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Audio level meter visualization subscription
  useEffect(() => {
    const unsubLevel = audioEngine.subscribeToLevel((lvl) => {
      setVolume(lvl);
      drawLiveWave(lvl);
    });

    const unsubRecord = audioEngine.subscribeToRecordings((blob, meta) => {
      const transcriptText = speechToTextService.stopTranscription();
      // Send completed recording up to parent view with attached live transcript
      onRecordComplete(blob, {
        ...meta,
        transcript: transcriptText || undefined,
        language: selectedLang
      }, { quality, noiseReduction });
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setLiveTranscript('');
    });

    return () => {
      unsubLevel();
      unsubRecord();
    };
  }, [quality, noiseReduction, selectedLang]);

  // Render oscillograph style wave canvas
  const drawLiveWave = (lvl: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Waveform rendering configurations
    const bars = 30;
    const barWidth = 3;
    const gap = 3;
    const totalWidth = bars * (barWidth + gap);
    const startX = (canvas.width - totalWidth) / 2;

    const baseColor = '#06b6d4'; // Cyan-500
    ctx.fillStyle = baseColor;

    for (let i = 0; i < bars; i++) {
      // Create natural acoustic oscillation heights matching current volume
      const progressFactor = Math.sin(i * 0.25 + Date.now() * 0.015);
      const height = Math.max(
        6,
        (lvl / 100) * canvas.height * 0.75 + progressFactor * 12
      );
      
      const x = startX + i * (barWidth + gap);
      const y = (canvas.height - height) / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, height, 2);
      ctx.fill();
    }
  };

  const handleStart = async () => {
    logger.info('RecorderCard', 'Requesting microphone hardware authorization...');
    const hasPermission = await audioEngine.requestPermissions();
    if (hasPermission) {
      setPermissionState('granted');
      const success = await audioEngine.startRecording();
      if (success) {
        setIsRecording(true);
        setIsPaused(false);
        setDuration(0);
        setLiveTranscript('');

        // Initialize real-time Speech recognition engine
        speechToTextService.setLanguage(selectedLang);
        speechToTextService.startTranscription((text) => {
          setLiveTranscript(text);
        });

        logger.info('RecorderCard', `Recording started at quality level: ${quality}`);
      }
    } else {
      setPermissionState('denied');
      logger.error('RecorderCard', 'Microphone access request rejected by client OS permissions.');
    }
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      audioEngine.resumeRecording();
      setIsPaused(false);
    } else {
      audioEngine.pauseRecording();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    audioEngine.stopRecording();
    // This fires the mediaRecorder.onstop internally, triggering subscribeToRecordings callback
  };

  const handleCancel = () => {
    audioEngine.stopRecording();
    speechToTextService.stopTranscription();
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setLiveTranscript('');
    onCancel();
    logger.warn('RecorderCard', 'Spoken entry recording canceled. Storage buffers flushed.');
  };

  // Estimate file size in real-time based on selected bitrates
  const getEstimatedSizeKb = () => {
    const bitrates = { high: 128, medium: 64, low: 32 };
    const kbps = bitrates[quality];
    return ((kbps * duration) / 8).toFixed(1);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-6">
      {/* Visual Header */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-500/10">
        <div>
          <h3 className="text-sm font-bold text-gray-200">Hardware Recording Hub</h3>
          <p className="text-[11px] text-gray-400">Offline-first voice stream encryption node</p>
        </div>
        <div className="flex gap-2">
          {permissionState === 'granted' && (
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-md flex items-center gap-1 font-mono">
              <Check className="h-3 w-3" /> MIC_ACTIVE
            </span>
          )}
          {permissionState === 'denied' && (
            <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-md flex items-center gap-1 font-mono">
              <CircleAlert className="h-3 w-3" /> MIC_BLOCKED
            </span>
          )}
        </div>
      </div>

      {/* Wave visualizer view */}
      <div className="relative w-full h-[100px] bg-[#0b0f19] rounded-2xl border border-cyan-500/15 flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} width={400} height={100} className="w-full h-full" />
        
        {!isRecording && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1.5 bg-[#0b0f19]/90 backdrop-blur-sm select-none">
            <Mic className="h-6 w-6 text-cyan-500/40 animate-pulse" />
            <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest">
              Ready to Capture
            </span>
          </div>
        )}

        {isRecording && isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0f19]/80 backdrop-blur-sm font-mono text-xs text-amber-400 uppercase tracking-wider font-bold">
            Recording Paused
          </div>
        )}
      </div>

      {/* Live Transcript Stream Preview */}
      {isRecording && (
        <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/10 rounded-xl space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            <Languages className="h-3.5 w-3.5 animate-pulse" />
            <span>Live Speech-to-Text Preview ({selectedLang})</span>
          </div>
          <p className="text-xs text-gray-300 italic leading-relaxed break-words">
            {liveTranscript || 'Start speaking to capture live, browser-native voice transcription...'}
          </p>
        </div>
      )}

      {/* Recording diagnostics */}
      {isRecording && (
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 bg-gray-500/5 px-3.5 py-2.5 rounded-xl border border-gray-500/10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-gray-200 font-bold">{formatTime(duration)}</span>
          </div>
          <div>
            <span>Est. Size: </span>
            <span className="text-cyan-400 font-bold">{getEstimatedSizeKb()} KB</span>
          </div>
          <div className="capitalize text-gray-300">
            {quality} ql • {noiseReduction ? 'filter' : 'raw'}
          </div>
        </div>
      )}

      {/* Settings Grid */}
      {!isRecording && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Quality Preset Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">Quality Presets</label>
            <div className="grid grid-cols-3 gap-1 bg-gray-500/5 p-1 rounded-xl border border-gray-500/10">
              {(['high', 'medium', 'low'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`py-1 text-[10px] uppercase font-bold rounded-lg cursor-pointer transition-all ${
                    quality === q
                      ? 'bg-cyan-500 text-white font-black'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Noise Suppression setting */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">Noise Filter</label>
            <button
              onClick={() => setNoiseReduction(!noiseReduction)}
              className={`w-full py-1.5 px-3 text-xs font-semibold rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                noiseReduction
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-gray-500/5 border-gray-500/10 text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Smart Suppress</span>
              </div>
              <span className="text-[9px] font-mono opacity-80">{noiseReduction ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Transcription Language Selection */}
      {!isRecording && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">Transcription Accent / Language</label>
          <div className="relative">
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="w-full py-2.5 pl-3.5 pr-10 bg-gray-500/5 border border-gray-500/10 hover:border-gray-500/20 text-xs text-gray-300 rounded-xl outline-none transition-all cursor-pointer appearance-none"
            >
              <option value="en-US" className="bg-[#0b0f19] text-gray-300">English (United States)</option>
              <option value="es-ES" className="bg-[#0b0f19] text-gray-300">Spanish (Spain)</option>
              <option value="fr-FR" className="bg-[#0b0f19] text-gray-300">French (France)</option>
              <option value="de-DE" className="bg-[#0b0f19] text-gray-300">German (Germany)</option>
              <option value="ja-JP" className="bg-[#0b0f19] text-gray-300">Japanese (Japan)</option>
              <option value="zh-CN" className="bg-[#0b0f19] text-gray-300">Chinese (China)</option>
              <option value="pt-BR" className="bg-[#0b0f19] text-gray-300">Portuguese (Brazil)</option>
              <option value="hi-IN" className="bg-[#0b0f19] text-gray-300">Hindi (India)</option>
            </select>
            <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
              <Languages className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      {/* Core Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-2">
        {isRecording && (
          <button
            onClick={handleCancel}
            title="Discard current capture"
            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-full transition-all cursor-pointer"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}

        <button
          onClick={isRecording ? handleStop : handleStart}
          className={`p-6 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-950/20'
          }`}
        >
          {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        {isRecording && (
          <button
            onClick={handlePauseToggle}
            title={isPaused ? 'Resume Recording' : 'Pause Recording'}
            className="p-3 bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 border border-gray-500/20 rounded-full transition-all cursor-pointer"
          >
            {isPaused ? <Play className="h-5 w-5 text-emerald-400 fill-current" /> : <Pause className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
