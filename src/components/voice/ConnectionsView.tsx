import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, Users, Target, Compass, Sparkles, Heart, MapPin, 
  BookOpen, HelpCircle, Check, X, RefreshCw, ArrowRight, ShieldCheck, Info
} from 'lucide-react';
import { intelligentConnectionEngine, IntelligentConnection, ConnectionDomain } from '../../core/intelligence/intelligent_connection_engine';
import { localDB, LocalJournalEntry } from '../../core/database/local_db';
import { logger } from '../../core/analytics/logger';

interface ConnectionsViewProps {
  userId: string;
  onOpenEntry?: (entryId: string) => void;
}

export default function ConnectionsView({ userId, onOpenEntry }: ConnectionsViewProps) {
  const [connections, setConnections] = useState<IntelligentConnection[]>([]);
  const [activeDomain, setActiveDomain] = useState<ConnectionDomain | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<IntelligentConnection | null>(null);
  const [supportingEntries, setSupportingEntries] = useState<LocalJournalEntry[]>([]);

  const loadConnections = async (refresh: boolean = false) => {
    setLoading(true);
    try {
      const data = await intelligentConnectionEngine.discoverConnections(userId, refresh);
      setConnections(data);
    } catch (e) {
      logger.error('ConnectionsView', 'Failed loading connections', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections(false);
  }, [userId]);

  const handleOpenWhy = async (conn: IntelligentConnection) => {
    setSelectedConnection(conn);
    try {
      const fetched: LocalJournalEntry[] = [];
      for (const id of conn.supportingEntryIds) {
        const entry = await localDB.getJournalEntry(id);
        if (entry) fetched.push(entry);
      }
      setSupportingEntries(fetched);
    } catch (e) {
      setSupportingEntries([]);
    }
  };

  const handleUpdateStatus = (connId: string, status: 'confirmed' | 'dismissed') => {
    intelligentConnectionEngine.updateConnectionStatus(userId, connId, status);
    setConnections(prev => prev.map(c => c.id === connId ? { ...c, userStatus: status } : c));
    if (selectedConnection?.id === connId) {
      setSelectedConnection(prev => prev ? { ...prev, userStatus: status } : null);
    }
  };

  const filtered = connections.filter(c => {
    if (c.userStatus === 'dismissed') return false;
    if (activeDomain === 'all') return true;
    return c.domain === activeDomain;
  });

  const domains = [
    { id: 'all', label: 'All Connections', icon: Network },
    { id: 'person_memory', label: 'People ↔ Memories', icon: Users },
    { id: 'habit_goal', label: 'Habits ↔ Goals', icon: Target },
    { id: 'goal_experience', label: 'Goals ↔ Experiences', icon: Compass },
    { id: 'emotion_event', label: 'Emotions ↔ Rest', icon: Heart },
    { id: 'theme_chapter', label: 'Themes ↔ Chapters', icon: BookOpen },
  ];

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Personal Life Model
            </span>
            <span className="text-gray-500 text-xs font-mono">• Incremental Graph Intelligence</span>
          </div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Network className="h-5 w-5 text-cyan-400" />
            <span>Intelligent Connection Engine</span>
          </h2>
          <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
            Automatically uncovers longitudinal patterns, relational anchors, and recurring themes across your memories.
            Every insight is transparent, explainable, and backed by your verified thoughts.
          </p>
        </div>

        <button
          onClick={() => loadConnections(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/20 text-gray-200 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing...' : 'Scan Connections'}</span>
        </button>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-500/10 select-none">
        {domains.map(d => {
          const Icon = d.icon;
          const isActive = activeDomain === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setActiveDomain(d.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive 
                  ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-500/5 border border-transparent'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{d.label}</span>
            </button>
          );
        })}
      </div>

      {/* Connection Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-3">
            <Network className="h-8 w-8 text-gray-600 mx-auto" />
            <h4 className="text-sm font-bold text-gray-300">No connections detected in this filter</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              As you capture more voice journals and link personal goals, the Intelligent Connection Engine incrementally surfaces recurring bridges without requiring manual tagging.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(conn => (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/15 flex flex-col justify-between space-y-4 hover:border-cyan-500/30 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold">
                      {conn.domain.replace('_', ' ↔ ')}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      Confidence: <strong className="text-cyan-400">{Math.round(conn.confidence * 100)}%</strong>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                      <span>{conn.title}</span>
                    </h3>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      {conn.explanation}
                    </p>
                  </div>

                  {/* Flow Pills */}
                  <div className="p-3 rounded-xl bg-[#090d16] border border-gray-500/10 flex items-center justify-between text-xs font-mono">
                    <div className="truncate max-w-[40%]">
                      <span className="text-gray-500 text-[10px] block uppercase">Source</span>
                      <span className="text-gray-200 font-semibold truncate block">{conn.source.label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-cyan-400 shrink-0" />
                    <div className="truncate max-w-[40%] text-right">
                      <span className="text-gray-500 text-[10px] block uppercase">Target</span>
                      <span className="text-cyan-300 font-semibold truncate block">{conn.target.label}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Explainable Why + Feedback */}
                <div className="pt-3 border-t border-gray-500/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenWhy(conn)}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer py-1"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Why this connection?</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {conn.userStatus !== 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(conn.id, 'confirmed')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20 cursor-pointer flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>Confirm</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateStatus(conn.id, 'dismissed')}
                      className="px-2.5 py-1 rounded-lg bg-gray-500/10 hover:bg-red-500/10 text-gray-400 hover:text-red-400 text-[11px] font-semibold border border-gray-500/10 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* EXPLAINABILITY MODAL: "WHY THIS CONNECTION?" */}
      <AnimatePresence>
        {selectedConnection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e1320] border border-cyan-500/30 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-500/10 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Evidence & Provenance</span>
                  <h3 className="text-base font-bold text-white">{selectedConnection.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedConnection(null)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-500/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* System Observation */}
              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/15 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono uppercase">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Transparent Model Explanation</span>
                </div>
                <p className="text-xs text-gray-200 leading-relaxed">
                  {selectedConnection.explanation}
                </p>
                <div className="pt-2 text-[11px] font-mono text-gray-400 border-t border-cyan-500/10">
                  Evidence basis: <span className="text-gray-200">{selectedConnection.evidence}</span>
                </div>
              </div>

              {/* Supporting Entries List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
                  Supporting Journal Records ({supportingEntries.length})
                </h4>

                {supportingEntries.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No specific direct journal transcripts linked.</p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {supportingEntries.map(entry => (
                      <div 
                        key={entry.id}
                        className="p-3 rounded-xl bg-gray-500/5 border border-gray-500/10 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                          <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                          <span className="text-cyan-400">Mood: {entry.moodScore}/10</span>
                        </div>
                        <p className="text-gray-300 line-clamp-2 italic">
                          "{entry.transcript}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User Agency Controls */}
              <div className="pt-3 border-t border-gray-500/10 flex items-center justify-between gap-3">
                <p className="text-[10px] text-gray-500">
                  LogEasy provides observations, not absolute truths. You maintain final authority over your personal narrative.
                </p>
                <button
                  onClick={() => setSelectedConnection(null)}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
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
