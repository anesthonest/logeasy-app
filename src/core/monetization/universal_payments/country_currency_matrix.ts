/**
 * LogEasy Country & Currency Dynamic Resolution Matrix
 * Maps countries to supported payment methods, local currencies,
 * carrier networks, and localized pricing tiers.
 */

import { 
  CountryCode, 
  CurrencyCode, 
  CountryConfig, 
  PaymentMethodDescriptor,
  LocalizedPlanPrice,
  MobileMoneyCarrierInfo 
} from './types';
import { SubscriptionPlanId } from '../billing_types';

export const SUPPORTED_CARRIERS: Record<string, MobileMoneyCarrierInfo> = {
  mpesa_ke: {
    id: 'mpesa',
    name: 'M-Pesa (Safaricom)',
    countryCode: 'KE',
    dialCode: '+254',
    currency: 'KES',
    logoBadge: '🟢 M-PESA',
    placeholder: '0712 345 678',
  },
  airtel_ke: {
    id: 'airtel_money',
    name: 'Airtel Money',
    countryCode: 'KE',
    dialCode: '+254',
    currency: 'KES',
    logoBadge: '🔴 AIRTEL',
    placeholder: '0733 123 456',
  },
  mtn_gh: {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    countryCode: 'GH',
    dialCode: '+233',
    currency: 'GHS',
    logoBadge: '🟡 MTN MoMo',
    placeholder: '024 123 4567',
  },
  vodafone_gh: {
    id: 'vodafone_cash',
    name: 'Telecel / Vodafone Cash',
    countryCode: 'GH',
    dialCode: '+233',
    currency: 'GHS',
    logoBadge: '🔴 VODAFONE',
    placeholder: '020 123 4567',
  },
  mtn_ng: {
    id: 'mtn_momo',
    name: 'MoMo PSB (MTN)',
    countryCode: 'NG',
    dialCode: '+234',
    currency: 'NGN',
    logoBadge: '🟡 MOMO PSB',
    placeholder: '0803 123 4567',
  },
  airtel_ng: {
    id: 'airtel_money',
    name: 'Smartcash PSB (Airtel)',
    countryCode: 'NG',
    dialCode: '+234',
    currency: 'NGN',
    logoBadge: '🔴 SMARTCASH',
    placeholder: '0802 123 4567',
  },
};

