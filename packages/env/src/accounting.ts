/**
 * Accounting provider OAuth credentials (Xero, QuickBooks, ContaAzul).
 */

import { resolve, required } from './core';

// -- Xero ------------------------------------------------------------------

export function getXeroClientId(): string | undefined {
  return resolve('XERO_CLIENT_ID');
}

export function requireXeroClientId(): string {
  return required('XERO_CLIENT_ID');
}

export function getXeroClientSecret(): string | undefined {
  return resolve('XERO_CLIENT_SECRET');
}

export function requireXeroClientSecret(): string {
  return required('XERO_CLIENT_SECRET');
}

export function getXeroOauthRedirectUrl(): string | undefined {
  return resolve('XERO_OAUTH_REDIRECT_URL');
}

export function requireXeroOauthRedirectUrl(): string {
  return required('XERO_OAUTH_REDIRECT_URL');
}

// -- QuickBooks ------------------------------------------------------------

export function getQuickbooksClientId(): string | undefined {
  return resolve('QUICKBOOKS_CLIENT_ID');
}

export function requireQuickbooksClientId(): string {
  return required('QUICKBOOKS_CLIENT_ID');
}

export function getQuickbooksClientSecret(): string | undefined {
  return resolve('QUICKBOOKS_CLIENT_SECRET');
}

export function requireQuickbooksClientSecret(): string {
  return required('QUICKBOOKS_CLIENT_SECRET');
}

export function getQuickbooksOauthRedirectUrl(): string | undefined {
  return resolve('QUICKBOOKS_OAUTH_REDIRECT_URL');
}

export function requireQuickbooksOauthRedirectUrl(): string {
  return required('QUICKBOOKS_OAUTH_REDIRECT_URL');
}

// -- ContaAzul -------------------------------------------------------------

export function getContaazulClientId(): string | undefined {
  return resolve('CONTAAZUL_CLIENT_ID');
}

export function requireContaazulClientId(): string {
  return required('CONTAAZUL_CLIENT_ID');
}

export function getContaazulClientSecret(): string | undefined {
  return resolve('CONTAAZUL_CLIENT_SECRET');
}

export function requireContaazulClientSecret(): string {
  return required('CONTAAZUL_CLIENT_SECRET');
}

export function getContaazulOauthRedirectUrl(): string | undefined {
  return resolve('CONTAAZUL_OAUTH_REDIRECT_URL');
}

export function requireContaazulOauthRedirectUrl(): string {
  return required('CONTAAZUL_OAUTH_REDIRECT_URL');
}

// -- QuickBooks Webhook ----------------------------------------------------

export function getQuickbooksWebhookVerifierToken(): string | undefined {
  return resolve('QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN');
}

export function requireQuickbooksWebhookVerifierToken(): string {
  return required('QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN');
}

// -- Accounting OAuth State Encryption -------------------------------------

export function getAccountingOauthSecret(): string | undefined {
  return resolve('ACCOUNTING_OAUTH_SECRET');
}

export function requireAccountingOauthSecret(): string {
  return required('ACCOUNTING_OAUTH_SECRET');
}
