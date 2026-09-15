import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, Brain, Search, Database, Calendar, Users, Share2, Sparkles, TrendingUp, AlertTriangle, 
  Trash2, Edit3, EyeOff, Eye, Check, X, RefreshCw, Layers, ShieldAlert, Award, FileText, Info, 
  Clock, ArrowRight, CheckCircle, Shield, Download, Lock, MapPin, Target, Zap, Settings
} from 'lucide-react';
import { localDB, LocalJournalEntry } from '../../core/database/local_db';
import { aiIntelligenceEngine } from '../../core/ai/ai_intelligence_engine';
import { aiService } from '../../core/ai/ai_service';
import { AIMemory, AIEntity, AIRelationship, AIInsight, AISummary } from '../../core/ai/ai_types';
import { logger } from '../../core/analytics/logger';

interface AIIntelligenceDashboardProps {
  userId: string;
}

export default function AIIntelligenceDashboard({ userId }: AIIntelligenceDashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'memories' | 'timeline' | 'insights' | 'privacy'>('overview');

  // DB Subscriptions
  const [entries, setEntries] = useState<LocalJournalEntry[]>([]);
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [entities, setEntities] = useState<AIEntity[]>([]);
  const [relationships, setRelationships] = useState<AIRelationship[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Semantic search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);

  // AI manual processing states
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Entity management modal/states
  const [editingEntity, setEditingEntity] = useState<AIEntity | null>(null);
  const [newName, setNewName] = useState('');
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);

  // Evidence Modal details
  const [activeEvidence, setActiveEvidence] = useState<{
    insightId: string;
    title: string;
    reasoning: string;
    confidence: number;
    dates: string;
    supportingIds: string[];
  } | null>(null);

  // Correction feedback inputs
  const [correctionText, setCorrectionText] = useState<Record<string, string>>({});

  // Summary builder scope selector
  const [summaryScope, setSummaryScope] = useState<'weekly' | 'monthly'>('weekly');
  const [summaryOutput, setSummaryOutput] = useState<AISummary | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Load all AI elements
  const reloadData = async () => {
    setLoading(true);
    try {
      const allEntries = await localDB.getJournalEntries(userId);
      const allMemories = await localDB.getAIMemories(userId);
      const allEntities = await localDB.getAIEntities(userId);
      const allRelationships = await localDB.getAIRelationships(userId);
      const allInsights = await localDB.getAIInsights(userId);
      const allSummaries = await localDB.getAISummaries(userId);

      setEntries(allEntries);
      setMemories(allMemories);
      setEntities(allEntities);
      setRelationships(allRelationships);
      setInsights(allInsights);
      setSummaries(allSummaries);
    } catch (e) {
      logger.error('AIDashboardUI', 'Failed loading dashboard details', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, [userId]);

  // Handle manual analysis trigger
  const handleManualAnalyze = async (entry: LocalJournalEntry) => {
    setProcessingId(entry.id);
    try {
      await aiIntelligenceEngine.analyzeJournalEntry(entry);
      await reloadData();
    } catch (e) {
      logger.error('AIDashboardUI', 'Manual processing failed', e);
    } finally {
      setProcessingId(null);
    }
  };

  // Perform semantic query search
  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResult(null);
    try {
      const res = await aiIntelligenceEngine.performAIQuery(userId, searchQuery);
      setSearchResult(res);
    } catch (err) {
      logger.error('AIDashboardUI', 'Semantic query crashed', err);
    } finally {
      setSearching(false);
    }
  };

  // Insight Feedback handlers
  const handleApproveInsight = async (insight: AIInsight) => {
    insight.feedbackStatus = 'approved';
    insight.updatedAt = new Date().toISOString();
    await localDB.saveAIInsight(insight);
    reloadData();
  };

  const handleRejectInsight = async (insight: AIInsight) => {
    insight.feedbackStatus = 'rejected';
    insight.updatedAt = new Date().toISOString();
    await localDB.saveAIInsight(insight);
    reloadData();
  };

  const handleCorrectionSubmit = async (insight: AIInsight) => {
    const text = correctionText[insight.id]?.trim();
    if (!text) return;

    insight.userCorrection = text;
    insight.feedbackStatus = 'approved';
    insight.updatedAt = new Date().toISOString();
    await localDB.saveAIInsight(insight);
    
    setCorrectionText(prev => ({ ...prev, [insight.id]: '' }));
    reloadData();
  };

  // Entity renaming & merging
  const handleRenameEntity = async () => {
    if (!editingEntity || !newName.trim()) return;

    editingEntity.name = newName.trim();
    editingEntity.updatedAt = new Date().toISOString();
    await localDB.saveAIEntity(editingEntity);

    // Update memories with the same name
    const relatedMemories = memories.filter(m => m.keyName.toLowerCase() === editingEntity.name.toLowerCase());
    for (const m of relatedMemories) {
      m.keyName = newName.trim();
      await localDB.saveAIMemory(m);
    }

    setEditingEntity(null);
    setNewName('');
    reloadData();
  };

  const handleMergeEntities = async (targetId: string) => {
    if (!mergeSourceId || mergeSourceId === targetId) return;

    const source = entities.find(e => e.id === mergeSourceId);
    const target = entities.find(e => e.id === targetId);

    if (source && target) {
      // Merge source supporting entry references into target
      target.supportingEntryIds = Array.from(new Set([...target.supportingEntryIds, ...source.supportingEntryIds]));
      target.updatedAt = new Date().toISOString();
      await localDB.saveAIEntity(target);

      // Re-point relationships
      for (const rel of relationships) {
        if (rel.sourceId === source.id) {
          rel.sourceId = target.id;
          await localDB.saveAIRelationship(rel);
        }
        if (rel.targetId === source.id) {
          rel.targetId = target.id;
          await localDB.saveAIRelationship(rel);
        }
      }

      // Re-point memories
      const sourceMemories = memories.filter(m => m.keyName.toLowerCase() === source.name.toLowerCase());
      for (const m of sourceMemories) {
        m.keyName = target.name;
        await localDB.saveAIMemory(m);
      }

      // Delete source
      await localDB.deleteAIEntity(source.id);
      setMergeSourceId(null);
      reloadData();
    }
  };

  // Toggle hide memories
  const handleToggleHideMemory = async (memory: AIMemory) => {
    memory.hidden = !memory.hidden;
    memory.updatedAt = new Date().toISOString();
    await localDB.saveAIMemory(memory);
    reloadData();
  };

  const handleDeleteMemory = async (memory: AIMemory) => {
    if (confirm(`Irreversible: Delete this memory point about "${memory.keyName}"?`)) {
      await localDB.deleteAIMemory(memory.id);
      reloadData();
    }
  };

  // Generate range summary (Smart Summarization)
  const handleGenerateTimeRangeSummary = async () => {
    setGeneratingSummary(true);
    setSummaryOutput(null);

    try {
      const now = new Date();
      let start = new Date();
      if (summaryScope === 'weekly') {
        start.setDate(now.getDate() - 7);
      } else {
        start.setMonth(now.getMonth() - 1);
      }

      const summary = await aiIntelligenceEngine.generateTimeRangeSummary(userId, summaryScope, { start, end: now });
      setSummaryOutput(summary);
      await reloadData();
    } catch (e) {
      logger.error('AIDashboardUI', 'Failed timeline synthesis', e);
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Total AI Cache Purge
  const handleCompleteReset = async () => {
    if (confirm('CRITICAL ACTION: This will completely scrub your long-term memories, knowledge graph nodes, and insights from local IndexedDB storage. Continue?')) {
      await localDB.clearAllAIData(userId);
      await reloadData();
      alert('AI Intelligence cache reset completed successfully.');
    }
  };

  // Export AI Data
  const handleExportAIData = () => {
    const data = {
      memories,
      entities,
      relationships,
      insights,
      summaries,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LogEasy_AI_Vault_Export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  // Find supporting entry details
  const getSupportingEntries = (ids: string[]) => {
    return entries.filter(e => ids.includes(e.id));
  };

  // UI Processing metrics helper
  const totalAnalyzed = entries.filter(e => e.aiProcessingStatus === 'completed').length;
  const totalPending = entries.filter(e => e.aiProcessingStatus === 'processing' || e.aiProcessingStatus === 'idle').length;
  const metrics = aiService.getUsageMetrics();

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6">
      
      {/* 1. INTERACTIVE TABS */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200/10 pb-px shrink-0 select-none">
        {[
          { id: 'overview', label: 'AI Overview', icon: Cpu },
          { id: 'search', label: 'Smart Search', icon: Search },
          { id: 'memories', label: 'Memory Explorer', icon: Brain },
          { id: 'timeline', label: 'Life Timeline', icon: Calendar },
          { id: 'insights', label: 'Insights & Habits', icon: TrendingUp },
          { id: 'privacy', label: 'Vault Control', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === t.id 
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' 
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-500/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. LOADING MASK */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-gray-400 font-mono">Syncing Local Encrypted Memory Graph...</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Bento Row 1: System Metrics Counters */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                
                <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Core Intelligence</span>
                    <div className="text-xl font-bold mt-1">{totalAnalyzed} / {entries.length}</div>
                    <p className="text-[11px] text-gray-400">Analyzed voice recordings</p>
                  </div>
                  <Brain className="h-8 w-8 text-cyan-500/20 shrink-0" />
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block">Knowledge Graph</span>
                    <div className="text-xl font-bold mt-1">{entities.length} nodes</div>
                    <p className="text-[11px] text-gray-400">{relationships.length} active relationships</p>
                  </div>
                  <Layers className="h-8 w-8 text-indigo-500/20 shrink-0" />
                </div>

                <div className="p-4 rounded-2xl bg-fuchsia-500/5 border border-fuchsia-500/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest block">Insights Vault</span>
                    <div className="text-xl font-bold mt-1">{insights.length} extracted</div>
                    <p className="text-[11px] text-gray-400">{insights.filter(i => i.feedbackStatus === 'approved').length} user attested</p>
                  </div>
                  <Award className="h-8 w-8 text-fuchsia-500/20 shrink-0" />
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block">Cost & Performance</span>
                    <div className="text-xl font-bold mt-1">{(metrics.totalTokens / 1000).toFixed(1)}k</div>
                    <p className="text-[11px] text-gray-400">Tokens used ({metrics.totalRequests} API calls)</p>
                  </div>
                  <Zap className="h-8 w-8 text-amber-500/20 shrink-0" />
                </div>

              </div>

              {/* Bento Row 2: Queue and Quick summaries */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* AI Tasks queue state & processing triggers */}
                <div className="xl:col-span-2 p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-cyan-400" />
                      <span>On-Device AI Transcription Processor & Queue</span>
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono">
                      {totalPending > 0 ? `${totalPending} Pending` : 'Up-to-Date'}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {entries.length === 0 ? (
                      <div className="text-center text-gray-500 py-12 text-xs font-mono">No voice recordings located. File some logs in the recorder tab.</div>
                    ) : (
                      entries.map((entry) => (
                        <div key={entry.id} className="p-3 rounded-xl bg-gray-500/5 border border-gray-500/10 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-gray-200 truncate">{entry.title || `Voice Log: ${new Date(entry.createdAt).toLocaleString()}`}</h4>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{entry.transcript}</p>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase ${
                              entry.aiProcessingStatus === 'completed' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : entry.aiProcessingStatus === 'processing'
                                ? 'bg-amber-500/10 text-amber-400 animate-pulse'
                                : 'bg-gray-500/10 text-gray-400'
                            }`}>
                              {entry.aiProcessingStatus || 'idle'}
                            </span>
                            
                            <button
                              onClick={() => handleManualAnalyze(entry)}
                              disabled={processingId !== null}
                              className="text-[10px] text-cyan-400 border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 rounded-lg hover:bg-cyan-500/15 transition-all disabled:opacity-40 cursor-pointer"
                            >
                              {processingId === entry.id ? 'Analyzing...' : 'Analyze'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Smart Summarizer Box */}
                <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-fuchsia-400" />
                    <span>Smart Summarizer</span>
                  </h3>
                  
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    Compile cross-entry weekly or monthly summaries. Synthesizes core themes, average emotions, and narratives while keeping data private.
                  </p>

                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-300">Time scope:</span>
                      <div className="flex bg-gray-500/10 rounded-lg p-0.5">
                        <button 
                          onClick={() => setSummaryScope('weekly')}
                          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${summaryScope === 'weekly' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-400'}`}
                        >
                          WEEKLY
                        </button>
                        <button 
                          onClick={() => setSummaryScope('monthly')}
                          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${summaryScope === 'monthly' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-400'}`}
                        >
                          MONTHLY
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateTimeRangeSummary}
                      disabled={generatingSummary || entries.length === 0}
                      className="w-full py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {generatingSummary ? 'Synthesizing...' : 'Generate Time Synthesis'}
                    </button>
                  </div>

                  {summaryOutput && (
                    <div className="p-3 bg-gray-500/5 rounded-xl border border-gray-500/10 space-y-2 max-h-[140px] overflow-y-auto">
                      <h4 className="text-[11px] font-black text-cyan-400 uppercase">{summaryOutput.title}</h4>
                      <p className="text-[10px] text-gray-300 whitespace-pre-wrap leading-relaxed">{summaryOutput.content}</p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB: SMART SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              
              <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-200/10 space-y-4">
                <h3 className="text-sm font-bold">Natural Language Memory Search</h3>
                <p className="text-xs text-gray-400">Search memories semantically. Ask questions like: <em>"What happened with Project Alpha?"</em> or <em>"When did I first mention Alice?"</em></p>

                <form onSubmit={handleSemanticSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type your semantic memory query..." 
                      className="w-full bg-gray-500/5 border border-gray-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:border-cyan-400 outline-none transition-all text-gray-200 font-medium"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={searching || !searchQuery.trim()}
                    className="px-6 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {searching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    <span>Query</span>
                  </button>
                </form>
              </div>

              {/* Chat-style retrieval result */}
              <AnimatePresence mode="wait">
                {searchResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-6"
                  >
                    {/* Synthesis answer */}
                    <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/10 space-y-3">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">AI Synthesis Response</span>
                      <div className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
                        {searchResult.summary}
                      </div>
                      <div className="text-[10px] text-gray-400 italic">
                        Relevance Confidence Score: {searchResult.relevanceScore}% • {searchResult.reasoning}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Linked Entities */}
                      <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-3">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase font-mono">Matching Memory Graph Nodes</h4>
                        {searchResult.matchingEntities.length === 0 ? (
                          <p className="text-[11px] text-gray-500 italic">No specific graph entity matches.</p>
                        ) : (
                          <div className="space-y-2">
                            {searchResult.matchingEntities.map((e: AIEntity) => (
                              <div key={e.id} className="p-2.5 rounded-xl bg-gray-500/5 border border-gray-500/10 flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-bold text-gray-200">{e.name}</span>
                                  <span className="text-[9px] uppercase px-1.5 py-0.2 bg-gray-500/10 rounded ml-2 font-mono tracking-wider">{e.type}</span>
                                </div>
                                <span className="text-[10px] text-gray-400">{e.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Direct Evidence entries */}
                      <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-3">
                        <h4 className="text-xs font-bold text-fuchsia-400 uppercase font-mono">Linked Journal Evidence ({searchResult.matchingEntryIds.length})</h4>
                        {searchResult.matchingEntryIds.length === 0 ? (
                          <p className="text-[11px] text-gray-500 italic">No direct logs referenced.</p>
                        ) : (
                          <div className="space-y-2 max-h-[160px] overflow-y-auto">
                            {getSupportingEntries(searchResult.matchingEntryIds).map((e) => (
                              <div key={e.id} className="p-2.5 rounded-xl bg-gray-500/5 border border-gray-500/10">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-300">{e.title || `Vocal Log: ${new Date(e.createdAt).toLocaleDateString()}`}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">{e.moodLabel}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 truncate">{e.transcript}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}

          {/* TAB: MEMORY EXPLORER & KNOWLEDGE GRAPH */}
          {activeTab === 'memories' && (
            <div className="space-y-6">
              
              {/* Split screen: Entities list & Knowledge Graph viewer */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Entities List */}
                <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <h3 className="text-sm font-bold flex items-center justify-between">
                    <span>Knowledge Graph Nodes (Entities)</span>
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full font-mono font-bold">{entities.length} nodes</span>
                  </h3>

                  {editingEntity && (
                    <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-3">
                      <h4 className="text-xs font-bold text-cyan-400">Rename Entity: "{editingEntity.name}"</h4>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="New entity name..." 
                          className="flex-1 bg-gray-500/5 border border-gray-500/20 rounded-lg px-2.5 py-1 text-xs focus:border-cyan-400 outline-none text-gray-200"
                        />
                        <button onClick={handleRenameEntity} className="bg-cyan-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:opacity-90">Save</button>
                        <button onClick={() => setEditingEntity(null)} className="text-gray-400 text-xs px-2">Cancel</button>
                      </div>
                    </div>
                  )}

                  {mergeSourceId && (
                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                      <p className="text-[11px] text-gray-300">
                        Selected merge source node: <strong>{entities.find(e => e.id === mergeSourceId)?.name}</strong>. 
                        Click <span className="text-indigo-400 font-bold">Merge Target</span> on any node below to combine their histories.
                      </p>
                      <button onClick={() => setMergeSourceId(null)} className="text-[10px] text-gray-400 hover:text-red-400">Cancel Merge</button>
                    </div>
                  )}

                  <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                    {entities.length === 0 ? (
                      <div className="text-center text-gray-500 py-16 text-xs font-mono">No graph entities synthesized yet.</div>
                    ) : (
                      entities.map((e) => (
                        <div key={e.id} className="p-3 rounded-xl bg-gray-500/5 border border-gray-500/10 flex flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-bold text-gray-200">{e.name}</span>
                              <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-gray-500/10 rounded text-gray-400 ml-2">{e.type}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => { setEditingEntity(e); setNewName(e.name); }}
                                className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                                title="Rename node"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => setMergeSourceId(e.id)}
                                className={`text-[10px] px-2 py-0.5 rounded transition-all ${mergeSourceId === e.id ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-indigo-400 border border-gray-500/10'}`}
                                title="Merge duplicate"
                              >
                                {mergeSourceId === e.id ? 'Merging' : 'Merge'}
                              </button>
                              {mergeSourceId && mergeSourceId !== e.id && (
                                <button 
                                  onClick={() => handleMergeEntities(e.id)}
                                  className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 font-bold"
                                >
                                  Merge Target
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span>{e.description}</span>
                            <span>{e.supportingEntryIds.length} mentions</span>
                          </div>

                          <div className="flex gap-1">
                            {e.tags.map((t, idx) => (
                              <span key={idx} className="text-[9px] px-1.5 bg-gray-500/10 rounded text-indigo-300">#{t}</span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Long-term memories explorer list */}
                <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <h3 className="text-sm font-bold flex items-center justify-between">
                    <span>Knowledge Graph Relationships & Memories</span>
                    <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full font-mono font-bold">{memories.length} memories</span>
                  </h3>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {memories.length === 0 ? (
                      <div className="text-center text-gray-500 py-16 text-xs font-mono">No long-term memory records discovered.</div>
                    ) : (
                      memories.map((m) => (
                        <div key={m.id} className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${m.hidden ? 'bg-gray-500/2 border-gray-500/5 opacity-50' : 'bg-gray-500/5 border-gray-500/10'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                              {m.keyName}
                              <span className="text-[9px] uppercase px-1.5 py-0.1 bg-gray-500/10 text-cyan-400 rounded font-mono">{m.category}</span>
                            </span>
                            
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleToggleHideMemory(m)}
                                className="p-1 text-gray-400 hover:text-cyan-400"
                                title={m.hidden ? 'Show memory' : 'Hide memory'}
                              >
                                {m.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              </button>
                              <button 
                                onClick={() => handleDeleteMemory(m)}
                                className="p-1 text-gray-400 hover:text-red-400"
                                title="Delete memory"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-gray-300 font-sans">{m.detail}</p>
                          <div className="text-[10px] text-gray-400 font-mono">Confidence rating: {m.confidence}% • Linked to {m.supportingEntryIds.length} logs</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              
              <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                <div>
                  <h3 className="text-sm font-bold">Personal Life Timeline Milestones</h3>
                  <p className="text-xs text-gray-400">Chronological vertical mapping of life milestones, business launches, moving events, and achievements extracted from voice journaling diaries.</p>
                </div>

                <div className="relative border-l-2 border-cyan-500/20 ml-4 pl-6 space-y-8 py-2">
                  {entities.filter(e => e.type === 'event').length === 0 ? (
                    <div className="text-center text-gray-500 py-12 text-xs font-mono ml-[-16px]">No major milestone events located. Speak about goals or achievements in logs.</div>
                  ) : (
                    entities.filter(e => e.type === 'event').map((mile, index) => (
                      <div key={mile.id} className="relative">
                        
                        {/* Dot indicator */}
                        <div className="absolute left-[-32px] top-1.5 h-4 w-4 rounded-full bg-cyan-500 border-2 border-white dark:border-[#0b0f19] flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>
                        </div>

                        <div className="space-y-1.5 p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-cyan-400">{mile.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(mile.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-300">{mile.description}</p>
                          
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            <span className="text-[10px] text-gray-400">Evidence reference:</span>
                            {getSupportingEntries(mile.supportingEntryIds).map((ent) => (
                              <span key={ent.id} className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/10 font-mono">
                                {ent.title || `Entry: ${new Date(ent.createdAt).toLocaleDateString()}`}
                              </span>
                            ))}
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB: INSIGHTS & HABITS */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold">Evidence-Backed Insight Engine</h3>
                  <p className="text-xs text-gray-400">Discovered psychological patterns, positive/negative habit shifts, stress triggers, and personal strengths backed by traceable logs.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {insights.length === 0 ? (
                  <div className="lg:col-span-2 text-center text-gray-500 py-24 text-xs font-mono p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10">
                    No insights generated. Log some journal sessions first.
                  </div>
                ) : (
                  insights.map((ins) => (
                    <div 
                      key={ins.id} 
                      className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                        ins.feedbackStatus === 'rejected' 
                          ? 'bg-red-500/2 border-red-500/10 opacity-40' 
                          : ins.feedbackStatus === 'approved'
                          ? 'bg-emerald-500/2 border-emerald-500/10'
                          : 'bg-gray-500/5 border-gray-500/10'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-black text-gray-100 flex items-center gap-1.5 leading-snug">
                            {ins.title}
                            <span className={`text-[9px] px-2 py-0.2 rounded font-mono uppercase ${
                              ins.category.startsWith('habit_positive') || ins.category === 'achievement'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : ins.category === 'concern' || ins.category.startsWith('habit_negative')
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-indigo-500/10 text-indigo-400'
                            }`}>
                              {ins.category.replace('_', ' ')}
                            </span>
                          </span>
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed font-sans">{ins.description}</p>
                        
                        {ins.userCorrection && (
                          <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-[11px] text-indigo-300">
                            <strong>User Correction Note:</strong> {ins.userCorrection}
                          </div>
                        )}
                      </div>

                      {/* Disclosure Drawer Evidence System */}
                      <div className="space-y-4 pt-2 border-t border-gray-200/5">
                        
                        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                          <button
                            onClick={() => setActiveEvidence({
                              insightId: ins.id,
                              title: ins.title,
                              reasoning: ins.reasoningSummary,
                              confidence: ins.confidenceScore,
                              dates: `${new Date(ins.dateRangeStart).toLocaleDateString()} - ${new Date(ins.dateRangeEnd).toLocaleDateString()}`,
                              supportingIds: ins.supportingEntryIds
                            })}
                            className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                          >
                            <Info className="h-3.5 w-3.5" />
                            <span>Inspect supporting evidence ({ins.supportingEntryIds.length})</span>
                          </button>
                          
                          <span className="font-mono text-gray-400">Confidence: <strong className="text-cyan-400">{ins.confidenceScore}%</strong></span>
                        </div>

                        {/* Interactive Feedback buttons */}
                        <div className="flex items-center justify-between gap-4 flex-wrap pt-1.5">
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleApproveInsight(ins)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                ins.feedbackStatus === 'approved' 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/5'
                              }`}
                              title="Approve Insight"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Approve</span>
                            </button>
                            
                            <button
                              onClick={() => handleRejectInsight(ins)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                ins.feedbackStatus === 'rejected' 
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                  : 'text-gray-400 hover:text-red-400 hover:bg-red-500/5'
                              }`}
                              title="Reject Insight"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Reject</span>
                            </button>
                          </div>

                          {/* Correction input fields */}
                          <div className="flex-1 flex gap-1.5 min-w-[200px]">
                            <input 
                              type="text" 
                              value={correctionText[ins.id] || ''}
                              onChange={(e) => setCorrectionText(prev => ({ ...prev, [ins.id]: e.target.value }))}
                              placeholder="Correct AI mistakes or refine..."
                              className="flex-1 bg-gray-500/5 border border-gray-500/20 rounded-lg px-2.5 py-1 text-[11px] focus:border-cyan-400 outline-none text-gray-200"
                            />
                            <button 
                              onClick={() => handleCorrectionSubmit(ins)}
                              className="text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg transition-all"
                            >
                              Correct
                            </button>
                          </div>

                        </div>

                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB: PRIVACY & SYSTEM CONFIGS */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 max-w-3xl">
              
              <div className="p-6 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 text-red-400 rounded-xl border border-red-500/30">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-100">Personal Memory & Privacy Dashboard</h3>
                    <p className="text-xs text-gray-400 font-sans">You retain absolute control over your AI memory vault, insights history, and training variables.</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs font-sans">
                  
                  <div className="flex items-center justify-between border-b border-gray-200/5 pb-3">
                    <div>
                      <span className="font-semibold text-gray-200 block">Encrypted Memory Graph</span>
                      <span className="text-gray-400 leading-normal">All graph links are stored inside local browser IndexedDB. Zero advertising telemetry.</span>
                    </div>
                    <span className="text-emerald-400 font-mono">Active</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-200/5 pb-3">
                    <div>
                      <span className="font-semibold text-gray-200 block">User-Controlled AI History</span>
                      <span className="text-gray-400">Reject, correct, hide or merge nodes anytime. Corrections optimize future extractions.</span>
                    </div>
                    <span className="text-cyan-400 font-mono">Active</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-200/5 pb-3">
                    <div>
                      <span className="font-semibold text-gray-200 block">Data Export</span>
                      <span className="text-gray-400">Export your personal knowledge graph, summaries, and insights into clean JSON.</span>
                    </div>
                    <button 
                      onClick={handleExportAIData}
                      className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export JSON</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-200/5 pb-3">
                    <div>
                      <span className="font-semibold text-gray-200 block">Reset Memory Vault</span>
                      <span className="text-gray-400">Irreversibly delete all entities, memories, relationships, and insight summaries.</span>
                    </div>
                    <button 
                      onClick={handleCompleteReset}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Purge Memory</span>
                    </button>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* 3. EVIDENCE DETAILED MODAL VIEWER */}
      <AnimatePresence>
        {activeEvidence && (
          <div className="fixed inset-0 z-50 bg-[#06080e]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f1422] border border-gray-200/10 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-gray-200/5 pb-3">
                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  <span>Evidence Inspection Panel</span>
                </h3>
                <button onClick={() => setActiveEvidence(null)} className="text-gray-400 hover:text-gray-200">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans">
                
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Insight Subject</span>
                  <p className="text-sm font-bold text-gray-200">{activeEvidence.title}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Heuristic / Reasoning Summary</span>
                  <p className="text-xs text-gray-300 leading-relaxed bg-[#141b2c] p-3.5 rounded-xl border border-gray-500/10 italic">
                    "{activeEvidence.reasoning}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Confidence Score</span>
                    <p className="text-sm font-bold text-cyan-400">{activeEvidence.confidence}% Verified</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Time Covered</span>
                    <p className="text-xs font-semibold text-gray-200">{activeEvidence.dates}</p>
                  </div>
                </div>

                {/* Direct Journal Evidence Text list */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Linked Supporting Journal Logs</span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {getSupportingEntries(activeEvidence.supportingIds).map((e) => (
                      <div key={e.id} className="p-3 bg-[#131a2a] rounded-xl border border-gray-500/10 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-300">
                          <span>{e.title || `Vocal Diary Entry`}</span>
                          <span>{new Date(e.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">"{e.transcript}"</p>
                        <div className="flex items-center justify-between text-[10px] text-indigo-400">
                          <span>Mood: {e.moodLabel} ({e.moodScore}/10)</span>
                          <span>Categories: {e.categories.join(', ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="pt-2 border-t border-gray-200/5">
                <button 
                  onClick={() => setActiveEvidence(null)}
                  className="w-full py-2 bg-gray-500/15 hover:bg-gray-500/25 text-gray-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close Evidence File
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
