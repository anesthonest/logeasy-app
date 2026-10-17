/**
 * LogEasy Universal Payment Service
 * High-level orchestration facade uniting Universal Payments,
 * Billing Engine, and Subscription Service.
 */

import { 
  paymentProviderRegistry 
} from './registry';
import { 
  bankTransferAdapter 
} from './adapters/bank_transfer_adapter';
import { 
  mobileMoneyAdapter 
} from './adapters/mobile_money_adapter';
import { 
  cardPaymentAdapter 
} from './adapters/card_payment_adapter';
import { 
  CreateUniversalCheckoutRequest, 
  UniversalCheckoutResult, 
  UniversalVerifyPaymentRequest, 
  UniversalVerifyPaymentResult,
  BankTransferProof,
  MobileMoneyPushRequest,
  MobileMoneyPushResponse,
  CountryCode,
  CurrencyCode,
  PaymentMethodDescriptor
} from './types';
import { subscriptionService } from '../subscription_service';
import { billingEngine } from '../billing_engine';
import { logger } from '../../analytics/logger';

export class UniversalPaymentService {
  private static instance: UniversalPaymentService;

  public static getInstance(): UniversalPaymentService {
    if (!UniversalPaymentService.instance) {
      UniversalPaymentService.instance = new UniversalPaymentService();
    }
    return UniversalPaymentService.instance;
  }

  // 1. Available methods & localized currencies for country
  public getAvailableMethods(country: CountryCode, currency: CurrencyCode): PaymentMethodDescriptor[] {
    return paymentProviderRegistry.getAvailableMethods(country, currency);
  }

  // 2. Initiate checkout
  public async initiateCheckout(req: CreateUniversalCheckoutRequest): Promise<UniversalCheckoutResult> {
    return paymentProviderRegistry.createCheckout(req);
  }

  // 3. Verify payment (Cards / Tokens / Admin verified)
  public async verifyPayment(req: UniversalVerifyPaymentRequest): Promise<UniversalVerifyPaymentResult> {
    const result = await paymentProviderRegistry.verifyPayment(req);

    // Sync state with SubscriptionService
    subscriptionService.updateSubscription(req.userId, {
      plan: result.planId as any,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: result.entitlement.endDate,
      autoRenew: result.entitlement.autoRenew,
      paymentProvider: req.rail === 'card_visa' || req.rail === 'card_mastercard' ? 'stripe' : 'manual',
    });

    // Record in local transactions ledger
    await subscriptionService.addTransaction(req.userId, {
      id: result.transactionId,
      amount: result.amount,
      currency: result.currency,
      plan: result.planId as any,
      date: result.verifiedAt,
      status: 'paid',
      invoiceUrl: result.invoiceUrl,
    });

    return result;
  }

  // 4. Bank transfer proof submission (Transitions to UNDER_REVIEW)
  public async submitBankProof(proof: Omit<BankTransferProof, 'submittedAt' | 'status'>) {
    return bankTransferAdapter.submitTransferProof(proof);
  }

  // 5. Admin bank reconciliation (APPROVE or REJECT)
  public async reconcileBankTransfer(params: {
    orderId: string;
    adminId: string;
    decision: 'APPROVE' | 'REJECT';
    reconciliationNotes?: string;
  }) {
    const order = bankTransferAdapter.getOrder(params.orderId);
    if (!order) {
      throw new Error(`Order ${params.orderId} not found.`);
    }

    const result = await bankTransferAdapter.reconcileTransfer(params);

    if (result.success && order) {
      // Sync with subscription service for the target user
      subscriptionService.updateSubscription(order.userId, {
        plan: order.planId,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: result.entitlement?.endDate || null,
        autoRenew: order.planId !== 'lifetime',
        paymentProvider: 'manual',
      });

      await subscriptionService.addTransaction(order.userId, {
        id: result.transaction?.id || `tx_${order.orderId}`,
        amount: order.amount,
        currency: order.currency,
        plan: order.planId,
        date: new Date().toISOString(),
        status: 'paid',
        invoiceUrl: `/api/billing/receipt/${result.transaction?.receiptId || order.referenceCode}`,
      });
    }

    return result;
  }

  // 6. Get pending bank reconciliations for Admin Console
  public getPendingBankReconciliations() {
    return bankTransferAdapter.getPendingReconciliations();
  }

  // 7. Mobile Money STK Push
  public async sendMobileMoneySTKPush(req: MobileMoneyPushRequest): Promise<MobileMoneyPushResponse> {
    return mobileMoneyAdapter.initiateSTKPush(req);
  }

  // 8. Mobile Money Status Poll
  public async pollMobileMoney(orderId: string) {
    return mobileMoneyAdapter.pollMobileMoneyStatus(orderId);
  }

  // 9. Instant Sandbox Simulator for Demo / Automated Verification
  public async simulateInstantSettlement(orderId: string, userId: string, method: 'bank_transfer' | 'mobile_money' | 'card') {
    logger.info('UniversalPaymentService', `Simulating instant settlement for order ${orderId} on ${method}`);
    
    if (method === 'bank_transfer') {
      return this.reconcileBankTransfer({
        orderId,
        adminId: 'simulated_instant_settlement',
        decision: 'APPROVE',
        reconciliationNotes: 'Instant sandbox demo bank wire settlement confirmation.',
      });
    }

    return this.verifyPayment({
      orderId,
      userId,
      method,
      rail: method === 'card' ? 'card_visa' : 'mobile_money',
      paymentToken: `tok_simulated_settled_${orderId}`,
    });
  }
}

export const universalPaymentService = UniversalPaymentService.getInstance();
