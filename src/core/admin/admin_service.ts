import { logger } from '../analytics/logger';
import { notificationManager } from '../notifications/notification_manager';

// ============================================================================
// DATA TYPES & INTERFACES FOR BUSINESS LOGIC
// ============================================================================

export type AdminRole = 
  | 'super_admin' 
  | 'admin' 
  | 'support_agent' 
  | 'finance_manager' 
  | 'ai_ops_manager' 
  | 'analytics_viewer' 
  | 'auditor';

export type AdminPermission = 
  | 'manage_users' 
  | 'delete_users' 
  | 'view_support_tickets' 
  | 'resolve_support_tickets' 
  | 'view_revenue' 
  | 'refund_subscriptions' 
  | 'manage_ai_ops' 
  | 'modify_remote_config' 
  | 'view_analytics' 
  | 'manage_marketing' 
  | 'view_audit_logs' 
  | 'view_security_alerts';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
  mfaEnabled: boolean;
  trustedDevices: string[];
  ipHistory: string[];
}

export interface AdminSession {
  adminUser: AdminUser;
  token: string;
  loginTime: string;
  ip: string;
  device: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  category: 'billing' | 'account' | 'sync' | 'ai_coach' | 'general';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'assigned' | 'resolved';
  assignedAgentId?: string;
  assignedAgentName?: string;
  internalNotes?: string;
  conversationHistory: {
    sender: 'user' | 'agent' | 'system';
    senderName: string;
    text: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminUsername: string;
  role: AdminRole;
  action: string;
  timestamp: string;
  device: string;
  ip: string;
  affectedResource: string;
  oldValue?: string;
  newValue?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SystemHealthMetric {
  apiStatus: 'healthy' | 'degraded' | 'down';
  dbHealth: 'healthy' | 'degraded';
  storageHealth: 'healthy' | 'degraded';
  authStatus: 'healthy' | 'degraded';
  syncHealth: 'healthy' | 'degraded';
  notificationHealth: 'healthy' | 'degraded';
  cfHealth: 'healthy' | 'degraded';
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  firestoreReads: number;
  firestoreWrites: number;
  apiLatencyMs: number;
  syncQueueSize: number;
}

export interface AIMonitoringMetric {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  responseTokens: number;
  responseTimeMs: number;
  providerStatus: 'online' | 'offline';
  modelPerformance: number; // score 1-100
  failureRate: number; // percentage
  fallbackUsageCount: number;
  cachingEfficiencyPercent: number;
  estimatedCostUsd: number;
}

export interface Campaign {
  id: string;
  title: string;
  type: 'announcement' | 'in_app' | 'email' | 'push' | 'promo';
  targetAudience: 'all' | 'free_only' | 'premium_only';
  scheduledTime: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  performance: {
    sent: number;
    opened: number;
    clicked: number;
  };
}

export interface AdminRemoteConfig {
  maintenanceMode: boolean;
  prices: {
    premium_monthly: number;
    premium_annual: number;
    lifetime: number;
    family_monthly: number;
  };
  aiLimits: {
    freeSummariesPerMonth: number;
    freeChatsPerMonth: number;
    maxTokenLength: number;
  };
  globalFeatureFlags: Record<string, boolean>;
  notificationRules: {
    dailyReminderHour: number;
    inactiveDaysTrigger: number;
  };
  activeExperimentId: string;
}

export interface CrashReport {
  id: string;
  errorName: string;
  message: string;
  stackTrace: string;
  affectedVersion: string;
  userImpactCount: number;
  timestamp: string;
  status: 'unresolved' | 'investigating' | 'resolved';
}

export interface SecurityAlert {
  id: string;
  type: 'failed_login' | 'unusual_ip' | 'abuse_detected' | 'rate_limiting' | 'compromised_session';
  message: string;
  ip: string;
  device: string;
  timestamp: string;
  riskLevel: 'low' | 'medium' | 'high';
  resolved: boolean;
}

// Simulated active platform users list for administrative inspection
export interface SupportUserMeta {
  userId: string;
  email: string;
  displayName: string;
  subscriptionPlan: string;
  isSuspended: boolean;
  joinedAt: string;
  deviceCount: number;
  lastLoginTime: string;
  loginIpHistory: string[];
  totalJournalEntries: number;
}

// ============================================================================
// ADMIN CORE ENGINE CLASS
// ============================================================================

class AdminService {
  private static instance: AdminService;

  // Pre-configured Admin Roles permissions mapper
  private rolePermissions: Record<AdminRole, AdminPermission[]> = {
    super_admin: [
      'manage_users', 'delete_users', 'view_support_tickets', 'resolve_support_tickets',
      'view_revenue', 'refund_subscriptions', 'manage_ai_ops', 'modify_remote_config',
      'view_analytics', 'manage_marketing', 'view_audit_logs', 'view_security_alerts'
    ],
    admin: [
      'manage_users', 'view_support_tickets', 'resolve_support_tickets', 'view_revenue',
      'manage_ai_ops', 'modify_remote_config', 'view_analytics', 'manage_marketing',
      'view_audit_logs', 'view_security_alerts'
    ],
    support_agent: [
      'view_support_tickets', 'resolve_support_tickets', 'view_analytics'
    ],
    finance_manager: [
      'view_revenue', 'refund_subscriptions', 'view_analytics'
    ],
    ai_ops_manager: [
      'manage_ai_ops', 'view_analytics'
    ],
    analytics_viewer: [
      'view_analytics'
    ],
    auditor: [
      'view_audit_logs', 'view_security_alerts', 'view_analytics'
    ]
  };

  private currentSession: AdminSession | null = null;

  private constructor() {
    this.seedInitialData();
  }

  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  // Seeding initial simulated dataset into localStorage for persistent demo tracking
  private seedInitialData() {
    if (localStorage.getItem('admin_data_seeded')) return;

    // 1. Audit Logs seed
    const initialAuditLogs: AuditLog[] = [
      {
        id: 'aud_1',
        adminUsername: 'super_admin_alex',
        role: 'super_admin',
        action: 'Modified Remote Config Features',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        device: 'macOS / Chrome',
        ip: '192.168.1.55',
        affectedResource: 'RemoteConfig.globalFeatureFlags',
        oldValue: '{"ai_coaching": false}',
        newValue: '{"ai_coaching": true}',
        riskLevel: 'medium'
      },
      {
        id: 'aud_2',
        adminUsername: 'support_sarah',
        role: 'support_agent',
        action: 'Resolved Customer Support Ticket',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        device: 'Windows 11 / Edge',
        ip: '10.0.4.12',
        affectedResource: 'SupportTicket.tkt_102',
        oldValue: 'assigned',
        newValue: 'resolved',
        riskLevel: 'low'
      }
    ];
    localStorage.setItem('admin_audit_logs', JSON.stringify(initialAuditLogs));

    // 2. Support Tickets seed
    const initialTickets: SupportTicket[] = [
      {
        id: 'tkt_101',
        userId: 'user_45a',
        userEmail: 'anesthonest81@gmail.com',
        subject: 'Billing discrepancy on Family Plan upgrade',
        category: 'billing',
        description: 'I was billed twice when trying to upgrade to the family plan. Please check card transactions.',
        priority: 'high',
        status: 'open',
        conversationHistory: [
          {
            sender: 'user',
            senderName: 'Anesth',
            text: 'I upgraded to the family plan and was charged $14.99 twice. Let me know if you see this in the logs.',
            timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
          }
        ],
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
      },
      {
        id: 'tkt_102',
        userId: 'user_x72',
        userEmail: 'mindful_user@yahoo.com',
        subject: 'Synchronization failure during offline mode',
        category: 'sync',
        description: 'My local journals saved while offline are not syncing to the cloud when I turn wifi back on.',
        priority: 'medium',
        status: 'assigned',
        assignedAgentId: 'agent_sarah',
        assignedAgentName: 'Sarah Conner',
        internalNotes: 'User seems to be using an older app build (v1.0.4) which had a sync queue timing race condition.',
        conversationHistory: [
          {
            sender: 'user',
            senderName: 'Mindful User',
            text: 'My thoughts logged yesterday do not appear on my tablet. Is my database synced?',
            timestamp: new Date(Date.now() - 3600000 * 20).toISOString()
          },
          {
            sender: 'agent',
            senderName: 'Sarah Conner (Support)',
            text: 'Hello, please verify that you have updated to the latest app build v1.1.0 which resolves background sync latency.',
            timestamp: new Date(Date.now() - 3600000 * 18).toISOString()
          }
        ],
        createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 18).toISOString()
      }
    ];
    localStorage.setItem('admin_support_tickets', JSON.stringify(initialTickets));

    // 3. User Metadata seed
    const initialUserMeta: SupportUserMeta[] = [
      {
        userId: 'guest_user',
        email: 'anesthonest81@gmail.com',
        displayName: 'Anesth Guest',
        subscriptionPlan: 'free',
        isSuspended: false,
        joinedAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
        deviceCount: 1,
        lastLoginTime: new Date().toISOString(),
        loginIpHistory: ['192.168.1.1', '127.0.0.1'],
        totalJournalEntries: 8
      },
      {
        userId: 'user_pro_99',
        email: 'pro_developer@gmail.com',
        displayName: 'John Doe',
        subscriptionPlan: 'premium_monthly',
        isSuspended: false,
        joinedAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
        deviceCount: 3,
        lastLoginTime: new Date(Date.now() - 3600000).toISOString(),
        loginIpHistory: ['82.112.5.42', '10.0.0.44'],
        totalJournalEntries: 42
      }
    ];
    localStorage.setItem('admin_user_metadata', JSON.stringify(initialUserMeta));

    // 4. Remote Config seed
    const initialConfig: AdminRemoteConfig = {
      maintenanceMode: false,
      prices: {
        premium_monthly: 9.99,
        premium_annual: 79.99,
        lifetime: 149.99,
        family_monthly: 14.99
      },
      aiLimits: {
        freeSummariesPerMonth: 5,
        freeChatsPerMonth: 3,
        maxTokenLength: 4096
      },
      globalFeatureFlags: {
        ai_coaching: true,
        advanced_analytics: true,
        audio_recaps: true,
        knowledge_graph: true,
        referral_system: true
      },
      notificationRules: {
        dailyReminderHour: 20,
        inactiveDaysTrigger: 5
      },
      activeExperimentId: 'onboarding_style_2026'
    };
    localStorage.setItem('admin_remote_config', JSON.stringify(initialConfig));

    // 5. Campaigns seed
    const initialCampaigns: Campaign[] = [
      {
        id: 'camp_1',
        title: 'Summer Solstice Mindfulness Renewal',
        type: 'promo',
        targetAudience: 'free_only',
        scheduledTime: new Date(Date.now() + 3600000 * 24 * 3).toISOString(),
        status: 'scheduled',
        performance: { sent: 0, opened: 0, clicked: 0 }
      },
      {
        id: 'camp_2',
        title: 'Welcome to LogEasy Premium Upgrades Campaign',
        type: 'email',
        targetAudience: 'all',
        scheduledTime: new Date(Date.now() - 3600000 * 24).toISOString(),
        status: 'completed',
        performance: { sent: 1200, opened: 820, clicked: 340 }
      }
    ];
    localStorage.setItem('admin_campaigns', JSON.stringify(initialCampaigns));

    // 6. Crash reports seed
    const initialCrashes: CrashReport[] = [
      {
        id: 'crsh_1',
        errorName: 'TypeError: Cannot read properties of undefined (reading "transcript")',
        message: 'Happens during background IndexedDB fetch for stale sessions.',
        stackTrace: 'at local_db.ts:412\nat Array.map (<anonymous>)\nat async VoiceJournalDashboard.tsx:288',
        affectedVersion: 'v1.0.8',
        userImpactCount: 14,
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        status: 'investigating'
      }
    ];
    localStorage.setItem('admin_crashes', JSON.stringify(initialCrashes));

    // 7. Security Alerts seed
    const initialSecurityAlerts: SecurityAlert[] = [
      {
        id: 'sec_1',
        type: 'failed_login',
        message: 'Suspicious login: 5 failed consecutive attempts to Admin Portal.',
        ip: '198.51.100.4',
        device: 'Mozilla/5.0 (Windows NT 10.0; Win64) Python-urllib/3.10',
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        riskLevel: 'high',
        resolved: false
      }
    ];
    localStorage.setItem('admin_security_alerts', JSON.stringify(initialSecurityAlerts));

    localStorage.setItem('admin_data_seeded', 'true');
    logger.info('AdminService', 'Simulated administrative sandbox environment seeded successfully.');
  }

  // ----------------------------------------------------
  // ADMIN AUTHENTICATION & RBAC
  // ----------------------------------------------------
  public loginAdmin(username: string, role: AdminRole): AdminSession {
    const adminUser: AdminUser = {
      id: `adm_${username.toLowerCase()}`,
      username,
      email: `${username}@logeasy.app`,
      role,
      permissions: this.rolePermissions[role],
      mfaEnabled: true,
      trustedDevices: ['Alex MacBook Pro', 'Secure Workstation #2'],
      ipHistory: ['127.0.0.1', '192.168.1.55']
    };

    const session: AdminSession = {
      adminUser,
      token: `admin_jwt_${Math.random().toString(36).substring(2, 15)}`,
      loginTime: new Date().toISOString(),
      ip: '192.168.1.55',
      device: 'macOS / Chrome Browser'
    };

    this.currentSession = session;
    this.createAuditLog(
      username,
      role,
      'Authorized Administrative Login',
      'Session',
      'none',
      'active',
      'low'
    );

    logger.info('AdminService', `Administrator ${username} successfully logged in with role: ${role}`);
    return session;
  }

  public logoutAdmin() {
    if (this.currentSession) {
      this.createAuditLog(
        this.currentSession.adminUser.username,
        this.currentSession.adminUser.role,
        'Administrative Logout',
        'Session',
        'active',
        'none',
        'low'
      );
      this.currentSession = null;
    }
  }

  public getSession(): AdminSession | null {
    return this.currentSession;
  }

  public hasPermission(permission: AdminPermission): boolean {
    if (!this.currentSession) return false;
    return this.currentSession.adminUser.permissions.includes(permission);
  }

  // ----------------------------------------------------
  // AUDIT LOGGING
  // ----------------------------------------------------
  public getAuditLogs(): AuditLog[] {
    const raw = localStorage.getItem('admin_audit_logs');
    return raw ? JSON.parse(raw) : [];
  }

  public createAuditLog(
    username: string,
    role: AdminRole,
    action: string,
    affectedResource: string,
    oldValue?: string,
    newValue?: string,
    riskLevel: AuditLog['riskLevel'] = 'low'
  ) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `aud_${Math.random().toString(36).substring(2, 9)}`,
      adminUsername: username,
      role,
      action,
      timestamp: new Date().toISOString(),
      device: 'Workstation / Secure Console',
      ip: '192.168.1.55',
      affectedResource,
      oldValue,
      newValue,
      riskLevel
    };

