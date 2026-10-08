import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, Cpu, Zap, RefreshCw, Clock, ShieldAlert, 
  Database, Gauge, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';
import { agentOrchestrator, AgentMetrics } from '../../core/ai/agent_orchestrator';

interface AgentDiagnosticsDashboardProps {
  userId: string;
}

export default function AgentDiagnosticsDashboard({ userId }: AgentDiagnosticsDashboardProps) {
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshDiagnostics = () => {
    const data = agentOrchestrator.getDiagnosticsSnapshot();
    setMetrics(data);
  };

  useEffect(() => {
    refreshDiagnostics();
    if (autoRefresh) {
      const interval = setInterval(refreshDiagnostics, 2500);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const totalCalls = metrics.reduce((sum, m) => sum + m.totalCalls, 0);
  const totalCacheHits = metrics.reduce((sum, m) => sum + m.cacheHits, 0);
  const cacheHitRate = totalCalls > 0 ? Math.round((totalCacheHits / totalCalls) * 100) : 0;
  const avgSystemLatency = metrics.length > 0 
    ? Math.round(metrics.reduce((sum, m) => sum + (m.averageLatencyMs || 0), 0) / metrics.length)
    : 0;

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Engineering Diagnostics
              </span>
              <span className="text-gray-500 text-xs font-mono">• Production Telemetry</span>
            </div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Cpu className="h-5 w-5 text-cyan-400" />
              <span>AI Agent Performance &amp; Orchestration Dashboard</span>
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              Real-time telemetry for multi-agent fan-out, p50/p95 response latencies, deduplication cache hit rates,
              and priority queue throughput. Strictly for system performance diagnostics (no psychological user scoring).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => agentOrchestrator.clearCache()}
              className="px-3 py-1.5 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 text-xs font-mono text-gray-300 border border-gray-500/20 cursor-pointer"
            >
              Flush Cache
            </button>
            <button
              onClick={refreshDiagnostics}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-[#090d16] border border-gray-500/10 space-y-1">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Total Agent Dispatches</span>
            <div className="text-xl font-mono font-bold text-white">{totalCalls}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#090d16] border border-gray-500/10 space-y-1">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Deduplication Cache Hit</span>
            <div className="text-xl font-mono font-bold text-emerald-400">{cacheHitRate}%</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#090d16] border border-gray-500/10 space-y-1">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Avg Cluster Latency</span>
            <div className="text-xl font-mono font-bold text-cyan-400">{avgSystemLatency} ms</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#090d16] border border-gray-500/10 space-y-1">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Gemini 3.8 Flash Stream</span>
            <div className="text-xl font-mono font-bold text-purple-400">P0 Active</div>
          </div>
        </div>
      </div>

      {/* Agents Telemetry Table */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="rounded-3xl bg-gray-500/5 border border-gray-500/15 overflow-hidden">
          <div className="p-4 border-b border-gray-500/10 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-200 uppercase font-mono tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Registered Multi-Agent Node Status</span>
            </h3>
            <span className="text-[10px] font-mono text-gray-500">{metrics.length} Monitored Agents</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 text-[10px] uppercase text-gray-500 border-b border-gray-500/10">
                <tr>
                  <th className="p-3.5">Agent / Engine Name</th>
                  <th className="p-3.5">Total Invocations</th>
                  <th className="p-3.5">Success / Fail</th>
                  <th className="p-3.5">Cache Hits</th>
                  <th className="p-3.5">p50 Latency</th>
                  <th className="p-3.5">p95 Latency</th>
                  <th className="p-3.5">Last Run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-500/10">
                {metrics.map(m => (
                  <tr key={m.agentName} className="hover:bg-gray-500/5 transition-colors">
                    <td className="p-3.5 font-bold text-white flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{m.agentName}</span>
                    </td>
                    <td className="p-3.5 text-gray-300">{m.totalCalls}</td>
                    <td className="p-3.5">
                      <span className="text-emerald-400 font-bold">{m.successfulCalls}</span>
                      <span className="text-gray-600"> / </span>
                      <span className={m.failedCalls > 0 ? 'text-red-400 font-bold' : 'text-gray-500'}>
                        {m.failedCalls}
                      </span>
                    </td>
                    <td className="p-3.5 text-cyan-400">{m.cacheHits}</td>
                    <td className="p-3.5 text-gray-200">{m.p50Ms > 0 ? `${m.p50Ms} ms` : '—'}</td>
                    <td className="p-3.5 text-purple-300">{m.p95Ms > 0 ? `${m.p95Ms} ms` : '—'}</td>
                    <td className="p-3.5 text-gray-500 text-[11px]">
                      {m.lastExecutedAt ? new Date(m.lastExecutedAt).toLocaleTimeString() : 'Ready in standby'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
