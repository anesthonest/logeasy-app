import React from 'react';
import { motion } from 'motion/react';
import { 
  Mic, Clock, Heart, Flame, Calendar, ArrowRight, BookOpen, Sparkles, TrendingUp, HelpCircle,
  Zap, Network, Activity, Archive
} from 'lucide-react';
import { LocalJournalEntry } from '../../core/database/local_db';
import { AuthSession } from '../../features/auth/auth_service';
import DailyRitualsCard from './DailyRitualsCard';

interface HomeDashboardProps {
  session: AuthSession;
  localEntries: LocalJournalEntry[];
  onNavigateTab: (tab: any) => void;
  onSelectEntry: (entry: LocalJournalEntry) => void;
  onOpenInstantCapture?: () => void;
}

export default function HomeDashboard({ 
  session, 
  localEntries, 
  onNavigateTab,
  onSelectEntry,
  onOpenInstantCapture
}: HomeDashboardProps) {
  
  // Greeting helper
  const getGreeting = () => {
    const hr = new Date().getHours();
    let greetText = "Welcome back";
    if (hr < 12) greetText = "Good morning";
    else if (hr < 18) greetText = "Good afternoon";
    else greetText = "Good evening";
    
    const name = session.user?.displayName || 'Friend';
    return `${greetText}, ${name}! 👋`;
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const latestEntry = localEntries.length > 0 ? localEntries[0] : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      
      {/* 1. WELCOME HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 backdrop-blur-md">
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest">{getFormattedDate()}</p>
          <h2 className="text-2xl font-black tracking-tight">{getGreeting()}</h2>
          <p className="text-xs text-gray-400">
            You have a private, secure mind sanctuary. Your voice logs are decrypted safely on-device.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          {onOpenInstantCapture && (
            <button
              onClick={onOpenInstantCapture}
              className="flex items-center gap-2 px-4 py-3.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold rounded-2xl text-xs transition-all cursor-pointer shadow-sm"
            >
              <Zap className="h-4 w-4 text-cyan-400" />
              <span>Instant Capture</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('journal')}
            className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-95 text-white font-bold rounded-2xl shadow-lg shadow-cyan-950/20 text-xs transition-all cursor-pointer"
          >
            <Mic className="h-4.5 w-4.5" />
            <span>Record Voice Journal</span>
          </button>
        </div>
      </div>

      {/* DAILY LIFE RITUALS (FEATURE TWO) */}
      <DailyRitualsCard 
        userId={session.user?.uid || 'local_user'} 
        localEntries={localEntries}
        onComplete={() => onNavigateTab('journal')}
      />

      {/* 2. MAIN BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Gentle Continuity & Micro-Recognition */}
        <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">Gentle Continuity</span>
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-300">
              {localEntries.length > 0 ? "You're making space" : "Begin when ready"}
            </div>
            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
              {localEntries.length > 0 
                ? "You returned to something that matters to you. Consistency in LogEasy is about returning with kindness, never about rigid unbroken chains." 
                : "No pressure or artificial urgency. Capture a vocal thought whenever you feel called."}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2 text-[11px] text-amber-300/80 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Zero shame • Returning is the victory</span>
          </div>
        </div>

        {/* Card 2: Today's Mood balance */}
        <div className="p-5 rounded-3xl bg-cyan-500/5 border border-cyan-500/10 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Emotional Pulse</span>
            <Heart className="h-5 w-5 text-cyan-400 fill-cyan-400/20" />
          </div>
          <div>
            <div className="text-2xl font-black text-cyan-400">
              {latestEntry ? `😊 ${latestEntry.moodLabel}` : 'Reflective State'}
            </div>
            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
              {latestEntry 
                ? `Your latest voice reflection had a healthy mood score of ${latestEntry.moodScore}/10.` 
                : "No mood records logged yet today. Click Record above to capture your emotional pulse."}
            </p>
          </div>
          <div className="pt-2">
            <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold font-mono">
              Self-Regulatory Core
            </span>
          </div>
        </div>

        {/* Card 3: Upcoming Check-in */}
        <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Daily Reminders</span>
            <Calendar className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-indigo-300">Quiet Hour Reminder</div>
            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
              Your next reflection check-in reminder is scheduled for <strong className="text-indigo-400">9:00 PM</strong> tonight.
            </p>
          </div>
          <button 
            onClick={() => onNavigateTab('profile')}
            className="text-left text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 mt-1 transition-all"
          >
            <span>Customize Reminder Schedule</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

      </div>

      {/* 3. RECENT ENTRIES & QUICK ACTIONS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 columns: Chronological Recent entries list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-cyan-400" />
              <span>Your Recent Spoken Logs</span>
            </h3>
            {localEntries.length > 2 && (
              <button 
                onClick={() => onNavigateTab('journal')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold transition-all"
              >
                View Timeline ({localEntries.length})
              </button>
            )}
          </div>

          <div className="space-y-3">
            {localEntries.length === 0 ? (
              <div className="p-8 border border-dashed border-gray-500/15 rounded-3xl text-center bg-gray-500/[0.01] space-y-3 py-12">
                <Mic className="h-9 w-9 text-gray-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400">Your spoken journal is empty</p>
                  <p className="text-[11px] text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Voice diaries capture raw vocal thoughts and process them with on-device speech-to-text. Try recording a quick test entry!
                  </p>
                </div>
              </div>
            ) : (
              localEntries.slice(0, 2).map((entry) => (
                <div 
                  key={entry.id} 
                  onClick={() => {
                    onSelectEntry(entry);
                    onNavigateTab('journal');
                  }}
                  className="p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10 hover:border-cyan-500/30 hover:bg-gray-500/10 transition-all cursor-pointer space-y-2 relative group"
                >
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-mono text-[10px] text-gray-500">ID: {entry.id}</span>
                    <span className="text-[10px] flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 px-2.5 py-0.5 rounded-full font-semibold">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-xs font-bold text-gray-200 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                    {entry.title || 'Untitled Spoken Reflection'}
                  </p>
                  
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {entry.transcript}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-2 text-[10px]">
                    <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full font-semibold">
                      Mood: {entry.moodScore}/10
                    </span>
                    {entry.colorTags && entry.colorTags.length > 0 ? (
                      entry.colorTags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-semibold border"
                          style={{
                            backgroundColor: `${tag.color}15`,
                            borderColor: `${tag.color}35`,
                            color: tag.color,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          #{tag.name}
                        </span>
                      ))
                    ) : (
                      entry.categories && entry.categories.map((cat, i) => (
                        <span key={i} className="text-gray-500 font-medium bg-gray-500/5 border border-gray-500/10 px-1.5 rounded">
                          #{cat}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 column: Helpful Tips / Coach highlights */}
        <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="h-4.5 w-4.5 fill-indigo-400/20" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Coach Reflection Check</h4>
            </div>
            
            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              "When you reflect, try naming three physical things you're grateful for. Expressing gratitude out loud triggers natural stress-deceleration cycles."
            </p>

            <div className="p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl text-[11px] text-gray-400 space-y-1">
              <span className="font-bold text-indigo-300 block">Today's Prompt Advice:</span>
              <span>"What is one challenge you overcame recently, and what strength did you use?"</span>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('coach')}
            className="w-full text-center py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-2xl transition-all cursor-pointer mt-4"
          >
            Start Chat with Reflection Coach
          </button>
        </div>

      </div>

      {/* 4. PERSONAL LIFE MODEL INTELLIGENCE DISCOVERY ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateTab('connections')}
          className="p-4 rounded-2xl bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/15 hover:border-cyan-500/30 text-left transition-all cursor-pointer space-y-2 group"
        >
          <Network className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <div>
            <h4 className="text-xs font-bold text-gray-200">Connections</h4>
            <p className="text-[11px] text-gray-400">Discover longitudinal links</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('patterns')}
          className="p-4 rounded-2xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/15 hover:border-purple-500/30 text-left transition-all cursor-pointer space-y-2 group"
        >
          <Activity className="h-5 w-5 text-purple-400 group-hover:scale-110 transition-transform" />
          <div>
            <h4 className="text-xs font-bold text-gray-200">Life Patterns</h4>
            <p className="text-[11px] text-gray-400">Recurring rhythms & rest</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('habits')}
          className="p-4 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 hover:border-emerald-500/30 text-left transition-all cursor-pointer space-y-2 group"
        >
          <Heart className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
          <div>
            <h4 className="text-xs font-bold text-gray-200">Soft Consistency</h4>
            <p className="text-[11px] text-gray-400">Zero-shame daily rhythms</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('archive')}
          className="p-4 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 hover:border-amber-500/30 text-left transition-all cursor-pointer space-y-2 group"
        >
          <Archive className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
          <div>
            <h4 className="text-xs font-bold text-gray-200">Life Archive</h4>
            <p className="text-[11px] text-gray-400">Export &amp; sovereignty</p>
          </div>
        </button>
      </div>

      {/* 5. WEEK SUMMARY REPORT SECTION */}
      <div className="p-6 rounded-3xl bg-cyan-500/5 border border-cyan-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5" />
            <span>Weekly Growth Highlights</span>
          </h3>
          <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
            You completed <strong>{localEntries.length} reflection entries</strong> this week. Your emotional trends show extremely positive stability with highlights centering on productivity and decompressing.
          </p>
        </div>

        <button 
          onClick={() => onNavigateTab('insights')}
          className="text-xs font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 px-5 py-2.5 rounded-2xl shadow-md transition-all shrink-0 cursor-pointer"
        >
          View Full Insights Studio
        </button>
      </div>

    </div>
  );
}
