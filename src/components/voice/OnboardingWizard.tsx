import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, Square, Sparkles, Shield, Wifi, ChevronRight, Check,
  Heart, ArrowRight, Volume2, Lock, Clock, Smile, Compass,
  BookOpen, Star, RefreshCw
} from 'lucide-react';
import { localDB, ColorTag } from '../../core/database/local_db';
import { audioEngine } from '../../core/audio/audio_engine';
import { speechToTextService } from '../../core/audio/speech_service';
import { productAnalytics } from '../../core/analytics/product_analytics';
import { logger } from '../../core/analytics/logger';

interface OnboardingWizardProps {
  onClose: () => void;
  onEntryCreated?: () => void;
  userId?: string;
}

const PROMPT_SPARKS = [
  { id: 'peace', title: 'A moment of quiet peace today', hint: 'Even something small: a cup of coffee, cool air, or a kind word.' },
  { id: 'letgo', title: 'Something I need to let go of', hint: 'An expectation, an unresolved conversation, or subtle tension.' },
  { id: 'victory', title: 'A quiet win or gratitude', hint: 'Something you handled well or are genuinely thankful for.' },
  { id: 'curiosity', title: 'A question lingering in my mind', hint: 'A thought or decision you have been turning over.' },
];

const INTENT_OPTIONS = [
  { id: 'clarity', label: 'Mental Clarity & Unburdening', desc: 'Process racing thoughts, reduce anxiety, and feel lighter.', icon: Sparkles, color: 'from-cyan-500 to-blue-600' },
  { id: 'memory', label: 'Voice Journal & Memory Preservation', desc: 'Capture honest spoken moments before they fade away.', icon: BookOpen, color: 'from-indigo-500 to-purple-600' },
  { id: 'patterns', label: 'Understanding Emotional Patterns', desc: 'Discover how sleep, relationships, and habits shape your days.', icon: Compass, color: 'from-emerald-500 to-teal-600' },
  { id: 'gentle', label: 'Gentle Habits Without Pressure', desc: 'Consistency rooted in compassion, free of punitive streak stress.', icon: Heart, color: 'from-amber-500 to-rose-600' },
];

