import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Lock, 
  Unlock, 
  Shield, 
  ShieldAlert, 
  Users, 
  Ticket, 
  TrendingUp, 
  Cpu, 
  Layers, 
  Settings2, 
  FileSpreadsheet, 
  AlertOctagon, 
  MessageSquare, 
  Plus, 
  Search, 
  Mail, 
  Server, 
  BarChart2, 
  CheckCircle2, 
  Trash2, 
  RefreshCw, 
  Sliders, 
  Eye, 
  EyeOff, 
  UserCheck, 
  Power, 
  X, 
  Send, 
  Sparkles, 
  Clock,
  Briefcase,
  Database,
  Terminal,
  Volume2,
  FileText,
  DollarSign,
  AlertTriangle,
  Flame,
  Check,
  Rocket,
  Globe,
  FileDown
} from 'lucide-react';
import { 
  adminService, 
  AdminRole, 
  AdminPermission, 
  AdminSession, 
  SupportTicket, 
  AuditLog, 
  SystemHealthMetric, 
  AIMonitoringMetric, 
  Campaign, 
  AdminRemoteConfig, 
  CrashReport, 
  SecurityAlert,
  SupportUserMeta
} from '../../core/admin/admin_service';
import { logger } from '../../core/analytics/logger';
import { apiIntegrationService, IntegrationConfig, IntegrationMetric, WebhookConfig } from '../../core/integrations/api_integration_service';
import { pluginManager, PluginInstance } from '../../core/plugins/plugin_manager';
import { complianceService } from '../../core/security/compliance_service';
import { launchReadinessService, TestSuiteResult, LocalizationPack, PipelineStep } from '../../core/admin/launch_readiness_service';

