/**
 * Inbox OAuth credentials (Gmail, Outlook).
 */

import { resolve, required } from './core';

// -- Gmail -----------------------------------------------------------------

export function getGmailClientId(): string | undefined {
  return resolve('GMAIL_CLIENT_ID');
}

export function requireGmailClientId(): string {
  return required('GMAIL_CLIENT_ID');
}

export function getGmailClientSecret(): string | undefined {
  return resolve('GMAIL_CLIENT_SECRET');
}

export function requireGmailClientSecret(): string {
  return required('GMAIL_CLIENT_SECRET');
}

export function getGmailRedirectUri(): string | undefined {
  return resolve('GMAIL_REDIRECT_URI');
}

export function requireGmailRedirectUri(): string {
  return required('GMAIL_REDIRECT_URI');
}

// -- Outlook ---------------------------------------------------------------

export function getOutlookClientId(): string | undefined {
  return resolve('OUTLOOK_CLIENT_ID');
}

export function requireOutlookClientId(): string {
  return required('OUTLOOK_CLIENT_ID');
}

export function getOutlookClientSecret(): string | undefined {
  return resolve('OUTLOOK_CLIENT_SECRET');
}

export function requireOutlookClientSecret(): string {
  return required('OUTLOOK_CLIENT_SECRET');
}

export function getOutlookRedirectUri(): string | undefined {
  return resolve('OUTLOOK_REDIRECT_URI');
}

export function requireOutlookRedirectUri(): string {
  return required('OUTLOOK_REDIRECT_URI');
}
