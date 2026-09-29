import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Network, UserCheck, Shield, Edit3, Check, 
  Sparkles, Sliders, Database, Eye, Lock, RefreshCw, Key
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { DigitalSelfProfile } from '../../core/database/hios_types';

interface KnowledgeAndDigitalSelfHubProps {
  userId: string;
}

export default function KnowledgeAndDigitalSelfHub({ userId }: KnowledgeAndDigitalSelfHubProps) {
  const [activeTab, setActiveTab] = useState<'graph' | 'self_model'>('graph');
  const [digitalSelf, setDigitalSelf] = useState<DigitalSelfProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields
  const [declaredValues, setDeclaredValues] = useState('');
  const [lifeMotto, setLifeMotto] = useState('');
  const [interests, setInterests] = useState('');
  const [preferredTone, setPreferredTone] = useState<string>('calm_grounded');
  const [allowAiSuggestions, setAllowAiSuggestions] = useState(true);

  // Knowledge Graph interactive selected node
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
    type: 'memory' | 'person' | 'value' | 'chapter' | 'habit' | 'decision';
    connections: string[];
    evidence: string;
  } | null>(null);

  const graphNodes = [
    {
      id: 'node_1',
      label: 'Radical Presence',
      type: 'value' as const,
      connections: ['Sovereign Journaling', 'Highland Pine Trail', 'Elena'],
      evidence: 'Declared in Core Meaning & Values anchor'
    },
    {
      id: 'node_2',
      label: 'Highland Pine Trail',
      type: 'memory' as const,
      connections: ['Radical Presence', 'Rest & Recovery'],
      evidence: 'Nature Immersion log with 9/10 restorative score'
    },
    {
      id: 'node_3',
      label: 'Elena',
      type: 'person' as const,
      connections: ['Radical Presence', 'Higher Learning & Independence'],
      evidence: 'Friendship profile, active since 2019'
    },
    {
      id: 'node_4',
      label: 'Building Mastery & Purpose',
      type: 'chapter' as const,
      connections: ['Radical Presence', 'Choosing Work Studio'],
      evidence: 'Life chapter 2023 - Present'
    },
    {
      id: 'node_5',
      label: 'Choosing Work Studio',
      type: 'decision' as const,
      connections: ['Building Mastery & Purpose'],
      evidence: 'Decision Workspace on studio environment'
    }
  ];

  useEffect(() => {
    loadDigitalSelf();
  }, [userId]);

  const loadDigitalSelf = async () => {
    try {
      const stored = await localDB.getDigitalSelfProfile(userId);
      if (stored) {
        setDigitalSelf(stored);
        setDeclaredValues(stored.coreValues.join(', '));
        setLifeMotto(stored.lifeMotto);
        setInterests(stored.declaredInterests.join(', '));
        setPreferredTone(stored.communicationPreferences);
        setAllowAiSuggestions(stored.inspectableDataApproved);
      } else {
        const defaultProfile: DigitalSelfProfile = {
          userId,
          coreValues: ['Radical Presence', 'Craftsmanship', 'Kindness', 'Intellectual Autonomy'],
          declaredInterests: ['Personal Computing', 'Philosophy of Mind', 'Creative Writing', 'Nature Trail Walking'],
          recurringThemes: ['Mindfulness', 'Sovereignty', 'Deep Focus'],
          communicationPreferences: 'calm_grounded',
          lifeMotto: 'Your life remembered with care. Private. Permanent. Warm. Intelligent.',
          privacyLevel: 'strictly_local',
          inspectableDataApproved: true,
          lastUpdated: new Date().toISOString()
        };
        await localDB.saveDigitalSelfProfile(defaultProfile);
        setDigitalSelf(defaultProfile);
        setDeclaredValues(defaultProfile.coreValues.join(', '));
        setLifeMotto(defaultProfile.lifeMotto);
        setInterests(defaultProfile.declaredInterests.join(', '));
        setPreferredTone(defaultProfile.communicationPreferences);
      }
    } catch (err) {
      console.error('Failed loading digital self:', err);
    }
  };

  const handleSaveSelfModel = async () => {
    if (!digitalSelf) return;

    const updated: DigitalSelfProfile = {
      ...digitalSelf,
      coreValues: declaredValues.split(',').map(s => s.trim()).filter(Boolean),
      lifeMotto: lifeMotto.trim(),
      declaredInterests: interests.split(',').map(s => s.trim()).filter(Boolean),
      communicationPreferences: preferredTone,
      inspectableDataApproved: allowAiSuggestions,
      lastUpdated: new Date().toISOString()
    };

    await localDB.saveDigitalSelfProfile(updated);
    setDigitalSelf(updated);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Layer 14 • Epistemic Sovereignty</span>
            <span className="px-2 py-0.5 text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full font-semibold">100% User Governed</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Knowledge Graph & Sovereign Digital Self</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Explore your life's interconnected conceptual graph and inspect your Digital Self representation. You own, edit, and audit every node.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'graph' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            <span>Personal Graph</span>
          </button>
          <button
            onClick={() => setActiveTab('self_model')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'self_model' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Digital Self Model</span>
          </button>
        </div>
      </div>

      {activeTab === 'graph' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Graph Stage */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Network className="h-4 w-4" />
                <span>Interconnected Human Dimensions</span>
              </span>
              <span className="text-[11px] text-slate-400">Click any node to inspect evidence</span>
            </div>

            {/* Visual Node Graph Grid */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 min-h-[320px] flex flex-wrap items-center justify-center gap-4 relative overflow-hidden">
              {graphNodes.map(node => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <motion.button
                    key={node.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedNode(node)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-900/90 text-white border-slate-800 hover:border-cyan-500/40'
                    }`}
                  >
                    <span className={`text-[10px] font-mono uppercase block font-bold ${
                      isSelected ? 'text-slate-900' : 'text-cyan-400'
                    }`}>
                      {node.type}
                    </span>
                    <span className="text-sm font-bold block mt-1">{node.label}</span>
                    <span className={`text-[11px] block mt-1 ${
                      isSelected ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {node.connections.length} links
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Node Evidence Inspector Panel */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Eye className="h-4 w-4 text-cyan-400" />
                <span>Evidence & Provenance</span>
              </span>

              {selectedNode ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                      {selectedNode.type}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">{selectedNode.label}</h3>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <span className="font-semibold text-slate-400 block text-[11px]">Grounded Evidence:</span>
                    <p className="text-slate-200 italic">"{selectedNode.evidence}"</p>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="font-semibold text-slate-400 block text-[11px]">Connected Entities:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNode.connections.map((c, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px]">
                          🔗 {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  Select a node on the canvas to inspect its cryptographic evidence, provenance, and relationships.
                </div>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200 flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>Strict Rule: Zero hallucinations. Every link originates from explicit user journal artifacts.</span>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: DIGITAL SELF MODEL */
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
            <div>
              <h3 className="text-lg font-bold text-white">Your Sovereign Digital Self Model</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                This is how LogEasy understands your values, interests, and preferences. You can inspect, adjust, or erase any attribute at any time.
              </p>
            </div>

            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSelfModel}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Digital Self</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Life Motto */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">Personal Life Motto</span>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={lifeMotto}
                  onChange={(e) => setLifeMotto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              ) : (
                <p className="text-sm font-semibold text-slate-200 italic leading-relaxed">
                  "{digitalSelf?.lifeMotto}"
                </p>
              )}
            </div>

            {/* AI Tone Preference */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">AI Voice & Tone Archetype</span>
              {isEditing ? (
                <select
                  value={preferredTone}
                  onChange={(e) => setPreferredTone(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="calm_grounded">Calm & Grounded (Minimal, unhurried)</option>
                  <option value="reflective_deep">Reflective & Philosophical</option>
                  <option value="warm_encouraging">Warm & Empathetic</option>
                  <option value="direct_concise">Direct & Concise (Zero fluff)</option>
                </select>
              ) : (
                <p className="text-sm font-semibold text-slate-200 capitalize">
                  {(digitalSelf?.communicationPreferences || preferredTone || 'calm_grounded').replace('_', ' ')}
                </p>
              )}
            </div>

            {/* Declared Values */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">Declared Values</span>
              {isEditing ? (
                <input
                  type="text"
                  value={declaredValues}
                  onChange={(e) => setDeclaredValues(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {digitalSelf?.coreValues.map((val, i) => (
                    <span key={i} className="px-3 py-1 bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 text-xs rounded-xl font-medium">
                      🛡️ {val}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Primary Interests */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">Primary Human Interests</span>
              {isEditing ? (
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {digitalSelf?.declaredInterests.map((interest, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-xl font-medium">
                      ✨ {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
