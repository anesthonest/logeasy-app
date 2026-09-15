# LogEasy Administration, Operations & Business Intelligence Platform

This document describes the design patterns, security standards, clean architecture, and technical workflows powering the administration console, customer support desk, Remote Config, marketing campaigns, audit logging, and security telemetry subsystems in LogEasy.

---

## 1. Architectural Overview

LogEasy adopts a **Decoupled, Operations-Safe Architecture**. The Administration platform resides under `/src/core/admin` (logical services) and `/src/components/admin` (visual workspaces) to isolate management capabilities from standard customer journaling utilities.

```
       ┌─────────────────────────────────────────────────────────┐
       │                       App.tsx                           │
       └────────────────────────────┬────────────────────────────┘
                                    │ Renders UI Tab
       ┌────────────────────────────▼────────────────────────────┐
       │              AdminConsole (UI Command Center)           │
       └────────────────────────────┬────────────────────────────┘
                                    │ Queries / Modifies State
       ┌────────────────────────────▼────────────────────────────┐
       │                 AdminService (Core Engine)               │
       └─────┬──────────────────────┬──────────────────────┬─────┘
             │                      │                      │
 ┌───────────▼───────────┐  ┌───────▼───────────────┐  ┌───▼──────────────────┐
 │ Role-Based Access     │  │ Customer Support Desk │  │ Live Telemetry BI    │
 │ Control (RBAC)        │  │ Ticket Hub            │  │ Health Sensors       │
 └───────────────────────┘  └───────────────────────┘  └──────────────────────┘
```

---

## 2. Role-Based Access Control (RBAC) & Security

The platform enforces strict cryptographic-aligned authorization checks using a pre-configured role-to-permission mapping table.

### Administrative Roles:
1. **Super Administrator**: Complete administrative capability, including deleting database records, issuing transaction refunds, altering billing fees, and viewing audits.
2. **Administrator**: General business operations. Can adjust feature flags, schedule campaigns, and view analytical telemetry, but cannot purge user files or view system-wide audit logs.
3. **Support Agent**: Restrictive read/write access to customer tickets. Can answer queries, update statuses, and check user sync logs, but cannot alter system-level configurations.
4. **Finance Manager**: Restricted strictly to monetary details. Can view ARR/MRR statistics, process transactional refunds, and inspect discount campaign logs.
5. **AI Operations Manager**: Tracks AI token usage efficiency, prompt cache hits, fallback usage frequencies, and estimated provider latency.
6. **Analytics Viewer**: Read-only business intelligence dashboard access. Used by growth, conversion, and cohort managers.
7. **Read Only Auditor**: Authorized to review system audit logs, active security alerts, and crashlytics reports.

### Code Access Verification Block:
```typescript
if (!adminService.hasPermission('delete_users')) {
  throw new Error("Security Exception: Access Denied.");
}
```

---

## 3. Operations Support Platform & Ticket Lifecycle

To provide customer support without violating user privacy, the ticket desk decouples user identity and encrypted transcripts:
* **Decoupled Tickets**: Tickets are tracked by custom references (e.g., `tkt_101`) mapped securely to the user email.
* **Closed-Loop Chats**: Administrators communicate directly via public responses within the ticket workspace.
* **Internal Auditing Notes**: Agents can record private notes (e.g., for escalations) that are omitted from customer-facing mailboxes.
* **Pre-Set Canned Responses**: Standard templates for common inquiries (e.g., duplicate charges, AES-256 local seeds, sync latency troubleshooting) accelerate response resolution.

```
Customer Ticket Submitted ──► Open Status ──► Assigned to Agent ──► Resolved & Audited
```

---

## 4. Operational Telemetry & Business Intelligence

The administrative platform pulls metrics from two main operations pipelines:
* **System Health Monitor**: Track API latencies, CPU/Memory usage, database transaction queue logs, and WebSocket tunnel counts to ensure infrastructure resiliency.
* **AI Operations Tracker**: Analyzes Gemni-2.5 token metrics, estimated operational costs (USD), failure and retry rates, model response speeds, and caching hits.
* **BI Metric Store**: Aggregates customer data to calculate key health factors:
  * **MRR / ARR**: Tracking active premium recurring value.
  * **LTV (Lifetime Value)**: Measuring value per user cohort.
  * **CAC (Customer Acquisition Cost)**: Visualizing marketing cost.
  * **Stickiness Ratio**: Calculated dynamically as Daily Active Users (DAU) / Monthly Active Users (MAU).

---

## 5. Remote Config, Toggles & Growth Campaigns

* **Maintenance Mode**: Activates a read-only global state block.
* **Live Price Toggles**: Modifies the subscription cost matrices dynamically.
* **Feature Flags**: Toggles advanced tools (e.g., knowledge graphs, audio recaps, AI companion coaching) on or off for specific buckets.
* **A/B Testing Experiments**: Controls client enrollment variants (Control vs Onboarding) to optimize monetization paths.
* **Campaign Manager**: Schedules pushes, messages, or emails for seasonal growth campaigns.

---

## 6. Audit Logging & Hardened Security Center

Every administrative operation is logged with detailed context for tracking:
* **Attributes Saved**: Timestamp, Username, Role, Affected Resource, Action, Device User-Agent, Client IP, Old Value, New Value, and Risk Level (Low/Medium/High).
* **Security Guardrails**: Aggregates authentication attempts and failed logins. Alerts are immediately triggered and logged when consecutive authentication failures exceed safe thresholds.
* **Crashlytics Console**: Real-time stack traces help development squads quickly debug exceptions in any production build.
