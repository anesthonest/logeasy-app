/**
 * LogEasy First-Class Bank Transfer Payment Adapter
 * Implements authoritative bank wire/deposit workflows:
 * Instructions Generation → Unique Reference → Proof Submission (Under Review)
 * → Authoritative Server/Admin Reconciliation → Entitlement Activation & Receipt.
 */

import { 
  PaymentProviderAdapter, 
  CreateUniversalCheckoutRequest, 
  UniversalCheckoutResult,
  UniversalVerifyPaymentRequest, 
  UniversalVerifyPaymentResult, 
  BankAccountInstructions,
  BankTransferProof,
  UniversalPaymentStatus,
  CountryCode,
  CurrencyCode,
  PaymentMethodDescriptor,
  ProviderCapabilities
} from '../types';
import { COUNTRY_REGISTRY, getLocalizedPlanPrice } from '../country_currency_matrix';
import { billingEngine, PLANS_CATALOG } from '../../billing_engine';
import { logger } from '../../../analytics/logger';

interface BankTransferOrder {
  orderId: string;
  userId: string;
  planId: any;
  country: CountryCode;
  currency: CurrencyCode;
  amount: number;
  status: UniversalPaymentStatus;
  referenceCode: string;
  instructions: BankAccountInstructions;
  createdAt: string;
  expiresAt: string;
  proof?: BankTransferProof;
  verifiedAt?: string;
  reconciledBy?: string;
}

export class BankTransferAdapter implements PaymentProviderAdapter {
  public readonly id = 'bank_transfer_provider';
  public readonly name = 'LogEasy Authoritative Bank Transfer Engine';

  // Internal persistent registry of bank orders & proofs
  private orders: Map<string, BankTransferOrder> = new Map();
  private proofs: Map<string, BankTransferProof> = new Map();

  // Banking beneficiary details per currency
  private bankAccounts: Record<CurrencyCode, {
    beneficiaryName: string;
    bankName: string;
    accountNumber: string;
    iban?: string;
    routingOrSortCode: string;
    swiftBic: string;
    domesticRailName: string;
  }> = {
    USD: {
      beneficiaryName: 'LogEasy / Vinexsah Technologies Inc.',
      bankName: 'JPMorgan Chase Bank, N.A.',
      accountNumber: '8492049182',
      routingOrSortCode: '021000021', // ABA Routing
      swiftBic: 'CHASUS33',
      domesticRailName: 'Fedwire / ACH Direct Deposit',
    },
    EUR: {
      beneficiaryName: 'LogEasy / Vinexsah Europe B.V.',
      bankName: 'Deutsche Bank AG',
      accountNumber: 'DE89370400440532013000',
      iban: 'DE89 3704 0044 0532 0130 00',
      routingOrSortCode: '37040044',
      swiftBic: 'DEUTDEDDFXX',
      domesticRailName: 'SEPA Instant Credit Transfer',
    },
    GBP: {
      beneficiaryName: 'LogEasy UK Technologies Ltd.',
      bankName: 'Barclays Bank UK PLC',
      accountNumber: '73928104',
      iban: 'GB29 BUKB 2000 0073 9281 04',
      routingOrSortCode: '20-00-00',
      swiftBic: 'BUKBGB22',
      domesticRailName: 'UK Faster Payments Service (FPS)',
    },
    KES: {
      beneficiaryName: 'LogEasy East Africa Sanctuary',
      bankName: 'Equity Bank Kenya Ltd.',
      accountNumber: '0180293847561',
      routingOrSortCode: '68001', // Equity Swift / Branch
      swiftBic: 'EQBLKENA',
      domesticRailName: 'PesaLink / KEPSS National Wire',
    },
    NGN: {
      beneficiaryName: 'LogEasy West Africa Sanctuary',
      bankName: 'Zenith Bank PLC',
      accountNumber: '1018928374',
      routingOrSortCode: '057150013',
      swiftBic: 'ZEIBNGLA',
      domesticRailName: 'NIP Instant Bank Transfer',
    },
    GHS: {
      beneficiaryName: 'LogEasy Ghana Sanctuary',
      bankName: 'Stanbic Bank Ghana',
      accountNumber: '9040003928172',
      routingOrSortCode: '090101',
      swiftBic: 'SBICGHAC',
      domesticRailName: 'GhIPSS Instant Pay (GIP)',
    },
    ZAR: {
      beneficiaryName: 'LogEasy South Africa',
      bankName: 'First National Bank (FNB)',
      accountNumber: '62839201948',
      routingOrSortCode: '250655',
      swiftBic: 'FIRNZAJJ',
      domesticRailName: 'RTC Instant EFT',
    },
    CAD: {
      beneficiaryName: 'LogEasy Canada Inc.',
      bankName: 'Royal Bank of Canada (RBC)',
      accountNumber: '003-892-1829',
      routingOrSortCode: '00003-001',
      swiftBic: 'ROYCCAT2',
      domesticRailName: 'Interac e-Transfer / EFT Wire',
    },
    AUD: {
      beneficiaryName: 'LogEasy Australia Pty Ltd',
      bankName: 'Commonwealth Bank of Australia',
      accountNumber: '7382-9182',
      routingOrSortCode: '062-000', // BSB
      swiftBic: 'CTBAAU2S',
      domesticRailName: 'PayID / Osko Direct Credit',
    },
    INR: {
      beneficiaryName: 'LogEasy India Private Ltd',
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50200038928172',
      routingOrSortCode: 'HDFC0000123', // IFSC
      swiftBic: 'HDFCINBB',
      domesticRailName: 'IMPS / NEFT Direct Bank Transfer',
    },
  };

