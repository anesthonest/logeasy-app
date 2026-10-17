/**
 * LogEasy Monetization & Billing Architecture — Core Types
 * Strict financial state machine, plan catalog, and transaction interfaces.
 */

export type SubscriptionPlanId =
  | 'free'
  | 'premium_monthly'
  | 'premium_annual'
  | 'lifetime'
  | 'family'
  | 'student'
  | 'gift';

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'VERIFIED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'REVERSED';

export type PaymentProvider =
  | 'stripe'
  | 'google_pay'
  | 'apple_pay'
  | 'sandbox'
  | 'offline_license'
  | 'none';

export interface PlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  price: number; // In USD, e.g. 9.99
  currency: 'USD';
  interval: 'month' | 'year' | 'one_time' | 'free';
  description: string;
  features: string[];
  quotas: {
    ai_summaries: number; // -1 for unlimited
    ai_coaching: number;  // -1 for unlimited
    audio_recaps: boolean;
    advanced_analytics: boolean;
    multi_device_sync: boolean;
    knowledge_graph: boolean;
  };
  highlighted?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export interface CheckoutSession {
  orderId: string;
  userId: string;
  planId: SubscriptionPlanId;
  amount: number;
  currency: 'USD' | string;
  provider: PaymentProvider;
  status: PaymentStatus;
  idempotencyKey: string;
  createdAt: string;
  expiresAt: string;
  clientSecret?: string;
  redirectUrl?: string;
  metadata?: Record<string, string>;
}

export interface VerifiedTransaction {
  id: string; // tx_...
  orderId: string;
  userId: string;
  planId: SubscriptionPlanId;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  createdAt: string;
  verifiedAt?: string;
  receiptId: string;
  invoiceUrl: string;
  refundReason?: string;
  providerTransactionId?: string;
  metadata?: Record<string, any>;
}

export interface UserEntitlement {
  userId: string;
  tier: 'free' | 'premium' | 'family' | 'lifetime';
  status: 'active' | 'expired' | 'canceled' | 'none';
  planId: SubscriptionPlanId;
  startDate: string;
  endDate: string | null; // null for lifetime
  autoRenew: boolean;
  sourceTransactionId?: string;
  paymentProvider: PaymentProvider;
  quotas: {
    ai_summaries_used: number;
    ai_coaching_used: number;
    monthKey: string;
  };
  lastVerifiedAt: string;
}

export interface RevenueLedgerMetrics {
  grossCollections: number;
  refundedTotal: number;
  netCollections: number;
  totalTransactions: number;
  verifiedTransactionsCount: number;
  pendingTransactionsCount: number;
  failedTransactionsCount: number;
  refundedTransactionsCount: number;
  activeSubscribers: number;
  planDistribution: Record<SubscriptionPlanId, number>;
  generatedAt: string;
}