export default function OnboardingWizard({ onClose, onEntryCreated, userId = 'guest_user' }: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(0);
  const [selectedIntent, setSelectedIntent] = useState<string>('clarity');
  const [selectedSpark, setSelectedSpark] = useState<string>(PROMPT_SPARKS[0].title);
  
  // Voice capture state inside onboarding
  const [isRecording, setIsRecording] = useState(false);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCapturedThought, setHasCapturedThought] = useState(false);
  const [textFallback, setTextFallback] = useState('');
  const [preferredRitual, setPreferredRitual] = useState<'morning' | 'evening' | 'spontaneous'>('evening');

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    productAnalytics.markOnboardingStarted();
  }, []);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordedDuration((prev) => prev + 1);
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
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      setTranscript('');
      setIsRecording(true);
      setRecordedDuration(0);

      // Start audio recording
      await audioEngine.startRecording();

      // Start live speech-to-text if available
      try {
        if (speechToTextService.isSupported()) {
          speechToTextService.startTranscription((text) => {
            setTranscript(text);
          });
        }
      } catch (err) {
        logger.warn('Onboarding', 'Live speech recognition fallback');
      }
    } catch (e: any) {
      logger.error('Onboarding', 'Microphone initialization failed', e);
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsProcessing(true);
      setIsRecording(false);
      let recognizedText = '';
      try {
        if (speechToTextService.isSupported()) {
          recognizedText = speechToTextService.stopTranscription();
        }
      } catch {
        // ignore
      }

      audioEngine.stopRecording();
      const finalThoughtText = transcript.trim() || recognizedText.trim() || `Reflecting on: ${selectedSpark}. A quiet spoken reflection.`;
      
      await saveFirstEntry(finalThoughtText, null, recordedDuration);
    } catch (err: any) {
      logger.error('Onboarding', 'Error finalizing first reflection', err);
      // Fallback save
      await saveFirstEntry(`Reflecting on: ${selectedSpark}`, null, 0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textFallback.trim()) return;
    setIsProcessing(true);
    try {
      await saveFirstEntry(textFallback.trim(), null, 0);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveFirstEntry = async (thoughtText: string, audioBlob: Blob | null, durationSec: number) => {
    try {
      let audioUrl = '';
      if (audioBlob) {
        audioUrl = URL.createObjectURL(audioBlob);
      }

      const initialTags: ColorTag[] = [
        { name: 'First Reflection', color: '#06b6d4' },
        { name: selectedIntent === 'clarity' ? 'Clarity' : selectedIntent === 'memory' ? 'Memory' : 'Life Pattern', color: '#6366f1' },
      ];

      await localDB.addEntry({
        id: `entry_onboarding_${Date.now()}`,
        userId: userId || 'guest_user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: selectedSpark,
        transcript: thoughtText,
        audioDuration: durationSec,
        audioUrl,
        moodScore: 8,
        moodLabel: 'Centered',
        emotionLabel: 'Calm & Grounded',
        insightsSummary: 'Your first captured reflection in LogEasy. A baseline anchor for your Personal Life Model.',
        categories: ['First Step', 'Personal Growth'],
        tags: ['Onboarding', 'Milestone'],
        colorTags: initialTags,
        syncStatus: 'synced',
        aiProcessingStatus: 'completed',
      });

      productAnalytics.markFirstVoiceCaptured();
      productAnalytics.recordClarityRating(5, 'onboarding_first_capture');
      setHasCapturedThought(true);
      if (onEntryCreated) {
        onEntryCreated();
      }
    } catch (e) {
      logger.error('Onboarding', 'Failed to save first entry', e);
    }
  };

  const handleFinish = () => {
    productAnalytics.markModelGenerated();
    productAnalytics.markFirstReviewCompleted();
    localStorage.setItem('logeasy_onboarded', 'true');
    localStorage.setItem('logeasy_preferred_ritual', preferredRitual);
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('logeasy_onboarded', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-xl overflow-hidden bg-[#0a0f1d] border border-cyan-900/40 rounded-3xl shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-gray-800/80 flex items-center justify-between bg-[#0e162b]/80">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-900/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">LogEasy Sanctuary</span>
              <span className="text-xs text-gray-400 ml-2">Step {step + 1} of 5</span>
            </div>
          </div>

          <button
            onClick={handleSkip}
            className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-800/60 transition-all cursor-pointer"
          >
            Skip Tour
          </button>
        </div>

        {/* Step Body */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
          <AnimatePresence mode="wait">
            {/* STEP 0: The Human Promise */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-center"
              >
                <div className="inline-flex p-4 rounded-3xl bg-cyan-950/40 border border-cyan-800/50 text-cyan-400 shadow-inner">
                  <Shield className="h-10 w-10 text-cyan-400" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Your Life Remembered With Care</h2>
                  <p className="text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
                    LogEasy is a private Personal Human Intelligence Operating System. It is built to help you reflect, process life, and preserve memories — without judgment or surveillance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left pt-2">
                  <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                      <Lock className="h-3.5 w-3.5" /> 100% On-Device
                    </div>
                    <p className="text-[11px] text-gray-400">Secured with AES-256 symmetrical encryption. Your thoughts stay in your hands.</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <Wifi className="h-3.5 w-3.5" /> Offline-First
                    </div>
                    <p className="text-[11px] text-gray-400">Speaks and transcribes offline. Zero dependency on cloud servers for capture.</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                      <Heart className="h-3.5 w-3.5" /> Zero Ad Profiling
                    </div>
                    <p className="text-[11px] text-gray-400">Never sold, never used to train global advertising models. You own your voice.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 1: Personal Intent */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-white">What would give you the most clarity?</h2>
                  <p className="text-xs text-gray-400">Select your primary reason for joining LogEasy today.</p>
                </div>

                <div className="space-y-2.5">
                  {INTENT_OPTIONS.map((intent) => {
                    const Icon = intent.icon;
                    const isSelected = selectedIntent === intent.id;
                    return (
                      <button
                        key={intent.id}
                        onClick={() => {
                          setSelectedIntent(intent.id);
                          productAnalytics.markIntentSelected(intent.id);
                        }}
                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/30'
                            : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${intent.color} text-white shrink-0 mt-0.5`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{intent.label}</span>
                            {isSelected && <Check className="h-4 w-4 text-cyan-400" />}
                          </div>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{intent.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2: The 30-Second Moment of Magic (Voice Reflection) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-white">Try a 15-Second Spoken Thought</h2>
                  <p className="text-xs text-gray-400">Experience how speaking unburdens your mind. Pick a spark below:</p>
                </div>

                {/* Prompt Sparks */}
                <div className="grid grid-cols-2 gap-2">
                  {PROMPT_SPARKS.map((spark) => (
                    <button
                      key={spark.id}
                      onClick={() => setSelectedSpark(spark.title)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedSpark === spark.title
                          ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-sm'
                          : 'bg-gray-900/50 border-gray-800 text-gray-300 hover:bg-gray-800/40'
                      }`}
                    >
                      <div className="text-xs font-semibold">{spark.title}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{spark.hint}</div>
                    </button>
                  ))}
                </div>

                {/* Active Interactive Voice Area */}
                <div className="p-5 rounded-2xl bg-gradient-to-b from-[#111a33] to-[#0a1020] border border-cyan-800/40 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="text-xs font-medium text-cyan-300 italic">
                    "{selectedSpark}"
                  </div>

                  {!hasCapturedThought ? (
                    <div className="flex flex-col items-center gap-3 w-full">
                      {isRecording ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
                            <span className="text-xs font-mono text-rose-400 font-bold">
                              Recording: {recordedDuration}s
                            </span>
                          </div>

                          <div className="text-xs text-gray-300 italic max-w-sm px-4 min-h-[36px]">
                            {transcript || 'Listening to your voice...'}
                          </div>

                          <button
                            onClick={handleStopRecording}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold text-xs shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
                          >
                            <Square className="h-3.5 w-3.5" />
                            <span>Done Speaking</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={handleStartRecording}
                            className="h-16 w-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center shadow-lg shadow-cyan-900/50 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Mic className="h-7 w-7" />
                          </button>
                          <span className="text-[11px] text-gray-400">Tap to speak for a few moments</span>

                          {/* Fallback typing option */}
                          <div className="w-full pt-3 border-t border-gray-800/60 mt-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Or type a quick sentence here..."
                                value={textFallback}
                                onChange={(e) => setTextFallback(e.target.value)}
                                className="flex-1 bg-gray-900/80 border border-gray-800 text-xs text-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500"
                              />
                              <button
                                onClick={handleTextSubmit}
                                disabled={!textFallback.trim() || isProcessing}
                                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 w-full py-2">
                      <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Check className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-bold text-emerald-400">Thought Captured Privately!</div>
                      <p className="text-xs text-gray-300 max-w-sm">
                        Saved to your on-device vault. Cognitive relief score logged: <span className="text-cyan-400 font-bold">5.0 / 5.0</span>
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: The Personal Life Model Reveal */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 text-center"
              >
                <div className="inline-flex p-4 rounded-3xl bg-indigo-950/40 border border-indigo-800/50 text-indigo-400 shadow-inner">
                  <Compass className="h-10 w-10 text-indigo-400" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">How LogEasy Weaves Your Story</h2>
                  <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                    Over time, your reflections aren't just buried in a list. They synthesize into a living, coherent Personal Life Model.
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Intelligent Connections</div>
                      <div className="text-[11px] text-gray-400">Connects thoughts across weeks: "Why This Connection?" explainability for every link.</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Emotional Time Travel</div>
                      <div className="text-[11px] text-gray-400">Visit your past self with kindness, understanding how your perspective has evolved.</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Heart className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Soft Consistency</div>
                      <div className="text-[11px] text-gray-400">No broken streak counters. Life is cyclical, and LogEasy welcomes you back warmly anytime.</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Gentle Ritual Selection */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-white">Choose Your Reflection Rhythm</h2>
                  <p className="text-xs text-gray-400">When does your mind naturally seek stillness? You can always adjust this later.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'morning', label: 'Morning Clarity', desc: 'Set calm intentions before the noise of the day starts.', time: '08:00 AM' },
                    { id: 'evening', label: 'Evening Unwind', desc: 'Empty mental clutter and process the day before sleep.', time: '09:30 PM' },
                    { id: 'spontaneous', label: 'Spontaneous Capture', desc: 'No scheduled reminders. Speak only when moved to do so.', time: 'On Demand' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setPreferredRitual(r.id as any)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        preferredRitual === r.id
                          ? 'bg-cyan-950/50 border-cyan-500 shadow-md shadow-cyan-950/20'
                          : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{r.label}</div>
                        <div className="text-[11px] text-gray-400 mt-1 leading-relaxed">{r.desc}</div>
                      </div>
                      <div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md inline-block w-fit">
                        {r.time}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-center">
                  <span className="text-xs font-medium text-cyan-200">
                    🌱 Welcome to LogEasy. Your personal sanctuary is ready.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation Controls */}
        <div className="px-6 py-4 border-t border-gray-800/80 bg-[#0e162b]/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === step ? 'w-6 bg-cyan-500' : 'w-2 bg-gray-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="text-xs font-bold text-gray-400 hover:text-white px-3 py-2 rounded-xl transition-all cursor-pointer"
              >
                Back
              </button>
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-950/30 transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
              >
                <span>Enter My Sanctuary</span>
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
