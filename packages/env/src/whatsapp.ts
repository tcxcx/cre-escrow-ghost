/**
 * WhatsApp credentials for Business API integration.
 */

import { resolve } from './core';

export function getWhatsAppVerifyToken(): string | undefined {
  return resolve('WHATSAPP_VERIFY_TOKEN');
}

export function getWhatsAppAppSecret(): string | undefined {
  return resolve('WHATSAPP_APP_SECRET');
}

export function getWhatsAppAccessToken(): string | undefined {
  return resolve('WHATSAPP_ACCESS_TOKEN');
}

export function getWhatsAppPhoneNumberId(): string | undefined {
  return resolve('WHATSAPP_PHONE_NUMBER_ID');
}

export function getWhatsAppDefaultTeamId(): string | undefined {
  return resolve('WHATSAPP_DEFAULT_TEAM_ID');
}
