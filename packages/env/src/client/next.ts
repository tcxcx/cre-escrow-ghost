/**
 * NEXT_PUBLIC_* environment variables.
 *
 * IMPORTANT: These MUST use literal `process.env.NEXT_PUBLIC_X` reads.
 * Next.js inlines these at build time — dynamic resolution won't work.
 */

// App
export function getNextPublicAppUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_APP_URL;
}

export function getNextPublicBaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_BASE_URL;
}

export function getNextPublicIsBeta(): boolean {
  return process.env.NEXT_PUBLIC_IS_BETA === 'true';
}

// Supabase
export function getNextPublicSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getNextPublicSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function getNextPublicSupabasePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

// Shiva / Hono
export function getNextPublicEngineApiUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_ENGINE_API_URL;
}

export function getNextPublicHonoApiUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_HONO_API_URL;
}

export function getNextPublicHonoApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_HONO_API_KEY;
}

// Stripe
export function getNextPublicStripePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

export function getNextPublicStripePriceProMonthly(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY;
}

export function getNextPublicStripePriceProAnnual(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL;
}

// Analytics
export function getNextPublicOpenPanelClientId(): string | undefined {
  return process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
}

// Identity
export function getNextPublicTellerApplicationId(): string | undefined {
  return process.env.NEXT_PUBLIC_TELLER_APPLICATION_ID;
}

export function getNextPublicTellerEnvironment(): string | undefined {
  return process.env.NEXT_PUBLIC_TELLER_ENVIRONMENT;
}

export function getNextPublicPlaidEnvironment(): string | undefined {
  return process.env.NEXT_PUBLIC_PLAID_ENVIRONMENT;
}

export function getNextPublicPersonaEnvKey(): string | undefined {
  return process.env.NEXT_PUBLIC_PERSONA_ENV_KEY;
}

export function getNextPublicPersonaKycTemplateId(): string | undefined {
  return process.env.NEXT_PUBLIC_PERSONA_KYC_TEMPLATE_ID;
}

export function getNextPublicPersonaKybTemplateId(): string | undefined {
  return process.env.NEXT_PUBLIC_PERSONA_KYB_TEMPLATE_ID;
}

// Blockchain
export function getNextPublicAlchemyApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
}

// Slack
export function getNextPublicSlackClientId(): string | undefined {
  return process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
}

export function getNextPublicSlackOauthRedirectUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URL;
}

export function getNextPublicSlackStateSecret(): string | undefined {
  return process.env.NEXT_PUBLIC_SLACK_STATE_SECRET;
}

// Feature flags
export function getNextPublicShowBillingDevTools(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_BILLING_DEV_TOOLS === 'true';
}

export function getNextPublicBankAccountCreationFeeAddress(): string | undefined {
  return process.env.NEXT_PUBLIC_BANK_ACCOUNT_CREATION_FEE_ADDRESS;
}

export function getNextPublicOpenPanelDashboardUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_OPENPANEL_DASHBOARD_URL;
}

// Motora
export function getNextPublicMotoraApiUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_MOTORA_API_URL;
}

export function getNextPublicMotoraUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_MOTORA_URL;
}

// Trigger
export function getNextPublicTriggerPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_TRIGGER_PUBLIC_KEY;
}

// Vercel
export function getNextPublicVercelUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_VERCEL_URL;
}

// Site
export function getNextPublicSiteUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SITE_URL;
}

// Chat
export function getNextPublicChatwootAccountId(): string | undefined {
  return process.env.NEXT_PUBLIC_CHATWOOT_ACCOUNT_ID;
}

export function getNextPublicChatwootUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_CHATWOOT_URL;
}

// Mesh
export function getNextPublicMeshClientId(): string | undefined {
  return process.env.NEXT_PUBLIC_MESH_CLIENT_ID;
}

// Novu
export function getNextPublicNovuApplicationIdentifier(): string | undefined {
  return process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;
}

// WalletConnect
export function getNextPublicWalletConnectProjectId(): string | undefined {
  return process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
}

// Mainnet
export function getNextPublicIsMainnet(): string | undefined {
  return process.env.NEXT_PUBLIC_IS_MAINNET;
}

// Stripe additional
export function getNextPublicStripePriceStarterMonthly(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY;
}

export function getNextPublicStripePriceStarterAnnual(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL;
}

// GoCardless
export function getNextPublicGoCardlessAuthUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_GOCARDLESS_AUTH_URL;
}

// Google
export function getNextPublicGoogleApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
}

// Shiva
export function getNextPublicShivaApiUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SHIVA_API_URL;
}

// Alerts
export function getNextPublicAlertSoundEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ALERT_SOUND_ENABLED === 'true';
}

export function getNextPublicAlertThresholdWarning(): string | undefined {
  return process.env.NEXT_PUBLIC_ALERT_THRESHOLD_WARNING;
}

export function getNextPublicAlertThresholdCritical(): string | undefined {
  return process.env.NEXT_PUBLIC_ALERT_THRESHOLD_CRITICAL;
}

export function getNextPublicAlertThresholdExtreme(): string | undefined {
  return process.env.NEXT_PUBLIC_ALERT_THRESHOLD_EXTREME;
}

// Large transaction
export function getNextPublicLargeTransactionThreshold(): string | undefined {
  return process.env.NEXT_PUBLIC_LARGE_TRANSACTION_THRESHOLD;
}
