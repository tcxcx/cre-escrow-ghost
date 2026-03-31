/**
 * Supabase credentials.
 */

import { resolve } from './core';

export function getSupabaseUrl(): string | undefined {
  return resolve('SUPABASE_URL') ?? resolve('NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseServiceKey(): string | undefined {
  return resolve('SUPABASE_SERVICE_KEY') ?? resolve('SUPABASE_SERVICE_ROLE_KEY');
}

export function getSupabaseAnonKey(): string | undefined {
  return resolve('SUPABASE_ANON_KEY') ?? resolve('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function getSupabasePublishableKey(): string | undefined {
  return resolve('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}

export function getSupabaseDbUrl(): string | undefined {
  return resolve('SUPABASE_DB_URL') ?? resolve('DATABASE_URL');
}
