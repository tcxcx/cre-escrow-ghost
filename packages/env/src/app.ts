/**
 * App URL and deployment environment accessors.
 *
 * Absorbs: packages/utils/src/envs.ts (URL helpers)
 *          packages/utils/src/envs-client.ts (getAppUrl client variant)
 */

import { resolve, isProd, isDev } from './core';

export function getAppUrl(): string {
  const explicit = resolve('NEXT_PUBLIC_APP_URL');
  if (explicit) return explicit;

  if (resolve('VERCEL_ENV') === 'production') return 'https://desk.bu.finance';
  if (resolve('VERCEL_ENV') === 'preview' || resolve('VERCEL_ENV') === 'staging') {
    return 'https://spooky-staging.bu.finance';
  }
  if (isDev()) return 'http://localhost:3000';

  return 'https://desk.bu.finance';
}

export function getClientAppUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }

  const explicit = resolve('NEXT_PUBLIC_APP_URL');
  if (explicit) return explicit;
  if (isDev()) return 'http://localhost:3000';

  return 'https://desk.bu.finance';
}

export function getEmailUrl(): string {
  const explicit = resolve('NEXT_PUBLIC_APP_URL');
  if (explicit) return explicit;
  if (isDev()) return 'http://localhost:3000';

  return 'https://desk.bu.finance';
}

export function getWebsiteUrl(): string {
  const explicit = resolve('NEXT_PUBLIC_APP_URL');
  if (explicit) return explicit;

  if (resolve('VERCEL_ENV') === 'production') return 'https://desk.bu.finance';

  const vercelUrl = resolve('VERCEL_URL');
  if (vercelUrl) return `https://${vercelUrl}`;

  if (isDev()) return 'http://localhost:3000';

  return 'https://desk.bu.finance';
}

export function getCdnUrl(): string {
  return 'https://cdn.bu.finance';
}

export function getMainnetUrl(): string {
  const explicit = resolve('NEXT_PUBLIC_APP_URL');
  if (explicit) return explicit;

  const env = resolve('NODE_ENV');
  if (env === 'development' || env === 'preview') return 'http://localhost:3000';

  return 'https://desk.bu.finance';
}

export function getVercelEnv(): string | undefined {
  return resolve('VERCEL_ENV');
}

export function getEnvironment(): string | undefined {
  return resolve('ENVIRONMENT');
}

export function getShivaUrl(): string | undefined {
  return resolve('SHIVA_URL') ?? resolve('NEXT_PUBLIC_SHIVA_API_URL');
}

export function getShivaServiceToken(): string | undefined {
  return resolve('SHIVA_SERVICE_TOKEN');
}

export function getHonoApiUrl(): string | undefined {
  return resolve('HONO_API_URL') ?? resolve('NEXT_PUBLIC_HONO_API_URL');
}

export function getHonoApiKey(): string | undefined {
  return resolve('HONO_API_KEY') ?? resolve('NEXT_PUBLIC_HONO_API_KEY');
}

export function getCdnBaseUrl(): string | undefined {
  return resolve('CDN_BASE_URL');
}

export function getCdnFontsUrl(): string | undefined {
  return resolve('CDN_FONTS_URL');
}

export function getSiteUrl(): string | undefined {
  return resolve('NEXT_PUBLIC_SITE_URL');
}

export function getIsBeta(): boolean {
  return resolve('IS_BETA') === 'true' || resolve('NEXT_PUBLIC_IS_BETA') === 'true';
}
