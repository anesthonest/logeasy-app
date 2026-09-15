# LogEasy Monetization, Growth & User Engagement Platform

This document describes the design patterns, clean architecture, and technical workflows powering the subscription, licensing, gating, referral, retention, and growth subsystems in LogEasy.

---

## 1. Architectural Overview

LogEasy adopts a **Clean, Offline-First Architecture**. The Monetization & Growth platform resides in `/src/core/monetization` and serves as a decoupled business rules layer that interacts with:
* **Storage Provider (`IndexedDB`/`localStorage`)**: Manages subscriber states, local achievements progress, referral entries, and A/B bucket distributions.
* **Notification Subsystem (`NotificationManager`)**: Emits native desktop notifications and local alerts when users unlock milestones, complete onboarding, or process invoices.
* **Telemetry Core (`logger`)**: Tracks customer conversion points, active session times, and feature usage cohorts.

```
       ┌─────────────────────────────────────────────────────────┐
       │                       App.tsx                           │
       └────────────────────────────┬────────────────────────────┘
                                    │ Renders UI Hub
       ┌────────────────────────────▼────────────────────────────┐
       │             MonetizationDashboard (UI Screens)          │
       └────────────────────────────┬────────────────────────────┘
                                    │ Queries / Modifies State
       ┌────────────────────────────▼────────────────────────────┐
       │               SubscriptionService (Core Rules)           │
       └─────┬──────────────────────┬──────────────────────┬─────┘
             │                      │                      │
 ┌───────────▼───────────┐  ┌───────▼───────────────┐  ┌───▼──────────────────┐
 │ Central Feature Gate  │  │ Dynamic Remote Config │  │ A/B Experiment Engine│
 └───────────────────────┘  └───────────────────────┘  └──────────────────────┘
```

---

## 2. Subscription System & Billing Flows

LogEasy supports multiple flexible pricing plans to maximize sustainable recurring revenue:
1. **Free Tier**: Default standard local vault storage with generous access to recording features but set limits on AI summaries and coaching (5 summaries and 3 coach chats per month).
2. **Premium Pro (Monthly / Annual)**: Offers unlimited AI capabilities, advanced semantic search, weekly and monthly summary recaps, goal tracking, and cloud sync across multi-devices.
3. **Family Multi-Vault**: Unlocks up to 5 fully isolated, encrypted individual profiles sharing the owner's billing controls.
4. **Student & Gift Packs**: Customizable discounts managed via Remote Config pricing tables.
5. **Lifetime License Key**: Instant permanent activation bypassing recurring payment portals.

### Payment Abstraction & Subscriptions Flow
```
User clicks "Upgrade" ──► SubscriptionService.upgradePlan() 
                             ├──► Record transaction item in storage
                             ├──► Notify A/B Test tracker of conversion success
                             ├──► Emit native browser premium status banner
                             └──► Refresh UI state
```

---

## 3. Centralized Feature Gating Engine

To avoid hardcoded subscription constraints, all component features query the centralized access manager:
```typescript
subscriptionService.canAccessFeature(userId, featureKey, currentUsageCount);
```

### Access Rules:
* If the user possesses any active Premium/Lifetime status, **ALL** gates return `allowed: true`.
* Under the Free Tier, the gate checks monthly usage logs against predefined thresholds (e.g., `< 5` for AI summaries, `< 3` for AI Coach conversations).
* Specialized features (e.g., `advanced_analytics`, `knowledge_graph`, `multi_device_sync`) return `allowed: false` with explicit, user-friendly upgrade recommendations.

---

## 4. Offline License Validation & Key Recovery

LogEasy includes a decentralized license key validator. 
* **Validation Standard**: Format constraints are verified locally against cryptographic verification masks (`LOGEASY-LIFETIME-XXXX-XXXX`).
* **Offline Resiliency**: In the event of offline server outages, local keys are verified against safe client-side hashes to prevent users from losing premium capabilities when working in low-connectivity areas.

---

## 5. Viral Referral & Invite Tracking

LogEasy incorporates a word-of-mouth growth program:
* **Dynamic Invite Keys**: Unique codes (e.g., `EASY-USERID-XYZ`) are generated for each user.
* **Double-Sided Incentives**: When a referred user applies the code, they get **10 Free Premium Days**, and the original inviter is automatically credited with a **10-day bonus period**.
* **Integrations**: Integrated with email templates to invite contacts directly via background SMTP mock alerts.

---

## 6. Onboarding Experience & Personalization Wizard

The onboarding engine guides first-time users through six steps to build immediate trust and capture user preferences:
1. **Welcome**: Explains the value proposition of LogEasy.
2. **Privacy**: Full walkthrough of AES-256 local encryption and IndexedDB sandboxed models.
3. **Hardware / Permissions**: Captures microphone permission configurations.
4. **AI Personalization**: Lets the user select their companion's therapist style (Socratic, Compassionate, Stoic, Creative).
5. **Smart Reminders**: Selects optimal alarm intervals for daily journaling.
6. **Premium Vault**: Explains premium features without forcing checkout gates.

---

## 7. Engagement & Achievement Systems

* **Smart Alarms**: Native scheduler simulations prompt users to log their feelings at the end of every evening.
* **Achievements Badge Board**: Tracks streaks, journal counts, premium enrollment, and referral milestones.
* **Gamification Toggle**: Mindful users who prefer an aesthetic, distraction-free environment can disable achievements entirely with a single click.

---

## 8. Growth Cohort A/B Testing

To optimize monetization pathways, LogEasy dynamically enrolls users in randomly bucketed variants:
* **Variant A (Control)**: Simple signup.
* **Variant B (Interactive)**: Rich interactive onboarding.
* **Variant C (Immediate Paywall)**: Displays pricing up-front to test direct transaction rates.
Conversion and session statistics are aggregated and structured under local retention cohorts.

---

## 9. Future Expansion Strategy

* **Enterprise Teams Platform**: Standardize the billing system to support multi-seat business team subscriptions with single-sign-on.
* **Payment Gateways**: Connect real Stripe API endpoints and Apple/Google In-App-Purchase SDK hooks. Since the business rules are decoupled inside `SubscriptionService`, swaps can be completed with zero edits to user-facing UI screens.
