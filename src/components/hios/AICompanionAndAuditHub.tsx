import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Bot, ShieldCheck, Lock, Activity, RefreshCw, 
  Send, Sparkles, AlertCircle, Check, Key, Terminal
} from 'lucide-react';
import { 
  personalIntelligenceCore, 
  SOVEREIGN_AGENTS, 
  AgentScope 
} from '../../core/ai/multi_agent_core';
import { AgentActionLog } from '../../core/database/hios_types';
import { localDB } from '../../core/database/local_db';

interface AICompanionAndAuditHubProps {
  userId: string;
}

export default function AICompanionAndAuditHub({ userId }: AICompanionAndAuditHubProps) {
  const [activeAgentId, setActiveAgentId] = useState<string>('ReflectionAgent');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<AgentActionLog[]>([]);

  // User configured granted scopes
  const [grantedScopes, setGrantedScopes] = useState<AgentScope[]>([
    'memory.read',
    'goals.read',
    'relationships.read',
    'AI.analysis',
    'AI.generation'
  ]);

  const allPossibleScopes: { scope: AgentScope; label: string; description: string }[] = [
    { scope: 'memory.read', label: 'Memory Read', description: 'Read confirmed personal memories' },
    { scope: 'memory.write', label: 'Memory Write', description: 'Write or update confirmed memories' },
    { scope: 'relationships.read', label: 'Relationships Read', description: 'Access relationship space data' },
    { scope: 'health_observation.read', label: 'Somatic Observations Read', description: 'Read non-medical energy and rest logs' },
    { scope: 'goals.read', label: 'Goals & Strategy Read', description: 'Read active goals and decision records' },
    { scope: 'goals.write', label: 'Goals & Strategy Write', description: 'Write goals and action steps' },
    { scope: 'legacy.read', label: 'Legacy Vault Read', description: 'Read preserved legacy documents' },
    { scope: 'AI.analysis', label: 'AI Pattern Analysis', description: 'Perform local contextual analysis' },
    { scope: 'AI.generation', label: 'AI Generation Service', description: 'Authorize AI synthesis and guidance' }
  ];

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const storedLogs = await localDB.getAgentActionLogs();
      setLogs(storedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err) {
      console.error('Failed loading audit logs:', err);
    }
  };

  const handleToggleScope = (scope: AgentScope) => {
    if (grantedScopes.includes(scope)) {
      setGrantedScopes(grantedScopes.filter(s => s !== scope));
    } else {
      setGrantedScopes([...grantedScopes, scope]);
    }
  };

  const handleInvokeAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const journalEntries = await localDB.getJournalEntries(userId);
      const people = await localDB.getPeopleProfiles(userId);
      const chapters = await localDB.getLifeChapters(userId);

      const res = await personalIntelligenceCore.dispatch(
        activeAgentId,
        prompt.trim(),
        {
          userId,
          journalEntries,
          people,
          chapters,
          grantedScopes
        }
      );

      setResponse(res.response);
      await loadAuditLogs();
    } catch (err: any) {
      setResponse(`Error: ${err.message || 'Agent invocation failed'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAgent = SOVEREIGN_AGENTS.find(a => a.id === activeAgentId) || SOVEREIGN_AGENTS[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Layer 15 • Multi-Agent Sovereignty</span>
            <span className="px-2 py-0.5 text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full font-semibold">Scope-Authorized & Audited</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Sovereign Agents & Security Audit Log</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Interact with 10 specialized intelligence agents under strict scope-based authorization. Every action is cryptographically recorded in your local audit log.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold self-start md:self-center cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Audit Log</span>
        </button>
      </div>

      {/* Scope Permission Manager */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Key className="h-4 w-4" />
            <span>Cryptographic Scope Permissions (Your Sovereign Control)</span>
          </div>
          <span className="text-[11px] text-slate-400">Toggle scopes granted to the agents below</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
          {allPossibleScopes.map(item => {
            const isGranted = grantedScopes.includes(item.scope);
            return (
              <button
                key={item.scope}
                onClick={() => handleToggleScope(item.scope)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  isGranted 
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-white' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <div className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center text-[10px] ${
                  isGranted ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-500'
                }`}>
                  {isGranted ? '✓' : ''}
                </div>
                <div>
                  <span className="text-xs font-bold block">{item.label}</span>
                  <span className="text-[10px] text-slate-400 block">{item.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Agent Invocation Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Selector */}
        <div className="lg:col-span-1 p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Select Sovereign Agent ({SOVEREIGN_AGENTS.length})
          </span>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {SOVEREIGN_AGENTS.map(agent => (
              <button
                key={agent.id}
                onClick={() => {
                  setActiveAgentId(agent.id);
                  setResponse(null);
                }}
                className={`w-full p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  activeAgentId === agent.id
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-white'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold block text-white">{agent.name}</span>
                  <span className="text-[10px] font-mono text-cyan-400">{agent.id}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{agent.role}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Interaction Panel */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cyan-400" />
                  <span>{selectedAgent.name}</span>
                </h3>
                <p className="text-xs text-slate-400">{selectedAgent.role}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Required Scopes:</span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">
                  {selectedAgent.requiredScopes.join(', ')}
                </span>
              </div>
            </div>

            {/* Conversation Output */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 min-h-[160px] text-xs text-slate-300 leading-relaxed overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center gap-2 text-cyan-400 animate-pulse pt-8 justify-center">
                  <Sparkles className="h-4 w-4" />
                  <span>Sovereign Agent evaluating through granted scopes...</span>
                </div>
              ) : response ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px] uppercase">
                    <Check className="h-3.5 w-3.5" />
                    <span>Agent Response</span>
                  </div>
                  <p className="whitespace-pre-wrap">{response}</p>
                </div>
              ) : (
                <p className="text-slate-500 text-center pt-12">
                  Ask {selectedAgent.name} a question, request reflection, or seek guidance.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleInvokeAgent} className="flex gap-2 pt-3 border-t border-slate-800">
            <input
              type="text"
              placeholder={`Prompt ${selectedAgent.name}...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Real-Time Immutable Audit Log */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Terminal className="h-4 w-4 text-cyan-400" />
            <span>Cryptographic Agent Audit Trail ({logs.length} events)</span>
          </div>
          <span className="text-[11px] text-slate-500">Every agent access is permanently logged</span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No audit logs recorded yet. When agents invoke or access scopes, entries appear here.
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-bold text-[11px]">{log.agentName}</span>
                    <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{log.actionDescription}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {log.scopesUsed.map((s, i) => (
                      <span key={i} className="text-[9px] font-mono bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                        {s}
                      </span>
                    ))}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {log.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
