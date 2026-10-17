import { describe, test, expect, beforeEach } from 'vitest';
import { universalPaymentService } from '../universal_payments/universal_payment_service';
import { paymentProviderRegistry } from '../universal_payments/registry';
import { bankTransferAdapter } from '../universal_payments/adapters/bank_transfer_adapter';
import { cardPaymentAdapter, detectCardBrand, validateCardLuhn } from '../universal_payments/adapters/card_payment_adapter';
import { mobileMoneyAdapter, validateMobileMoneyPhone } from '../universal_payments/adapters/mobile_money_adapter';
import { 
  COUNTRY_REGISTRY, 
  LOCALIZED_PRICING, 
  getLocalizedPlanPrice, 
  formatCurrencyAmount 
} from '../universal_payments/country_currency_matrix';
import { billingEngine } from '../billing_engine';
import { subscriptionService } from '../subscription_service';

describe('LogEasy Phase 11 — Universal Payments (Bank + Visa/Mastercard + Mobile Money)', () => {
  const testUserId = 'user_universal_pay_test_001';

  beforeEach(() => {
    subscriptionService.downgradeToFree(testUserId);
  });

  // --------------------------------------------------------------------------
  // 1. DYNAMIC COUNTRY & CURRENCY MATRIX RESOLUTION
  // --------------------------------------------------------------------------
  describe('Dynamic Country & Currency Resolution Matrix', () => {
    test('Resolves available methods accurately by country', () => {
      // US: Card and Bank ACH
      const usMethods = universalPaymentService.getAvailableMethods('US', 'USD');
      expect(usMethods.some(m => m.id === 'card')).toBe(true);
      expect(usMethods.some(m => m.id === 'bank_transfer')).toBe(true);
      expect(usMethods.some(m => m.id === 'mobile_money')).toBe(false);

      // Kenya: Mobile Money (M-Pesa), Card, and Bank Wire
      const keMethods = universalPaymentService.getAvailableMethods('KE', 'KES');
      expect(keMethods.some(m => m.id === 'mobile_money')).toBe(true);
      expect(keMethods.some(m => m.id === 'card')).toBe(true);
      expect(keMethods.some(m => m.id === 'bank_transfer')).toBe(true);

      // Nigeria: Bank Transfer (NIP), Card, and Mobile Money
      const ngMethods = universalPaymentService.getAvailableMethods('NG', 'NGN');
      expect(ngMethods.some(m => m.id === 'bank_transfer')).toBe(true);
      expect(ngMethods.some(m => m.id === 'card')).toBe(true);

      // UK: Card and Faster Payments
      const gbMethods = universalPaymentService.getAvailableMethods('GB', 'GBP');
      expect(gbMethods.some(m => m.id === 'card')).toBe(true);
      expect(gbMethods.some(m => m.id === 'bank_transfer')).toBe(true);
    });

    test('Provides purchasing-power adjusted localized pricing for all 10 currencies', () => {
      const usdMonthly = getLocalizedPlanPrice('premium_monthly', 'USD');
      expect(usdMonthly.amount).toBe(7.99);
      expect(usdMonthly.formatted).toBe('$7.99');

      const kesMonthly = getLocalizedPlanPrice('premium_monthly', 'KES');
      expect(kesMonthly.amount).toBe(1050);
      expect(kesMonthly.formatted).toContain('1,050');

      const ngnAnnual = getLocalizedPlanPrice('premium_annual', 'NGN');
      expect(ngnAnnual.amount).toBe(85000);
      expect(ngnAnnual.formatted).toContain('85,000');

      const eurAnnual = getLocalizedPlanPrice('premium_annual', 'EUR');
      expect(eurAnnual.amount).toBe(54.99);
      expect(eurAnnual.formatted).toBe('€54.99');

      const gbpLifetime = getLocalizedPlanPrice('lifetime', 'GBP');
      expect(gbpLifetime.amount).toBe(79.00);
      expect(gbpLifetime.formatted).toBe('£79.00');

      // Free plan is zero across all currencies
      expect(getLocalizedPlanPrice('free', 'USD').amount).toBe(0);
      expect(getLocalizedPlanPrice('free', 'KES').amount).toBe(0);
      expect(getLocalizedPlanPrice('free', 'NGN').amount).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. FIRST-CLASS BANK TRANSFER ARCHITECTURE & RECONCILIATION
  // --------------------------------------------------------------------------
  describe('Bank Transfer Lifecycle & Reconciliation', () => {
    test('Creates bank wire checkout with unique reference and domestic wire details', async () => {
      const order = await universalPaymentService.initiateCheckout({
        userId: testUserId,
        planId: 'premium_annual',
        country: 'US',
        currency: 'USD',
        method: 'bank_transfer',
        rail: 'bank_transfer',
      });

      expect(order.orderId).toContain('ord_bank_');
      expect(order.status).toBe('PENDING');
      expect(order.bankInstructions).toBeDefined();
      expect(order.bankInstructions?.referenceCode).toMatch(/^LOGEASY-REF-[A-Z0-9]+$/);
      expect(order.bankInstructions?.beneficiaryName).toContain('LogEasy');
      expect(order.bankInstructions?.domesticRailName).toContain('Fedwire');
      expect(order.amount).toBe(59.99);
    });

    test('Submitting transfer proof sets status to UNDER_REVIEW without activating entitlement', async () => {
      const order = await universalPaymentService.initiateCheckout({
        userId: testUserId,
        planId: 'premium_monthly',
        country: 'DE',
        currency: 'EUR',
        method: 'bank_transfer',
        rail: 'bank_transfer',
      });

      // User submits proof
      const proofRes = await universalPaymentService.submitBankProof({
        orderId: order.orderId,
        userId: testUserId,
        senderName: 'Hans Schmidt',
        senderBank: 'Deutsche Bank',
        transferReference: 'SEPA-82910482',
        transferDate: new Date().toISOString(),
        amount: order.amount,
        currency: 'EUR',
      });

      expect(proofRes.status).toBe('UNDER_REVIEW');
      expect(proofRes.proof.status).toBe('PENDING_REVIEW');

      // Crucial Security Test: Entitlement MUST NOT be active merely because user clicked "I have paid"
      const sub = subscriptionService.getSubscription(testUserId);
      expect(sub.status).not.toBe('active');
    });

    test('Authoritative admin reconciliation activates entitlement with verified transaction', async () => {
      const order = await universalPaymentService.initiateCheckout({
        userId: testUserId,
        planId: 'premium_annual',
        country: 'GB',
        currency: 'GBP',
        method: 'bank_transfer',
        rail: 'bank_transfer',
      });

      await universalPaymentService.submitBankProof({
        orderId: order.orderId,
        userId: testUserId,
        senderName: 'Eleanor Sterling',
        senderBank: 'Barclays UK',
        transferReference: 'FPS-4829104',
        transferDate: new Date().toISOString(),
        amount: order.amount,
        currency: 'GBP',
      });

      // Admin reviews statement and APPROVES
      const reconcileRes = await universalPaymentService.reconcileBankTransfer({
        orderId: order.orderId,
        adminId: 'auditor_alex',
        decision: 'APPROVE',
        reconciliationNotes: 'Matched Barclays wire settlement transcript.',
      });

      expect(reconcileRes.success).toBe(true);
      expect(reconcileRes.status).toBe('VERIFIED');
      expect(reconcileRes.transaction).toBeDefined();

      // Entitlement is now activated
      const sub = subscriptionService.getSubscription(testUserId);
      expect(sub.plan).toBe('premium_annual');
      expect(sub.status).toBe('active');
    });

    test('Admin rejection sets status to FAILED and does not activate plan', async () => {
      const rejectUser = `user_reject_${Date.now()}`;
      const order = await universalPaymentService.initiateCheckout({
        userId: rejectUser,
        planId: 'premium_monthly',
        country: 'US',
        currency: 'USD',
        method: 'bank_transfer',
        rail: 'bank_transfer',
      });

      await universalPaymentService.submitBankProof({
        orderId: order.orderId,
        userId: rejectUser,
        senderName: 'Fraud Suspect',
        senderBank: 'Unknown Bank',
        transferReference: 'FAKE-9999',
        transferDate: new Date().toISOString(),
        amount: order.amount,
        currency: 'USD',
      });

      const reconcileRes = await universalPaymentService.reconcileBankTransfer({
        orderId: order.orderId,
        adminId: 'auditor_alex',
        decision: 'REJECT',
        reconciliationNotes: 'Wire reference not found in bank statement.',
      });

      expect(reconcileRes.success).toBe(false);
      expect(reconcileRes.status).toBe('FAILED');

      const sub = subscriptionService.getSubscription(rejectUser);
      expect(sub.status).not.toBe('active');
    });
  });

  // --------------------------------------------------------------------------
  // 3. VISA & MASTERCARD UNIVERSAL CARD ADAPTER
  // --------------------------------------------------------------------------
  describe('Visa & Mastercard Card Payment Adapter', () => {
    test('Accurately detects Visa, Mastercard, and Amex brands', () => {
      expect(detectCardBrand('4242424242424242')).toBe('visa');
      expect(detectCardBrand('4000123456789010')).toBe('visa');
      expect(detectCardBrand('5100123456789010')).toBe('mastercard');
      expect(detectCardBrand('5500000000000004')).toBe('mastercard');
      expect(detectCardBrand('2221000000000001')).toBe('mastercard');
      expect(detectCardBrand('378282246310005')).toBe('amex');
      expect(detectCardBrand('6011111111111117')).toBe('discover');
      expect(detectCardBrand('9999999999999999')).toBe('unknown');
    });

    test('Validates card number with Luhn algorithm checksum', () => {
      expect(validateCardLuhn('49927398716')).toBe(true);
      expect(validateCardLuhn('49927398717')).toBe(false);
      expect(validateCardLuhn('1234')).toBe(false);
    });

    test('Approves valid Visa & Mastercard payments and activates entitlements', async () => {
      const order = await universalPaymentService.initiateCheckout({
        userId: testUserId,
        planId: 'premium_monthly',
        country: 'US',
        currency: 'USD',
        method: 'card',
        rail: 'card_visa',
      });

      const verifyRes = await universalPaymentService.verifyPayment({
        orderId: order.orderId,
        userId: testUserId,
        method: 'card',
        rail: 'card_visa',
        paymentToken: 'tok_visa_approved_4242',
        cardData: {
          token: 'tok_visa_approved_4242',
          brand: 'visa',
          last4: '4242',
          expMonth: '12',
          expYear: '28',
          cardholderName: 'Alex Vance',
          threeDSecureStatus: 'PASSED',
        },
      });

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.status).toBe('VERIFIED');
      expect(verifyRes.transactionId).toBeDefined();
      expect(verifyRes.receiptId).toBeDefined();

      const sub = subscriptionService.getSubscription(testUserId);
      expect(sub.plan).toBe('premium_monthly');
      expect(sub.status).toBe('active');
    });

    test('Rejects declined tokens with appropriate card error messages', async () => {
      const order = await universalPaymentService.initiateCheckout({
        userId: testUserId,
        planId: 'premium_monthly',
        country: 'US',
        currency: 'USD',
        method: 'card',
        rail: 'card_visa',
      });

      await expect(
        universalPaymentService.verifyPayment({
          orderId: order.orderId,
          userId: testUserId,
          method: 'card',
          rail: 'card_visa',
          paymentToken: 'tok_declined',
        })
      ).rejects.toThrow('Card declined: The issuing bank rejected the transaction.');

      await expect(
        universalPaymentService.verifyPayment({
          orderId: order.orderId,
          userId: testUserId,
          method: 'card',
          rail: 'card_visa',
          paymentToken: 'tok_insufficient_funds',
        })
      ).rejects.toThrow('Insufficient funds');
    });
  });

  // --------------------------------------------------------------------------
  // 4. MOBILE MONEY UNIVERSAL ADAPTER
  // --------------------------------------------------------------------------
  describe('Mobile Money Adapter & STK Push Workflows', () => {
    test('Validates mobile phone number format for regional carriers', () => {
      // Kenya M-Pesa (+254 or 07...)
      expect(validateMobileMoneyPhone('+254712345678', 'mpesa')).toBe(true);
      expect(validateMobileMoneyPhone('0712345678', 'mpesa')).toBe(true);
      expect(validateMobileMoneyPhone('0112345678', 'mpesa')).toBe(true);
      expect(validateMobileMoneyPhone('9999', 'mpesa')).toBe(false);

      // Ghana MTN MoMo (+233 or 02...)
      expect(validateMobileMoneyPhone('+233241234567', 'mtn_momo')).toBe(true);
      expect(validateMobileMoneyPhone('0241234567', 'mtn_momo')).toBe(true);
      expect(validateMobileMoneyPhone('123', 'mtn_momo')).toBe(false);
    });

    test('Dispatches STK Push prompt and transitions through AWAITING_PIN to VERIFIED', async () => {
      const order = await universalPaymentService.initiateCheckout({
        userId: testUserId,
        planId: 'premium_monthly',
        country: 'KE',
        currency: 'KES',
        method: 'mobile_money',
        rail: 'mobile_money',
      });

      // 1. Send STK Push prompt
      const pushRes = await universalPaymentService.sendMobileMoneySTKPush({
        orderId: order.orderId,
        userId: testUserId,
        phoneNumber: '+254712345678',
        carrier: 'mpesa',
        amount: order.amount,
        currency: 'KES',
      });

      expect(pushRes.status).toBe('AWAITING_PIN');
      expect(pushRes.customerPromptMessage).toContain('M-PESA PIN');

      // 2. Poll status while awaiting PIN
      const pollRes = await universalPaymentService.pollMobileMoney(order.orderId);
      expect(pollRes.status).toBe('AWAITING_PIN');

      // 3. Customer approves PIN on handset -> network confirms
      const verifyRes = await universalPaymentService.verifyPayment({
        orderId: order.orderId,
        userId: testUserId,
        method: 'mobile_money',
        rail: 'mobile_money',
        paymentToken: 'tok_momo_pin_approved_8291',
      });

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.status).toBe('VERIFIED');
      expect(verifyRes.currency).toBe('KES');

      const sub = subscriptionService.getSubscription(testUserId);
      expect(sub.status).toBe('active');
    });

    test('Fails on cancelled or declined handset PIN', async () => {
      const order = await universalPaymentService.initiateCheckout({
        userId: testUserId,
        planId: 'premium_monthly',
        country: 'KE',
        currency: 'KES',
        method: 'mobile_money',
        rail: 'mobile_money',
      });

      await universalPaymentService.sendMobileMoneySTKPush({
        orderId: order.orderId,
        userId: testUserId,
        phoneNumber: '0712345678',
        carrier: 'mpesa',
        amount: order.amount,
        currency: 'KES',
      });

      await expect(
        universalPaymentService.verifyPayment({
          orderId: order.orderId,
          userId: testUserId,
          method: 'mobile_money',
          rail: 'mobile_money',
          paymentToken: 'tok_pin_declined',
        })
      ).rejects.toThrow('PIN entry was cancelled or timed out');
    });
  });

  // --------------------------------------------------------------------------
  // 5. SECURITY & ACCESS CONTROL
  // --------------------------------------------------------------------------
  describe('Security & Access Control', () => {
    test('Prevents user A from verifying or submitting proof for user B order', async () => {
      const order = await universalPaymentService.initiateCheckout({
        userId: 'victim_user_1',
        planId: 'premium_monthly',
        country: 'US',
        currency: 'USD',
        method: 'card',
        rail: 'card_visa',
      });

      await expect(
        universalPaymentService.verifyPayment({
          orderId: order.orderId,
          userId: 'attacker_user_2',
          method: 'card',
          rail: 'card_visa',
          paymentToken: 'tok_visa_valid',
        })
      ).rejects.toThrow('Access denied');
    });

    test('Simulated instant settlement functions reliably in demo/sandbox environment', async () => {
      const demoOrder = await universalPaymentService.initiateCheckout({
        userId: 'demo_settle_user',
        planId: 'lifetime',
        country: 'DE',
        currency: 'EUR',
        method: 'bank_transfer',
        rail: 'bank_transfer',
      });

      const result = await universalPaymentService.simulateInstantSettlement(
        demoOrder.orderId,
        'demo_settle_user',
        'bank_transfer'
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('VERIFIED');

      const sub = subscriptionService.getSubscription('demo_settle_user');
      expect(sub.plan).toBe('lifetime');
      expect(sub.status).toBe('active');
    });
  });
});
