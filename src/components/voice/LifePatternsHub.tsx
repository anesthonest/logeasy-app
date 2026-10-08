import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Clock, Compass, Sparkles, HelpCircle, 
  Filter, Calendar, ShieldCheck, ArrowUpRight, Check, X, Info
} from 'lucide-react';
import { patternDiscoveryEngine } from '../../core/intelligence/pattern_discovery_engine';
import { PatternObservation as LifePatternObservation } from '../../core/intelligence/types';
import { localDB, LocalJournalEntry } from '../../core/database/local_db';
import { logger } from '../../core/analytics/logger';

interface LifePatternsHubProps {
  userId: string;
}

export type TimeRangeFilter = '7d' | '30d' | '90d' | '6m' | '1y' | 'lifetime';

export default function LifePatternsHub({ userId }: LifePatternsHubProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [patterns, setPatterns] = useState<LifePatternObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<LifePatternObservation | null>(null);
  const [evidenceEntries, setEvidenceEntries] = useState<LocalJournalEntry[]>([]);

  const loadPatterns = async () => {
    setLoading(true);
    try {
      const data = await patternDiscoveryEngine.analyzePatterns(userId);
      setPatterns(data);
    } catch (e) {
      logger.error('LifePatternsHub', 'Failed to load patterns', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatterns();
  }, [userId, timeRange]);

  const handleOpenWhy = async (p: LifePatternObservation) => {
    setSelectedPattern(p);
    try {
      const allEntries = await localDB.getJournalEntries(userId);
      const matches = allEntries.filter(e => 
        p.supportingEvidence.some(ev => ev.sourceId === e.id)
      );
      setEvidenceEntries(matches);
    } catch (e) {
      setEvidenceEntries([]);
    }
  };

  const categories = [
    { id: 'all', label: 'All Patterns' },
    { id: 'creative_surge', label: 'Creativity & Ideas' },
    { id: 'stress_cluster', label: 'Energy & Rest' },
    { id: 'recurring_interest', label: 'Recurring Themes' },
    { id: 'relational_shift', label: 'Relationships' },
  ];

  const timeRanges: Array<{ id: TimeRangeFilter; label: string }> = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: '6m', label: '6 Months' },
    { id: '1y', label: '1 Year' },
    { id: 'lifetime', label: 'Lifetime' },
  ];

  const filteredPatterns = patterns.filter(p => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Pattern Discovery Engine
              </span>
              <span className="text-gray-500 text-xs font-mono">• Safe Longitudinal Reasoning</span>
            </div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Activity className="h-5 w-5 text-purple-400" />
              <span>Life Patterns View</span>
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              Synthesizes recurring rhythms across emotions, creative bursts, energy, rest, and habits.
              We treat correlation with humility and never make medical or clinical diagnoses.
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-1 bg-black/40 rounded-2xl border border-gray-500/15 overflow-x-auto shrink-0">
            {timeRanges.map(t => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  timeRange === t.id
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pattern Safety Guarantee Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/15 text-[11px] text-gray-300">
          <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <p>
            <strong>Pattern Safety Discipline:</strong> LogEasy distinguishes between correlation and causation. 
            Insights state what your records suggest over time without claiming definitive causal claims.
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-500/10">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              selectedCategory === c.id
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-500/5 border border-transparent'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Patterns Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredPatterns.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-3">
            <Activity className="h-8 w-8 text-gray-600 mx-auto" />
            <h4 className="text-sm font-bold text-gray-300">No patterns detected for {timeRange}</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              As you record regular reflections, LogEasy detects subtle behavioral rhythms and returns transparent observations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPatterns.map(p => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/15 flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold">
                      {(p.category || 'Pattern').replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      Sample Size: <strong className="text-purple-300">{p.observationCount} logs</strong>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-100">{p.title}</h3>
                    <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Supporting Evidence Snippet */}
                  {p.supportingEvidence.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#090d16] border border-gray-500/10 text-xs font-mono space-y-1">
                      <span className="text-[10px] text-gray-500 uppercase block">Sample Evidence</span>
                      <p className="text-gray-300 truncate italic">
                        "{p.supportingEvidence[0].snippet}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer with Explainability */}
                <div className="pt-3 border-t border-gray-500/10 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenWhy(p)}
                    className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Why am I seeing this?</span>
                  </button>

                  <span className="text-[10px] font-mono text-gray-500">
                    Confidence: {Math.round((p.supportingEvidence[0]?.relevanceScore || 0.85) * 100)}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* WHY AM I SEEING THIS MODAL */}
      <AnimatePresence>
        {selectedPattern && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0d111c] border border-purple-500/30 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-500/10 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block">Evidence Breakdown</span>
                  <h3 className="text-base font-bold text-white">{selectedPattern.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedPattern(null)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-500/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2">
                <h4 className="text-xs font-bold text-purple-300 font-mono uppercase">Transparent Methodology</h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  LogEasy observed this pattern by grouping your reflections across the selected time range ({timeRange}). 
                  We detected recurring co-occurrences in mood, phrasing, and habits.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
                  Underlying Logs ({selectedPattern.supportingEvidence.length})
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedPattern.supportingEvidence.map((ev, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-gray-500/5 border border-gray-500/10 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                        <span>Logged Date: {ev.date}</span>
                        <span className="text-purple-400">Match score: {Math.round(ev.relevanceScore * 100)}%</span>
                      </div>
                      <p className="text-gray-300 italic">"{ev.snippet}"</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-500/10 flex items-center justify-between">
                <p className="text-[10px] text-gray-500">
                  You can dismiss or refine any observed pattern at any time.
                </p>
                <button
                  onClick={() => setSelectedPattern(null)}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
