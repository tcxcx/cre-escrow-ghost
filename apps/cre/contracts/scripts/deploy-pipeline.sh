#!/usr/bin/env bash
# =============================================================================
# Ghost Mode / Private Transfer — Full Pipeline Deployment
# =============================================================================
#
# Deploys and configures the entire private transfer pipeline:
#   1. Smart contracts (BUAttestation, USDCg, TreasuryManager)
#   2. Vault registration (USDCg + PolicyEngine on ACE Vault)
#   3. Treasury wallet creation (Circle DCW)
#   4. USYC Teller approval (treasury approves Teller to spend USDC)
#   5. Outputs .env.deployed with all addresses
#
# Usage:
#   ./scripts/deploy-pipeline.sh                    # Full deploy
#   ./scripts/deploy-pipeline.sh --dry-run          # Simulate only
#   ./scripts/deploy-pipeline.sh --contracts-only   # Skip Circle/Teller
#   ./scripts/deploy-pipeline.sh --skip-contracts   # Skip Foundry, do Circle/Teller only
#
# Required env vars (or .env file in this directory):
#   PRIVATE_KEY             — Deployer wallet private key
#   RPC_URL                 — Sepolia RPC endpoint
#
# Optional env vars:
#   CIRCLE_API_KEY          — Circle API key (for treasury wallet creation)
#   CIRCLE_ENTITY_SECRET    — Circle entity secret
#   INITIAL_DEPOSIT         — USDC to deposit as backed liquidity (default: 0, min: 1)
#                              USDCg is NEVER minted without 1:1 USDC backing.
#   USYC_TELLER_ADDRESS     — USYC Teller for approval (default: Sepolia address)
#   USDC_ADDRESS            — USDC token (default: Sepolia address)
#   SHIVA_URL               — Shiva API base URL (default: http://localhost:8787)
#   SHIVA_JWT               — JWT token for Shiva API calls
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${CYAN}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[  ok  ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ warn ]${NC} $*"; }
err()  { echo -e "${RED}[error ]${NC} $*" >&2; }
die()  { err "$@"; exit 1; }

# ---------------------------------------------------------------------------
# Parse args
# ---------------------------------------------------------------------------
DRY_RUN=false
CONTRACTS_ONLY=false
SKIP_CONTRACTS=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)          DRY_RUN=true ;;
    --contracts-only)   CONTRACTS_ONLY=true ;;
    --skip-contracts)   SKIP_CONTRACTS=true ;;
    --help|-h)
      echo "Usage: $0 [--dry-run] [--contracts-only] [--skip-contracts]"
      exit 0
      ;;
    *) die "Unknown argument: $arg" ;;
  esac
done

# ---------------------------------------------------------------------------
# Load env
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(cd "$CONTRACT_DIR/../../.." && pwd)"

# Source .env files (contract-local first, then repo root)
[[ -f "$CONTRACT_DIR/.env" ]] && source "$CONTRACT_DIR/.env"
[[ -f "$REPO_ROOT/.env" ]] && source "$REPO_ROOT/.env"

# Output file for deployed addresses
DEPLOYED_FILE="$CONTRACT_DIR/.env.deployed"

# ---------------------------------------------------------------------------
# Defaults — Sepolia
# ---------------------------------------------------------------------------
: "${RPC_URL:=https://ethereum-sepolia-rpc.publicnode.com}"
: "${INITIAL_DEPOSIT:=0}"
: "${ACE_VAULT_ADDRESS:=0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13}"
: "${USDC_ADDRESS:=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238}"
: "${USYC_TOKEN_ADDRESS:=0x38D3A3f8717F4DB1CcB4Ad7D8C755919440848A3}"
: "${USYC_TELLER_ADDRESS:=0x96424C885951ceb4B79fecb934eD857999e6f82B}"
: "${USYC_ORACLE_ADDRESS:=0x35b96d80C72f873bACc44A1fACfb1f5fac064f1a}"
: "${SHIVA_URL:=http://localhost:8787}"
: "${CHAIN_ID:=11155111}"