export const COUNTRY_REGISTRY: Record<CountryCode, CountryConfig> = {
  US: {
    code: 'US',
    name: 'United States',
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_visa',
    domesticBankRail: 'ACH / Fedwire Direct Deposit',
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    defaultCurrency: 'GBP',
    supportedCurrencies: ['GBP', 'EUR', 'USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_visa',
    domesticBankRail: 'UK Faster Payments / BACS',
  },
  DE: {
    code: 'DE',
    name: 'Germany (European Union)',
    defaultCurrency: 'EUR',
    supportedCurrencies: ['EUR', 'USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_mastercard',
    domesticBankRail: 'SEPA Credit Transfer (Instant)',
  },
  FR: {
    code: 'FR',
    name: 'France (European Union)',
    defaultCurrency: 'EUR',
    supportedCurrencies: ['EUR', 'USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_visa',
    domesticBankRail: 'SEPA Credit Transfer',
  },
  NL: {
    code: 'NL',
    name: 'Netherlands',
    defaultCurrency: 'EUR',
    supportedCurrencies: ['EUR', 'USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_mastercard',
    domesticBankRail: 'SEPA / iDEAL Bank Wire',
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    defaultCurrency: 'EUR',
    supportedCurrencies: ['EUR', 'USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_visa',
    domesticBankRail: 'SEPA Credit Transfer',
  },
  IT: {
    code: 'IT',
    name: 'Italy',
    defaultCurrency: 'EUR',
    supportedCurrencies: ['EUR', 'USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_mastercard',
    domesticBankRail: 'SEPA Bonifico Bancario',
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    defaultCurrency: 'KES',
    supportedCurrencies: ['KES', 'USD'],
    supportedMethods: ['mobile_money', 'card', 'bank_transfer', 'license_key'],
    defaultRail: 'mobile_money',
    carriers: [SUPPORTED_CARRIERS.mpesa_ke, SUPPORTED_CARRIERS.airtel_ke],
    domesticBankRail: 'PesaLink / KEPSS Interbank',
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    defaultCurrency: 'NGN',
    supportedCurrencies: ['NGN', 'USD'],
    supportedMethods: ['bank_transfer', 'card', 'mobile_money', 'license_key'],
    defaultRail: 'bank_transfer',
    carriers: [SUPPORTED_CARRIERS.mtn_ng, SUPPORTED_CARRIERS.airtel_ng],
    domesticBankRail: 'NIP Direct Bank Transfer (Instant)',
  },
  GH: {
    code: 'GH',
    name: 'Ghana',
    defaultCurrency: 'GHS',
    supportedCurrencies: ['GHS', 'USD'],
    supportedMethods: ['mobile_money', 'card', 'bank_transfer', 'license_key'],
    defaultRail: 'mobile_money',
    carriers: [SUPPORTED_CARRIERS.mtn_gh, SUPPORTED_CARRIERS.vodafone_gh],
    domesticBankRail: 'GhIPSS Instant Pay (GIP)',
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    defaultCurrency: 'ZAR',
    supportedCurrencies: ['ZAR', 'USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_visa',
    domesticBankRail: 'RTC Instant EFT',
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    defaultCurrency: 'CAD',
    supportedCurrencies: ['CAD', 'USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_visa',
    domesticBankRail: 'Interac e-Transfer / EFT',
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    defaultCurrency: 'AUD',
    supportedCurrencies: ['AUD', 'USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_visa',
    domesticBankRail: 'PayID / Osko Bank Transfer',
  },
  IN: {
    code: 'IN',
    name: 'India',
    defaultCurrency: 'INR',
    supportedCurrencies: ['INR', 'USD'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_mastercard',
    domesticBankRail: 'IMPS / NEFT / UPI Bank Transfer',
  },
  OTHER: {
    code: 'OTHER',
    name: 'International / Other Region',
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    supportedMethods: ['card', 'bank_transfer', 'license_key'],
    defaultRail: 'card_visa',
    domesticBankRail: 'International SWIFT Wire Transfer',
  },
};

/**
 * Localized Plan Pricing by Currency
 * Transparent, fair purchasing-power adjusted pricing
 */
export const LOCALIZED_PRICING: Record<SubscriptionPlanId, Record<CurrencyCode, number>> = {
  free: {
    USD: 0,
    EUR: 0,
    GBP: 0,
    KES: 0,
    NGN: 0,
    GHS: 0,
    ZAR: 0,
    CAD: 0,
    AUD: 0,
    INR: 0,
  },
  premium_monthly: {
    USD: 7.99,
    EUR: 7.49,
    GBP: 6.49,
    KES: 1050,
    NGN: 11500,
    GHS: 110,
    ZAR: 145,
    CAD: 10.99,
    AUD: 11.99,
    INR: 649,
  },
  premium_annual: {
    USD: 59.99,
    EUR: 54.99,
    GBP: 47.99,
    KES: 7800,
    NGN: 85000,
    GHS: 820,
    ZAR: 1090,
    CAD: 79.99,
    AUD: 89.99,
    INR: 4899,
  },
  lifetime: {
    USD: 99.00,
    EUR: 92.00,
    GBP: 79.00,
    KES: 13000,
    NGN: 140000,
    GHS: 1350,
    ZAR: 1800,
    CAD: 135.00,
    AUD: 149.00,
    INR: 8199,
  },
  family: {
    USD: 12.99,
    EUR: 11.99,
    GBP: 10.49,
    KES: 1700,
    NGN: 18500,
    GHS: 180,
    ZAR: 235,
    CAD: 17.99,
    AUD: 19.99,
    INR: 1049,
  },
  student: {
    USD: 4.99,
    EUR: 4.49,
    GBP: 3.99,
    KES: 650,
    NGN: 7000,
    GHS: 65,
    ZAR: 90,
    CAD: 6.99,
    AUD: 7.49,
    INR: 399,
  },
  gift: {
    USD: 0,
    EUR: 0,
    GBP: 0,
    KES: 0,
    NGN: 0,
    GHS: 0,
    ZAR: 0,
    CAD: 0,
    AUD: 0,
    INR: 0,
  },
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  KES: 'KSh ',
  NGN: '₦',
  GHS: 'GH₵ ',
  ZAR: 'R ',
  CAD: 'CA$',
  AUD: 'AU$',
  INR: '₹',
};

export function formatCurrencyAmount(amount: number, currency: CurrencyCode): string {
  const sym = CURRENCY_SYMBOLS[currency] || `${currency} `;
  if (currency === 'KES' || currency === 'NGN' || currency === 'GHS' || currency === 'ZAR' || currency === 'INR') {
    return `${sym}${amount.toLocaleString()}`;
  }
  return `${sym}${amount.toFixed(2)}`;
}

export function getLocalizedPlanPrice(planId: SubscriptionPlanId, currency: CurrencyCode): LocalizedPlanPrice {
  const amount = LOCALIZED_PRICING[planId]?.[currency] ?? LOCALIZED_PRICING[planId]?.USD ?? 0;
  return {
    planId,
    currency,
    amount,
    formatted: formatCurrencyAmount(amount, currency),
  };
}

export function getAvailableMethodsForCountry(
  countryCode: CountryCode, 
  currency: CurrencyCode
): PaymentMethodDescriptor[] {
  const country = COUNTRY_REGISTRY[countryCode] || COUNTRY_REGISTRY.OTHER;
  const descriptors: PaymentMethodDescriptor[] = [];

  // Card (Visa/Mastercard)
  if (country.supportedMethods.includes('card')) {
    descriptors.push({
      id: 'card',
      name: 'Credit or Debit Card',
      description: 'Instant activation via Visa, Mastercard, and international credit/debit cards.',
      supportedRails: ['card_visa', 'card_mastercard'],
      icon: 'credit-card',
      badge: 'Visa / Mastercard',
      isPopular: countryCode === 'US' || countryCode === 'GB' || countryCode === 'CA' || countryCode === 'AU',
    });
  }

  // Mobile Money (where supported)
  if (country.supportedMethods.includes('mobile_money')) {
    const carrierNames = (country.carriers || []).map(c => c.name.split(' ')[0]).join(' / ');
    descriptors.push({
      id: 'mobile_money',
      name: 'Mobile Money',
      description: `Fast STK push & prompt directly on your mobile device (${carrierNames || 'M-Pesa / MTN'}).`,
      supportedRails: ['mobile_money'],
      icon: 'smartphone',
      badge: carrierNames || 'Instant Push',
      isPopular: countryCode === 'KE' || countryCode === 'GH',
    });
  }

  // Bank Transfer
  if (country.supportedMethods.includes('bank_transfer')) {
    descriptors.push({
      id: 'bank_transfer',
      name: 'Bank Transfer / Wire',
      description: `Direct transfer via ${country.domesticBankRail} with dedicated order reference.`,
      supportedRails: ['bank_transfer'],
      icon: 'building-2',
      badge: country.domesticBankRail.split(' ')[0],
      isPopular: countryCode === 'NG' || countryCode === 'DE' || countryCode === 'NL',
    });
  }

  // Offline / Lifetime License
  descriptors.push({
    id: 'license_key',
    name: 'Redeem License Key',
    description: '16-character cryptographic lifetime authorization token.',
    supportedRails: ['license_key'],
    icon: 'key',
  });

  return descriptors;
}
