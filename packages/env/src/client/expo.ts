/**
 * EXPO_PUBLIC_* environment variables.
 *
 * IMPORTANT: These MUST use literal `process.env.EXPO_PUBLIC_X` reads.
 * Expo inlines these at build time — dynamic resolution won't work.
 */

// App
export function getExpoPublicAppUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_APP_URL;
}

export function getExpoPublicIsBeta(): boolean {
  return process.env.EXPO_PUBLIC_IS_BETA === 'true';
}

export function getExpoPublicAppEnv(): string | undefined {
  return process.env.EXPO_PUBLIC_APP_ENV;
}

export function getExpoPublicEnvironment(): string | undefined {
  return process.env.EXPO_PUBLIC_ENVIRONMENT;
}

// Backend
export function getExpoPublicBackendUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL;
}

export function getExpoPublicShivaUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_SHIVA_URL;
}

export function getExpoPublicHonoApiUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_HONO_API_URL;
}

// Supabase
export function getExpoPublicSupabaseUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_URL;
}

export function getExpoPublicSupabaseAnonKey(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
}

// Persona
export function getExpoPublicPersonaEnvironment(): string | undefined {
  return process.env.EXPO_PUBLIC_PERSONA_ENVIRONMENT;
}

export function getExpoPublicPersonaKycTemplateId(): string | undefined {
  return process.env.EXPO_PUBLIC_PERSONA_KYC_TEMPLATE_ID;
}

export function getExpoPublicPersonaKybTemplateId(): string | undefined {
  return process.env.EXPO_PUBLIC_PERSONA_KYB_TEMPLATE_ID;
}

// RevenueCat
export function getExpoPublicRevenueCatApiKeyIos(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
}

export function getExpoPublicRevenueCatApiKeyAndroid(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
}
