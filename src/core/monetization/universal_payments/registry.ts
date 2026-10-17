/**
 * LogEasy Universal Payment Provider Registry
 * Decouples core billing from concrete payment rails and providers.
 * Dynamically resolves adapters based on method, country, and currency.
 */

import { 
  PaymentProviderAdapter, 
  PaymentMethodId, 
  CountryCode, 
  CurrencyCode,
  PaymentMethodDescriptor,
  CreateUniversalCheckoutRequest,
  UniversalCheckoutResult,
  UniversalVerifyPaymentRequest,
  UniversalVerifyPaymentResult,
  UniversalPaymentStatus
} from './types';
import { bankTransferAdapter } from './adapters/bank_transfer_adapter';
import { cardPaymentAdapter } from './adapters/card_payment_adapter';
import { mobileMoneyAdapter } from './adapters/mobile_money_adapter';
import { getAvailableMethodsForCountry } from './country_currency_matrix';
import { logger } from '../../analytics/logger';

export class PaymentProviderRegistry {
  private static instance: PaymentProviderRegistry;

  private adapters: Map<string, PaymentProviderAdapter> = new Map();
  private methodRouting: Map<PaymentMethodId, string> = new Map();

  private constructor() {
    this.registerDefaultAdapters();
  }

  public static getInstance(): PaymentProviderRegistry {
    if (!PaymentProviderRegistry.instance) {
      PaymentProviderRegistry.instance = new PaymentProviderRegistry();
    }
    return PaymentProviderRegistry.instance;
  }

  private registerDefaultAdapters() {
    this.registerAdapter(bankTransferAdapter);
    this.registerAdapter(cardPaymentAdapter);
    this.registerAdapter(mobileMoneyAdapter);

    // Default method to adapter routing
    this.methodRouting.set('bank_transfer', bankTransferAdapter.id);
    this.methodRouting.set('card', cardPaymentAdapter.id);
    this.methodRouting.set('mobile_money', mobileMoneyAdapter.id);
  }

  public registerAdapter(adapter: PaymentProviderAdapter) {
    this.adapters.set(adapter.id, adapter);
    logger.info('PaymentProviderRegistry', `Registered payment provider adapter: ${adapter.name} (${adapter.id})`);
  }

  public getAdapter(adapterId: string): PaymentProviderAdapter | null {
    return this.adapters.get(adapterId) || null;
  }

  public getAdapterForMethod(method: PaymentMethodId): PaymentProviderAdapter {
    const adapterId = this.methodRouting.get(method);
    if (adapterId && this.adapters.has(adapterId)) {
      return this.adapters.get(adapterId)!;
    }

    // Fallbacks
    if (method === 'card') return cardPaymentAdapter;
    if (method === 'bank_transfer') return bankTransferAdapter;
    if (method === 'mobile_money') return mobileMoneyAdapter;

    throw new Error(`No payment provider adapter registered for method: ${method}`);
  }

  public setMethodRoute(method: PaymentMethodId, adapterId: string) {
    if (!this.adapters.has(adapterId)) {
      throw new Error(`Cannot route to unregistered adapter ID: ${adapterId}`);
    }
    this.methodRouting.set(method, adapterId);
  }

  // --------------------------------------------------------------------------
  // HIGH LEVEL ORCHESTRATION
  // --------------------------------------------------------------------------
  public async createCheckout(req: CreateUniversalCheckoutRequest): Promise<UniversalCheckoutResult> {
    const adapter = this.getAdapterForMethod(req.method);
    return adapter.createCheckout(req);
  }

  public async verifyPayment(req: UniversalVerifyPaymentRequest): Promise<UniversalVerifyPaymentResult> {
    const adapter = this.getAdapterForMethod(req.method);
    return adapter.verifyPayment(req);
  }

  public async getPaymentStatus(method: PaymentMethodId, orderId: string): Promise<UniversalPaymentStatus> {
    const adapter = this.getAdapterForMethod(method);
    return adapter.getPaymentStatus(orderId);
  }

  public async refundPayment(method: PaymentMethodId, transactionId: string, reason: string) {
    const adapter = this.getAdapterForMethod(method);
    return adapter.refundPayment(transactionId, reason);
  }

  public getAvailableMethods(country: CountryCode, currency: CurrencyCode): PaymentMethodDescriptor[] {
    return getAvailableMethodsForCountry(country, currency);
  }

  public getAllRegisteredAdapters(): { id: string; name: string; capabilities: any }[] {
    return Array.from(this.adapters.values()).map(a => ({
      id: a.id,
      name: a.name,
      capabilities: a.getProviderCapabilities(),
    }));
  }
}

export const paymentProviderRegistry = PaymentProviderRegistry.getInstance();
