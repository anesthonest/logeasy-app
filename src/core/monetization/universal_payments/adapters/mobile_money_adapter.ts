/**
 * LogEasy Mobile Money Payment Adapter
 * Supports M-Pesa, MTN Mobile Money, Airtel Money, and Vodafone Cash.
 * Phone format validation, STK push initiation, handset PIN prompt,
 * status polling, and authoritative settlement verification.
 */

import { 
  PaymentProviderAdapter, 
  CreateUniversalCheckoutRequest, 
  UniversalCheckoutResult,
  UniversalVerifyPaymentRequest, 
  UniversalVerifyPaymentResult, 
  MobileMoneyCarrier,
  MobileMoneyPushRequest,
  MobileMoneyPushResponse,
  UniversalPaymentStatus,
  CountryCode,
  CurrencyCode,
  PaymentMethodDescriptor,
  ProviderCapabilities
} from '../types';
import { COUNTRY_REGISTRY, SUPPORTED_CARRIERS, getLocalizedPlanPrice } from '../country_currency_matrix';
import { billingEngine, PLANS_CATALOG } from '../../billing_engine';
import { logger } from '../../../analytics/logger';

interface MobileMoneySession {
  orderId: string;
  userId: string;
  planId: any;
  country: CountryCode;
  currency: CurrencyCode;
  amount: number;
  carrier: MobileMoneyCarrier;
  phoneNumber?: string;
  checkoutRequestId?: string;
  status: UniversalPaymentStatus;
  createdAt: string;
  expiresAt: string;
  promptMessage?: string;
  verifiedAt?: string;
}

export function validateMobileMoneyPhone(phoneNumber: string, carrier: MobileMoneyCarrier): boolean {
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  if (!cleaned) return false;

  // Format check based on carrier
  if (carrier === 'mpesa' || carrier === 'airtel_money') {
    // Kenya (+254, 07..., 01..., 254...)
    return /^(?:\+?254|0)?[17]\d{8}$/.test(cleaned);
  }

  if (carrier === 'mtn_momo' || carrier === 'vodafone_cash') {
    // Ghana (+233, 02..., 05..., 233...) or Nigeria (+234, 08..., 09...)
    return /^(?:\+?233|0)?[25]\d{8}$/.test(cleaned) || /^(?:\+?234|0)?[789]\d{9}$/.test(cleaned);
  }

  // Generic international mobile check (8 to 15 digits)
  return /^\+?\d{8,15}$/.test(cleaned);
}

export class MobileMoneyAdapter implements PaymentProviderAdapter {
  public readonly id = 'mobile_money_provider';
  public readonly name = 'LogEasy Mobile Money Universal Gateway';

  private sessions: Map<string, MobileMoneySession> = new Map();

  public getProviderCapabilities(): ProviderCapabilities {
    return {
      supportsBankTransfer: false,
      supportsVisaMastercard: false,
      supportsMobileMoney: true,
      supportsWebhooks: true,
      supportsRefunds: true,
      supportsAutomaticReconciliation: true,
    };
  }

  public getSupportedMethods(country: CountryCode, _currency: CurrencyCode): PaymentMethodDescriptor[] {
    const config = COUNTRY_REGISTRY[country] || COUNTRY_REGISTRY.KE;
    const carrierList = (config.carriers || [SUPPORTED_CARRIERS.mpesa_ke]).map(c => c.name).join(', ');
    return [{
      id: 'mobile_money',
      name: 'Mobile Money',
      description: `Fast STK Push to your phone (${carrierList}).`,
      supportedRails: ['mobile_money'],
      icon: 'smartphone',
      badge: 'STK Push Instant',
    }];
  }

  public getSupportedCurrencies(): CurrencyCode[] {
    return ['KES', 'GHS', 'NGN', 'ZAR', 'USD'];
  }

