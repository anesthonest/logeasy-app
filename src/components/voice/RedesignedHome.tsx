import React, { useState, useEffect } from 'react';
import { 
  Flame, Mic, Calendar, Heart, ShieldAlert, CheckCircle, Clock, 
  ArrowRight, BookOpen, Smile, TrendingUp, Sparkles, RefreshCw, Eye
} from 'lucide-react';
import { motion } from 'motion/react';
import { LocalJournalEntry } from '../../core/database/local_db';
import { AuthSession } from '../../features/auth/auth_service';
import { AppSettings } from '../../features/settings/settings_provider';

interface RedesignedHomeProps {
  session: AuthSession;
  localEntries: LocalJournalEntry[];
  onStartVoiceJournal: () => void;
  onContinueLastEntry: (entry: LocalJournalEntry) => void;
  settings: AppSettings;
}

export default function RedesignedHome({
  session,
  localEntries,
  onStartVoiceJournal,
  onContinueLastEntry,
  settings
}: RedesignedHomeProps) {
  const [quickMood, setQuickMood] = useState(7);
  const [showMoodFeedback, setShowMoodFeedback] = useState(false);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    let greet = 'Hello';
    if (hrs < 12) greet = 'Good morning';
    else if (hrs < 18) greet = 'Good afternoon';
    else greet = 'Good evening';
    
    if (session.isAuthenticated && session.user?.displayName) {
      return `${greet}, ${session.user.displayName}!`;
    }
    return `${greet}, reflective mind!`;
  };

  const getStreakCount = () => {
    if (localEntries.length === 0) return 0;
    const uniqueDates = new Set(localEntries.map(e => new Date(e.createdAt).toDateString()));
    return uniqueDates.size;
  };

  const getMoodEmojiAndLabel = (score: number) => {
    if (score <= 3) return { emoji: '😔', label: 'Stressed / Drained', color: 'text-amber-400' };
    if (score <= 5) return { emoji: '😐', label: 'Neutral / Reflective', color: 'text-indigo-400' };
    if (score <= 7) return { emoji: '😌', label: 'Calm & Steady', color: 'text-cyan-400' };
    return { emoji: '😊', label: 'Happy & Energized', color: 'text-emerald-400' };
  };

  const streak = getStreakCount();
  const lastEntry = localEntries.length > 0 ? localEntries[0] : null;
  const moodData = getMoodEmojiAndLabel(quickMood);

  // Today's Date Formatting
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* 1. HERO GREETINGS CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/10 via-indigo-500/5 to-transparent border border-cyan-500/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">{formattedDate}</span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">{getGreeting()}</h2>
            <p className="text-xs text-gray-400 max-w-md">
              Your voice carries your deepest insights. Take a short moment to reflect today and map your cognitive path.
            </p>
          </div>

          {/* Streak badge */}
          <div className="flex items-center gap-3.5 bg-gray-500/5 border border-gray-500/10 px-5 py-3 rounded-2xl shrink-0 self-start md:self-auto shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse border border-amber-500/20">
              <Flame className="h-5.5 w-5.5 fill-amber-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100 flex items-center gap-1">
                <span>{streak} Day Streak</span>
              </div>
              <span className="text-[11px] text-gray-400">Reflections logged</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC BENTO ACTION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Prominent Recording Trigger */}
        <div className="md:col-span-3 p-6 rounded-3xl bg-gradient-to-br from-cyan-500 to-indigo-600 border border-cyan-400/20 text-white flex flex-col justify-between min-h-[220px] shadow-lg hover:shadow-cyan-500/5 transition-all group relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-15 text-[150px] group-hover:scale-110 transition-transform duration-500 pointer-events-none">🎙️</div>
          
          <div className="space-y-1.5 z-10">
            <span className="text-[10px] uppercase tracking-widest font-bold bg-white/20 text-cyan-100 px-2.5 py-0.5 rounded-full inline-block">
              Vocal Session
            </span>
            <h3 className="text-xl font-bold tracking-tight">Record Your Thoughts</h3>
            <p className="text-xs text-cyan-100 max-w-sm leading-relaxed">
              Express your feelings, logs, or creative outputs in real-time. We'll handle transcription and AI diagnostics on-device.
            </p>
          </div>

          <button 
            onClick={onStartVoiceJournal}
            className="z-10 self-start mt-6 flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 hover:bg-cyan-50 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Mic className="h-4 w-4 text-cyan-600 animate-pulse" />
            <span>Start Voice Journal</span>
            <ArrowRight className="h-3.5 w-3.5 text-indigo-600 ml-1 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Quick Mood Logging Check-In */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 flex flex-col justify-between min-h-[220px]">
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-indigo-400 block">Daily Check-In</span>
            <h3 className="text-base font-bold text-gray-100">How do you feel right now?</h3>
            <p className="text-xs text-gray-400 leading-normal">
              Quickly capture your mental state. Drag the emotional balance score.
            </p>
          </div>

          {/* Quick mood slider */}
          <div className="space-y-3.5 my-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-300">Level: {quickMood}/10</span>
              <span className={`font-black flex items-center gap-1 ${moodData.color}`}>
                <span>{moodData.emoji}</span>
                <span>{moodData.label}</span>
              </span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={quickMood}
              onChange={(e) => {
                setQuickMood(Number(e.target.value));
                setShowMoodFeedback(true);
                setTimeout(() => setShowMoodFeedback(false), 2000);
              }}
              className="w-full accent-cyan-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
            />
          </div>

          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 h-6">
            {showMoodFeedback ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
                <CheckCircle className="h-3 w-3" /> State logged. Create a journal to cement this feeling!
              </span>
            ) : (
              <span className="text-gray-500 font-mono">Simulated on-device state analysis active</span>
            )}
          </div>
        </div>

      </div>

      {/* 3. CONTINUE OR SUMMARY STORY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Continue Last Entry */}
        <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 flex flex-col justify-between min-h-[160px]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400">
              <BookOpen className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Continue Recent Reflection</span>
            </div>
            {lastEntry ? (
              <div>
                <h4 className="text-xs font-bold text-gray-200 line-clamp-1">{lastEntry.title}</h4>
                <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 italic">
                  "{lastEntry.transcript || 'No transcribed content yet.'}"
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-2">
                No local memories recorded yet. Record your first log to see continuation options.
              </p>
            )}
          </div>

          {lastEntry && (
            <button 
              onClick={() => onContinueLastEntry(lastEntry)}
              className="mt-3 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 self-start cursor-pointer"
            >
              <span>Resume and edit transcript</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Weekly Story Summary Card */}
        <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 flex flex-col justify-between min-h-[160px]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Your Weekly Reflection Story</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {localEntries.length > 0 ? (
                `You recorded ${localEntries.length} voice reflection${localEntries.length !== 1 ? 's' : ''} this week. Your primary emotional state is Calm. Consistent daily check-ins help identify core growth cycles.`
              ) : (
                'You have not recorded any memories this week. Start with just 30 seconds of speech to initialize your weekly summary analytics!'
              )}
            </p>
          </div>

          <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span>Recommended recording time: 9:00 PM</span>
          </div>
        </div>

      </div>

      {/* 4. RECENT REFLECTIONS CHRONOLOGICAL LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight text-gray-100 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <span>Recent Reflections</span>
          </h3>
          <span className="text-[11px] font-mono text-gray-400">Chronological feed</span>
        </div>

        {localEntries.length === 0 ? (
          <div className="p-8 text-center rounded-3xl border border-dashed border-gray-500/20 bg-gray-500/5 space-y-2">
            <span className="text-3xl block">⏳</span>
            <h4 className="text-xs font-bold text-gray-300">Your journal is waiting...</h4>
            <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
              Record a brief audio reflection or type a transcript simulation to seed your timeline.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {localEntries.slice(0, 3).map((entry) => {
              const mood = getMoodEmojiAndLabel(entry.moodScore || 7);
              return (
                <div 
                  key={entry.id}
                  className="p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10 hover:border-gray-500/25 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-200">{entry.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono ${
                        entry.syncStatus === 'synced' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {entry.syncStatus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1 italic">
                      "{entry.transcript}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs">
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`px-2 py-1 rounded-xl bg-gray-500/10 border border-gray-500/10 flex items-center gap-1 font-semibold ${mood.color}`}>
                      <span>{mood.emoji}</span>
                      <span className="text-[10px]">{entry.moodLabel}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