  public getProviderCapabilities(): ProviderCapabilities {
    return {
      supportsBankTransfer: true,
      supportsVisaMastercard: false,
      supportsMobileMoney: false,
      supportsWebhooks: false,
      supportsRefunds: true,
      supportsAutomaticReconciliation: false, // Requires authoritative proof & audit
    };
  }

  public getSupportedMethods(country: CountryCode, currency: CurrencyCode): PaymentMethodDescriptor[] {
    const config = COUNTRY_REGISTRY[country] || COUNTRY_REGISTRY.OTHER;
    return [{
      id: 'bank_transfer',
      name: 'Bank Transfer / Wire',
      description: `Direct transfer to LogEasy via ${config.domesticBankRail}.`,
      supportedRails: ['bank_transfer'],
      icon: 'building-2',
      badge: 'Official Bank Transfer',
    }];
  }

  public getSupportedCurrencies(): CurrencyCode[] {
    return Object.keys(this.bankAccounts) as CurrencyCode[];
  }

  // --------------------------------------------------------------------------
  // 1. CREATE BANK CHECKOUT & INSTRUCTIONS
  // --------------------------------------------------------------------------
  public async createCheckout(req: CreateUniversalCheckoutRequest): Promise<UniversalCheckoutResult> {
    const { userId, planId, country, currency, idempotencyKey } = req;
    
    if (!userId || !userId.trim()) {
      throw new Error('Authentication required: Valid userId must be specified for bank transfer.');
    }

    const plan = PLANS_CATALOG[planId];
    if (!plan) {
      throw new Error(`Invalid plan identifier: ${planId}`);
    }

    const priceInfo = getLocalizedPlanPrice(planId, currency);
    const amount = priceInfo.amount;

    // Generate unique order ID and reference code
    const orderId = `ord_bank_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const refSuffix = orderId.split('_')[2] || Math.random().toString(36).substring(2, 6).toUpperCase();
    const referenceCode = `LOGEASY-REF-${refSuffix.toUpperCase()}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 48); // 48 hours for bank wire

    const account = this.bankAccounts[currency] || this.bankAccounts.USD;
    const instructions: BankAccountInstructions = {
      beneficiaryName: account.beneficiaryName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      iban: account.iban,
      routingOrSortCode: account.routingOrSortCode,
      swiftBic: account.swiftBic,
      referenceCode,
      amount,
      currency,
      deadlineHours: 48,
      notes: `CRITICAL: You MUST include "${referenceCode}" in your transfer payment reference or description so our bank reconciliation system can match your account.`,
      domesticRailName: account.domesticRailName,
    };