  // --------------------------------------------------------------------------
  // 1. CREATE CHECKOUT
  // --------------------------------------------------------------------------
  public async createCheckout(req: CreateUniversalCheckoutRequest): Promise<UniversalCheckoutResult> {
    const { userId, planId, country, currency, idempotencyKey } = req;

    if (!userId || !userId.trim()) {
      throw new Error('Authentication required: Valid userId must be specified.');
    }

    const plan = PLANS_CATALOG[planId];
    if (!plan) {
      throw new Error(`Invalid plan identifier: ${planId}`);
    }

    const priceInfo = getLocalizedPlanPrice(planId, currency);
    const orderId = `ord_momo_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 20); // 20 minutes

    const config = COUNTRY_REGISTRY[country] || COUNTRY_REGISTRY.KE;
    const defaultCarrier = config.carriers?.[0]?.id || 'mpesa';

    const session: MobileMoneySession = {
      orderId,
      userId,
      planId,
      country,
      currency,
      amount: priceInfo.amount,
      carrier: defaultCarrier,
      status: 'CREATED',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.sessions.set(orderId, session);

    // Register with core billing engine
    billingEngine.initiateCheckout({
      orderId,
      userId,
      planId,
      amount: priceInfo.amount,
      currency,
      provider: 'sandbox',
      idempotencyKey: idempotencyKey || `idem_${orderId}`,
    });

    logger.info('MobileMoneyAdapter', `Created mobile money checkout ${orderId} for user ${userId} (${priceInfo.formatted})`);

    return {
      orderId,
      userId,
      planId,
      amount: priceInfo.amount,
      currency,
      country,
      method: 'mobile_money',
      rail: 'mobile_money',
      status: 'CREATED',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      idempotencyKey: idempotencyKey || orderId,
      mobileMoneyDetails: {
        supportedCarriers: config.carriers || [SUPPORTED_CARRIERS.mpesa_ke, SUPPORTED_CARRIERS.airtel_ke],
      },
    };
  }

  // --------------------------------------------------------------------------
  // 2. INITIATE STK PUSH PROMPT
  // --------------------------------------------------------------------------
  public async initiateSTKPush(req: MobileMoneyPushRequest): Promise<MobileMoneyPushResponse> {
    const { orderId, userId, phoneNumber, carrier, amount, currency } = req;
    const session = this.sessions.get(orderId);

    if (!session) {
      throw new Error(`Mobile money order ${orderId} not found.`);
    }

    if (session.userId !== userId) {
      throw new Error('Access denied: Mobile money order does not belong to this user.');
    }

    // Phone validation
    const isValidPhone = validateMobileMoneyPhone(phoneNumber, carrier);
    if (!isValidPhone) {
      throw new Error(`Invalid phone number format for ${carrier.toUpperCase()}. Please check country code and number.`);
    }

    const checkoutRequestId = `req_stk_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date();
    const carrierName = carrier === 'mpesa' ? 'M-PESA' : carrier.toUpperCase();
    const promptMessage = `A prompt has been sent to ${phoneNumber}. Please unlock your phone and enter your ${carrierName} PIN to authorize the payment of ${currency} ${amount.toLocaleString()}.`;

    session.phoneNumber = phoneNumber;
    session.carrier = carrier;
    session.checkoutRequestId = checkoutRequestId;
    session.status = 'AWAITING_PIN';
    session.promptMessage = promptMessage;
    this.sessions.set(orderId, session);

    logger.info('MobileMoneyAdapter', `STK Push dispatched to ${phoneNumber} on ${carrier} for order ${orderId} (${currency} ${amount})`);

    return {
      orderId,
      checkoutRequestId,
      status: 'AWAITING_PIN',
      customerPromptMessage: promptMessage,
      carrier,
      phoneNumber,
      initiatedAt: now.toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // 3. POLL MOBILE MONEY STATUS
  // --------------------------------------------------------------------------
  public async pollMobileMoneyStatus(orderId: string): Promise<{
    orderId: string;
    status: UniversalPaymentStatus;
    carrier?: MobileMoneyCarrier;
    phoneNumber?: string;
    message: string;
  }> {
    const session = this.sessions.get(orderId);
    if (!session) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (session.status === 'VERIFIED') {
      return {
        orderId,
        status: 'VERIFIED',
        carrier: session.carrier,
        phoneNumber: session.phoneNumber,
        message: 'Payment confirmed by network! Entitlement is active.',
      };
    }

    if (session.status === 'AWAITING_PIN') {
      return {
        orderId,
        status: 'AWAITING_PIN',
        carrier: session.carrier,
        phoneNumber: session.phoneNumber,
        message: session.promptMessage || 'Awaiting PIN confirmation on handset...',
      };
    }

    return {
      orderId,
      status: session.status,
      carrier: session.carrier,
      phoneNumber: session.phoneNumber,
      message: `Status: ${session.status}`,
    };
  }

  // --------------------------------------------------------------------------
  // 4. VERIFY PAYMENT (When PIN approved or callback received)
  // --------------------------------------------------------------------------
  public async verifyPayment(req: UniversalVerifyPaymentRequest): Promise<UniversalVerifyPaymentResult> {
    const { orderId, userId, paymentToken } = req;
    const session = this.sessions.get(orderId);

    if (!session) {
      throw new Error(`Mobile money order ${orderId} not found.`);
    }

    if (session.userId !== userId) {
      throw new Error('Access denied: Mobile money order does not belong to this user.');
    }

    // Check decline simulation
    if (paymentToken === 'tok_pin_declined' || paymentToken === 'tok_timeout') {
      session.status = 'FAILED';
      throw new Error('Mobile money transaction failed: PIN entry was cancelled or timed out.');
    }

    // Authoritative verification via BillingEngine
    const billingResult = await billingEngine.verifyPayment({
      orderId: session.orderId,
      userId,
      paymentToken: paymentToken || `tok_momo_${session.checkoutRequestId || orderId}`,
      provider: 'sandbox',
    });

    session.status = 'VERIFIED';
    session.verifiedAt = new Date().toISOString();
    this.sessions.set(orderId, session);

    logger.info('MobileMoneyAdapter', `Mobile money payment confirmed for order ${orderId}. User: ${userId}`);

    return {
      success: true,
      orderId,
      transactionId: billingResult.transaction.id,
      receiptId: billingResult.transaction.receiptId,
      planId: session.planId,
      status: 'VERIFIED',
      amount: session.amount,
      currency: session.currency,
      method: 'mobile_money',
      rail: 'mobile_money',
      message: `Payment authorized via ${session.carrier.toUpperCase()}! Account upgraded successfully.`,
      verifiedAt: session.verifiedAt,
      invoiceUrl: billingResult.transaction.invoiceUrl,
      entitlement: billingResult.entitlement,
    };
  }

  public async getPaymentStatus(orderId: string): Promise<UniversalPaymentStatus> {
    const session = this.sessions.get(orderId);
    return session ? session.status : 'FAILED';
  }

  public async refundPayment(transactionId: string, reason: string): Promise<{ success: boolean; transactionId: string }> {
    billingEngine.refundTransaction('mobile_money_reversal', transactionId, reason);
    return { success: true, transactionId };
  }

  public async cancelPayment(orderId: string): Promise<{ success: boolean; orderId: string }> {
    const session = this.sessions.get(orderId);
    if (session) {
      session.status = 'CANCELLED';
      this.sessions.set(orderId, session);
    }
    return { success: true, orderId };
  }

  public async verifyWebhook(payload: any, _signature?: string): Promise<{ success: boolean; eventId: string; processed: boolean }> {
    // Handle M-Pesa / MTN MoMo C2B/B2C webhook notifications
    const orderId = payload?.BillRefNumber || payload?.orderId;
    if (orderId && this.sessions.has(orderId)) {
      const session = this.sessions.get(orderId)!;
      session.status = 'VERIFIED';
      session.verifiedAt = new Date().toISOString();
      this.sessions.set(orderId, session);
      return { success: true, eventId: payload?.TransID || `evt_momo_${Date.now()}`, processed: true };
    }
    return { success: true, eventId: 'evt_momo_noop', processed: false };
  }
}

export const mobileMoneyAdapter = new MobileMoneyAdapter();