# ---------------------------------------------------------------------------
# Validate prerequisites
# ---------------------------------------------------------------------------
command -v forge >/dev/null 2>&1 || die "forge not found — install Foundry: https://book.getfoundry.sh"
command -v cast  >/dev/null 2>&1 || die "cast not found — install Foundry"
command -v jq    >/dev/null 2>&1 || die "jq not found — brew install jq"

if [[ "$SKIP_CONTRACTS" == "false" ]]; then
  [[ -z "${PRIVATE_KEY:-}" ]] && die "PRIVATE_KEY is required"
fi

DEPLOYER_ADDRESS=""
if [[ -n "${PRIVATE_KEY:-}" ]]; then
  DEPLOYER_ADDRESS=$(cast wallet address "$PRIVATE_KEY" 2>/dev/null || echo "")
fi

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  Ghost Mode Pipeline — Deployment${NC}"
echo -e "${BOLD}============================================${NC}"
echo ""
log "RPC:             $RPC_URL"
log "Chain ID:        $CHAIN_ID"
log "Deployer:        ${DEPLOYER_ADDRESS:-N/A}"
log "ACE Vault:       $ACE_VAULT_ADDRESS"
if [[ "$INITIAL_DEPOSIT" -gt 0 ]]; then
  log "Liquidity:       $INITIAL_DEPOSIT USDC (1:1 backed USDCg)"
else
  log "Liquidity:       0 (contracts only, no mint)"
fi
log "Dry run:         $DRY_RUN"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  warn "DRY RUN — no transactions will be broadcast"
  echo ""
fi

# ---------------------------------------------------------------------------
# Helper: extract contract address from forge broadcast JSON
# ---------------------------------------------------------------------------
extract_address() {
  local broadcast_file="$CONTRACT_DIR/broadcast/$1/$CHAIN_ID/run-latest.json"
  if [[ -f "$broadcast_file" ]]; then
    jq -r ".transactions[] | select(.contractName == \"$2\") | .contractAddress" "$broadcast_file" | head -1
  fi
}

# ---------------------------------------------------------------------------
# Helper: check deployer balance
# ---------------------------------------------------------------------------
check_balance() {
  local bal
  bal=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$RPC_URL" --ether 2>/dev/null || echo "0")
  log "Deployer balance: $bal ETH"
  # Warn if below 0.01 ETH
  if (( $(echo "$bal < 0.01" | bc -l 2>/dev/null || echo 0) )); then
    warn "Low balance — deployment may fail. Fund $DEPLOYER_ADDRESS with Sepolia ETH"
  fi
}

# =============================================================================
# PHASE 1: Smart Contract Deployment
# =============================================================================

BU_ATTESTATION_ADDRESS=""
USDCG_ADDRESS=""
TREASURY_MANAGER_ADDRESS=""
POLICY_ENGINE_ADDRESS=""

deploy_contracts() {
  echo -e "${BOLD}--- Phase 1: Smart Contract Deployment ---${NC}"
  echo ""

  check_balance

  # Build first
  log "Compiling contracts..."
  (cd "$CONTRACT_DIR" && forge build --quiet) || die "Compilation failed"
  ok "Contracts compiled"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "Simulating DeployAll..."
    (cd "$CONTRACT_DIR" && \
      INITIAL_DEPOSIT="$INITIAL_DEPOSIT" \
      forge script script/DeployAll.s.sol:DeployAll \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
    ) || die "Simulation failed"
    ok "Simulation passed"
    return
  fi

  if [[ "$INITIAL_DEPOSIT" -gt 0 ]]; then
    log "Deploying contracts + seeding $INITIAL_DEPOSIT USDC/USDCg (1:1) liquidity..."
  else
    log "Deploying BUAttestation + USDCg + TreasuryManager + PolicyEngine + vault registration..."
  fi
  (cd "$CONTRACT_DIR" && \
    INITIAL_DEPOSIT="$INITIAL_DEPOSIT" \
    forge script script/DeployAll.s.sol:DeployAll \
      --rpc-url "$RPC_URL" \
      --broadcast \
      --private-key "$PRIVATE_KEY" \
  ) || die "Deployment failed"

  # Extract deployed addresses from broadcast
  BU_ATTESTATION_ADDRESS=$(extract_address "DeployAll.s.sol" "BUAttestation")
  USDCG_ADDRESS=$(extract_address "DeployAll.s.sol" "USDCg")
  TREASURY_MANAGER_ADDRESS=$(extract_address "DeployAll.s.sol" "TreasuryManager")
  POLICY_ENGINE_ADDRESS=$(extract_address "DeployAll.s.sol" "ERC1967Proxy")

  [[ -z "$BU_ATTESTATION_ADDRESS" ]] && die "Failed to extract BUAttestation address"
  [[ -z "$USDCG_ADDRESS" ]] && die "Failed to extract USDCg address"
  [[ -z "$TREASURY_MANAGER_ADDRESS" ]] && die "Failed to extract TreasuryManager address"
  [[ -z "$POLICY_ENGINE_ADDRESS" ]] && die "Failed to extract PolicyEngine address"

  ok "BUAttestation:     $BU_ATTESTATION_ADDRESS"
  ok "USDCg:             $USDCG_ADDRESS"
  ok "TreasuryManager:   $TREASURY_MANAGER_ADDRESS"
  ok "PolicyEngine:      $POLICY_ENGINE_ADDRESS"
  echo ""
}

