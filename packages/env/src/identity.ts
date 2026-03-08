/**
 * Identity verification service credentials (Persona, Plaid, GoCardless, Teller, Pluggy).
 */

import { resolve } from './core';

// Persona
export function getPersonaApiKey(): string | undefined {
  return resolve('PERSONA_API_KEY');
}

export function getPersonaUrl(): string | undefined {
  return resolve('PERSONA_URL');
}

export function getPersonaVersion(): string | undefined {
  return resolve('PERSONA_VERSION');
}

// Plaid
export function getPlaidClientId(): string | undefined {
  return resolve('PLAID_CLIENT_ID');
}

export function getPlaidSecret(): string | undefined {
  return resolve('PLAID_SECRET');
}

export function getPlaidEnvironment(): string | undefined {
  return resolve('PLAID_ENVIRONMENT');
}

// GoCardless
export function getGoCardlessSecretId(): string | undefined {
  return resolve('GOCARDLESS_SECRET_ID');
}

export function getGoCardlessSecretKey(): string | undefined {
  return resolve('GOCARDLESS_SECRET_KEY');
}

// Teller
export function getTellerApplicationId(): string | undefined {
  return resolve('TELLER_APPLICATION_ID');
}

export function getTellerEnvironment(): string | undefined {
  return resolve('TELLER_ENVIRONMENT');
}

export function getTellerSigningSecret(): string | undefined {
  return resolve('TELLER_SIGNING_SECRET');
}

export function getTellerCertificate(): string | undefined {
  return resolve('TELLER_CERTIFICATE');
}

export function getTellerPrivateKey(): string | undefined {
  return resolve('TELLER_PRIVATE_KEY');
}

// Pluggy
export function getPluggyClientId(): string | undefined {
  return resolve('PLUGGY_CLIENT_ID');
}

export function getPluggyClientSecret(): string | undefined {
  return resolve('PLUGGY_CLIENT_SECRET') ?? resolve('PLUGGY_SECRET');
}

export function getPersonaEnvironment(): string | undefined {
  return resolve('PERSONA_ENVIRONMENT');
}

export function getIniciadorWebhookSecret(): string | undefined {
  return resolve('INICIADOR_WEBHOOK_SECRET');
}
