import { adminService, AdminRole } from '../admin_service';

describe('Admin Service and Operations Platform', () => {
  beforeEach(() => {
    localStorage.clear();
    // Re-initialize or let service seed default localStorage values
    (adminService as any).seedInitialData();
  });

  afterEach(() => {
    adminService.logoutAdmin();
  });

  test('Administrator Authentication & Session Management', () => {
    const session = adminService.loginAdmin('super_alex', 'super_admin');
    expect(session.adminUser.username).toBe('super_alex');
    expect(session.adminUser.role).toBe('super_admin');
    expect(adminService.getSession()).not.toBeNull();
    
    adminService.logoutAdmin();
    expect(adminService.getSession()).toBeNull();
  });

  test('Role-Based Access Control (RBAC) Permitted Actions', () => {
    // 1. Super Admin possesses comprehensive controls
    adminService.loginAdmin('super_alex', 'super_admin');
    expect(adminService.hasPermission('delete_users')).toBe(true);
    expect(adminService.hasPermission('modify_remote_config')).toBe(true);
    expect(adminService.hasPermission('view_audit_logs')).toBe(true);
    adminService.logoutAdmin();

    // 2. Support Agent possesses sandboxed diagnostic permissions
    adminService.loginAdmin('agent_sarah', 'support_agent');
    expect(adminService.hasPermission('view_support_tickets')).toBe(true);
    expect(adminService.hasPermission('resolve_support_tickets')).toBe(true);
    expect(adminService.hasPermission('delete_users')).toBe(false);
    expect(adminService.hasPermission('modify_remote_config')).toBe(false);
    adminService.logoutAdmin();

    // 3. Finance Manager has access restricted strictly to business transactions
    adminService.loginAdmin('finance_frank', 'finance_manager');
    expect(adminService.hasPermission('view_revenue')).toBe(true);
    expect(adminService.hasPermission('refund_subscriptions')).toBe(true);
    expect(adminService.hasPermission('resolve_support_tickets')).toBe(false);
    expect(adminService.hasPermission('view_audit_logs')).toBe(false);
  });

  test('Support Ticket Management Lifecycle', () => {
    adminService.loginAdmin('agent_sarah', 'support_agent');
    
    // Create ticket
    const ticket = adminService.createTicket(
      'guest_user',
      'anesthonest81@gmail.com',
      'AI Coach Loop Error',
      'I am seeing too many consecutive reminders.',
      'ai_coach'
    );
    expect(ticket.status).toBe('open');
    expect(ticket.priority).toBe('medium');

    // Assign ticket
    adminService.assignTicket(ticket.id, 'agent_sarah', 'Sarah Conner');
    let loaded = adminService.getTickets().find(t => t.id === ticket.id);
    expect(loaded?.status).toBe('assigned');
    expect(loaded?.assignedAgentName).toBe('Sarah Conner');

    // Reply
    adminService.replyToTicket(ticket.id, 'I have adjusted your notification triggers.');
    loaded = adminService.getTickets().find(t => t.id === ticket.id);
    expect(loaded?.conversationHistory.length).toBe(2);
    expect(loaded?.conversationHistory[1].text).toBe('I have adjusted your notification triggers.');

    // Resolve
    adminService.resolveTicket(ticket.id);
    loaded = adminService.getTickets().find(t => t.id === ticket.id);
    expect(loaded?.status).toBe('resolved');
  });

  test('Audit Log Recording on Actions', () => {
    adminService.loginAdmin('super_alex', 'super_admin');
    
    const countBefore = adminService.getAuditLogs().length;
    adminService.updateRemoteConfig({ maintenanceMode: true });
    
    const countAfter = adminService.getAuditLogs().length;
    expect(countAfter).toBe(countBefore + 1);

    const latestLog = adminService.getAuditLogs()[0];
    expect(latestLog.adminUsername).toBe('super_alex');
    expect(latestLog.affectedResource).toBe('RemoteConfig');
    expect(latestLog.riskLevel).toBe('medium');
  });

  test('User Operations and Privacy Controls', () => {
    adminService.loginAdmin('super_alex', 'super_admin');

    // Verify initial meta loaded
    const users = adminService.getUsersMetadata();
    expect(users.length).toBeGreaterThan(0);

    const targetUser = users[0];
    expect(targetUser.isSuspended).toBe(false);

    // Suspend
    const status = adminService.toggleUserSuspension(targetUser.userId);
    expect(status).toBe(true);

    const usersUpdated = adminService.getUsersMetadata();
    expect(usersUpdated[0].isSuspended).toBe(true);

    // Delete
    adminService.deleteUserAccountSecurely(targetUser.userId);
    const usersAfterDelete = adminService.getUsersMetadata();
    expect(usersAfterDelete.find(u => u.userId === targetUser.userId)).toBeUndefined();
  });
});
