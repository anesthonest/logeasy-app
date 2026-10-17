/**
 * LogEasy Universal Payments Architecture — Core Types
 * Provider-independent contracts for Bank Transfers, Visa/Mastercard,
 * Mobile Money, and Country-Specific Rails.
 */

import { SubscriptionPlanId, PaymentStatus as CorePaymentStatus, UserEntitlement } from '../billing_types';

export type PaymentRail = 
  | 'bank_transfer' 
  | 'card_visa' 
  | 'card_mastercard' 
  | 'mobile_money' 
  | 'license_key';

export type PaymentMethodId = 
  | 'bank_transfer' 
  | 'card' 
  | 'mobile_money' 
  | 'license_key';

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export type MobileMoneyCarrier = 
  | 'mpesa' 
  | 'mtn_momo' 
  | 'airtel_money' 
  | 'orange_money' 
  | 'vodafone_cash';

export type CurrencyCode = 
  | 'USD' 
  | 'EUR' 
  | 'GBP' 
  | 'KES' 
  | 'NGN' 
  | 'GHS' 
  | 'ZAR' 
  | 'CAD' 
  | 'AUD' 
  | 'INR';

export type CountryCode = 
  | 'US' 
  | 'GB' 
  | 'DE' 
  | 'FR' 
  | 'NL' 
  | 'ES' 
  | 'IT' 
  | 'KE' 
  | 'NG' 
  | 'GH' 
  | 'ZA' 
  | 'CA' 
  | 'AU' 
  | 'IN' 
  | 'OTHER';

export type UniversalPaymentStatus = 
  | 'CREATED'
  | 'PENDING'
  | 'UNDER_REVIEW' // Used for Bank Transfer awaiting reconciliation
  | 'STK_PUSH_SENT' // Used for Mobile Money
  | 'AWAITING_PIN'  // Used for Mobile Money
  | 'VERIFIED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'REVERSED'
  | 'EXPIRED';

export interface LocalizedPlanPrice {
  planId: SubscriptionPlanId;
  currency: CurrencyCode;
  amount: number;
  formatted: string;
}

export interface BankAccountInstructions {
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  routingOrSortCode: string;
  swiftBic: string;
  referenceCode: string; // e.g. LOGEASY-REF-XXXXX
  amount: number;
  currency: CurrencyCode;
  deadlineHours: number;
  notes: string;
  domesticRailName: string; // e.g. "ACH / Fedwire", "SEPA", "Faster Payments", "NIP Transfer"
}

export interface BankTransferProof {
  orderId: string;
  userId: string;
  senderName: string;
  senderBank: string;
  transferReference: string;
  transferDate: string;
  amount: number;
  currency: CurrencyCode;
  submittedAt: string;
  reconciledBy?: string;
  reconciledAt?: string;
  reconciliationNotes?: string;
  status: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
}

export interface CardIntakeData {
  cardNumber: string; // tokenized or masked on client
  cardholderName: string;
  expMonth: string;
  expYear: string;
  cvc: string; // never saved on server
  brand?: CardBrand;
  requires3DS?: boolean;
}

export interface CardTokenPayload {
  token: string;
  brand: CardBrand;
  last4: string;
  expMonth: string;
  expYear: string;
  cardholderName: string;
  threeDSecureStatus?: 'PASSED' | 'FAILED' | 'BYPASSED';
}

export interface MobileMoneyCarrierInfo {
  id: MobileMoneyCarrier;
  name: string;
  countryCode: CountryCode;
  dialCode: string;
  currency: CurrencyCode;
  logoBadge: string;
  placeholder: string;
}

export interface MobileMoneyPushRequest {
  orderId: string;
  userId: string;
  phoneNumber: string;
  carrier: MobileMoneyCarrier;
  amount: number;
  currency: CurrencyCode;
}

