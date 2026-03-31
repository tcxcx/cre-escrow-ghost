export interface Env {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // OpenAI
  OPENAI_API_KEY: string;

  // Circle
  CIRCLE_API_KEY: string;
  CIRCLE_BLOCKCHAIN: string;
  AGENT_WALLET_ID: string;
  AGENT_WALLET_ADDRESS: string;
  USDC_CONTRACT_ADDRESS: string;

  // CRE workflow gateway
  CRE_WORKFLOW_URL: string;
  CRE_WORKFLOW_API_KEY?: string;

  // ERC-8004 on-chain registration
  ERC8004_PRIVATE_KEY?: string;
  AVALANCHE_FUJI_RPC_URL?: string;
}
