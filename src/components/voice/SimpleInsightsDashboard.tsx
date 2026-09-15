import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Heart, Sparkles, Target, Trophy, ChevronDown, ChevronUp, BarChart3, Star
} from 'lucide-react';
import { LocalJournalEntry } from '../../core/database/local_db';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PersonalIntelligenceEngine from './PersonalIntelligenceEngine';

interface SimpleInsightsDashboardProps {
  userId: string;
  localEntries: LocalJournalEntry[];
}

export default function SimpleInsightsDashboard({ userId, localEntries }: SimpleInsightsDashboardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fallback / mock trend data for charts if database has fewer records
  const getTrendData = () => {
    if (localEntries.length === 0) {
      return [
        { date: 'Mon', mood: 7 },
        { date: 'Tue', mood: 6 },
        { date: 'Wed', mood: 8 },
        { date: 'Thu', mood: 7 },
        { date: 'Fri', mood: 8 },
        { date: 'Sat', mood: 9 },
        { date: 'Sun', mood: 7 },
      ];
    }

    return [...localEntries]
      .reverse()
      .map(entry => ({
        date: new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        mood: entry.moodScore,
      }))
      .slice(-7); // Last 7 entries
  };

  const trendData = getTrendData();
  const latestEntry = localEntries.length > 0 ? localEntries[0] : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      
      {/* HEADER */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-cyan-400" />
          <span>Mental Intelligence & Insights</span>
        </h2>
        <p className="text-xs text-gray-400">
          Plain-language summaries of your emotional stability, active habits, and recurring cognitive thoughts.
        </p>
      </div>

      {/* 1. SIMPLE PLAIN-LANGUAGE CARDS (CONSUMER EXPERIENCE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Plain-Language Weekly Trend Card */}
        <div className="p-5 rounded-3xl bg-cyan-500/5 border border-cyan-500/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">Weekly Mood Flow</h3>
            <Heart className="h-4.5 w-4.5 text-cyan-400 fill-cyan-400/20" />
          </div>
          
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorMoodSimple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={9} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={9} tickLine={false} domain={[1, 10]} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '10px' }} />
                <Area name="Mood Level" type="monotone" dataKey="mood" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorMoodSimple)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1 text-xs">
            <p className="font-semibold text-gray-200">
              {latestEntry ? `😊 Steady upward trend: ${latestEntry.moodLabel}` : '😊 Emotion balance is steady'}
            </p>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              This simple graph tracks your mood rating (from 1 to 10) over your recent voice journal reflections. A higher curve indicates days where you expressed high energy and positive confidence.
            </p>
          </div>
        </div>

        {/* Card 2: Topic of the Week & AI Insights */}
        <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">Topic of the Week</h3>
              <Sparkles className="h-4.5 w-4.5 text-indigo-400 fill-indigo-400/20" />
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-black text-indigo-300">
                {latestEntry?.categories && latestEntry.categories.length > 0 
                  ? `"${latestEntry.categories[0]}"`
                  : '"Career & Growth"'}
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                You mentioned topics related to personal growth, learning, and self-care more than any other category. This shows high attention toward self-improvement and positive behavior modification.
              </p>
            </div>
          </div>

          <div className="p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl text-[11px] text-gray-400 space-y-1.5">
            <span className="font-bold text-indigo-300 flex items-center gap-1">
              <Star className="h-3 w-3 text-indigo-400 fill-indigo-400/20" />
              Latest Cognitive Reflection Summary:
            </span>
            <span>
              "Your focus patterns are strongly aligned with study and career goals. Maintain evening decompression exercises to optimize working memory recovery."
            </span>
          </div>
        </div>

      </div>

      {/* 2. PROGRESSIVE DISCLOSURE - DETAILED STUDIO TOGGLE */}
      <div className="border-t border-gray-200/10 pt-4 flex flex-col items-center">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-5 py-3 bg-gray-500/5 hover:bg-gray-500/10 border border-gray-500/10 rounded-2xl text-xs font-bold text-gray-200 hover:text-white transition-all cursor-pointer shadow-sm"
        >
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          <span>{showAdvanced ? 'Hide Advanced Analytics' : 'View Detailed Analytics & Reports Studio'}</span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <p className="text-[10px] text-gray-500 mt-2 text-center max-w-sm">
          Expand this panel to view detailed life-balance radar charts, print smart PDF/ZIP audit reports, and generate audio vocal recaps.
        </p>
      </div>

      {/* 3. DETAILED CORE ANALYTICS (EXPANDABLE WORKSPACE) */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden pt-4"
          >
            <div className="p-1 rounded-3xl border border-gray-500/10 bg-gray-500/[0.01]">
              <PersonalIntelligenceEngine userId={userId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
