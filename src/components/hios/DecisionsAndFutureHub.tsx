import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  GitFork, Target, CheckCircle2, AlertCircle, Plus, 
  HelpCircle, ArrowRight, Shield, Check, Clock
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { DecisionWorkspace } from '../../core/database/hios_types';

interface DecisionsAndFutureHubProps {
  userId: string;
}

export default function DecisionsAndFutureHub({ userId }: DecisionsAndFutureHubProps) {
  const [decisions, setDecisions] = useState<DecisionWorkspace[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [priorities, setPriorities] = useState('');
  const [opt1Name, setOpt1Name] = useState('');
  const [opt1Pros, setOpt1Pros] = useState('');
  const [opt1Cons, setOpt1Cons] = useState('');
  const [opt2Name, setOpt2Name] = useState('');
  const [opt2Pros, setOpt2Pros] = useState('');
  const [opt2Cons, setOpt2Cons] = useState('');
  const [valuesAlignment, setValuesAlignment] = useState('');

  useEffect(() => {
    loadDecisions();
  }, [userId]);

  const loadDecisions = async () => {
    try {
      const stored = await localDB.getDecisionWorkspaces(userId);
      if (stored.length === 0) {
        const seedD: DecisionWorkspace = {
          id: 'dec_1',
          userId,
          decisionTitle: 'Choosing Between Two Studio Work Environments',
          status: 'deliberating',
          priorities: ['Focus and uninterrupted silence', 'Clear boundary between rest and deep work', 'Budget sustainability'],
          constraints: ['Must stay within 15 mins transit'],
          options: [
            {
              id: 'opt_1',
              title: 'Option A: Redesign Home Study with Strict Door Policy',
              pros: ['Zero additional rent', 'No commute time', 'Maximum comfort'],
              cons: ['Work easily bleeds into evening rest', 'Household distractions'],
              risks: ['Burnout if separation is not honored'],
              benefits: ['Zero additional financial risk'],
              score: 8
            },
            {
              id: 'opt_2',
              title: 'Option B: Independent Workshop Space 10 Minutes Away',
              pros: ['Absolute psychological separation', 'Dedicated sacred room for creation'],
              cons: ['Monthly overhead', '15 min bicycle commute in rain'],
              risks: ['Pressure to monetize quickly to justify rent'],
              benefits: ['Deep focus environment free of household context'],
              score: 9
            }
          ],
          knownFacts: ['Current savings cover 12 months buffer', 'Current home space causes subtle evening anxiety'],
          assumptions: ['Commute will feel grounding, not draining'],
          uncertainties: ['Will workshop landlord allow flexible short-term lease?'],
          valuesAlignment: 'Values sovereignty, deep focus, and psychological rest.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await localDB.saveDecisionWorkspace(seedD);
        setDecisions([seedD]);
      } else {
        setDecisions(stored);
      }
    } catch (err) {
      console.error('Failed loading decision workspaces:', err);
    }
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newDec: DecisionWorkspace = {
      id: `dec_${Date.now()}`,
      userId,
      decisionTitle: title.trim(),
      status: 'deliberating',
      priorities: priorities ? priorities.split(',').map(s => s.trim()) : [],
      constraints: [],
      options: [
        {
          id: 'opt_1',
          title: opt1Name || 'Option 1',
          pros: opt1Pros ? opt1Pros.split(',').map(s => s.trim()) : [],
          cons: opt1Cons ? opt1Cons.split(',').map(s => s.trim()) : [],
          risks: [],
          benefits: [],
          score: 8
        },
        {
          id: 'opt_2',
          title: opt2Name || 'Option 2',
          pros: opt2Pros ? opt2Pros.split(',').map(s => s.trim()) : [],
          cons: opt2Cons ? opt2Cons.split(',').map(s => s.trim()) : [],
          risks: [],
          benefits: [],
          score: 8
        }
      ],
      knownFacts: [],
      assumptions: [],
      uncertainties: [],
      valuesAlignment: valuesAlignment.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveDecisionWorkspace(newDec);
    setShowAddModal(false);
    await loadDecisions();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Layer 13 • Clarity & Agency</span>
            <span className="px-2 py-0.5 text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full font-semibold">Values-Grounded Choices</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Structured Decision Workspaces</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Navigate crossroads with calm rigor. Disentangle facts from anxieties, test options against core values, and record outcomes for lifelong learning.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-xs transition-all shadow-md self-start md:self-center cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Decision Space</span>
        </button>
      </div>

      {/* Decision Workspaces List */}
      <div className="space-y-6">
        {decisions.map(dec => (
          <div key={dec.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-500/20 font-bold">
                  Status: {dec.status}
                </span>
                <h3 className="text-lg font-black text-white mt-1.5">{dec.decisionTitle}</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Initiated {new Date(dec.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              {dec.valuesAlignment}
            </p>

            {/* Priorities */}
            {dec.priorities.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Non-Negotiable Priorities
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {dec.priorities.map((p, i) => (
                    <span key={i} className="text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 px-3 py-1 rounded-xl">
                      🎯 {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Options Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {dec.options.map(opt => (
                <div key={opt.id} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{opt.title}</h4>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      Values Fit: {opt.score || 8}/10
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="text-[11px] font-bold text-emerald-400 block">Pros:</span>
                    {opt.pros.map((pro, i) => (
                      <p key={i} className="text-slate-300">✓ {pro}</p>
                    ))}
                  </div>

                  <div className="space-y-1.5 text-xs pt-1 border-t border-slate-800/60">
                    <span className="text-[11px] font-bold text-rose-400 block">Cons & Risks:</span>
                    {opt.cons.map((con, i) => (
                      <p key={i} className="text-slate-400">✗ {con}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Known Facts vs Assumptions */}
            {dec.knownFacts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="font-bold text-cyan-400 block text-[11px] mb-1">Known Facts (Objective):</span>
                  {dec.knownFacts.map((f, i) => <p key={i} className="text-slate-300">• {f}</p>)}
                </div>
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="font-bold text-amber-400 block text-[11px] mb-1">Assumptions & Uncertainties:</span>
                  {dec.assumptions.concat(dec.uncertainties).map((u, i) => <p key={i} className="text-slate-300">• {u}</p>)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Create Decision Workspace</h3>
            <form onSubmit={handleSaveDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Decision Title</label>
                <input
                  type="text"
                  placeholder="e.g. Relocating to a quieter coastal town"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Context & Core Dilemma</label>
                <textarea
                  rows={2}
                  placeholder="Why is this decision needed now?"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Top Priorities (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Health, peace of mind, financial sustainability"
                  value={priorities}
                  onChange={(e) => setPriorities(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">Option 1</span>
                <input
                  type="text"
                  placeholder="Option 1 Name"
                  value={opt1Name}
                  onChange={(e) => setOpt1Name(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Pros (comma-separated)"
                  value={opt1Pros}
                  onChange={(e) => setOpt1Pros(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Cons (comma-separated)"
                  value={opt1Cons}
                  onChange={(e) => setOpt1Cons(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">Option 2</span>
                <input
                  type="text"
                  placeholder="Option 2 Name"
                  value={opt2Name}
                  onChange={(e) => setOpt2Name(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Pros (comma-separated)"
                  value={opt2Pros}
                  onChange={(e) => setOpt2Pros(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Cons (comma-separated)"
                  value={opt2Cons}
                  onChange={(e) => setOpt2Cons(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
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
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