    const order: BankTransferOrder = {
      orderId,
      userId,
      planId,
      country,
      currency,
      amount,
      status: 'PENDING',
      referenceCode,
      instructions,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.orders.set(orderId, order);

    // Also register session with core billing engine so ledger stays in sync
    billingEngine.initiateCheckout({
       orderId,
       userId,
       planId,
       amount,
       currency,
       provider: 'sandbox', // Provider independent fallback
       idempotencyKey: idempotencyKey || `idem_${orderId}`,
     });

    logger.info('BankTransferAdapter', `Created bank transfer order ${orderId} for user ${userId} (${priceInfo.formatted}) with reference ${referenceCode}`);

    return {
      orderId,
      userId,
      planId,
      amount,
      currency,
      country,
      method: 'bank_transfer',
      rail: 'bank_transfer',
      status: 'PENDING',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      idempotencyKey: idempotencyKey || orderId,
      bankInstructions: instructions,
    };
  }

  // --------------------------------------------------------------------------
  // 2. SUBMIT TRANSFER PROOF (Transitions from PENDING to UNDER_REVIEW)
  // --------------------------------------------------------------------------
  public async submitTransferProof(proof: Omit<BankTransferProof, 'submittedAt' | 'status'>): Promise<{
    success: boolean;
    orderId: string;
    status: UniversalPaymentStatus;
    message: string;
    proof: BankTransferProof;
  }> {
    const { orderId, userId, senderName, senderBank, transferReference } = proof;
    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error(`Bank order ${orderId} not found.`);
    }

    if (order.userId !== userId) {
      throw new Error('Access denied: Bank order does not belong to this user.');
    }

    if (!senderName || !senderName.trim()) {
      throw new Error('Sender account name is required for bank transfer reconciliation.');
    }

    if (!transferReference || !transferReference.trim()) {
      throw new Error('Bank transaction reference number is required.');
    }

    const fullProof: BankTransferProof = {
      ...proof,
      submittedAt: new Date().toISOString(),
      status: 'PENDING_REVIEW',
    };

    order.status = 'UNDER_REVIEW';
    order.proof = fullProof;
    this.orders.set(orderId, order);
    this.proofs.set(orderId, fullProof);

    logger.info('BankTransferAdapter', `User ${userId} submitted transfer proof for order ${orderId} (Ref: ${transferReference}). State: UNDER_REVIEW`);

