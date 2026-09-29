import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Shield, Tag, Search, Check, X, Edit3, Plus, 
  Clock, MapPin, User, Heart, Lock, AlertCircle, Info, Database
} from 'lucide-react';
import { localDB, LocalJournalEntry } from '../../core/database/local_db';
import { AIMemoryProposal } from '../../core/database/hios_types';
import { AIMemory } from '../../core/ai/ai_types';

interface MemoriesHubProps {
  userId: string;
  entries: LocalJournalEntry[];
  onSelectEntry?: (entry: LocalJournalEntry) => void;
}

export default function MemoriesHub({ userId, entries, onSelectEntry }: MemoriesHubProps) {
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [proposals, setProposals] = useState<AIMemoryProposal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'user' | 'ai' | 'high_importance'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New manual memory state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('life_event');
  const [newImportance, setNewImportance] = useState<number>(4);
  const [newPrivacy, setNewPrivacy] = useState<'private' | 'vault'>('private');

  useEffect(() => {
    loadMemories();
  }, [userId]);

  const loadMemories = async () => {
    try {
      const stored = await localDB.getAIMemories(userId);
      setMemories(stored);

      const storedProposals = await localDB.getAIMemoryProposals(userId);
      setProposals(storedProposals.filter(p => p.status === 'pending'));
    } catch (err) {
      console.error('Failed loading memories:', err);
    }
  };

  const handleSaveProposal = async (proposal: AIMemoryProposal) => {
    // Commit as confirmed memory
    const confirmedMemory: AIMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      keyName: (proposal.inferredCategory || 'memory').replace('_', ' ').toUpperCase(),
      detail: proposal.memoryText,
      category: (proposal.inferredCategory as any) || 'other',
      confidence: proposal.confidenceScore,
      supportingEntryIds: proposal.sourceEntryId ? [proposal.sourceEntryId] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await localDB.saveAIMemory(confirmedMemory);

    // Update proposal status
    proposal.status = 'saved';
    await localDB.saveAIMemoryProposal(proposal);
    await loadMemories();
  };

  const handleDismissProposal = async (proposal: AIMemoryProposal) => {
    proposal.status = 'dismissed';
    await localDB.saveAIMemoryProposal(proposal);
    await loadMemories();
  };

  const handleCreateManualMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const manualMem: AIMemory = {
      id: `mem_user_${Date.now()}`,
      userId,
      keyName: newTitle.trim() || 'User Authored Memory',
      detail: newContent.trim(),
      category: (newCategory as any) || 'other',
      confidence: 1.0,
      supportingEntryIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveAIMemory(manualMem);
    setNewTitle('');
    setNewContent('');
    setShowAddModal(false);
    await loadMemories();
  };

  const filteredMemories = memories.filter(m => {
    const matchesSearch = 
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.tags && m.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    if (activeFilter === 'user') return m.confidence === 1.0 || m.tags?.includes('user_authored');
    if (activeFilter === 'ai') return m.tags?.includes('ai_suggested') || m.confidence < 1.0;
    if (activeFilter === 'high_importance') return (m.importance || 0) >= 4;

    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Layer 2 • Sovereign Engine</span>
            <span className="px-2 py-0.5 text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full font-semibold">Evidence Grounded</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Sovereign Memory Vault</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Permanent, private memories connected to your life events. Strictly distinguishes user-authored facts from AI suggestions. AI never invents memories silently.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-xs transition-all shadow-md self-start md:self-center cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Anchor New Memory</span>
        </button>
      </div>

      {/* AI Memory Proposals Review Banner (SAVE / EDIT / DISMISS) */}
      {proposals.length > 0 && (
        <div className="p-5 rounded-3xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>AI Memory Proposals Awaiting Your Confirmation ({proposals.length})</span>
            </div>
            <span className="text-[11px] text-slate-400">Strict Rule: AI suggestions require explicit user acceptance</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {proposals.map(p => (
              <div key={p.id} className="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                    Category: {p.inferredCategory}
                  </span>
                  <span className="text-slate-400 text-[10px]">Confidence: {(p.confidenceScore * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  "{p.memoryText}"
                </p>
                {p.sourceSnippet && (
                  <p className="text-[11px] text-slate-400 italic">
                    Source snippet: "{p.sourceSnippet}..."
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleSaveProposal(p)}
                    className="flex-1 py-1.5 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save to Memory</span>
                  </button>
                  <button
                    onClick={() => handleDismissProposal(p)}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-1 transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search memories, tags, people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All (${memories.length})` },
            { id: 'user', label: 'User Authored' },
            { id: 'ai', label: 'AI Suggested' },
            { id: 'high_importance', label: 'High Importance' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      {filteredMemories.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/20 space-y-3">
          <Database className="h-8 w-8 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-400">No memories match the filter</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Memories are extracted from your voice journals and reflections, or you can anchor memories directly using the button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.map(mem => (
            <motion.div
              key={mem.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                    mem.confidence === 1.0 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  }`}>
                    {mem.confidence === 1.0 ? 'User Authored Fact' : 'Confirmed AI Insight'}
                  </span>
                  
                  <div className="flex items-center gap-1 text-slate-400">
                    <Lock className="h-3 w-3" />
                    <span className="capitalize text-[10px]">{mem.category}</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white leading-snug">
                  {mem.keyName || 'Untitled Memory'}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {mem.detail}
                </p>

                {mem.evidenceSnippet && (
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <span className="font-semibold text-slate-300 block">Evidence source:</span>
                    <span className="italic">"{mem.evidenceSnippet}"</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(mem.createdAt).toLocaleDateString()}
                </span>

                <div className="flex gap-1">
                  {mem.tags && mem.tags.slice(0, 2).map((t, idx) => (
                    <span key={idx} className="bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded text-[10px]">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Manual Memory Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Anchor a Sovereign Memory</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualMemory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Memory Title</label>
                <input
                  type="text"
                  placeholder="e.g., Trip to the Coastal Cliffs with Maya"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">What happened? (Memory Content)</label>
                <textarea
                  rows={4}
                  placeholder="Describe the moment, realization, or life event in your own words..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="life_event">Life Event</option>
                    <option value="person">Person / Relationship</option>
                    <option value="lesson">Life Lesson</option>
                    <option value="achievement">Achievement</option>
                    <option value="nature">Nature Experience</option>
                    <option value="turning_point">Turning Point</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Importance (1-5)</label>
                  <select
                    value={newImportance}
                    onChange={(e) => setNewImportance(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value={1}>1 - Fleeting note</option>
                    <option value={2}>2 - Notable</option>
                    <option value={3}>3 - Important</option>
                    <option value={4}>4 - Deeply Meaningful</option>
                    <option value={5}>5 - Core Life Anchor</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Anchor Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
