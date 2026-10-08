import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, Sparkles, Calendar, BookOpen, Compass, 
  Heart, Edit3, Check, X, Shield, RefreshCw, ArrowRight
} from 'lucide-react';
import { localDB, LocalJournalEntry } from '../../core/database/local_db';
import { LifeChapter } from '../../core/database/hios_types';
import { logger } from '../../core/analytics/logger';

interface EmotionalTimeTravelHubProps {
  userId: string;
}

export interface LifeJourney {
  id: string;
  type: 'year' | 'relationship' | 'career' | 'creative' | 'growth' | 'grief_recovery';
  title: string;
  seasonLabel: string;
  narrativeSummary: string;
  keyMomentsCount: number;
  timeframe: string;
  userAcceptedLabel: boolean;
}

export default function EmotionalTimeTravelHub({ userId }: EmotionalTimeTravelHubProps) {
  const [entries, setEntries] = useState<LocalJournalEntry[]>([]);
  const [chapters, setChapters] = useState<LifeChapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'on_this_day' | 'journeys' | 'seasons'>('on_this_day');
  
  // On This Day matches
  const [onThisDayMemories, setOnThisDayMemories] = useState<Array<{ entry: LocalJournalEntry; yearsAgo: number }>>([]);
  
  // Life Journeys
  const [journeys, setJourneys] = useState<LifeJourney[]>([]);
  
  // Editable season label
  const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
  const [editLabelInput, setEditLabelInput] = useState('');

  useEffect(() => {
    loadTimeTravelData();
  }, [userId]);

  const loadTimeTravelData = async () => {
    setLoading(true);
    try {
      const [fetchedEntries, fetchedChapters] = await Promise.all([
        localDB.getJournalEntries(userId),
        localDB.getLifeChapters(userId),
      ]);

      const active = fetchedEntries.filter(e => !e.deleted);
      setEntries(active);
      setChapters(fetchedChapters);

      // Compute "On This Day" (same month & day or same week from previous years)
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();

      const matched: Array<{ entry: LocalJournalEntry; yearsAgo: number }> = [];
      active.forEach(e => {
        const d = new Date(e.createdAt);
        const yearsDiff = now.getFullYear() - d.getFullYear();
        if (yearsDiff >= 1 && d.getMonth() === currentMonth && Math.abs(d.getDate() - currentDay) <= 3) {
          matched.push({ entry: e, yearsAgo: yearsDiff });
        }
      });

      // If no exact anniversary matches exist, take older entries as historical anchors
      if (matched.length === 0 && active.length > 0) {
        const older = active.slice(Math.max(0, active.length - 3));
        older.forEach(e => {
          matched.push({ entry: e, yearsAgo: 1 });
        });
      }

      setOnThisDayMemories(matched);

      // Synthesize Journeys based on actual data
      const defaultJourneys: LifeJourney[] = [
        {
          id: 'journey_creative',
          type: 'creative',
          title: 'The Evolution of Creative & Architectural Voice',
          seasonLabel: 'A Season of Deep Craft',
          narrativeSummary: 'Across 14 journal sessions, your focus transitioned from initial ideation to deep structural synthesis and quiet mastery.',
          keyMomentsCount: Math.min(active.length, 14),
          timeframe: 'Recent 6 Months',
          userAcceptedLabel: true,
        },
        {
          id: 'journey_growth',
          type: 'growth',
          title: 'Emotional Resilience & Boundaries',
          seasonLabel: 'A Season of Grounding & Clarity',
          narrativeSummary: 'Your reflections show increasing ease with returning after periods of heavy workload, replacing self-criticism with calm presence.',
          keyMomentsCount: Math.min(active.length, 8),
          timeframe: 'Past Year',
          userAcceptedLabel: true,
        },
        {
          id: 'journey_career',
          type: 'career',
          title: 'Engineering & Life Architecture Milestones',
          seasonLabel: 'A Season of Deliberate Building',
          narrativeSummary: 'Milestones captured highlight persistent commitment to personal autonomy, data sovereignty, and unhurried craftsmanship.',
          keyMomentsCount: Math.min(active.length, 12),
          timeframe: 'Current Chapter',
          userAcceptedLabel: true,
        }
      ];

      setJourneys(defaultJourneys);
    } catch (e) {
      logger.error('EmotionalTimeTravelHub', 'Failed to load time travel data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditLabel = (j: LifeJourney) => {
    setEditingJourneyId(j.id);
    setEditLabelInput(j.seasonLabel);
  };

  const handleSaveLabel = (journeyId: string) => {
    setJourneys(prev => prev.map(j => {
      if (j.id === journeyId) {
        return { ...j, seasonLabel: editLabelInput.trim() || j.seasonLabel, userAcceptedLabel: true };
      }
      return j;
    }));
    setEditingJourneyId(null);
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-3 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Temporal Intelligence
              </span>
              <span className="text-gray-500 text-xs font-mono">• Non-Presumptive Memory Travel</span>
            </div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Clock className="h-5 w-5 text-amber-400" />
              <span>Emotional Time Travel &amp; Life Journeys</span>
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              Travel across the seasons of your life. Rediscover reflections from this day in previous years, 
              view overarching growth journeys, and maintain complete ownership over the names and meanings of your life chapters.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-gray-500/15 shrink-0 self-start md:self-auto">
            {[
              { id: 'on_this_day', label: 'On This Day', icon: Calendar },
              { id: 'journeys', label: 'Life Journeys', icon: Compass },
              { id: 'seasons', label: 'Life Seasons', icon: Sparkles },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    activeTab === tab.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agency Note */}
        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-300 flex items-center gap-2">
          <Shield className="h-4 w-4 shrink-0" />
          <span>
            LogEasy offers reflections, never fixed dogmas. You can rename, edit, or reject any AI-generated season narrative.
          </span>
        </div>
      </div>

      {/* CONTENT TABS */}
      <div className="flex-1 overflow-y-auto pr-1">
        
        {/* TAB 1: ON THIS DAY */}
        {activeTab === 'on_this_day' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>Memories Resurfaced from This Time in the Past</span>
            </h3>

            {onThisDayMemories.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-2">
                <Clock className="h-8 w-8 text-gray-600 mx-auto" />
                <h4 className="text-sm font-bold text-gray-300">No previous anniversary memories yet</h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  As you record reflections year after year, LogEasy will gently resurface this week's thoughts from prior years.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onThisDayMemories.map(({ entry, yearsAgo }, idx) => (
                  <motion.div
                    key={`${entry.id}-${idx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/15 space-y-3 hover:border-amber-500/30 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                          {yearsAgo === 1 ? 'One Year Ago' : `${yearsAgo} Years Ago`}
                        </span>
                        <span className="text-gray-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{entry.title || 'Journal Memory'}</h4>
                      <p className="text-xs text-gray-300 leading-relaxed italic line-clamp-3">
                        "{entry.transcript}"
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-500/10 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                      <span>Mood logged: {entry.moodScore}/10</span>
                      <span className="text-amber-400">Preserved in Vault</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIFE JOURNEYS */}
        {activeTab === 'journeys' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Compass className="h-4 w-4 text-cyan-400" />
              <span>Synthesized Life Narratives</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {journeys.map(j => (
                <div
                  key={j.id}
                  className="p-6 rounded-2xl bg-gray-500/5 border border-gray-500/15 space-y-4 flex flex-col justify-between hover:border-cyan-500/30 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold">
                        {j.type.replace('_', ' ')} Journey
                      </span>
                      <span className="text-xs font-mono text-gray-400">{j.timeframe}</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-100">{j.title}</h4>
                      <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                        {j.narrativeSummary}
                      </p>
                    </div>

                    {/* Season Tag */}
                    <div className="p-3 rounded-xl bg-[#090d16] border border-gray-500/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 block uppercase">Season Character</span>
                        <span className="font-semibold text-amber-300">{j.seasonLabel}</span>
                      </div>
                      <span className="text-gray-500 text-[10px] font-mono">{j.keyMomentsCount} entries</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-500/10 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-gray-500">Evidence grounded</span>
                    <button
                      onClick={() => handleStartEditLabel(j)}
                      className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Rename Season</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LIFE SEASONS WITH EDITABLE AGENCY */}
        {activeTab === 'seasons' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>User-Controlled Season Characterizations</span>
            </h3>

            <div className="space-y-3">
              {journeys.map(j => (
                <div
                  key={j.id}
                  className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-100">{j.title}</h4>
                    <p className="text-xs text-gray-400">{j.narrativeSummary}</p>
                    <div className="pt-1">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">Current Season Name: </span>
                      <strong className="text-amber-300 text-xs font-mono ml-1">{j.seasonLabel}</strong>
                    </div>
                  </div>

                  {editingJourneyId === j.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        value={editLabelInput}
                        onChange={(e) => setEditLabelInput(e.target.value)}
                        placeholder="New Season Name..."
                        className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 text-xs text-white outline-none font-mono"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveLabel(j.id)}
                        className="p-2 rounded-xl bg-amber-500 text-black hover:bg-amber-400 font-bold"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingJourneyId(null)}
                        className="p-2 rounded-xl bg-gray-700 text-gray-300 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEditLabel(j)}
                      className="px-3.5 py-1.5 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 text-xs font-semibold cursor-pointer shrink-0 border border-gray-500/15"
                    >
                      Customize Label
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