# =============================================================================
# PHASE 2: Contract Verification
# =============================================================================

verify_contracts() {
  echo -e "${BOLD}--- Phase 2: Contract Verification ---${NC}"
  echo ""

  if [[ "$DRY_RUN" == "true" ]]; then
    warn "Skipping verification (dry run)"
    return
  fi

  # Verify on Sourcify (no API key needed)
  log "Verifying BUAttestation on Sourcify..."
  (cd "$CONTRACT_DIR" && \
    forge verify-contract "$BU_ATTESTATION_ADDRESS" \
      src/BUAttestation.sol:BUAttestation \
      --chain "$CHAIN_ID" \
      --watch 2>&1 || true
  )

  log "Verifying USDCg on Sourcify..."
  (cd "$CONTRACT_DIR" && \
    forge verify-contract "$USDCG_ADDRESS" \
      src/USDCg.sol:USDCg \
      --chain "$CHAIN_ID" \
      --constructor-args "$(cast abi-encode 'constructor(address,address,address)' "$USDC_ADDRESS" "$POLICY_ENGINE_ADDRESS" "$DEPLOYER_ADDRESS")" \
      --watch 2>&1 || true
  )

  log "Verifying TreasuryManager on Sourcify..."
  (cd "$CONTRACT_DIR" && \
    forge verify-contract "$TREASURY_MANAGER_ADDRESS" \
      src/TreasuryManager.sol:TreasuryManager \
      --chain "$CHAIN_ID" \
      --constructor-args "$(cast abi-encode 'constructor(address,address,address,address,address,address)' "$USDCG_ADDRESS" "$USDC_ADDRESS" "$USYC_TOKEN_ADDRESS" "$USYC_TELLER_ADDRESS" "$USYC_ORACLE_ADDRESS" "$DEPLOYER_ADDRESS")" \
      --watch 2>&1 || true
  )

  ok "Verification complete"
  echo ""
}

# =============================================================================
# PHASE 3: Post-Deploy On-Chain Configuration
# =============================================================================

