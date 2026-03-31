/**
 * Third-party provider credentials (Typesense, Chatwoot, OpenPanel, Alchemy, Azure, etc).
 */

import { resolve } from './core';

export function getTypesenseApiKey(): string | undefined {
  return resolve('TYPESENSE_API_KEY');
}

export function getTypesenseHost(): string | undefined {
  return resolve('TYPESENSE_HOST') ?? resolve('TYPESENSE_ENDPOINT');
}

export function getChatwootApiKey(): string | undefined {
  return resolve('CHATWOOT_API_KEY');
}

export function getOpenPanelSecretKey(): string | undefined {
  return resolve('OPENPANEL_SECRET_KEY');
}

export function getOpenPanelClientId(): string | undefined {
  return resolve('NEXT_PUBLIC_OPENPANEL_CLIENT_ID');
}

export function getAlchemyApiKey(): string | undefined {
  return resolve('NEXT_PUBLIC_ALCHEMY_API_KEY') ?? resolve('ALCHEMY_API_KEY');
}

export function getAlchemyGasManagerPolicyId(): string | undefined {
  return resolve('ALCHEMY_GAS_MANAGER_POLICY_ID');
}

export function getAlchemyServerAccessKey(): string | undefined {
  return resolve('ALCHEMY_SERVER_ACCESS_KEY');
}

export function getRobinhoodTestnetRpcUrl(): string {
  const key = getAlchemyApiKey();
  return key
    ? `https://robinhood-testnet.g.alchemy.com/v2/${key}`
    : 'https://rpc.testnet.chain.robinhood.com';
}

export function getAzureApiKey(): string | undefined {
  return resolve('AZURE_API_KEY');
}

export function getVatCheckApiKey(): string | undefined {
  return resolve('VATCHECKAPI_API_KEY') ?? resolve('VATCHECK_API_KEY');
}

export function getChatwootUrl(): string | undefined {
  return resolve('CHATWOOT_API_URL') ?? resolve('NEXT_PUBLIC_CHATWOOT_URL');
}

export function getChatwootAccountId(): string | undefined {
  return resolve('CHATWOOT_ACCOUNT_ID') ?? resolve('NEXT_PUBLIC_CHATWOOT_ACCOUNT_ID');
}

export function getChatwootInboxId(): string | undefined {
  return resolve('CHATWOOT_INBOX_ID');
}

export function getChatwootWebhookSecret(): string | undefined {
  return resolve('CHATWOOT_WEBHOOK_SECRET');
}

export function getCloudflareAccountId(): string | undefined {
  return resolve('CLOUDFLARE_ACCOUNT_ID');
}

export function getR2AccessKeyId(): string | undefined {
  return resolve('R2_ACCESS_KEY_ID');
}

export function getR2SecretAccessKey(): string | undefined {
  return resolve('R2_SECRET_ACCESS_KEY');
}

export function getAttioApiKey(): string | undefined {
  return resolve('ATTIO_API_KEY');
}

export function getAttioWebhookSecret(): string | undefined {
  return resolve('ATTIO_WEBHOOK_SECRET');
}

export function getAzureDocIntelligenceEndpoint(): string | undefined {
  return resolve('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
}

export function getAzureDocIntelligenceKey(): string | undefined {
  return resolve('AZURE_DOCUMENT_INTELLIGENCE_KEY');
}

export function getGooglePlacesApiKey(): string | undefined {
  return resolve('GOOGLE_PLACES_API_KEY') ?? resolve('NEXT_PUBLIC_GOOGLE_API_KEY');
}

export function getOpenPanelProjectId(): string | undefined {
  return resolve('OPENPANEL_PROJECT_ID');
}

export function getExchangeRateApiKey(): string | undefined {
  return resolve('EXCHANGERATE_API_KEY');
}

export function getLogoDevToken(): string | undefined {
  return resolve('LOGO_DEV_TOKEN');
}

export function getLogoDevPublishableKey(): string | undefined {
  return resolve('LOGO_DEV_PUBLISHABLE_KEY');
}

export function getPlainApiKey(): string | undefined {
  return resolve('PLAIN_API_KEY');
}

export function getMeshClientId(): string | undefined {
  return resolve('NEXT_PUBLIC_MESH_CLIENT_ID') ?? resolve('MESH_CLIENT_ID');
}

export function getNovuApplicationIdentifier(): string | undefined {
  return resolve('NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER');
}

export function getWalletConnectProjectId(): string | undefined {
  return resolve('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID');
}