    logs.unshift(newLog);
    localStorage.setItem('admin_audit_logs', JSON.stringify(logs.slice(0, 100))); // Limit to last 100 audits
  }

  // ----------------------------------------------------
  // CUSTOMER SUPPORT TICKET SYSTEM
  // ----------------------------------------------------
  public getTickets(): SupportTicket[] {
    const raw = localStorage.getItem('admin_support_tickets');
    return raw ? JSON.parse(raw) : [];
  }

  public createTicket(userId: string, email: string, subject: string, description: string, category: SupportTicket['category']): SupportTicket {
    const tickets = this.getTickets();
    const newTicket: SupportTicket = {
      id: `tkt_${100 + tickets.length + 1}`,
      userId,
      userEmail: email,
      subject,
      category,
      description,
      priority: category === 'billing' ? 'high' : 'medium',
      status: 'open',
      conversationHistory: [
        {
          sender: 'user',
          senderName: email.split('@')[0],
          text: description,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tickets.unshift(newTicket);
    localStorage.setItem('admin_support_tickets', JSON.stringify(tickets));
    logger.info('AdminService', `Created support ticket ${newTicket.id} for user ${email}`);
    return newTicket;
  }

  public assignTicket(ticketId: string, agentId: string, agentName: string) {
    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = 'assigned';
      ticket.assignedAgentId = agentId;
      ticket.assignedAgentName = agentName;
      ticket.updatedAt = new Date().toISOString();

      localStorage.setItem('admin_support_tickets', JSON.stringify(tickets));

      if (this.currentSession) {
        this.createAuditLog(
          this.currentSession.adminUser.username,
          this.currentSession.adminUser.role,
          `Assigned Ticket ${ticketId} to agent ${agentName}`,
          `SupportTicket.${ticketId}`,
          'unassigned',
          agentName,
          'low'
        );
      }
    }
  }

  public replyToTicket(ticketId: string, text: string, isInternal: boolean = false) {
    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      if (isInternal) {
        ticket.internalNotes = text;
      } else {
        ticket.conversationHistory.push({
          sender: 'agent',
          senderName: this.currentSession?.adminUser.username || 'Agent Support',
          text,
          timestamp: new Date().toISOString()
        });
      }
      ticket.updatedAt = new Date().toISOString();
      localStorage.setItem('admin_support_tickets', JSON.stringify(tickets));

      if (this.currentSession && !isInternal) {
        this.createAuditLog(
          this.currentSession.adminUser.username,
          this.currentSession.adminUser.role,
          `Replied to Ticket ${ticketId}`,
          `SupportTicket.${ticketId}`,
          'none',
          'agent_reply',
          'low'
        );
      }
    }
  }

  public resolveTicket(ticketId: string) {
    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = 'resolved';
      ticket.updatedAt = new Date().toISOString();
      localStorage.setItem('admin_support_tickets', JSON.stringify(tickets));

      if (this.currentSession) {
        this.createAuditLog(
          this.currentSession.adminUser.username,
          this.currentSession.adminUser.role,
          `Resolved Support Ticket ${ticketId}`,
          `SupportTicket.${ticketId}`,
          'assigned',
          'resolved',
          'low'
        );
      }
    }
  }

  // ----------------------------------------------------
  // USER METADATA OPERATIONS
  // ----------------------------------------------------
  public getUsersMetadata(): SupportUserMeta[] {
    const raw = localStorage.getItem('admin_user_metadata');
    return raw ? JSON.parse(raw) : [];
  }

  public toggleUserSuspension(userId: string): boolean {
    const users = this.getUsersMetadata();
    const user = users.find(u => u.userId === userId);
    if (user) {
      user.isSuspended = !user.isSuspended;
      localStorage.setItem('admin_user_metadata', JSON.stringify(users));

      if (this.currentSession) {
        this.createAuditLog(
          this.currentSession.adminUser.username,
          this.currentSession.adminUser.role,
          `${user.isSuspended ? 'Suspended' : 'Restored'} User Account ${userId}`,
          `User.${userId}`,
          String(!user.isSuspended),
          String(user.isSuspended),
          'high'
        );
      }
      return user.isSuspended;
    }
    return false;
  }

  public deleteUserAccountSecurely(userId: string) {
    const users = this.getUsersMetadata();
    const filtered = users.filter(u => u.userId !== userId);
    localStorage.setItem('admin_user_metadata', JSON.stringify(filtered));

    if (this.currentSession) {
      this.createAuditLog(
        this.currentSession.adminUser.username,
        this.currentSession.adminUser.role,
        `PERMANENTLY DELETED USER DATA FOR ${userId}`,
        `User.${userId}`,
        'active_user',
        'deleted_purge',
        'high'
      );
    }
  }

  // ----------------------------------------------------
  // REMOTE CONFIG MANAGEMENT
  // ----------------------------------------------------
  public getRemoteConfig(): AdminRemoteConfig {
    const raw = localStorage.getItem('admin_remote_config');
    return JSON.parse(raw || '{}');
  }

  public updateRemoteConfig(config: Partial<AdminRemoteConfig>) {
    const current = this.getRemoteConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('admin_remote_config', JSON.stringify(updated));

    if (this.currentSession) {
      this.createAuditLog(
        this.currentSession.adminUser.username,
        this.currentSession.adminUser.role,
        'Updated Remote Configuration parameters',
        'RemoteConfig',
        JSON.stringify(current).substring(0, 50),
        JSON.stringify(updated).substring(0, 50),
        'medium'
      );
    }
  }

  // ----------------------------------------------------
  // TELEMETRY SIMULATIONS (REAL-TIME BI / HEALTH)
  // ----------------------------------------------------
  public getSystemHealth(): SystemHealthMetric {
    return {
      apiStatus: 'healthy',
      dbHealth: 'healthy',
      storageHealth: 'healthy',
      authStatus: 'healthy',
      syncHealth: 'healthy',
      notificationHealth: 'healthy',
      cfHealth: 'healthy',
      cpuUsage: 14 + Math.floor(Math.random() * 8),
      memoryUsage: 45 + Math.floor(Math.random() * 3),
      firestoreReads: 14205,
      firestoreWrites: 2110,
      apiLatencyMs: 35 + Math.floor(Math.random() * 15),
      syncQueueSize: 0
    };
  }

  public getAIMonitoring(): AIMonitoringMetric {
    return {
      totalRequests: 840,
      totalTokens: 1250400,
      promptTokens: 890000,
      responseTokens: 360400,
      responseTimeMs: 1450,
      providerStatus: 'online',
      modelPerformance: 98,
      failureRate: 0.2,
      fallbackUsageCount: 1,
      cachingEfficiencyPercent: 82,
      estimatedCostUsd: 18.52
    };
  }

  // ----------------------------------------------------
  // MARKETING CAMPAIGNS
  // ----------------------------------------------------
  public getCampaigns(): Campaign[] {
    const raw = localStorage.getItem('admin_campaigns');
    return raw ? JSON.parse(raw) : [];
  }

  public createCampaign(title: string, type: Campaign['type'], targetAudience: Campaign['targetAudience'], scheduledTime: string): Campaign {
    const campaigns = this.getCampaigns();
    const newCamp: Campaign = {
      id: `camp_${Date.now()}`,
      title,
      type,
      targetAudience,
      scheduledTime,
      status: 'draft',
      performance: { sent: 0, opened: 0, clicked: 0 }
    };

    campaigns.unshift(newCamp);
    localStorage.setItem('admin_campaigns', JSON.stringify(campaigns));

    if (this.currentSession) {
      this.createAuditLog(
        this.currentSession.adminUser.username,
        this.currentSession.adminUser.role,
        `Created marketing campaign: ${title}`,
        `Campaign.${newCamp.id}`,
        'none',
        'draft',
        'medium'
      );
    }
    return newCamp;
  }

  // ----------------------------------------------------
  // CRASH REPORTS & SECURITY CENTER
  // ----------------------------------------------------
  public getCrashReports(): CrashReport[] {
    const raw = localStorage.getItem('admin_crashes');
    return raw ? JSON.parse(raw) : [];
  }

  public getSecurityAlerts(): SecurityAlert[] {
    const raw = localStorage.getItem('admin_security_alerts');
    return raw ? JSON.parse(raw) : [];
  }

  public resolveSecurityAlert(alertId: string) {
    const alerts = this.getSecurityAlerts();
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      localStorage.setItem('admin_security_alerts', JSON.stringify(alerts));

      if (this.currentSession) {
        this.createAuditLog(
          this.currentSession.adminUser.username,
          this.currentSession.adminUser.role,
          `Resolved Security Alert ${alertId}`,
          `SecurityAlert.${alertId}`,
          'unresolved',
          'resolved',
          'medium'
        );
      }
    }
  }
}

export const adminService = AdminService.getInstance();