configure_onchain() {
  echo -e "${BOLD}--- Phase 3: On-Chain Configuration ---${NC}"
  echo ""

  if [[ "$DRY_RUN" == "true" ]]; then
    warn "Skipping on-chain config (dry run)"
    return
  fi

  # Verify attestation contract is live
  local count
  count=$(cast call "$BU_ATTESTATION_ADDRESS" "attestationCount()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null || echo "FAIL")
  if [[ "$count" == "FAIL" ]]; then
    die "BUAttestation not responding at $BU_ATTESTATION_ADDRESS"
  fi
  ok "BUAttestation live (attestationCount: $count)"

  # Verify USDCg
  local supply
  supply=$(cast call "$USDCG_ADDRESS" "totalSupply()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null || echo "FAIL")
  if [[ "$supply" == "FAIL" ]]; then
    die "USDCg not responding at $USDCG_ADDRESS"
  fi
  ok "USDCg live (totalSupply: $supply)"

  # Approve USYC Teller to spend USDC from deployer (for testing subscribe)
  log "Approving USYC Teller to spend USDC..."
  cast send "$USDC_ADDRESS" \
    "approve(address,uint256)" "$USYC_TELLER_ADDRESS" "$(cast max-uint)" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --quiet 2>/dev/null || warn "USDC approve for Teller failed (may already be approved)"
  ok "USDC approved for USYC Teller"

  echo ""
}

# =============================================================================
# PHASE 4: Treasury Wallet (Circle DCW)
# =============================================================================

TREASURY_WALLET_ID=""
TREASURY_WALLET_ADDRESS=""

create_treasury_wallet() {
  echo -e "${BOLD}--- Phase 4: Treasury Wallet (Circle DCW) ---${NC}"
  echo ""

  if [[ -z "${CIRCLE_API_KEY:-}" ]]; then
    warn "CIRCLE_API_KEY not set — skipping treasury wallet creation"
    warn "Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET to enable"
    return
  fi

  if [[ -z "${SHIVA_JWT:-}" ]]; then
    warn "SHIVA_JWT not set — skipping Shiva wallet creation"
    warn "Get a JWT from Shiva auth endpoint first"
    warn ""
    warn "Alternative: Create wallet directly via Circle SDK."
    warn "Add TREASURY_WALLET_ID and TREASURY_WALLET_ADDRESS to .env.deployed manually."
    return
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    warn "Skipping wallet creation (dry run)"
    return
  fi

  log "Creating treasury wallet via Shiva..."
  local response
  response=$(curl -s -X POST "$SHIVA_URL/wallets" \
    -H "Authorization: Bearer $SHIVA_JWT" \
    -H "Content-Type: application/json" \
    -d '{"blockchain": "ETH-SEPOLIA", "walletSetName": "ghost-mode-treasury"}' \
    2>/dev/null || echo '{"error": "connection failed"}')

  # Try to extract wallet ID and address
  TREASURY_WALLET_ID=$(echo "$response" | jq -r '.data.id // .id // empty' 2>/dev/null || echo "")
  TREASURY_WALLET_ADDRESS=$(echo "$response" | jq -r '.data.address // .address // empty' 2>/dev/null || echo "")

  if [[ -n "$TREASURY_WALLET_ID" && -n "$TREASURY_WALLET_ADDRESS" ]]; then
    ok "Treasury wallet created"
    ok "  ID:      $TREASURY_WALLET_ID"
    ok "  Address: $TREASURY_WALLET_ADDRESS"
  else
    warn "Could not parse wallet response. Raw response:"
    echo "$response" | jq . 2>/dev/null || echo "$response"
    warn ""
    warn "Create manually and add to .env.deployed:"
    warn "  TREASURY_WALLET_ID=<wallet-id>"
    warn "  TREASURY_WALLET_ADDRESS=<0x-address>"
  fi

  echo ""
}

# =============================================================================
# PHASE 5: Write .env.deployed
# =============================================================================

write_env() {
  echo -e "${BOLD}--- Phase 5: Write .env.deployed ---${NC}"
  echo ""

  if [[ "$DRY_RUN" == "true" ]]; then
    log "Would write to $DEPLOYED_FILE"
    return
  fi

  cat > "$DEPLOYED_FILE" <<EOF
# =============================================================================
# Ghost Mode — Deployed Addresses
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Chain: Sepolia ($CHAIN_ID)
# Deployer: $DEPLOYER_ADDRESS
# =============================================================================

# --- Smart Contracts ---
BU_ATTESTATION_ADDRESS=${BU_ATTESTATION_ADDRESS:-TODO}
USDCG_TOKEN_ADDRESS=${USDCG_ADDRESS:-TODO}
TREASURY_MANAGER_ADDRESS=${TREASURY_MANAGER_ADDRESS:-TODO}
POLICY_ENGINE_ADDRESS=${POLICY_ENGINE_ADDRESS:-TODO}
ACE_VAULT_ADDRESS=$ACE_VAULT_ADDRESS

# --- External Contracts (pre-deployed) ---
USDC_ADDRESS=$USDC_ADDRESS
USYC_TOKEN_ADDRESS=$USYC_TOKEN_ADDRESS
USYC_TELLER_ADDRESS=$USYC_TELLER_ADDRESS
USYC_ORACLE_ADDRESS=$USYC_ORACLE_ADDRESS

# --- Chain Config ---
ACE_CHAIN_ID=$CHAIN_ID
ACE_API_URL=https://convergence2026-token-api.cldev.cloud

# --- Circle DCW ---
CIRCLE_API_KEY=${CIRCLE_API_KEY:-TODO}
CIRCLE_ENTITY_SECRET=${CIRCLE_ENTITY_SECRET:-TODO}
TREASURY_WALLET_ID=${TREASURY_WALLET_ID:-TODO}
TREASURY_WALLET_ADDRESS=${TREASURY_WALLET_ADDRESS:-TODO}

# --- Yield ---
USDC_BUFFER_RATIO=0.15
EOF

  ok "Wrote $DEPLOYED_FILE"
  echo ""
  log "Copy relevant vars to your app .env files:"
  log "  apps/shiva/.dev.vars"
  log "  apps/app/.env.local"
  log "  packages/trigger/.env.local"
  echo ""
}

# =============================================================================
# PHASE 6: Summary
# =============================================================================

print_summary() {
  echo ""
  echo -e "${BOLD}============================================${NC}"
  echo -e "${BOLD}  Deployment Summary${NC}"
  echo -e "${BOLD}============================================${NC}"
  echo ""
  echo -e "  ${CYAN}BUAttestation${NC}     ${BU_ATTESTATION_ADDRESS:-N/A}"
  echo -e "  ${CYAN}USDCg${NC}             ${USDCG_ADDRESS:-N/A}"
  echo -e "  ${CYAN}TreasuryManager${NC}   ${TREASURY_MANAGER_ADDRESS:-N/A}"
  echo -e "  ${CYAN}PolicyEngine${NC}      ${POLICY_ENGINE_ADDRESS:-N/A} (fresh proxy)"
  echo -e "  ${CYAN}ACE Vault${NC}         $ACE_VAULT_ADDRESS"
  echo -e "  ${CYAN}USDC${NC}              $USDC_ADDRESS"
  echo -e "  ${CYAN}USYC${NC}              $USYC_TOKEN_ADDRESS"
  echo -e "  ${CYAN}USYC Teller${NC}       $USYC_TELLER_ADDRESS"
  echo -e "  ${CYAN}Treasury Wallet${NC}   ${TREASURY_WALLET_ADDRESS:-Not created}"
  echo ""
  echo -e "  ${CYAN}Config file${NC}       $DEPLOYED_FILE"
  echo ""

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${YELLOW}Mode: DRY RUN (no transactions sent)${NC}"
  else
    echo -e "  ${GREEN}Mode: LIVE${NC}"
  fi

  echo ""
  echo -e "${BOLD}Next steps:${NC}"
  echo "  1. Copy .env.deployed vars to your app env files"
  echo "  2. Fill in TREASURY_WALLET_ID/ADDRESS if not auto-created"
  echo "  3. Fund treasury with Sepolia ETH for gas"
  echo "  4. Start Shiva: cd apps/shiva && pnpm dev"
  echo "  5. Test deposit: POST /private-transfer/deposit"
  echo ""
  echo -e "${BOLD}============================================${NC}"
  echo ""
}

# =============================================================================
# Main
# =============================================================================

main() {
  if [[ "$SKIP_CONTRACTS" == "false" ]]; then
    deploy_contracts
    verify_contracts
    configure_onchain
  else
    log "Skipping contract deployment (--skip-contracts)"
    # Load existing addresses if available
    if [[ -f "$DEPLOYED_FILE" ]]; then
      source "$DEPLOYED_FILE"
      BU_ATTESTATION_ADDRESS="${BU_ATTESTATION_ADDRESS:-}"
      USDCG_ADDRESS="${USDCG_TOKEN_ADDRESS:-}"
      TREASURY_MANAGER_ADDRESS="${TREASURY_MANAGER_ADDRESS:-}"
      POLICY_ENGINE_ADDRESS="${POLICY_ENGINE_ADDRESS:-}"
    fi
  fi

  if [[ "$CONTRACTS_ONLY" == "false" ]]; then
    create_treasury_wallet
  else
    log "Skipping Circle/Teller setup (--contracts-only)"
  fi

  write_env
  print_summary
}

main
