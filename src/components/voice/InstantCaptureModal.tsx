import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Mic, Square, Image, FileText, Check, AlertCircle, 
  X, Sparkles, Shield, Clock, ArrowRight, Loader2
} from 'lucide-react';
import { instantCaptureEngine, CaptureType } from '../../core/audio/instant_capture_engine';
import { LocalJournalEntry } from '../../core/database/local_db';
import { logger } from '../../core/analytics/logger';

interface InstantCaptureModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onCaptured: (entry: LocalJournalEntry) => void;
}

export default function InstantCaptureModal({
  userId,
  isOpen,
  onClose,
  onCaptured,
}: InstantCaptureModalProps) {
  const [activeType, setActiveType] = useState<CaptureType>('quick_note');
  const [textContent, setTextContent] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [moodScore, setMoodScore] = useState(7);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [capturedImage, setCapturedImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      logger.error('InstantCaptureModal', 'Microphone access failed', err);
      setCaptureError('Microphone permission or access was denied. Please allow microphone in browser.');
      setTimeout(() => setCaptureError(null), 5000);
    }
  };

  const stopRecordingAndSave = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setIsRecording(false);
    setIsSaving(true);

    const mediaRecorder = mediaRecorderRef.current;
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());

      try {
        const entry = await instantCaptureEngine.captureImmediately({
          userId,
          type: 'voice',
          audioBlob,
          audioDurationSeconds: recordingSeconds,
          title: titleInput.trim() || `Instant Voice Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          moodScore,
        });

        onCaptured(entry);
        setSaveConfirmation('Vocal thought safely encrypted on-device. Background transcription queued.');
        setTimeout(() => {
          setSaveConfirmation(null);
          onClose();
        }, 1800);
      } catch (e: any) {
        logger.error('InstantCaptureModal', 'Voice capture failed', e);
      } finally {
        setIsSaving(false);
      }
    };

    mediaRecorder.stop();
  };

  const handleSaveText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const entry = await instantCaptureEngine.captureImmediately({
        userId,
        type: activeType,
        text: textContent.trim(),
        title: titleInput.trim() || (activeType === 'photo_screenshot' ? 'Photo Note' : 'Instant Thought'),
        imageBlob: capturedImage?.blob,
        imageUrl: capturedImage?.url,
        moodScore,
      });

      onCaptured(entry);
      setSaveConfirmation('Thought persisted instantly. Background intelligence link queued.');
      setTextContent('');
      setTitleInput('');
      setCapturedImage(null);

      setTimeout(() => {
        setSaveConfirmation(null);
        onClose();
      }, 1500);
    } catch (e) {
      logger.error('InstantCaptureModal', 'Text capture failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCapturedImage({ blob: file, url });
    setActiveType('photo_screenshot');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#0b0f19] border border-cyan-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-500/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Instant Capture</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  &lt; 50ms Local Save
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">Capture now. Enrich &amp; organize in the background.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-500/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Confirmation banner */}
        <AnimatePresence>
          {saveConfirmation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium"
            >
              <Check className="h-4 w-4 shrink-0" />
              <span>{saveConfirmation}</span>
            </motion.div>
          )}
          {captureError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 font-medium"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{captureError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Capture Type Switcher */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'quick_note', label: 'Quick Thought', icon: FileText },
            { id: 'voice', label: 'Spoken Voice', icon: Mic },
            { id: 'photo_screenshot', label: 'Screenshot / Photo', icon: Image },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeType === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'photo_screenshot' && !capturedImage) {
                    fileInputRef.current?.click();
                  } else {
                    setActiveType(item.id as CaptureType);
                  }
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-gray-500/5 border-gray-500/15 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[11px]">{item.label}</span>
              </button>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* Optional Title */}
        <div>
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Optional Title (e.g. Sudden Idea, Meeting Observation)..."
            className="w-full px-3.5 py-2 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-cyan-400 transition-all font-mono"
          />
        </div>

        {/* VOICE RECORDER BODY */}
        {activeType === 'voice' && (
          <div className="p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/15 flex flex-col items-center justify-center space-y-4 text-center">
            {isRecording ? (
              <>
                <div className="h-16 w-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center animate-pulse">
                  <Mic className="h-8 w-8 text-red-400" />
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-mono font-bold text-white">
                    {Math.floor(recordingSeconds / 60)}:
                    {(recordingSeconds % 60).toString().padStart(2, '0')}
                  </div>
                  <p className="text-[11px] text-gray-400">Capturing audio stream locally...</p>
                </div>
                <button
                  onClick={stopRecordingAndSave}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-all"
                >
                  <Square className="h-4 w-4 fill-white" />
                  <span>Save Audio &amp; Process Later</span>
                </button>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Mic className="h-8 w-8 text-cyan-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-gray-200">Zero-Wait Vocal Recording</h4>
                  <p className="text-[11px] text-gray-400 max-w-xs">
                    Tap below to speak freely. The audio is saved to your encrypted local database immediately.
                  </p>
                </div>
                <button
                  onClick={startRecording}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-all"
                >
                  <Mic className="h-4 w-4" />
                  <span>Start Instant Voice Recording</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* TEXT & PHOTO BODY */}
        {activeType !== 'voice' && (
          <form onSubmit={handleSaveText} className="space-y-3">
            {capturedImage && (
              <div className="relative rounded-xl overflow-hidden border border-gray-500/20 max-h-40 flex items-center justify-center bg-black/40">
                <img
                  src={capturedImage.url}
                  alt="Captured screenshot"
                  className="object-contain max-h-40 w-full"
                />
                <button
                  type="button"
                  onClick={() => setCapturedImage(null)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-gray-300 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="What is happening right now? Type thoughts, feelings, or paste context..."
              rows={4}
              autoFocus
              className="w-full p-3.5 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-cyan-400 transition-all leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                <span>Energy/Mood:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={moodScore}
                  onChange={(e) => setMoodScore(Number(e.target.value))}
                  className="w-20 accent-cyan-400 cursor-pointer"
                />
                <span className="font-bold text-cyan-300">{moodScore}/10</span>
              </div>

              <button
                type="submit"
                disabled={!textContent.trim() || isSaving}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Save Immediately</span>
              </button>
            </div>
          </form>
        )}

        {/* Security & Non-blocking Guarantee Badge */}
        <div className="pt-2 border-t border-gray-500/10 flex items-center justify-between text-[10px] text-gray-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>AES-256 On-Device Vault</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>Non-Blocking Background Intelligence</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
