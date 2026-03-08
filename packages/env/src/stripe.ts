/**
 * Stripe credentials, webhook secrets, and metering IDs.
 */

import { resolve } from './core';

export function getStripeSecretKey(): string | undefined {
  return resolve('STRIPE_SECRET_KEY');
}

export function requireStripeSecretKey(): string {
  const key = resolve('STRIPE_SECRET_KEY');
  if (!key) {
    throw new Error(
      '[Billing] STRIPE_SECRET_KEY not configured. Set the environment variable before using Stripe.',
    );
  }
  return key;
}

export function getStripeWebhookSecret(): string {
  return resolve('STRIPE_WEBHOOK_SECRET') ?? '';
}

export function getStripeWebhookSecretAttio(): string {
  return resolve('STRIPE_WEBHOOK_SECRET_ATTIO') ?? '';
}

export function getStripePublishableKey(): string {
  return resolve('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') ?? '';
}

// Stripe Price IDs
export function getStripePriceProMonthly(): string | undefined {
  return resolve('NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY');
}

export function getStripePriceProAnnual(): string | undefined {
  return resolve('NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL');
}

export function getStripePriceEnterprise(): string | undefined {
  return resolve('STRIPE_PRICE_ENTERPRISE');
}

// Stripe Product IDs
export function getStripeProductPro(): string | undefined {
  return resolve('STRIPE_PRODUCT_PRO');
}

export function getStripeProductEnterprise(): string | undefined {
  return resolve('STRIPE_PRODUCT_ENTERPRISE');
}

export function getStripeProductFree(): string | undefined {
  return resolve('STRIPE_PRODUCT_FREE');
}

// Stripe Meter IDs
export function getStripeMeterTransaction(): string {
  return resolve('STRIPE_METER_TRANSACTION') ?? '';
}

export function getStripeMeterApiCall(): string {
  return resolve('STRIPE_METER_API_CALL') ?? '';
}

export function getStripeMeterStorage(): string {
  return resolve('STRIPE_METER_STORAGE') ?? '';
}

export function getStripeMeterUser(): string {
  return resolve('STRIPE_METER_USER') ?? '';
}

export function getStripeMeterPayroll(): string {
  return resolve('STRIPE_METER_PAYROLL') ?? '';
}

export function getStripeMeterInvoice(): string {
  return resolve('STRIPE_METER_INVOICE') ?? '';
}

// Additional price IDs
export function getStripePriceStarterMonthly(): string | undefined {
  return resolve('STRIPE_PRICE_STARTER_MONTHLY') ?? resolve('NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY');
}

export function getStripePriceStarterAnnual(): string | undefined {
  return resolve('STRIPE_PRICE_STARTER_ANNUAL') ?? resolve('NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL');
}

export function getStripePriceFree(): string | undefined {
  return resolve('STRIPE_PRICE_FREE');
}

export function getStripePricePro(): string | undefined {
  return resolve('STRIPE_PRICE_PRO');
}

export function getStripePriceStarter(): string | undefined {
  return resolve('STRIPE_PRICE_STARTER');
}

export function getStripeProductStarter(): string | undefined {
  return resolve('STRIPE_PRODUCT_STARTER');
}

export function getStripeProMonthlyPriceId(): string | undefined {
  return resolve('STRIPE_PRO_MONTHLY_PRICE_ID') ?? resolve('NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID');
}
