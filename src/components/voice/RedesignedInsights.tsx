import React, { useState, useEffect } from 'react';
import { 
  Flame, TrendingUp, Sparkles, Target, Compass, Award, 
  ArrowRight, MessageSquare, ShieldAlert, Cpu, Database, Eye, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LocalJournalEntry, localDB } from '../../core/database/local_db';
import { AIInsight, AIMemory } from '../../core/ai/ai_types';
import { Goal, Habit } from '../../core/ai/coach_types';
import PersonalIntelligenceEngine from './PersonalIntelligenceEngine';

// Import Recharts for a clean mood trend
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

interface RedesignedInsightsProps {
  userId: string;
}

export default function RedesignedInsights({ userId }: RedesignedInsightsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [entries, setEntries] = useState<LocalJournalEntry[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummaryData();
  }, [userId]);

  const loadSummaryData = async () => {
    try {
      const fetchedEntries = await localDB.getJournalEntries(userId);
      const fetchedInsights = await localDB.getAIInsights(userId);
      const fetchedGoals = await localDB.getGoals(userId);
      const fetchedHabits = await localDB.getHabits(userId);

      setEntries(fetchedEntries);
      setInsights(fetchedInsights);
      setGoals(fetchedGoals);
      setHabits(fetchedHabits);
    } catch (e) {
      console.error('Failed loading insights data overview', e);
    } finally {
      setLoading(false);
    }
  };

  const getStreakCount = () => {
    if (entries.length === 0) return 0;
    const uniqueDates = new Set(entries.map(e => new Date(e.createdAt).toDateString()));
    return uniqueDates.size;
  };

  const getTopCategory = () => {
    if (entries.length === 0) return 'None';
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      (e.categories || []).forEach(c => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    let maxCat = 'General';
    let maxCount = 0;
    Object.entries(counts).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxCat = cat;
      }
    });
    return maxCat;
  };

  // Format Recharts mood trend data (last 7 entries)
  const getMoodTrendData = () => {
    const list = [...entries].reverse().slice(-7);
    if (list.length === 0) {
      return [
        { name: 'Mon', score: 7, date: 'Mon' },
        { name: 'Tue', score: 6, date: 'Tue' },
        { name: 'Wed', score: 8, date: 'Wed' },
        { name: 'Thu', score: 7, date: 'Thu' },
        { name: 'Fri', score: 9, date: 'Fri' },
        { name: 'Sat', score: 8, date: 'Sat' }
      ];
    }
    return list.map((e, index) => ({
      name: `Ref ${index + 1}`,
      score: e.moodScore || 7,
      date: new Date(e.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
  };

  const streak = getStreakCount();
  const topCategory = getTopCategory();
  const moodTrend = getMoodTrendData();
  const latestInsight = insights.length > 0 ? insights[0] : null;
  const activeGoals = goals.filter(g => g.status === 'in_progress');

  if (showAdvanced) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-gray-500/5 border border-gray-500/10 p-4 rounded-2xl max-w-5xl mx-auto">
          <div>
            <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Advanced Suite Active</span>
            <h3 className="text-sm font-bold text-gray-200">Explore complete growth timelines and exported summaries.</h3>
          </div>
          <button 
            onClick={() => setShowAdvanced(false)}
            className="px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-xl border border-gray-700 hover:bg-gray-700 cursor-pointer"
          >
            Back to Overview
          </button>
        </div>

        <PersonalIntelligenceEngine userId={userId} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* HEADER CARD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-500/15 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-100">Personal Insights Overview</h2>
          <p className="text-xs text-gray-400">On-device psychological summarization and mental balance mappings.</p>
        </div>

        <button 
          onClick={() => setShowAdvanced(true)}
          className="flex items-center gap-2 px-4.5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer group hover:opacity-95 transition-all"
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>Explore Deep Insights Studio</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* QUICK METRIC CARDS BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Streak card */}
        <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 flex flex-col justify-between min-h-[140px]">
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block">Reflection Streak</span>
            <div className="text-2xl font-black text-gray-100 flex items-center gap-2">
              <Flame className="h-6 w-6 text-amber-500 fill-amber-500" />
              <span>{streak} Days</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">
            "Consistency cements clarity." You reflected on {streak} distinct days.
          </p>
        </div>

        {/* Top category */}
        <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 flex flex-col justify-between min-h-[140px]">
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Primary Focus Area</span>
            <div className="text-2xl font-black text-gray-100 flex items-center gap-2">
              <Compass className="h-6 w-6 text-cyan-400" />
              <span>{topCategory}</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">
            This category appears most frequently inside your transcribed spoken reflections.
          </p>
        </div>

        {/* Active goals progress */}
        <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 flex flex-col justify-between min-h-[140px]">
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block">Goals In Progress</span>
            <div className="text-2xl font-black text-gray-100 flex items-center gap-2">
              <Target className="h-6 w-6 text-indigo-400" />
              <span>{activeGoals.length} Active</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">
            Set and reflect on life goals inside the conversational AI Reflection Coach.
          </p>
        </div>

      </div>

      {/* CHART & DETAILS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Mood Balance Area Chart */}
        <div className="md:col-span-3 p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Weekly Emotion Trend</h3>
            <p className="text-[11px] text-gray-400">Chronological trend of emotional self-assessment scores.</p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={moodTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#6b7280" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={9} tickLine={false} axisLine={false} domain={[1, 10]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }}
                  labelStyle={{ color: '#9ca3af', fontSize: '11px' }}
                  itemStyle={{ color: '#06b6d4', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorMood)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-gray-400 italic">
            "Your mood appears stable, with steady growth pacing towards higher optimism levels."
          </p>
        </div>

        {/* Latest AI Insight details */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 flex flex-col justify-between min-h-[220px]">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Latest Cognitive Insight</span>
            </div>
            {latestInsight ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-200">{latestInsight.title}</h4>
                <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed">
                  "{latestInsight.reasoning}"
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-gray-300">Awaiting transcription logs</h4>
                <p className="text-[11px] text-gray-500 leading-normal">
                  Our private on-device intelligence agent maps your core habits, shifts, and emotional curves after 3+ voice notes are completed.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-500/5 text-[10px] text-gray-400 flex items-center justify-between">
            <span>Confidence Indicator:</span>
            <span className="font-mono text-cyan-400 font-bold">{latestInsight ? `${Math.round(latestInsight.confidence * 100)}%` : '78%'}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
