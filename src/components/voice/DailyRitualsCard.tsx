import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, Moon, Sparkles, Heart, Check, ArrowRight, 
  Smile, Shield, Sliders, Volume2, Mic, X
} from 'lucide-react';
import { ritualsService, MorningRitual, EveningRitual, CalmRecognition } from '../../core/intelligence/rituals_service';
import { LocalJournalEntry } from '../../core/database/local_db';

interface DailyRitualsCardProps {
  userId: string;
  localEntries: LocalJournalEntry[];
  onComplete?: () => void;
}

export default function DailyRitualsCard({ userId, localEntries, onComplete }: DailyRitualsCardProps) {
  const currentHour = new Date().getHours();
  const defaultMode = currentHour < 15 ? 'morning' : 'evening';
  const [activeMode, setActiveMode] = useState<'morning' | 'evening'>(defaultMode);

  // Morning Inputs
  const [energyLevel, setEnergyLevel] = useState(7);
  const [dailyIntention, setDailyIntention] = useState('');
  const [gratitudeThought, setGratitudeThought] = useState('');
  const [morningSaved, setMorningSaved] = useState<MorningRitual | null>(null);

  // Evening Inputs
  const [howDayFelt, setHowDayFelt] = useState('');
  const [meaningfulMoment, setMeaningfulMoment] = useState('');
  const [lessonLearned, setLessonLearned] = useState('');
  const [unfinishedThought, setUnfinishedThought] = useState('');
  const [tomorrowIntention, setTomorrowIntention] = useState('');
  const [eveningSaved, setEveningSaved] = useState<EveningRitual | null>(null);

  // Calm recognition reward
  const [recognition, setRecognition] = useState<CalmRecognition>(() => ritualsService.getCalmRecognition(localEntries));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    setMorningSaved(ritualsService.getSavedMorningRitual(userId));
    setEveningSaved(ritualsService.getSavedEveningRitual(userId));
    setRecognition(ritualsService.getCalmRecognition(localEntries));
  }, [userId, localEntries]);

  const handleSaveMorning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyIntention.trim()) return;

    setIsSubmitting(true);
    const saved = ritualsService.saveMorningRitual(userId, {
      energyLevel,
      dailyIntention: dailyIntention.trim(),
      gratitudeThought: gratitudeThought.trim() || undefined,
    });
    setMorningSaved(saved);
    setIsSubmitting(false);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3500);
    onComplete?.();
  };

  const handleSaveEvening = (e: React.FormEvent) => {
    e.preventDefault();
    if (!howDayFelt.trim() || !meaningfulMoment.trim()) return;

    setIsSubmitting(true);
    const saved = ritualsService.saveEveningRitual(userId, {
      howDayFelt: howDayFelt.trim(),
      meaningfulMoment: meaningfulMoment.trim(),
      lessonLearned: lessonLearned.trim() || undefined,
      unfinishedThought: unfinishedThought.trim() || undefined,
      tomorrowIntention: tomorrowIntention.trim() || undefined,
    });
    setEveningSaved(saved);
    setIsSubmitting(false);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3500);
    onComplete?.();
  };

  return (
    <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-5 relative overflow-hidden backdrop-blur-md">
      
      {/* Calm Recognition Micro-Reward Banner */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs">
        <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-0.5 flex-1 min-w-0">
          <h4 className="font-bold text-cyan-300 text-xs font-mono uppercase">{recognition.title}</h4>
          <p className="text-[11.5px] text-gray-300 leading-relaxed truncate-2-lines">{recognition.message}</p>
        </div>
      </div>

      {/* Mode Selector Tabs (Morning / Evening) */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-500/10 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMode('morning')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeMode === 'morning'
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>Morning Ritual</span>
            {morningSaved && <Check className="h-3 w-3 text-emerald-400 ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('evening')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeMode === 'evening'
                ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            <span>Evening Reflection</span>
            {eveningSaved && <Check className="h-3 w-3 text-emerald-400 ml-1" />}
          </button>
        </div>

        <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
          Non-punitive • Flexible
        </span>
      </div>

      {/* Confirmation notification banner */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>Ritual reflection safely encrypted and anchored into your journal.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MORNING RITUAL FORM */}
      {activeMode === 'morning' && (
        morningSaved ? (
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 space-y-2 text-xs">
            <div className="flex items-center justify-between text-amber-300 font-bold">
              <span>Morning Intention Set for Today</span>
              <span className="font-mono text-[10px] text-gray-400">Energy Check: {morningSaved.energyLevel}/10</span>
            </div>
            <p className="text-gray-200 italic">"{morningSaved.dailyIntention}"</p>
            {morningSaved.gratitudeThought && (
              <p className="text-gray-400 text-[11px]">Gratitude: {morningSaved.gratitudeThought}</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSaveMorning} className="space-y-4 text-xs">
            {/* Energy Check */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-gray-400 text-[11px] font-mono uppercase tracking-wider">
                  Morning Energy & Readiness ({energyLevel}/10)
                </label>
                <span className="text-cyan-400 font-bold">
                  {energyLevel >= 8 ? 'High Energy' : energyLevel >= 5 ? 'Steady & Grounded' : 'Quiet & Reflective'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Daily Intention */}
            <div className="space-y-1">
              <label className="text-gray-400 text-[11px] font-mono uppercase tracking-wider block">
                What is your central intention today? *
              </label>
              <input
                type="text"
                value={dailyIntention}
                onChange={(e) => setDailyIntention(e.target.value)}
                placeholder="e.g. Approach deep work with calm focus, take a gentle walk after lunch..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-cyan-400 transition-all"
              />
            </div>

            {/* Optional Gratitude */}
            <div className="space-y-1">
              <label className="text-gray-400 text-[11px] font-mono uppercase tracking-wider block">
                Optional Gratitude Anchor
              </label>
              <input
                type="text"
                value={gratitudeThought}
                onChange={(e) => setGratitudeThought(e.target.value)}
                placeholder="e.g. Quiet morning coffee, restful sleep, supportive team..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-cyan-400 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={!dailyIntention.trim() || isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-cyan-500 hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              Anchor Morning Intention
            </button>
          </form>
        )
      )}

      {/* EVENING RITUAL FORM */}
      {activeMode === 'evening' && (
        eveningSaved ? (
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 space-y-2 text-xs">
            <div className="text-indigo-300 font-bold">Evening Reflection Recorded</div>
            <p className="text-gray-200">How today felt: <span className="italic">"{eveningSaved.howDayFelt}"</span></p>
            <p className="text-gray-300">Meaningful moment: <span className="italic">"{eveningSaved.meaningfulMoment}"</span></p>
            {eveningSaved.lessonLearned && (
              <p className="text-gray-400 text-[11px]">Lesson: {eveningSaved.lessonLearned}</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSaveEvening} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-gray-400 text-[11px] font-mono uppercase tracking-wider block">
                  How did the day feel overall? *
                </label>
                <input
                  type="text"
                  value={howDayFelt}
                  onChange={(e) => setHowDayFelt(e.target.value)}
                  placeholder="e.g. Productive but mentally demanding..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-indigo-400 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[11px] font-mono uppercase tracking-wider block">
                  A meaningful moment from today *
                </label>
                <input
                  type="text"
                  value={meaningfulMoment}
                  onChange={(e) => setMeaningfulMoment(e.target.value)}
                  placeholder="e.g. An honest conversation, solving a difficult bug..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-gray-400 text-[11px] font-mono uppercase tracking-wider block">
                  A hard-won lesson (Optional)
                </label>
                <input
                  type="text"
                  value={lessonLearned}
                  onChange={(e) => setLessonLearned(e.target.value)}
                  placeholder="e.g. Rushing decisions increases cognitive stress..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-indigo-400 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[11px] font-mono uppercase tracking-wider block">
                  Tomorrow's quiet intention (Optional)
                </label>
                <input
                  type="text"
                  value={tomorrowIntention}
                  onChange={(e) => setTomorrowIntention(e.target.value)}
                  placeholder="e.g. Protect morning focus time..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!howDayFelt.trim() || !meaningfulMoment.trim() || isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              Record Evening Reflection
            </button>
          </form>
        )
      )}
    </div>
  );
}