export interface MobileMoneyPushResponse {
  orderId: string;
  checkoutRequestId: string;
  status: 'STK_PUSH_SENT' | 'AWAITING_PIN' | 'VERIFIED' | 'FAILED' | 'TIMEOUT';
  customerPromptMessage: string;
  carrier: MobileMoneyCarrier;
  phoneNumber: string;
  initiatedAt: string;
}

export interface PaymentMethodDescriptor {
  id: PaymentMethodId;
  name: string;
  description: string;
  supportedRails: PaymentRail[];
  icon: string;
  badge?: string;
  isPopular?: boolean;
}

export interface CountryConfig {
  code: CountryCode;
  name: string;
  defaultCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  supportedMethods: PaymentMethodId[];
  defaultRail: PaymentRail;
  carriers?: MobileMoneyCarrierInfo[];
  domesticBankRail: string;
}

export interface CreateUniversalCheckoutRequest {
  userId: string;
  planId: SubscriptionPlanId;
  country: CountryCode;
  currency: CurrencyCode;
  method: PaymentMethodId;
  rail: PaymentRail;
  idempotencyKey?: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export interface UniversalCheckoutResult {
  orderId: string;
  userId: string;
  planId: SubscriptionPlanId;
  amount: number;
  currency: CurrencyCode;
  country: CountryCode;
  method: PaymentMethodId;
  rail: PaymentRail;
  status: UniversalPaymentStatus;
  createdAt: string;
  expiresAt: string;
  idempotencyKey: string;
  bankInstructions?: BankAccountInstructions;
  cardRequirements?: {
    supportedBrands: CardBrand[];
    requires3DS: boolean;
  };
  mobileMoneyDetails?: {
    supportedCarriers: MobileMoneyCarrierInfo[];
  };
  clientSecret?: string;
  isDuplicate?: boolean;
}

export interface UniversalVerifyPaymentRequest {
  orderId: string;
  userId: string;
  method: PaymentMethodId;
  rail: PaymentRail;
  paymentToken?: string;
  cardData?: CardTokenPayload;
  bankProof?: BankTransferProof;
  mobileMoneyResponse?: MobileMoneyPushResponse;
}

export interface UniversalVerifyPaymentResult {
  success: boolean;
  orderId: string;
  transactionId: string;
  receiptId: string;
  planId: SubscriptionPlanId;
  status: UniversalPaymentStatus;
  amount: number;
  currency: CurrencyCode;
  method: PaymentMethodId;
  rail: PaymentRail;
  message: string;
  verifiedAt: string;
  invoiceUrl: string;
  entitlement: UserEntitlement;
  transaction?: {
    id: string;
    amount: number;
    currency: string;
    plan: SubscriptionPlanId;
    date: string;
    status: string;
    receiptId?: string;
  };
}

export interface ProviderCapabilities {
  supportsBankTransfer: boolean;
  supportsVisaMastercard: boolean;
  supportsMobileMoney: boolean;
  supportsWebhooks: boolean;
  supportsRefunds: boolean;
  supportsAutomaticReconciliation: boolean;
}

export interface PaymentProviderAdapter {
  readonly id: string;
  readonly name: string;
  createCheckout(req: CreateUniversalCheckoutRequest): Promise<UniversalCheckoutResult>;
  verifyPayment(req: UniversalVerifyPaymentRequest): Promise<UniversalVerifyPaymentResult>;
  verifyWebhook(payload: any, signature?: string): Promise<{ success: boolean; eventId: string; processed: boolean }>;
  getPaymentStatus(orderId: string): Promise<UniversalPaymentStatus>;
  refundPayment(transactionId: string, reason: string): Promise<{ success: boolean; transactionId: string }>;
  cancelPayment(orderId: string): Promise<{ success: boolean; orderId: string }>;
  getSupportedMethods(country: CountryCode, currency: CurrencyCode): PaymentMethodDescriptor[];
  getSupportedCurrencies(): CurrencyCode[];
  getProviderCapabilities(): ProviderCapabilities;
}