    return {
      success: true,
      orderId,
      status: 'UNDER_REVIEW',
      message: 'Bank transfer details received. Your order is under reconciliation review. Entitlements will activate once bank confirmation is verified.',
      proof: fullProof,
    };
  }

  // --------------------------------------------------------------------------
  // 3. AUTHORITATIVE RECONCILIATION & ENTITLEMENT ACTIVATION
  // --------------------------------------------------------------------------
  public async reconcileTransfer(params: {
    orderId: string;
    adminId: string;
    decision: 'APPROVE' | 'REJECT';
    reconciliationNotes?: string;
  }): Promise<{
    success: boolean;
    orderId: string;
    status: UniversalPaymentStatus;
    transaction?: any;
    entitlement?: any;
    message: string;
  }> {
    const { orderId, adminId, decision, reconciliationNotes } = params;
    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error(`Bank transfer order ${orderId} not found.`);
    }

    if (decision === 'REJECT') {
      order.status = 'FAILED';
      if (order.proof) {
        order.proof.status = 'REJECTED';
        order.proof.reconciledBy = adminId;
        order.proof.reconciledAt = new Date().toISOString();
        order.proof.reconciliationNotes = reconciliationNotes || 'Bank reference could not be verified in ledger.';
      }
      this.orders.set(orderId, order);
      logger.warn('BankTransferAdapter', `Admin ${adminId} REJECTED bank transfer ${orderId}: ${reconciliationNotes}`);
      return {
        success: false,
        orderId,
        status: 'FAILED',
        message: `Bank transfer rejected: ${reconciliationNotes || 'Unable to confirm receipt of funds.'}`,
      };
    }

    // APPROVE & ACTIVATE
    order.status = 'VERIFIED';
    order.verifiedAt = new Date().toISOString();
    order.reconciledBy = adminId;
    if (order.proof) {
      order.proof.status = 'VERIFIED';
      order.proof.reconciledBy = adminId;
      order.proof.reconciledAt = order.verifiedAt;
      order.proof.reconciliationNotes = reconciliationNotes || 'Verified against bank settlement statement.';
    }
    this.orders.set(orderId, order);

    // Call BillingEngine to authoritatively verify and activate entitlement
    const billingResult = await billingEngine.verifyPayment({
      orderId: order.orderId,
      userId: order.userId,
      paymentToken: `tok_bank_wire_${order.referenceCode}`,
      provider: 'sandbox',
    });

    logger.info('BankTransferAdapter', `Authoritative bank reconciliation verified by ${adminId} for order ${orderId}. Entitlement activated.`);

    return {
      success: true,
      orderId,
      status: 'VERIFIED',
      transaction: billingResult.transaction,
      entitlement: billingResult.entitlement,
      message: `Bank transfer verified! Entitlement for plan ${order.planId} activated successfully.`,
    };
  }

  // --------------------------------------------------------------------------
  // 4. VERIFY PAYMENT (Interface implementation)
  // --------------------------------------------------------------------------
  public async verifyPayment(req: UniversalVerifyPaymentRequest): Promise<UniversalVerifyPaymentResult> {
    const { orderId, userId, bankProof } = req;
    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error(`Bank transfer order ${orderId} not found.`);
    }

    if (order.userId !== userId) {
      throw new Error('Access denied: Bank order does not belong to this user.');
    }

    // If order has already been verified by admin
    if (order.status === 'VERIFIED') {
      const billingTx = billingEngine.getUserTransactions(userId).find(t => t.orderId === orderId);
      const ent = billingEngine.getUserEntitlement(userId);
      return {
        success: true,
        orderId,
        transactionId: billingTx?.id || `tx_bank_${orderId}`,
        receiptId: billingTx?.receiptId || `rcpt_${orderId}`,
        planId: order.planId,
        status: 'VERIFIED',
        amount: order.amount,
        currency: order.currency,
        method: 'bank_transfer',
        rail: 'bank_transfer',
        message: 'Bank transfer verified and account entitlements active.',
        verifiedAt: order.verifiedAt || new Date().toISOString(),
        invoiceUrl: billingTx?.invoiceUrl || `/api/billing/receipt/rcpt_${orderId}`,
        entitlement: ent,
      };
    }

    // If proof was provided in verify call: submit it and enforce UNDER_REVIEW
    if (bankProof) {
      await this.submitTransferProof(bankProof);
      throw new Error(
        'Bank transfer proof submitted and placed under authoritative reconciliation review. Account will activate upon admin or bank confirmation.'
      );
    }

    throw new Error(
      `Bank transfer order is in ${order.status} state. Awaiting transfer proof and settlement reconciliation.`
    );
  }

  public async getPaymentStatus(orderId: string): Promise<UniversalPaymentStatus> {
    const order = this.orders.get(orderId);
    return order ? order.status : 'FAILED';
  }

  public async refundPayment(transactionId: string, reason: string): Promise<{ success: boolean; transactionId: string }> {
    billingEngine.refundTransaction('admin_bank_reconciliation', transactionId, reason);
    return { success: true, transactionId };
  }

  public async cancelPayment(orderId: string): Promise<{ success: boolean; orderId: string }> {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = 'CANCELLED';
      this.orders.set(orderId, order);
    }
    return { success: true, orderId };
  }

  public async verifyWebhook(_payload: any, _signature?: string): Promise<{ success: boolean; eventId: string; processed: boolean }> {
    return { success: true, eventId: 'bank_manual', processed: false };
  }

  // Helper for admin inspection
  public getPendingReconciliations(): BankTransferOrder[] {
    return Array.from(this.orders.values()).filter(o => o.status === 'UNDER_REVIEW' || o.status === 'PENDING');
  }

  public getOrder(orderId: string): BankTransferOrder | null {
    return this.orders.get(orderId) || null;
  }
}

export const bankTransferAdapter = new BankTransferAdapter();