export interface AdminConsoleProps {
  userId: string;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ userId }) => {
  // Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>('alex_admin');
  const [adminRole, setAdminRole] = useState<AdminRole>('super_admin');
  const [mfaCode, setMfaCode] = useState<string>('442901');
  const [session, setSession] = useState<AdminSession | null>(null);

  // Core administrative states
  const [activeSubTab, setActiveSubTab] = useState<string>('dashboard');
  const [users, setUsers] = useState<SupportUserMeta[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetric | null>(null);
  const [aiMonitoring, setAIMonitoring] = useState<AIMonitoringMetric | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [remoteConfig, setRemoteConfig] = useState<AdminRemoteConfig | null>(null);
  const [crashes, setCrashes] = useState<CrashReport[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);

  // Launch readiness, Integrations, Compliance & Plugins states
  const [integrationsList, setIntegrationsList] = useState<IntegrationConfig[]>([]);
  const [integrationMetricsList, setIntegrationMetricsList] = useState<IntegrationMetric[]>([]);
  const [pluginsList, setPluginsList] = useState<PluginInstance[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInstance | null>(null);
  const [pluginConfigValue, setPluginConfigValue] = useState<string>('');
  const [webhooksList, setWebhooksList] = useState<WebhookConfig[]>([]);
  const [newWebhookEvent, setNewWebhookEvent] = useState<WebhookConfig['event']>('journal.created');
  const [newWebhookUrl, setNewWebhookUrl] = useState<string>('');
  const [newWebhookSecret, setNewWebhookSecret] = useState<string>('whsec_temp_secret');
  
  const [testSuitesList, setTestSuitesList] = useState<TestSuiteResult[]>([]);
  const [localizationList, setLocalizationList] = useState<LocalizationPack[]>([]);
  const [pipelineStepsList, setPipelineStepsList] = useState<PipelineStep[]>([]);
  const [pipelineStepIndex, setPipelineStepIndex] = useState<number>(-1);
  const [isPipelineRunningState, setIsPipelineRunningState] = useState<boolean>(false);
  const [targetReleaseNotesPlatform, setTargetReleaseNotesPlatform] = useState<'android' | 'ios' | 'web'>('web');
  const [targetReleaseNotesVersion, setTargetReleaseNotesVersion] = useState<string>('1.2.0');
  const [generatedReleaseNotes, setGeneratedReleaseNotes] = useState<string>('');

  // Interactive filters & inputs
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [ticketSearchQuery, setTicketSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState<string>('');
  const [ticketInternalNotes, setTicketInternalNotes] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<SupportUserMeta | null>(null);
  
  // Create campaign input fields
  const [newCampaignTitle, setNewCampaignTitle] = useState<string>('');
  const [newCampaignType, setNewCampaignType] = useState<Campaign['type']>('push');
  const [newCampaignAudience, setNewCampaignAudience] = useState<Campaign['targetAudience']>('all');

  // Load and refresh core administrative data
  const refreshData = () => {
    setUsers(adminService.getUsersMetadata());
    setTickets(adminService.getTickets());
    setAuditLogs(adminService.getAuditLogs());
    setSystemHealth(adminService.getSystemHealth());
    setAIMonitoring(adminService.getAIMonitoring());
    setCampaigns(adminService.getCampaigns());
    setRemoteConfig(adminService.getRemoteConfig());
    setCrashes(adminService.getCrashReports());
    setSecurityAlerts(adminService.getSecurityAlerts());

    // Populate launch platforms
    setIntegrationsList(apiIntegrationService.getIntegrations());
    setIntegrationMetricsList(apiIntegrationService.getMetrics());
    setPluginsList(pluginManager.getPlugins());
    setWebhooksList(apiIntegrationService.getWebhooks());
    setTestSuitesList(launchReadinessService.getTestSuites());
    setLocalizationList(launchReadinessService.getLocalizationPacks());
    setPipelineStepsList(launchReadinessService.getPipelineSteps());

    // Update active selected ticket if open
    if (selectedTicket) {
      const updated = adminService.getTickets().find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  };

  useEffect(() => {
    const activeSession = adminService.getSession();
    if (activeSession) {
      setSession(activeSession);
      setIsAdminLoggedIn(true);
      refreshData();
    }
  }, []);

  // Timer simulation to update telemetry metrics in real-time
  useEffect(() => {
    if (isAdminLoggedIn) {
      const interval = setInterval(() => {
        setSystemHealth(adminService.getSystemHealth());
        setAIMonitoring(adminService.getAIMonitoring());
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAdminLoggedIn]);

  // Handle Admin Auth Submission
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length < 6) {
      logger.error('AdminConsole', 'Authentication failed: Invalid Multi-Factor Token');
      alert('Authentication error: Multi-Factor Authentication token must be exactly 6 digits.');
      return;
    }

    const sess = adminService.loginAdmin(adminUsername, adminRole);
    setSession(sess);
    setIsAdminLoggedIn(true);
    refreshData();
    logger.info('AdminConsole', `Admin console unlocked successfully for ${adminUsername}`);
  };

  const handleAdminLogout = () => {
    adminService.logoutAdmin();
    setIsAdminLoggedIn(false);
    setSession(null);
    setSelectedTicket(null);
    setSelectedUser(null);
  };

  // Helper to verify permissions
  const hasPerm = (permission: AdminPermission): boolean => {
    return adminService.hasPermission(permission);
  };

  // Administrative Actions
  const handleToggleUserSuspension = (targetUserId: string) => {
    if (!hasPerm('manage_users')) {
      alert('Security Exception: Your admin role does not possess the manage_users permission.');
      return;
    }
    const isNowSuspended = adminService.toggleUserSuspension(targetUserId);
    refreshData();
    if (selectedUser && selectedUser.userId === targetUserId) {
      setSelectedUser({ ...selectedUser, isSuspended: isNowSuspended });
    }
    alert(`Account ${targetUserId} status updated: ${isNowSuspended ? 'SUSPENDED' : 'RESTORED'}`);
  };

  const handleDeleteUserSecurely = (targetUserId: string) => {
    if (!hasPerm('delete_users')) {
      alert('Security Exception: Critical user data deletion requires Super Administrator status.');
      return;
    }
    if (confirm(`CRITICAL: Are you absolutely sure you want to permanently erase user ${targetUserId}? This clears all device credentials and local state partitions.`)) {
      adminService.deleteUserAccountSecurely(targetUserId);
      setSelectedUser(null);
      refreshData();
      alert('User database registry cleared successfully.');
    }
  };

  const handleTicketAssign = (ticketId: string) => {
    if (!hasPerm('resolve_support_tickets')) {
      alert('Unauthorized action.');
      return;
    }
    adminService.assignTicket(ticketId, 'agent_alex', session?.adminUser.username || 'Alex Admin');
    refreshData();
  };

  const handleTicketReply = (ticketId: string, isInternal: boolean) => {
    if (!hasPerm('resolve_support_tickets')) {
      alert('Unauthorized action.');
      return;
    }
    const text = isInternal ? ticketInternalNotes : ticketReplyText;
    if (!text.trim()) return;

    adminService.replyToTicket(ticketId, text, isInternal);
    if (isInternal) {
      setTicketInternalNotes('');
    } else {
      setTicketReplyText('');
    }
    refreshData();
  };

  const handleTicketResolve = (ticketId: string) => {
    if (!hasPerm('resolve_support_tickets')) {
      alert('Unauthorized action.');
      return;
    }
    adminService.resolveTicket(ticketId);
    refreshData();
  };

  const handleUpdateFeatureFlag = (flagKey: string, value: boolean) => {
    if (!hasPerm('modify_remote_config')) {
      alert('Unauthorized action.');
      return;
    }
    if (!remoteConfig) return;
    const updatedFlags = { ...remoteConfig.globalFeatureFlags, [flagKey]: value };
    adminService.updateRemoteConfig({ globalFeatureFlags: updatedFlags });
    refreshData();
  };

  const handleUpdatePrice = (priceKey: string, value: number) => {
    if (!hasPerm('modify_remote_config')) {
      alert('Unauthorized action.');
      return;
    }
    if (!remoteConfig) return;
    const updatedPrices = { ...remoteConfig.prices, [priceKey]: value };
    adminService.updateRemoteConfig({ prices: updatedPrices });
    refreshData();
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPerm('manage_marketing')) {
      alert('Security Exception: Marketing campaign management requires Administrative clearance.');
      return;
    }
    if (!newCampaignTitle.trim()) return;

    adminService.createCampaign(
      newCampaignTitle,
      newCampaignType,
      newCampaignAudience,
      new Date(Date.now() + 3600000 * 24 * 7).toISOString() // Scheduled 7 days out
    );
    setNewCampaignTitle('');
    refreshData();
    alert(`Campaign "${newCampaignTitle}" added to pending scheduling logs.`);
  };

  const handleResolveAlert = (alertId: string) => {
    adminService.resolveSecurityAlert(alertId);
    refreshData();
  };

  // Filtered Users
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.userId.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(ticketSearchQuery.toLowerCase()) ||
    t.userEmail.toLowerCase().includes(ticketSearchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(ticketSearchQuery.toLowerCase())
  );

  // ============================================================================
  // SCREEN RENDER 1: ADMIN AUTHORIZATION PORTAL
  // ============================================================================
  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto w-full p-6 rounded-2xl bg-[#0e1424] border border-gray-500/20 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Administrative Portal</h2>
          <p className="text-xs text-gray-400 font-sans">
            Secure multi-role control panel. Please authorize below.
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-gray-400 block font-medium">Username</label>
            <input 
              type="text" 
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-500/5 border border-gray-500/20 text-white outline-none focus:border-amber-400 transition-all font-mono"
              required 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-400 block font-medium">Select Operational Role (RBAC Mockup)</label>
            <select
              value={adminRole}
              onChange={(e) => setAdminRole(e.target.value as AdminRole)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141b2d] border border-gray-500/20 text-white outline-none focus:border-amber-400 transition-all font-sans cursor-pointer"
            >
              <option value="super_admin">Super Administrator (Full Access)</option>
              <option value="admin">Administrator (General Ops)</option>
              <option value="support_agent">Support Agent (Tickets Desk)</option>
              <option value="finance_manager">Finance Manager (Revenue / Refunds)</option>
              <option value="ai_ops_manager">AI Operations Manager (Token Caches)</option>
              <option value="analytics_viewer">Analytics Viewer (BI Dashboard)</option>
              <option value="auditor">Read Only Auditor (Logs / Security)</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-500/5 border border-gray-500/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono text-gray-400 tracking-wider">Multi-Factor Authenticator</span>
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">TOTP Active</span>
            </div>
            <p className="text-[11px] text-gray-400">Enter code generated on your hardware key</p>
            <input 
              type="text" 
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full tracking-[0.5em] text-center font-mono text-base font-bold py-2 rounded-lg bg-black/40 border border-gray-500/20 text-amber-400 focus:border-amber-400 outline-none"
              required 
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-amber-400" />
              <span>Trust this administrator console</span>
            </label>
            <span className="text-gray-500 font-mono">IP: 192.168.1.55</span>
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold rounded-xl shadow-lg transition-all hover:opacity-95 cursor-pointer text-xs"
          >
            Decrypt Administration Console
          </button>
        </form>
      </div>
    );
  }

  // ============================================================================
  // SCREEN RENDER 2: COMPREHENSIVE ADMINISTRATIVE DASHBOARD
  // ============================================================================
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070b14] rounded-2xl border border-gray-500/10 overflow-hidden text-xs">
      
      {/* Admin Panel Header */}
      <div className="bg-[#0c1222] border-b border-gray-500/15 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">LogEasy Admin Console</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-mono border border-amber-500/20">
                {session?.adminUser.role.toUpperCase().replace('_', ' ')}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">
              Welcome back, <span className="font-bold text-gray-200">{session?.adminUser.username}</span> | Secure Session Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={refreshData}
            className="px-3 py-1.5 border border-gray-500/20 hover:bg-gray-500/5 text-gray-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Stats</span>
          </button>
          <button 
            onClick={handleAdminLogout}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-1.5 hover:bg-red-500/20 cursor-pointer"
          >
            <Power className="h-3.5 w-3.5" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      {/* Admin Inner Navigation */}
      <div className="bg-[#0e1528] border-b border-gray-500/10 px-4 flex gap-1.5 overflow-x-auto scrollbar-none py-2 shrink-0">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
          { id: 'users', label: 'User Registry', icon: Users },
          { id: 'support', label: 'Support Desk', icon: Ticket },
          { id: 'revenue', label: 'BI & Revenue', icon: TrendingUp },
          { id: 'ai_ops', label: 'AI Operations', icon: Cpu },
          { id: 'health', label: 'System Health', icon: Server },
          { id: 'flags', label: 'Remote Config', icon: Sliders },
          { id: 'marketing', label: 'Marketing/Campaigns', icon: Layers },
          { id: 'audits', label: 'Audit Trail', icon: FileSpreadsheet },
          { id: 'security_center', label: 'Security & Crashes', icon: ShieldAlert },
          { id: 'launch_board', label: 'Release & Launch', icon: Rocket }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setSelectedUser(null);
                setSelectedTicket(null);
              }}
              className={`px-3 py-2 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === tab.id 
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm' 
                  : 'text-gray-400 hover:bg-gray-500/5 hover:text-gray-200 border border-transparent'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Administrative Content Area */}
      <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6">

        {/* --------------------------------------------------------------------
            SUBTAB: DASHBOARD OVERVIEW
            -------------------------------------------------------------------- */}
        {activeSubTab === 'dashboard' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <BarChart2 className="h-4.5 w-4.5 text-amber-400" />
              <span>Operational Analytics Overview</span>
            </h3>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase">DAU / MAU Metrics</span>
                <div className="text-xl font-bold text-white font-mono">1,420 / 12,480</div>
                <p className="text-[10px] text-emerald-400">● 11.37% Stickiness Ratio</p>
              </div>
              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase">Monthly Recurring Revenue</span>
                <div className="text-xl font-bold text-white font-mono">$18,450.00</div>
                <p className="text-[10px] text-emerald-400">↑ 14% growth month over month</p>
              </div>
              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase">AI Operations Cost</span>
                <div className="text-xl font-bold text-white font-mono">${aiMonitoring?.estimatedCostUsd || '18.52'}</div>
                <p className="text-[10px] text-gray-400">Based on {aiMonitoring?.totalTokens || '1,250,400'} tokens</p>
              </div>
              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase">System Latency</span>
                <div className="text-xl font-bold text-white font-mono">{systemHealth?.apiLatencyMs || '35'} ms</div>
                <p className="text-[10px] text-emerald-400">API Gateway Response: Healthy</p>
              </div>
            </div>

            {/* Quick Diagnostic Insights Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-5 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <span>Real-Time Operation Buffers</span>
                </h4>
                
                <div className="space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Cloud Sync Success Rate:</span>
                    <span className="text-emerald-400 font-bold">100.0%</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Active WebSocket Tunnels:</span>
                    <span className="text-cyan-400 font-bold">842 connections</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Crash Frequency Index:</span>
                    <span className="text-emerald-400 font-bold">0.02% (Extremely low)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Active A/B Experiment:</span>
                    <span className="text-amber-400 uppercase">{remoteConfig?.activeExperimentId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <span>Administrative Security Overview</span>
                </h4>
                
                <div className="space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">MFA Enforce Status:</span>
                    <span className="text-emerald-400 font-bold">Mandated for all admins</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Failed Admin Logins (24h):</span>
                    <span className={securityAlerts.length > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                      {securityAlerts.length} incidents
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Data Export Privacy Logs:</span>
                    <span className="text-cyan-400">AES-Symmetrical Sealed</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Last System Audit Log:</span>
                    <span className="text-gray-400 truncate max-w-[180px]">
                      {auditLogs[0] ? `${auditLogs[0].adminUsername}: ${auditLogs[0].action}` : 'None'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Action Guides */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-gray-300 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-white mb-1">Administrative Privacy Mandate</p>
                <p>
                  As an administrator, you are bound by LogEasy's end-to-end local zero-knowledge privacy standards. Under no circumstances is journal transcription content exposed to administrators unless explicitly requested by the customer during a synchronized billing or synchronization recovery process.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            SUBTAB: USER MANAGEMENT REGISTRY
            -------------------------------------------------------------------- */}
        {activeSubTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-amber-400" />
                  <span>User Accounts Registry</span>
                </h3>
                <p className="text-gray-400">Search profiles, inspect cloud sync status, device counts, and initiate secure export/deletion flows.</p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search by ID, email or name..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-64 rounded-lg bg-[#0e1424] border border-gray-500/20 text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Users List */}
              <div className="xl:col-span-2 space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 bg-[#0e1424] border border-gray-500/10 rounded-xl text-center text-gray-500">
                    No matching users found.
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div 
                      key={user.userId}
                      onClick={() => setSelectedUser(user)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedUser?.userId === user.userId 
                          ? 'bg-amber-500/5 border-amber-500/30' 
                          : 'bg-[#0e1424] border-gray-500/10 hover:border-gray-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                          user.isSuspended ? 'bg-red-500/10 text-red-400' : 'bg-cyan-500/10 text-cyan-400'
                        }`}>
                          {user.displayName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{user.displayName}</span>
                            <span className={`text-[9px] font-mono px-2 py-0.2 rounded-full uppercase ${
                              user.subscriptionPlan === 'free' 
                                ? 'bg-gray-500/10 text-gray-400' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {user.subscriptionPlan}
                            </span>
                          </div>
                          <span className="text-gray-400 text-[11px] block font-mono">{user.email}</span>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <span className="text-[10px] text-gray-500 font-mono block">Joined: {new Date(user.joinedAt).toLocaleDateString()}</span>
                        {user.isSuspended && (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase font-bold font-mono">
                            Suspended
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* User Detail Inspect View */}
              <div className="xl:col-span-1">
                {selectedUser ? (
                  <div className="p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-5">
                    <div className="flex items-start justify-between border-b border-gray-500/10 pb-3">
                      <div>
                        <h4 className="font-bold text-white text-sm">{selectedUser.displayName}</h4>
                        <span className="text-gray-400 font-mono text-[11px]">{selectedUser.userId}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedUser(null)}
                        className="text-gray-500 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-gray-400 block font-mono">Vault Encryption:</span>
                          <span className="text-cyan-400 font-semibold uppercase">AES-256 On-Device</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-mono">Device Count:</span>
                          <span className="text-white font-semibold font-mono">{selectedUser.deviceCount} Connected</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-mono">Total Thoughts Cached:</span>
                          <span className="text-white font-semibold font-mono">{selectedUser.totalJournalEntries} entries</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-mono">Account Status:</span>
                          <span className={selectedUser.isSuspended ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {selectedUser.isSuspended ? 'Suspended' : 'Healthy'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-500/5 rounded-lg border border-gray-500/10 font-mono text-[10px] space-y-1 text-gray-400">
                        <span className="text-gray-500 font-bold uppercase tracking-wide block">IP Login Log</span>
                        {selectedUser.loginIpHistory.map((ip, i) => (
                          <div key={i} className="flex justify-between">
                            <span>● {ip}</span>
                            <span>Success</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 border-t border-gray-500/10 pt-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Administrative Gated Controls</span>
                        
                        <button
                          onClick={() => handleToggleUserSuspension(selectedUser.userId)}
                          className={`w-full py-2.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                            selectedUser.isSuspended 
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {selectedUser.isSuspended ? 'Restore Vault Permissions' : 'Suspend Account / Gating'}
                        </button>

                        <button
                          onClick={() => {
                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedUser, null, 2));
                            const downloadAnchor = document.createElement('a');
                            downloadAnchor.setAttribute("href", dataStr);
                            downloadAnchor.setAttribute("download", `logeasy_meta_export_${selectedUser.userId}.json`);
                            document.body.appendChild(downloadAnchor);
                            downloadAnchor.click();
                            downloadAnchor.remove();
                            logger.info('AdminConsole', `Exported metadata payload for user ${selectedUser.userId}`);
                          }}
                          className="w-full py-2 bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 border border-gray-500/20 rounded-lg text-xs cursor-pointer"
                        >
                          Export User Metadata JSON
                        </button>

                        <button
                          onClick={() => handleDeleteUserSecurely(selectedUser.userId)}
                          className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Scrub User Sandbox Data
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-gray-500/20 rounded-xl text-center text-gray-500">
                    Select a user registry profile to inspect and modify administrative settings.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            SUBTAB: CUSTOMER SUPPORT PLATFORM & TICKET SYSTEM
            -------------------------------------------------------------------- */}
        {activeSubTab === 'support' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                  <Ticket className="h-4.5 w-4.5 text-amber-400" />
                  <span>Support Service Ticket Desk</span>
                </h3>
                <p className="text-gray-400">Resolve, escalate, and assign active customer billing and synchronization issues.</p>
              </div>

              {/* Ticket Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search tickets..."
                  value={ticketSearchQuery}
                  onChange={(e) => setTicketSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-64 rounded-lg bg-[#0e1424] border border-gray-500/20 text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* Tickets List */}
              <div className="xl:col-span-1 space-y-3">
                {filteredTickets.length === 0 ? (
                  <div className="p-8 bg-[#0e1424] border border-gray-500/10 rounded-xl text-center text-gray-500">
                    No matching support tickets.
                  </div>
                ) : (
                  filteredTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 text-xs ${
                        selectedTicket?.id === t.id 
                          ? 'bg-amber-500/5 border-amber-500/30' 
                          : 'bg-[#0e1424] border-gray-500/10 hover:border-gray-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-gray-400">{t.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold font-mono ${
                          t.priority === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          t.priority === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {t.priority}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="font-bold text-white truncate">{t.subject}</h4>
                        <span className="text-[10px] text-gray-400 font-mono block">{t.userEmail}</span>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-200/5 pt-2 text-[10px] text-gray-500">
                        <span>Category: <span className="text-gray-300 font-bold uppercase">{t.category}</span></span>
                        <span className={`px-1.5 py-0.2 rounded font-mono uppercase ${
                          t.status === 'open' ? 'bg-red-500/10 text-red-400' :
                          t.status === 'assigned' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Active Ticket Chat Workspace */}
              <div className="xl:col-span-2">
                {selectedTicket ? (
                  <div className="p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl flex flex-col h-[520px]">
                    
                    {/* Header Info */}
                    <div className="flex items-center justify-between border-b border-gray-500/10 pb-3 shrink-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{selectedTicket.subject}</h4>
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[9px]">{selectedTicket.status.toUpperCase()}</span>
                        </div>
                        <p className="text-gray-400 text-[11px] font-mono">User ID: {selectedTicket.userId} | Email: {selectedTicket.userEmail}</p>
                      </div>

                      <div className="flex gap-1.5">
                        {selectedTicket.status === 'open' && (
                          <button
                            onClick={() => handleTicketAssign(selectedTicket.id)}
                            className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[11px] font-semibold cursor-pointer"
                          >
                            Assign to Myself
                          </button>
                        )}
                        {selectedTicket.status !== 'resolved' && (
                          <button
                            onClick={() => handleTicketResolve(selectedTicket.id)}
                            className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-semibold cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-white p-1">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Chat Logs */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-3.5">
                      <div className="p-3 bg-gray-500/5 rounded-xl border border-gray-500/10 text-xs text-gray-300">
                        <span className="font-bold text-white block mb-1 font-sans">Initial Complaint Summary</span>
                        {selectedTicket.description}
                      </div>

                      {selectedTicket.conversationHistory.map((msg, idx) => (
                        <div 
                          key={idx}
                          className={`flex flex-col max-w-[80%] ${msg.sender === 'agent' ? 'ml-auto items-end' : 'mr-auto'}`}
                        >
                          <span className="text-[10px] text-gray-500 font-bold mb-0.5">{msg.senderName} ({msg.sender.toUpperCase()})</span>
                          <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                            msg.sender === 'agent' 
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25 rounded-tr-none' 
                              : 'bg-gray-500/10 text-gray-200 border border-gray-500/15 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[9px] text-gray-500 font-mono mt-0.5">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>

                    {/* Quick Response Templates Selection */}
                    <div className="bg-[#131b2f] border border-gray-500/10 p-2.5 rounded-xl mb-3 flex items-center justify-between gap-4 shrink-0 text-[11px]">
                      <span className="text-gray-400 font-bold uppercase tracking-wider font-mono shrink-0">Support Templates:</span>
                      <div className="flex gap-1.5 overflow-x-auto">
                        <button 
                          onClick={() => setTicketReplyText("Hello, thank you for contacting LogEasy Support. We have processed a secondary ledger validation and can confirm your account sync status is fully restored. Please hard-refresh your browser.")}
                          className="px-2 py-1 bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 rounded whitespace-nowrap cursor-pointer"
                        >
                          Restore Sync Fix
                        </button>
                        <button 
                          onClick={() => setTicketReplyText("Hello, we apologize for the double transaction error on your ledger. Our billing platform has successfully executed a 100% refund for the duplicate transaction, reflecting in 3-5 business days.")}
                          className="px-2 py-1 bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 rounded whitespace-nowrap cursor-pointer"
                        >
                          Double Billing Refund
                        </button>
                        <button 
                          onClick={() => setTicketReplyText("Greetings! To safeguard your thoughts, please verify that you have written down your local symmetrical AES-256 seed backup keys. Administrators cannot recover accounts without these.")}
                          className="px-2 py-1 bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 rounded whitespace-nowrap cursor-pointer"
                        >
                          AES Encryption Reminder
                        </button>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3 border-t border-gray-500/10 pt-3 shrink-0">
                      
                      {/* Public Reply input */}
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Type reply to customer email..."
                          value={ticketReplyText}
                          onChange={(e) => setTicketReplyText(e.target.value)}
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-gray-500/20 text-white outline-none focus:border-amber-400 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTicketReply(selectedTicket.id, false);
                          }}
                        />
                        <button
                          onClick={() => handleTicketReply(selectedTicket.id, false)}
                          className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl cursor-pointer"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Internal Notes input */}
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Add internal agent notes (not visible to customer)..."
                          value={ticketInternalNotes}
                          onChange={(e) => setTicketInternalNotes(e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-red-900/5 border border-red-500/10 text-amber-200 outline-none focus:border-red-500 text-xs font-mono"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTicketReply(selectedTicket.id, true);
                          }}
                        />
                        <button
                          onClick={() => handleTicketReply(selectedTicket.id, true)}
                          className="px-3.5 py-2 bg-red-950/20 text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-xl cursor-pointer font-bold font-mono text-[10px]"
                        >
                          Note
                        </button>
                      </div>

                    </div>

                  </div>
                ) : (
                  <div className="p-12 border border-dashed border-gray-500/20 rounded-xl text-center text-gray-500 h-[300px] flex flex-col justify-center items-center">
                    <MessageSquare className="h-10 w-10 text-gray-600 mb-2" />
                    <p className="font-bold text-gray-400">Support Workspace Unselected</p>
                    <p className="text-xs">Select any incoming billing, security or sync support complaint from the queue.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            SUBTAB: BI & REVENUE METRICS
            -------------------------------------------------------------------- */}
        {activeSubTab === 'revenue' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-amber-400" />
              <span>Business Intelligence & Pricing Analytics</span>
            </h3>

            {/* Financial Overview Bento cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 block font-mono">Monthly Recurring Revenue (MRR)</span>
                <div className="text-xl font-bold text-emerald-400 font-mono">$18,450.00</div>
              </div>
              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 block font-mono">Annual Recurring Revenue (ARR)</span>
                <div className="text-xl font-bold text-emerald-400 font-mono">$221,400.00</div>
              </div>
              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 block font-mono">Customer Lifetime Value (LTV)</span>
                <div className="text-xl font-bold text-white font-mono">$280.00</div>
              </div>
              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 block font-mono">Acquisition Cost (CAC)</span>
                <div className="text-xl font-bold text-white font-mono">$32.50</div>
              </div>
            </div>

            {/* Revenue Analytics visual graphs mockup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-5 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 font-mono uppercase">User Retention & Cohort Churn Rates</h4>
                
                <div className="space-y-3.5 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Month 1 Retention (Active Vaults):</span>
                      <span className="text-emerald-400 font-bold">84%</span>
                    </div>
                    <div className="w-full bg-gray-500/10 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '84%' }}></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Month 3 Retention (Active Vaults):</span>
                      <span className="text-emerald-400 font-bold">68%</span>
                    </div>
                    <div className="w-full bg-gray-500/10 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Core Subscription Churn Ratio:</span>
                      <span className="text-red-400 font-bold">2.4%</span>
                    </div>
                    <div className="w-full bg-gray-500/10 rounded-full h-2">
                      <div className="bg-red-400 h-2 rounded-full" style={{ width: '2.4%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 font-mono uppercase">Conversion Funnel Gating Rate</h4>
                
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">1. Guest / Free Onboarding:</span>
                    <span className="text-white">100.0% (12,480 users)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">2. Active Vault Log (At least 1 entry):</span>
                    <span className="text-cyan-400">76.4% (9,534 users)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">3. AI Cognitive Summaries Requested:</span>
                    <span className="text-indigo-400">42.1% (5,254 users)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">4. Checkout / Premium Conversion:</span>
                    <span className="text-amber-400 font-bold">4.8% (599 users)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Financial Audits & Refund list */}
            <div className="p-5 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-gray-300 font-mono uppercase flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>Simulated Transactions & Refund Portal Ledger</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-500/20 text-gray-500">
                      <th className="pb-2">TXID</th>
                      <th className="pb-2">Customer Email</th>
                      <th className="pb-2">Plan Purchased</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2 text-right">Refund Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-500/10">
                    <tr>
                      <td className="py-2.5">tx_94821</td>
                      <td>anesthonest81@gmail.com</td>
                      <td>Pro Annual Plan</td>
                      <td className="text-emerald-400 font-bold">$79.99</td>
                      <td>2026-07-01</td>
                      <td className="text-right">
                        <button 
                          onClick={() => {
                            if (confirm('Verify refund of transaction tx_94821 ($79.99)?')) {
                              logger.warn('AdminConsole', 'Refunded Transaction tx_94821 ($79.99)');
                              alert('Refund processed back to customer bank account.');
                            }
                          }}
                          className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded cursor-pointer"
                        >
                          Revoke & Refund
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5">tx_94819</td>
                      <td>mindful_coder@yahoo.com</td>
                      <td>Pro Monthly Plan</td>
                      <td className="text-emerald-400 font-bold">$9.99</td>
                      <td>2026-06-28</td>
                      <td className="text-right">
                        <button 
                          onClick={() => alert('Verify refund processed.')}
                          className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded cursor-pointer"
                        >
                          Revoke & Refund
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            SUBTAB: AI OPERATIONS & COST MONITOR
            -------------------------------------------------------------------- */}
        {activeSubTab === 'ai_ops' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-amber-400" />
              <span>AI Operations Platform Telemetry</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono">
              <div className="p-3 bg-[#0e1424] border border-gray-500/10 rounded-xl">
                <span className="text-[10px] text-gray-400 block">Total Requests</span>
                <span className="text-lg font-bold text-white">{aiMonitoring?.totalRequests || 840}</span>
              </div>
              <div className="p-3 bg-[#0e1424] border border-gray-500/10 rounded-xl">
                <span className="text-[10px] text-gray-400 block">Prompt Tokens</span>
                <span className="text-lg font-bold text-cyan-400">{aiMonitoring?.promptTokens || 890000}</span>
              </div>
              <div className="p-3 bg-[#0e1424] border border-gray-500/10 rounded-xl">
                <span className="text-[10px] text-gray-400 block">Response Tokens</span>
                <span className="text-lg font-bold text-indigo-400">{aiMonitoring?.responseTokens || 360400}</span>
              </div>
              <div className="p-3 bg-[#0e1424] border border-gray-500/10 rounded-xl">
                <span className="text-[10px] text-gray-400 block">Cache Hits</span>
                <span className="text-lg font-bold text-emerald-400">{aiMonitoring?.cachingEfficiencyPercent || 82}%</span>
              </div>
              <div className="p-3 bg-[#0e1424] border border-gray-500/10 rounded-xl">
                <span className="text-[10px] text-gray-400 block">Est. Cost</span>
                <span className="text-lg font-bold text-emerald-400">${aiMonitoring?.estimatedCostUsd || '18.52'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-5 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 font-mono uppercase">AI Companion Model Performance</h4>
                
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Cognitive Framework Model:</span>
                    <span className="text-white font-bold">gemini-2.5-flash-lite</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Response Latency (Mean):</span>
                    <span className="text-cyan-400 font-bold">{aiMonitoring?.responseTimeMs || '1450'} ms</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Fallback Failures Rate:</span>
                    <span className="text-emerald-400 font-bold">{aiMonitoring?.failureRate || '0.2'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Socratic Companion Usage:</span>
                    <span className="text-gray-300">582 sessions (69.2%)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 font-mono uppercase">Cognitive Graph Storage Metrics</h4>
                
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Total Entities Mapped:</span>
                    <span className="text-cyan-400">4,810 entries</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Relationships Connected:</span>
                    <span className="text-cyan-400">12,401 nodes</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/5 pb-2">
                    <span className="text-gray-400">Average Graph Depth:</span>
                    <span className="text-white">4.2 levels</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vector Index State:</span>
                    <span className="text-emerald-400 font-bold uppercase">Synthesized OK</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            SUBTAB: SYSTEM HEALTH & MONITORS
            -------------------------------------------------------------------- */}
        {activeSubTab === 'health' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Server className="h-4.5 w-4.5 text-amber-400" />
              <span>Core Application System Health Services</span>
            </h3>

            {/* Health indicators list */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#0e1424] border border-gray-500/10 rounded-xl flex items-center justify-between">
                <span>Database Engines</span>
                <span className="text-emerald-400 font-bold">HEALTHY</span>
              </div>
              <div className="p-3 bg-[#0e1424] border border-gray-500/10 rounded-xl flex items-center justify-between">
                <span>Sync Pipelines</span>
                <span className="text-emerald-400 font-bold">HEALTHY</span>
              </div>
              <div className="p-3 bg-[#0e1424] border border-gray-500/10 rounded-xl flex items-center justify-between">
                <span>IndexedDB Space</span>
                <span className="text-cyan-400 font-bold">0.8 MB / 50 MB</span>
              </div>
              <div className="p-3 bg-[#0e1424] border border-gray-500/10 rounded-xl flex items-center justify-between">
                <span>Server Checkpoints</span>
                <span className="text-emerald-400 font-bold">99.99%</span>
              </div>
            </div>

            {/* Simulated Server Telemetry graphs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-3 font-mono">
                <span className="text-[10px] text-gray-400 uppercase">Gateway Throughput CPU</span>
                <div className="text-2xl font-bold text-white">{systemHealth?.cpuUsage || '18'}%</div>
                <div className="w-full bg-gray-500/15 rounded-full h-1.5">
                  <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${systemHealth?.cpuUsage || 18}%` }}></div>
                </div>
              </div>

              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-3 font-mono">
                <span className="text-[10px] text-gray-400 uppercase">Host Memory Utilization</span>
                <div className="text-2xl font-bold text-white">{systemHealth?.memoryUsage || '46'}%</div>
                <div className="w-full bg-gray-500/15 rounded-full h-1.5">
                  <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${systemHealth?.memoryUsage || 46}%` }}></div>
                </div>
              </div>

              <div className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-3 font-mono">
                <span className="text-[10px] text-gray-400 uppercase">Synchronous API Latency</span>
                <div className="text-2xl font-bold text-emerald-400">{systemHealth?.apiLatencyMs || '42'} ms</div>
                <div className="text-[10px] text-gray-500">Global DNS Route healthy</div>
              </div>

            </div>

            {/* Performance charts table */}
            <div className="p-5 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-4 text-xs">
              <h4 className="font-bold text-gray-300 font-mono uppercase">Operational Latency Counters</h4>
              
              <div className="space-y-2 font-mono">
                <div className="flex justify-between border-b border-gray-200/5 pb-2">
                  <span className="text-gray-400">IndexedDB Symmetrical Read queries:</span>
                  <span>1.4ms (Average)</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/5 pb-2">
                  <span className="text-gray-400">IndexedDB Symmetrical Write queries:</span>
                  <span>2.8ms (Average)</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/5 pb-2">
                  <span className="text-gray-400">Local Symmetrical Cryptographic Encode Time:</span>
                  <span>0.4ms (AES-256)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Local Symmetrical Cryptographic Decode Time:</span>
                  <span>0.3ms (AES-256)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            SUBTAB: REMOTE CONFIGURATION & FLAGS
            -------------------------------------------------------------------- */}
        {activeSubTab === 'flags' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-amber-400" />
              <span>Remote Config Feature Gating & Flags</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Feature Flags */}
              <div className="p-5 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 uppercase font-mono tracking-wider">Active Global Feature Flags</h4>
                
                {remoteConfig ? (
                  <div className="space-y-3.5">
                    {Object.entries(remoteConfig.globalFeatureFlags).map(([flag, active]) => (
                      <div key={flag} className="flex items-center justify-between border-b border-gray-200/5 pb-2">
                        <div>
                          <span className="font-bold text-white font-mono block text-xs">{flag}</span>
                          <span className="text-[10px] text-gray-400 font-sans">Toggle feature globally on all app clients</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={active}
                            onChange={(e) => handleUpdateFeatureFlag(flag, e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Loading flags...</p>
                )}
              </div>

              {/* pricing configs & Limits */}
              <div className="p-5 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 uppercase font-mono tracking-wider">Plan Billing Controls</h4>
                
                {remoteConfig ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-gray-400 text-[11px] block font-mono">Premium Monthly Subscription Fee ($)</span>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          step="0.01"
                          defaultValue={remoteConfig.prices.premium_monthly}
                          onBlur={(e) => handleUpdatePrice('premium_monthly', parseFloat(e.target.value))}
                          className="px-3.5 py-2 rounded-lg bg-black/40 border border-gray-500/20 text-white outline-none w-32 font-mono"
                        />
                        <span className="text-gray-500 text-[11px] self-center">Press Enter or Tab to submit</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-400 text-[11px] block font-mono">Lifetime Single Key Cost ($)</span>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          step="0.1"
                          defaultValue={remoteConfig.prices.lifetime}
                          onBlur={(e) => handleUpdatePrice('lifetime', parseFloat(e.target.value))}
                          className="px-3.5 py-2 rounded-lg bg-black/40 border border-gray-500/20 text-white outline-none w-32 font-mono"
                        />
                        <span className="text-gray-500 text-[11px] self-center">Press Enter or Tab to submit</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-400 text-[11px] block font-mono">Active Experiment Identifier</span>
                      <input 
                        type="text" 
                        value={remoteConfig.activeExperimentId}
                        onChange={(e) => adminService.updateRemoteConfig({ activeExperimentId: e.target.value })}
                        className="px-3.5 py-2 rounded-lg bg-black/40 border border-gray-500/20 text-white outline-none w-full font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Loading configurations...</p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            SUBTAB: MARKETING & CAMPAIGN MANAGER
            -------------------------------------------------------------------- */}
        {activeSubTab === 'marketing' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-amber-400" />
              <span>Marketing Campaign & Seasonal Promotions Planner</span>
            </h3>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* Scheduled Promotions Scheduler */}
              <div className="xl:col-span-1 p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 uppercase font-mono tracking-wider">Schedule Seasonal Campaigns</h4>
                
                <form onSubmit={handleCreateCampaign} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-gray-400 font-sans block">Campaign Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Autumn Equinox Mindful Streak Pack"
                      value={newCampaignTitle}
                      onChange={(e) => setNewCampaignTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-gray-500/20 text-white outline-none text-xs"
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-gray-400 font-sans block">Promotion Channel</label>
                    <select
                      value={newCampaignType}
                      onChange={(e) => setNewCampaignType(e.target.value as Campaign['type'])}
                      className="w-full px-3 py-2 rounded-xl bg-[#141b2d] border border-gray-500/20 text-white text-xs cursor-pointer outline-none"
                    >
                      <option value="push">Simulate Mobile Push Notification</option>
                      <option value="in_app">Interactive In-App Message Alert</option>
                      <option value="email">Marketing Campaign Email blast</option>
                      <option value="promo">Temporary pricing Promo discount</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-gray-400 font-sans block">Target Audience Gating</label>
                    <select
                      value={newCampaignAudience}
                      onChange={(e) => setNewCampaignAudience(e.target.value as Campaign['targetAudience'])}
                      className="w-full px-3 py-2 rounded-xl bg-[#141b2d] border border-gray-500/20 text-white text-xs cursor-pointer outline-none"
                    >
                      <option value="all">Deliver to All Users</option>
                      <option value="free_only">Deliver only to Free Sandbox accounts</option>
                      <option value="premium_only">Deliver only to Premium members</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Schedule Dispatch Campaign
                  </button>
                </form>
              </div>

              {/* Active list */}
              <div className="xl:col-span-2 space-y-4">
                <h4 className="text-xs font-bold text-gray-300 uppercase font-mono tracking-wider">Campaign performance logs</h4>
                
                {campaigns.length === 0 ? (
                  <div className="p-8 bg-[#0e1424] border border-gray-500/10 rounded-xl text-center text-gray-500">
                    No active campaigns.
                  </div>
                ) : (
                  campaigns.map((camp) => (
                    <div key={camp.id} className="p-4 bg-[#0e1424] border border-gray-500/10 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{camp.title}</span>
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.2 rounded uppercase font-mono font-bold">
                            {camp.type}
                          </span>
                        </h5>
                        <span className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold ${
                          camp.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {camp.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-gray-400">
                        <div>
                          <span>Dispatched:</span>
                          <span className="text-white font-bold ml-1">{camp.performance.sent} targets</span>
                        </div>
                        <div>
                          <span>Open Rate:</span>
                          <span className="text-cyan-400 font-bold ml-1">
                            {camp.performance.sent > 0 ? `${Math.round((camp.performance.opened / camp.performance.sent) * 100)}%` : '0%'}
                          </span>
                        </div>
                        <div>
                          <span>Click-through:</span>
                          <span className="text-indigo-400 font-bold ml-1">
                            {camp.performance.opened > 0 ? `${Math.round((camp.performance.clicked / camp.performance.opened) * 100)}%` : '0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            SUBTAB: AUDIT LOGS VIEWER
            -------------------------------------------------------------------- */}
        {activeSubTab === 'audits' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <FileSpreadsheet className="h-4.5 w-4.5 text-amber-400" />
              <span>Administrative Operations Audit Trail</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-gray-500/10">
              <table className="w-full text-left font-mono text-[11px] border-collapse bg-[#0e1424]">
                <thead>
                  <tr className="border-b border-gray-500/15 text-gray-400 bg-black/30">
                    <th className="p-3">ID</th>
                    <th className="p-3">Operator</th>
                    <th className="p-3">Action Completed</th>
                    <th className="p-3">Affected Resource</th>
                    <th className="p-3">Risk Level</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-500/10">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-500/5 transition-all">
                      <td className="p-3 text-gray-500 font-mono">{log.id}</td>
                      <td className="p-3">
                        <span className="font-bold text-gray-200">{log.adminUsername}</span>
                        <span className="text-[9px] text-gray-400 ml-1">({log.role})</span>
                      </td>
                      <td className="p-3 text-white">{log.action}</td>
                      <td className="p-3 text-cyan-400">{log.affectedResource}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold font-mono ${
                          log.riskLevel === 'high' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                          log.riskLevel === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-gray-500/15 text-gray-400'
                        }`}>
                          {log.riskLevel}
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            SUBTAB: SECURITY CENTER & CRASHES
            -------------------------------------------------------------------- */}
        {activeSubTab === 'security_center' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-400" />
              <span>Administrative Security center & Crashlytics console</span>
            </h3>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Active Security alerts */}
              <div className="p-5 bg-[#0e1424] border border-[#ff0055]/10 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Interactive Threat Indicators</span>
                </h4>

                {securityAlerts.length === 0 ? (
                  <div className="p-6 bg-emerald-500/5 text-center text-emerald-400 font-bold border border-emerald-500/10 rounded-xl">
                    No active threat warnings. All device signatures attested.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {securityAlerts.map((alert) => (
                      <div 
                        key={alert.id}
                        className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all ${
                          alert.resolved 
                            ? 'bg-emerald-500/5 border-emerald-500/10 opacity-70' 
                            : 'bg-red-500/5 border-red-500/15'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-bold font-mono">
                            {alert.type.toUpperCase()}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>

                        <p className="text-gray-200 text-xs">{alert.message}</p>
                        <div className="font-mono text-[10px] text-gray-500 flex justify-between">
                          <span>IP: {alert.ip}</span>
                          <span>{alert.device}</span>
                        </div>

                        {!alert.resolved && (
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            className="self-end px-3 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded text-[11px] font-bold cursor-pointer"
                          >
                            Mark Handled & Resolve
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* JavaScript Crash Reports */}
              <div className="p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 font-mono uppercase flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4 text-amber-400" />
                  <span>Real-Time Crashlytics Crash logs</span>
                </h4>

                {crashes.length === 0 ? (
                  <p className="text-gray-500 text-center py-6 font-mono">No telemetry errors recorded today.</p>
                ) : (
                  crashes.map((report) => (
                    <div key={report.id} className="p-4 bg-black/40 border border-gray-500/15 rounded-xl space-y-3 text-xs leading-relaxed">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-red-400 font-bold block font-mono font-xs">{report.errorName}</span>
                          <span className="text-[10px] text-gray-500 block font-mono">Occurrences: {report.userImpactCount} impacts | Version: {report.affectedVersion}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[9px] font-mono uppercase">{report.status}</span>
                      </div>

                      <div className="p-2 bg-red-950/20 rounded border border-red-500/10 font-mono text-[10px] text-gray-400 overflow-x-auto whitespace-pre">
                        {report.stackTrace}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>Timestamp: {new Date(report.timestamp).toLocaleTimeString()}</span>
                        <button 
                          onClick={() => alert('Simulated fix deployment active. This crash profile resolved.')}
                          className="text-cyan-400 hover:underline"
                        >
                          Resolve & close ticket
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------
            SUBTAB: PRODUCTION READINESS, INTEGRATIONS & LAUNCH BOARD
            -------------------------------------------------------------------- */}
        {activeSubTab === 'launch_board' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Launch Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/5 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 font-mono text-[9px] uppercase font-bold tracking-wider">
                  <Rocket className="h-3 w-3 animate-bounce" />
                  <span>Production Ready Platform</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Deploy, Integrations & Compliance Command Board</h3>
                <p className="text-gray-400 text-xs max-w-2xl">
                  Run automated CI/CD gating pipelines, toggles for Google Gemini & Firebase cloud integrations, configure dynamic plugins, generate App Store release configurations, and run secure GDPR exports.
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0 font-mono text-[10px]">
                <div className="px-3.5 py-2 rounded-xl bg-black/40 border border-gray-500/10 text-gray-300">
                  <span>Current App Version: </span>
                  <span className="text-amber-400 font-bold">v1.2.0-Prod</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-black/40 border border-gray-500/10 text-gray-300 flex justify-between gap-4">
                  <span>SSL Security: </span>
                  <span className="text-emerald-400 font-bold">Strict HSTS</span>
                </div>
              </div>
            </div>

            {/* Grid 1: Automated QA CI/CD Pipelines & Web Deployment Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Automated Build Pipeline terminal and steps */}
              <div className="lg:col-span-2 p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-500/10 pb-3">
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <Terminal className="h-4 w-4 text-amber-400" />
                      <span>CI/CD Static Audits & Testing Pipelines</span>
                    </h4>
                    <p className="text-gray-400 text-[11px]">Run automated linter standard compiles and cryptographic validation checkers.</p>
                  </div>
                  
                  <button
                    onClick={async () => {
                      if (isPipelineRunningState) return;
                      setIsPipelineRunningState(true);
                      setPipelineStepIndex(0);
                      
                      const finished = await launchReadinessService.runFullPipelineSimulated((idx) => {
                        setPipelineStepIndex(idx);
                      });
                      
                      if (finished) {
                        setIsPipelineRunningState(false);
                        setPipelineStepIndex(-1);
                        refreshData();
                        alert('Continuous Integration Deployment Gating checks completed with status: SUCCESS (A+).');
                      }
                    }}
                    disabled={isPipelineRunningState}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all ${
                      isPipelineRunningState 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                        : 'bg-amber-500 text-black hover:bg-amber-400 shadow'
                    }`}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isPipelineRunningState ? 'animate-spin' : ''}`} />
                    <span>{isPipelineRunningState ? 'Executing Pipeline...' : 'Run Automated CI/CD'}</span>
                  </button>
                </div>

                {/* Pipeline Steps Tracker */}
                <div className="space-y-3 font-sans">
                  {pipelineStepsList.map((step, idx) => {
                    const isStepRunning = isPipelineRunningState && pipelineStepIndex === idx;
                    const isStepSuccess = !isPipelineRunningState && step.status === 'success';
                    const isPending = isPipelineRunningState && idx > pipelineStepIndex;

                    return (
                      <div 
                        key={step.id} 
                        className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-all ${
                          isStepRunning ? 'bg-amber-500/5 border-amber-500/30' :
                          isStepSuccess ? 'bg-emerald-500/5 border-emerald-500/10' :
                          'bg-black/20 border-gray-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center font-bold font-mono text-[10px] ${
                            isStepRunning ? 'bg-amber-500/10 text-amber-400 animate-pulse' :
                            isStepSuccess ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <span className={`font-bold block ${isStepRunning ? 'text-amber-400' : 'text-gray-200'}`}>
                              {step.name}
                            </span>
                            {isStepRunning && <span className="text-[10px] text-amber-500 animate-pulse">Running compilation algorithms...</span>}
                            {isStepSuccess && <span className="text-[10px] text-gray-500">Completed in {(step.durationMs / 1000).toFixed(1)}s</span>}
                          </div>
                        </div>

                        <div>
                          {isStepRunning && <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />}
                          {isStepSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                          {isPending && <span className="text-[10px] text-gray-500 font-mono">PENDING</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Simulated Live Compilation Output logs console */}
                <div className="p-3.5 bg-black/60 rounded-xl border border-gray-500/15 font-mono text-[11px] text-gray-300 space-y-1.5 max-h-[140px] overflow-y-auto">
                  <div className="text-gray-500 border-b border-gray-200/5 pb-1.5 mb-2 flex justify-between items-center text-[10px]">
                    <span>COMPILATION & TEST STREAM CONSOLE</span>
                    <span className="text-amber-400">ACTIVE: SSL ENCRYPTION OK</span>
                  </div>
                  {isPipelineRunningState && pipelineStepIndex !== -1 ? (
                    pipelineStepsList[pipelineStepIndex]?.logLines.map((line, i) => (
                      <div key={i} className="text-amber-300">
                        <span>$ {line}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="text-emerald-400">● Build gating completed successfully. LogEasy ready to host.</div>
                      <div className="text-gray-500">$ tsc compilation completed. No type mismatch exceptions.</div>
                      <div className="text-gray-500">$ Symmetrical cryptographic seeds validated with 0 discrepancies.</div>
                    </>
                  )}
                </div>
              </div>

              {/* Web Hosting and PWA status cards */}
              <div className="p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-gray-500/10 pb-3">
                  <Globe className="h-4 w-4 text-cyan-400" />
                  <span>Web Hosting & PWA Diagnostics</span>
                </h4>

                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-black/20 border border-gray-500/10 space-y-2">
                    <span className="text-[10px] text-gray-400 uppercase font-mono block">Firebase Hosting Status</span>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white font-bold">https://logeasy.app</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[9px] uppercase font-bold font-mono">DEPLOYED</span>
                    </div>
                    <div className="text-[10px] text-gray-500 leading-relaxed font-sans">
                      Linked to direct Cloud Run container reverse-proxy mapping on port 3000. Static assets cached on global CDN.
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/20 border border-gray-500/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 uppercase font-mono block">PWA Manifest Parameters</span>
                      <span className="text-[9px] text-emerald-400 font-bold font-mono">PWA ACTIVE</span>
                    </div>

                    <div className="space-y-1 text-[11px] font-mono text-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Service Worker:</span>
                        <span className="text-white">Active (sw.js)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Offline Caching:</span>
                        <span className="text-white">Workbox Strategy</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Standalone View:</span>
                        <span className="text-white">display: standalone</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Favicons:</span>
                        <span className="text-white">Adaptive (SVG + PNG)</span>
                      </div>
                    </div>
                  </div>

                  {/* App Store deployment checks checklist */}
                  <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-1 text-[10px] leading-relaxed text-gray-400">
                    <div className="font-bold text-white uppercase font-mono flex items-center gap-1">
                      <Check className="h-3 w-3 text-amber-400" />
                      <span>Security Scanning Approved</span>
                    </div>
                    <p>All third-party dependencies are screened for known CVE vulnerabilities. Node modules contain no malicious packages.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Grid 2: Core API Platform Connections & Webhooks Dispatcher */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* API Connection Cards */}
              <div className="lg:col-span-2 p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <div>
                  <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-amber-400" />
                    <span>API Integration Platform Gateways</span>
                  </h4>
                  <p className="text-gray-400 text-[11px]">Connect and toggle core cloud services. Configured with rate-limits, automatic retry policies and latency monitors.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {integrationsList.map((integration) => {
                    const metric = integrationMetricsList.find(m => m.serviceId === integration.serviceId);
                    return (
                      <div 
                        key={integration.serviceId} 
                        className={`p-4 rounded-xl border space-y-3 transition-all ${
                          integration.isEnabled 
                            ? 'bg-black/30 border-gray-500/15' 
                            : 'bg-black/10 border-gray-500/10 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-white block text-xs truncate max-w-[180px]">{integration.name}</span>
                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">ID: {integration.serviceId} | VERSION: {integration.version}</span>
                          </div>

                          <button
                            onClick={() => {
                              apiIntegrationService.toggleIntegration(integration.serviceId);
                              refreshData();
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                              integration.isEnabled 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/15 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {integration.isEnabled ? 'ON' : 'OFF'}
                          </button>
                        </div>

                        {/* Connection metrics info */}
                        <div className="grid grid-cols-3 gap-1.5 border-t border-gray-200/5 pt-2 text-[10px] font-mono text-gray-400">
                          <div>
                            <span className="text-gray-500 block">Total Calls:</span>
                            <span className="text-white font-bold">{metric?.totalCalls || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Failures:</span>
                            <span className={metric?.failedCalls && metric.failedCalls > 0 ? "text-amber-400 font-bold" : "text-emerald-400"}>
                              {metric?.failedCalls || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Latency:</span>
                            <span className="text-cyan-400 font-bold">{metric?.averageLatencyMs || 0} ms</span>
                          </div>
                        </div>

                        {/* Retry settings and limit details */}
                        <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono">
                          <span>Max Retries: {integration.maxRetries} times</span>
                          <span>Rate Limit: {integration.rateLimitPerMinute}/min</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Webhooks configuration panel */}
              <div className="p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-gray-500/10 pb-3">
                  <Mail className="h-4 w-4 text-cyan-400" />
                  <span>Custom Outgoing Webhooks</span>
                </h4>

                {/* Form to register webhook */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newWebhookUrl.trim()) return;
                    apiIntegrationService.registerWebhook(newWebhookEvent, newWebhookUrl, newWebhookSecret);
                    setNewWebhookUrl('');
                    refreshData();
                    alert('Custom outgoing webhook target url successfully registered.');
                  }}
                  className="space-y-3.5 text-xs text-gray-300"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase font-mono block">Event Trigger</label>
                    <select
                      value={newWebhookEvent}
                      onChange={(e) => setNewWebhookEvent(e.target.value as WebhookConfig['event'])}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#070b14] border border-gray-500/20 text-white font-sans outline-none focus:border-amber-400"
                    >
                      <option value="journal.created">journal.created (New entry added)</option>
                      <option value="journal.deleted">journal.deleted (Entry scrubbed)</option>
                      <option value="user.premium_upgrade">user.premium_upgrade (New SaaS client)</option>
                      <option value="user.mfa_triggered">user.mfa_triggered (MFA login token)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase font-mono block">Endpoint Target URL</label>
                    <input 
                      type="url" 
                      placeholder="https://api.myanalytics.com/hooks"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#070b14] border border-gray-500/20 text-white font-mono outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase font-mono block">Signing Symmetrical Secret</label>
                    <input 
                      type="text" 
                      placeholder="whsec_secret"
                      value={newWebhookSecret}
                      onChange={(e) => setNewWebhookSecret(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#070b14] border border-gray-500/20 text-white font-mono outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="flex gap-2.5 pt-1.5">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-gray-500/10 hover:bg-gray-500/15 text-white border border-gray-500/25 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Add Event Webhook
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        apiIntegrationService.triggerWebhookSimulated('journal.created', { id: 'journal_102', transcript: 'Simulated journal entry hook' });
                        alert('Hook notification simulation fired. Check system console and metrics.');
                        refreshData();
                      }}
                      className="px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 rounded-lg font-bold text-xs cursor-pointer whitespace-nowrap"
                    >
                      Test Fire Hook
                    </button>
                  </div>
                </form>

                {/* Webhooks Registered Table */}
                <div className="space-y-2 border-t border-gray-500/10 pt-3.5">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Registered Webhook Clients ({webhooksList.length})</span>
                  {webhooksList.length === 0 ? (
                    <p className="text-[10px] text-gray-500 text-center py-2 font-mono">No active webhook client receivers.</p>
                  ) : (
                    webhooksList.map((wh) => (
                      <div key={wh.id} className="p-2.5 rounded-lg bg-black/30 border border-gray-500/10 flex items-center justify-between text-[11px] font-mono leading-relaxed">
                        <div className="space-y-0.5 truncate max-w-[180px]">
                          <span className="text-white block font-bold truncate">{wh.targetUrl}</span>
                          <span className="text-amber-400 text-[10px]">On: {wh.event}</span>
                        </div>

                        <button
                          onClick={() => {
                            apiIntegrationService.removeWebhook(wh.id);
                            refreshData();
                          }}
                          className="text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/5 rounded hover:bg-red-500/10 cursor-pointer"
                        >
                          Scrub
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Grid 3: Plugin Registry Manager & Gated Configs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Plugin Selection list */}
              <div className="lg:col-span-2 p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <div>
                  <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-400" />
                    <span>Dynamic Modular Plugin Registry</span>
                  </h4>
                  <p className="text-gray-400 text-[11px]">Install extension plugins on top of core. Code includes full version checking and dependency constraint resolution.</p>
                </div>

                <div className="space-y-3">
                  {pluginsList.map((p) => (
                    <div 
                      key={p.meta.id} 
                      onClick={() => {
                        setSelectedPlugin(p);
                        setPluginConfigValue(JSON.stringify(p.config, null, 2));
                      }}
                      className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer ${
                        selectedPlugin?.meta.id === p.meta.id 
                          ? 'bg-amber-500/5 border-amber-500/30 shadow-sm' 
                          : 'bg-black/30 border-gray-500/10 hover:border-gray-500/20'
                      }`}
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{p.meta.name}</span>
                          <span className="px-2 py-0.2 rounded-full bg-gray-500/10 border border-gray-500/20 text-[9px] font-mono text-gray-400">
                            v{p.meta.version}
                          </span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">{p.meta.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-mono text-gray-500 pt-1">
                          <span>Author: {p.meta.author}</span>
                          {p.meta.dependencies.length > 0 && (
                            <span className="text-cyan-400">Requires: {p.meta.dependencies.join(', ')}</span>
                          )}
                          <span>App compatibility: {p.meta.requiredAppVersion}</span>
                        </div>
                      </div>

                      {/* Control Toggle */}
                      <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold font-mono ${
                          p.state === 'enabled' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          p.state === 'loaded' ? 'bg-amber-500/10 text-amber-400' :
                          p.state === 'disabled' ? 'bg-gray-500/10 text-gray-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {p.state}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.state === 'enabled') {
                              pluginManager.disablePlugin(p.meta.id);
                            } else {
                              pluginManager.enablePlugin(p.meta.id);
                            }
                            refreshData();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            p.state === 'enabled' 
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {p.state === 'enabled' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plugin configuration panel */}
              <div className="p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-gray-500/10 pb-3">
                  <Sliders className="h-4 w-4 text-cyan-400" />
                  <span>Dynamic Parameter Schema</span>
                </h4>

                {selectedPlugin ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      try {
                        const parsed = JSON.parse(pluginConfigValue);
                        pluginManager.updatePluginConfig(selectedPlugin.meta.id, parsed);
                        refreshData();
                        alert(`Configuration options compiled successfully for: ${selectedPlugin.meta.name}`);
                      } catch (err) {
                        alert('Invalid JSON formatting: Please make sure your schema is fully valid before saving.');
                      }
                    }}
                    className="space-y-4 text-xs text-gray-300"
                  >
                    <div className="space-y-1">
                      <span className="text-gray-400 text-[10px] uppercase font-mono block">Editing config:</span>
                      <span className="font-bold text-white text-xs">{selectedPlugin.meta.name}</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-mono block">Configuration JSON Block</label>
                      <textarea
                        rows={6}
                        value={pluginConfigValue}
                        onChange={(e) => setPluginConfigValue(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-[#070b14] border border-gray-500/20 text-white font-mono text-[11px] outline-none focus:border-amber-400 leading-normal"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs cursor-pointer transition-all"
                    >
                      Update Plugin Configuration
                    </button>
                  </form>
                ) : (
                  <div className="p-8 border border-dashed border-gray-500/20 rounded-xl text-center text-gray-500">
                    Select a dynamic plugin from the registry to view and alter its JSON configuration parameters.
                  </div>
                )}
              </div>

            </div>

            {/* Grid 4: GDPR Compliance Workspace & Symmetrical Export Trigger */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Consent options and exporter card */}
              <div className="p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-gray-500/10 pb-3">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <span>GDPR Article 20 Compliance & Data Portability</span>
                </h4>

                <div className="space-y-4 leading-relaxed text-xs text-gray-300">
                  <p>
                    LogEasy incorporates strict compliance parameters according to European GDPR and California CCPA regulations. Users retain full rights to request immediate data portability or permanent erasure.
                  </p>

                  <div className="p-4 rounded-xl bg-black/30 border border-gray-500/10 space-y-3">
                    <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wide block">Simulate Portability Package</span>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans text-xs">
                      <div>
                        <span className="font-bold text-white block">Verified User: Alex Admin (Superuser)</span>
                        <span className="text-gray-500 font-mono text-[11px]">User ID: {session?.adminUser.id || 'guest_user'}</span>
                      </div>

                      <button
                        onClick={() => {
                          const mockEntries = [
                            { id: 'j_1', timestamp: new Date().toISOString(), transcript: 'Logged voice thought on startup metrics.', mood: 'relaxed', summary: 'Startup metric journaling.', duration: 18.2 },
                            { id: 'j_2', timestamp: new Date().toISOString(), transcript: 'Reflecting on project architecture parameters.', mood: 'excited', summary: 'Technical brainstorming.', duration: 42.4 },
                          ];
                          const { exportPayload, fileName } = complianceService.triggerGdprDataExport(
                            session?.adminUser.id || 'guest_user',
                            session?.adminUser.username || 'Alex Admin',
                            mockEntries
                          );

                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportPayload);
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href", dataStr);
                          downloadAnchor.setAttribute("download", fileName);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();

                          logger.info('AdminConsole', `Executed GDPR Article 20 Export for ${session?.adminUser.id}`);
                          alert(`GDPR compliance file '${fileName}' assembled and downloaded.`);
                        }}
                        className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                      >
                        <FileDown className="h-4 w-4" />
                        <span>GDPR Data Export (JSON)</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Consent Checklist parameters */}
                  <div className="space-y-2 border-t border-gray-500/10 pt-3.5">
                    <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider block">Privacy Consent Log Choices</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        <span>Essential Session Cookies (Mandated)</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        <span>Voice Process Consent (Accept)</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <X className="h-3.5 w-3.5 text-gray-600" />
                        <span>Marketing/Cookies (Declined)</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <X className="h-3.5 w-3.5 text-gray-600" />
                        <span>External Analytics Sharing (Declined)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Erasure and Right to be Forgotten Form */}
              <div className="p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-gray-500/10 pb-3">
                  <Trash2 className="h-4 w-4 text-red-400" />
                  <span>GDPR Article 17: Right to Be Forgotten</span>
                </h4>

                <div className="space-y-4 leading-relaxed text-xs text-gray-300">
                  <p>
                    Permanent user erasure scrubs the client's profile registration logs, cloud databases, voice recordings, and compliance agreements forever.
                  </p>

                  <div className="p-4 bg-red-500/5 border border-red-500/15 rounded-xl space-y-3.5">
                    <span className="text-[10px] font-bold font-mono text-red-400 uppercase block">Execute Symmetrical Purge</span>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase font-mono block">Confirm User Email address to purge</label>
                      <input 
                        type="email" 
                        id="purge_user_email"
                        placeholder="user@gmail.com"
                        className="w-full px-3 py-2 rounded-lg bg-[#070b14] border border-red-500/20 text-white font-mono outline-none focus:border-red-400"
                      />
                    </div>

                    <button
                      onClick={() => {
                        const emailInput = document.getElementById('purge_user_email') as HTMLInputElement;
                        const email = emailInput?.value || '';
                        if (!email.trim() || !email.includes('@')) {
                          alert('Purge Error: Please fill in a valid registered user email.');
                          return;
                        }

                        if (confirm(`CRITICAL WARNING: Are you sure you want to permanently delete all data records for ${email}? Under Article 17, this operation is cryptographically and logically irreversible.`)) {
                          const success = complianceService.executeRightToBeForgotten(
                            email.split('@')[0], // Simulate ID
                            [
                              () => logger.info('Compliance', `Purged local caches of ${email}`),
                              () => logger.info('Compliance', `Dispatched API command to scrub S3 and Firestore records for ${email}`)
                            ]
                          );
                          if (success) {
                            if (emailInput) emailInput.value = '';
                            alert(`Data scrubbed. All registers associated with ${email} have been successfully wiped from LogEasy database servers.`);
                            refreshData();
                          }
                        }
                      }}
                      className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/25 rounded-lg text-xs cursor-pointer transition-all"
                    >
                      Completely Scrub and Wipe User Data Logs
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    Consent logs capture timestamps, client IP addresses and user agents to generate proof-of-compliance audit certificates.
                  </p>
                </div>
              </div>

            </div>

            {/* Grid 5: App Store Readiness & Localization Packs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* App store assets and launch configurations */}
              <div className="lg:col-span-2 p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-500/10 pb-3">
                  <div>
                    <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 text-amber-400" />
                      <span>App Store & Mobile Launch Manifest Config</span>
                    </h4>
                    <p className="text-gray-400 text-[11px]">Configure metadata packages for iOS App Store and Google Play console releases.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
                  <div className="p-4 rounded-xl bg-black/20 border border-gray-500/10 space-y-3">
                    <span className="text-[10px] text-amber-400 uppercase font-mono font-bold tracking-wider block">Google Play circular adaptive icon checklist</span>
                    <div className="space-y-1.5 text-[11px] font-sans text-gray-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Adaptive Icon Vector (mipmap-anydpi-v26)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Splash Screen theme (splash_screen_background)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Permissions rationale (Manifest justifications)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>App bundle targeting minSDK 26 (Android Oreo)</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/20 border border-gray-500/10 space-y-3">
                    <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold tracking-wider block">iOS App Store plist permission manifest</span>
                    <div className="space-y-1.5 text-[11px] font-sans text-gray-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>NSMicrophoneUsageDescription (Speech input)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>NSSpeechRecognitionUsageDescription (AI processing)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Apple Launch Screen Storyboard config (Main.storyboard)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>App Store Connect Screenshots matching 12.9" iPads</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Release notes generator */}
                <div className="p-4 rounded-xl bg-black/30 border border-gray-500/10 space-y-3.5">
                  <span className="text-[10px] font-bold font-mono text-gray-400 uppercase block">App Store Store Release notes compiler</span>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-gray-300">
                    <div className="space-y-1">
                      <span className="text-gray-500 text-[10px] font-mono uppercase block">Target Release Version</span>
                      <input 
                        type="text" 
                        value={targetReleaseNotesVersion}
                        onChange={(e) => setTargetReleaseNotesVersion(e.target.value)}
                        className="px-3 py-1.5 rounded bg-[#070b14] border border-gray-500/20 text-white font-mono w-28 outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-500 text-[10px] font-mono uppercase block">Select Mobile/Web platform</span>
                      <div className="flex gap-1.5">
                        {['android', 'ios', 'web'].map((p) => (
                          <button
                            key={p}
                            onClick={() => setTargetReleaseNotesPlatform(p as any)}
                            className={`px-3 py-1.5 rounded font-bold text-[11px] cursor-pointer ${
                              targetReleaseNotesPlatform === p 
                                ? 'bg-amber-500 text-black' 
                                : 'bg-[#070b14] text-gray-400 border border-gray-500/15 hover:text-white'
                            }`}
                          >
                            {p.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const notes = launchReadinessService.generateReleaseNotes(targetReleaseNotesVersion, targetReleaseNotesPlatform);
                        setGeneratedReleaseNotes(notes);
                      }}
                      className="ml-auto px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Compile Store Release File
                    </button>
                  </div>

                  {generatedReleaseNotes && (
                    <div className="p-3 bg-[#070b14] rounded-xl border border-gray-500/15 font-mono text-[11px] text-gray-300 space-y-1 text-left max-h-[160px] overflow-y-auto whitespace-pre-wrap">
                      {generatedReleaseNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Localization Packs List */}
              <div className="p-5 bg-[#0e1424] border border-gray-500/15 rounded-xl space-y-4">
                <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-gray-500/10 pb-3">
                  <Globe className="h-4 w-4 text-cyan-400" />
                  <span>Localization (i18n) Packs</span>
                </h4>

                <div className="space-y-3.5">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    LogEasy includes standard translation libraries that support Left-to-Right and Right-to-Left (RTL) script directions dynamically based on client systems.
                  </p>

                  <div className="space-y-3 font-sans">
                    {localizationList.map((lang) => (
                      <div 
                        key={lang.code}
                        className="p-3 rounded-lg bg-black/30 border border-gray-500/10 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{lang.name}</span>
                            <span className="text-[9px] font-mono bg-gray-500/10 text-gray-400 px-1.5 py-0.2 rounded">
                              {lang.code.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
                            <span>Currency: {lang.currencyCode}</span>
                            <span>Direction: {lang.direction.toUpperCase()}</span>
                          </div>
                        </div>

                        <div className="text-right space-y-1 font-mono">
                          <span className="text-[11px] text-gray-300 block">{lang.stringsLoaded} strings</span>
                          <span className={`text-[9px] font-bold ${lang.isCompleted ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                            {lang.isCompleted ? 'COMPLETED (100%)' : 'TRANSLATING'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-gray-500 font-mono text-center">
                    All date stamps, currency symbols, and text flows alter dynamically.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

