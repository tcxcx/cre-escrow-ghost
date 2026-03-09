#!/bin/bash
# ==========================================================================
# CRE Workflow Simulation Runner
# ==========================================================================
# Runs `cre workflow simulate` for all (or selected) CRE workflows.
#
# Usage:
#   ./simulate-all.sh all              # Run all workflows
#   ./simulate-all.sh ghost-deposit    # Run one workflow
#   ./simulate-all.sh --list           # List available workflows
#   ./simulate-all.sh --check          # Check prerequisites only
#
# Each workflow runs in its own directory with --non-interactive.
# Full output is logged to apps/cre/simulation-logs/.
# ==========================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/simulation-logs"
MOCK_DIR="$SCRIPT_DIR/mock-payloads"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# ── Colors ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Result tracking ──────────────────────────────────────────────────────
declare -a RESULTS_NAME=()
declare -a RESULTS_STATUS=()
declare -a RESULTS_DETAIL=()
declare -a RESULTS_TRIGGER=()
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# ── Placeholder secrets ────────────────────────────────────────────────
# Export dummy env vars for all secrets the CRE CLI validates at startup.
# These satisfy CLI validation; actual values are not used in local-simulation.
export SUPABASE_SERVICE_KEY_VAR="${SUPABASE_SERVICE_KEY_VAR:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-supabase-service-key}"
export SUPABASE_URL_VAR="${SUPABASE_URL_VAR:-https://placeholder.supabase.co}"
export SHIVA_API_URL_VAR="${SHIVA_API_URL_VAR:-https://placeholder.shiva.dev}"
export SHIVA_SERVICE_TOKEN_VAR="${SHIVA_SERVICE_TOKEN_VAR:-dummy-shiva-service-token}"
export SHIVA_URL_VAR="${SHIVA_URL_VAR:-https://placeholder.shiva.dev}"
export SHIVA_API_KEY_VAR="${SHIVA_API_KEY_VAR:-dummy-shiva-api-key}"
export ACE_API_KEY_VAR="${ACE_API_KEY_VAR:-dummy-ace-api-key}"
export ACE_URL_VAR="${ACE_URL_VAR:-https://placeholder.ace.dev}"
export MOTORA_API_URL_VAR="${MOTORA_API_URL_VAR:-https://placeholder.motora.dev}"
export MOTORA_API_KEY_VAR="${MOTORA_API_KEY_VAR:-dummy-motora-api-key}"
export MOTORA_URL_VAR="${MOTORA_URL_VAR:-https://placeholder.motora.dev}"
# CRE_ETH_PRIVATE_KEY_VAR is typically already set via CRE_ETH_PRIVATE_KEY
export CRE_ETH_PRIVATE_KEY_VAR="${CRE_ETH_PRIVATE_KEY_VAR:-${CRE_ETH_PRIVATE_KEY:-0x0000000000000000000000000000000000000000000000000000000000000001}}"

# ── Workflow registry ────────────────────────────────────────────────────
# Format: name|trigger_type|trigger_index|required_secrets|description|mock_payload
# trigger_index: the --trigger-index N for --non-interactive
# mock_payload: filename in mock-payloads/ (empty for non-HTTP or no payload needed)
# For multi-handler workflows, index 0 is the first handler.
WORKFLOWS=(
  "workflow-allowlist-sync|http|0|none|KYC/KYB AllowList attestation|allowlist-sync.json"
  "workflow-escrow-deploy|http|0|SUPABASE_SERVICE_KEY_VAR,SUPABASE_URL_VAR,CRE_ETH_PRIVATE_KEY_VAR|Deploy EscrowWithAgentV3 on-chain|escrow-deploy.json"
  "workflow-escrow-dispute|http|0|SUPABASE_SERVICE_KEY_VAR,SUPABASE_URL_VAR,SHIVA_API_URL_VAR,SHIVA_SERVICE_TOKEN_VAR,CRE_ETH_PRIVATE_KEY_VAR|4-layer AI dispute arbitration|escrow-dispute.json"
  "workflow-escrow-finalize|http|0|SUPABASE_SERVICE_KEY_VAR,SUPABASE_URL_VAR,SHIVA_API_URL_VAR,SHIVA_SERVICE_TOKEN_VAR,CRE_ETH_PRIVATE_KEY_VAR|On-chain milestone release/refund|escrow-finalize.json"
  "workflow-escrow-monitor|log|0|SUPABASE_SERVICE_KEY_VAR,SUPABASE_URL_VAR,CRE_ETH_PRIVATE_KEY_VAR|EscrowFactory event monitor (EVM Log)|SKIP_EVM_LOG"
  "workflow-escrow-monitor|cron|1|SUPABASE_SERVICE_KEY_VAR,SUPABASE_URL_VAR,CRE_ETH_PRIVATE_KEY_VAR|Escrow proof-of-reserves (Cron)|"
  "workflow-escrow-verify|http|0|SUPABASE_SERVICE_KEY_VAR,SUPABASE_URL_VAR,SHIVA_API_URL_VAR,SHIVA_SERVICE_TOKEN_VAR,CRE_ETH_PRIVATE_KEY_VAR|AI milestone verification|escrow-verify.json"
  "workflow-escrow-yield|http|0|SUPABASE_SERVICE_KEY_VAR,SUPABASE_URL_VAR,MOTORA_API_URL_VAR,MOTORA_API_KEY_VAR,CRE_ETH_PRIVATE_KEY_VAR|Escrow yield deposit/redeem via Motora|escrow-yield.json"
  "workflow-example|cron|0|none|Example workflow (no-op)|"
  "workflow-ghost-deposit|http|0|ACE_API_KEY_VAR|Ghost Mode USDC deposit verification|ghost-deposit.json"
  "workflow-ghost-transfer|log|0|ACE_API_KEY_VAR|ConfidentialTransfer event monitor (EVM Log)|SKIP_EVM_LOG"
  "workflow-ghost-transfer|log|1|ACE_API_KEY_VAR|Standard Transfer event monitor (EVM Log)|SKIP_EVM_LOG"
  "workflow-ghost-withdraw|http|0|ACE_API_KEY_VAR,SHIVA_URL_VAR,SHIVA_API_KEY_VAR|Ghost Mode USDC withdrawal verification|ghost-withdraw.json"
  "workflow-invoice-settle|http|0|SUPABASE_SERVICE_KEY_VAR,SUPABASE_URL_VAR|Invoice settlement attestation|invoice-settle.json"
  "workflow-payroll-attest|http|0|SUPABASE_SERVICE_KEY_VAR,SUPABASE_URL_VAR|Payroll batch attestation|payroll-attest.json"
  "workflow-private-transfer|log|0|ACE_API_KEY_VAR,ACE_URL_VAR|ACE Vault event monitor (EVM Log)|SKIP_EVM_LOG"
  "workflow-private-transfer|http|1|ACE_API_KEY_VAR,ACE_URL_VAR|Private transfer verifier (HTTP)|private-transfer.json"
  "workflow-private-transfer|cron|2|ACE_API_KEY_VAR,ACE_URL_VAR|USDCg proof-of-reserves (Cron)|"
  "workflow-report-verify|http|0|SUPABASE_SERVICE_KEY_VAR,SUPABASE_URL_VAR|AI report data attestation|report-verify.json"
  "workflow-treasury-rebalance|cron|0|none|Treasury buffer ratio check|"
  "workflow-worldid-verify|http|0|none|WorldID proof-of-personhood attestation|worldid-verify.json"
)

# ==========================================================================
# Functions
# ==========================================================================

print_header() {
  echo ""
  echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${BLUE}║         CRE Workflow Simulation Runner                       ║${NC}"
  echo -e "${BOLD}${BLUE}║         $(date '+%Y-%m-%d %H:%M:%S')                                    ║${NC}"
  echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

list_workflows() {
  echo -e "${BOLD}Available workflows:${NC}"
  echo ""
  printf "  ${BOLD}%-30s %-8s %-6s %s${NC}\n" "WORKFLOW" "TRIGGER" "INDEX" "DESCRIPTION"
  echo "  ────────────────────────────── ──────── ────── ──────────────────────────────────"

  for entry in "${WORKFLOWS[@]}"; do
    IFS='|' read -r name trigger idx secrets desc payload <<< "$entry"
    local skip_note=""
    if [[ "$payload" == "SKIP_EVM_LOG" ]]; then
      skip_note=" [SKIP: needs real tx hash]"
    fi
    printf "  %-30s %-8s %-6s %s%s\n" "$name" "$trigger" "$idx" "$desc" "$skip_note"
  done

  echo ""
  echo -e "  ${CYAN}Total: ${#WORKFLOWS[@]} handlers across $(ls -d "$SCRIPT_DIR"/workflow-*/ 2>/dev/null | wc -l | tr -d ' ') workflows${NC}"
  echo ""
}

check_prerequisites() {
  local all_ok=true

  echo -e "${BOLD}Checking prerequisites...${NC}"
  echo ""

  # 1. Bun version
  if command -v bun &>/dev/null; then
    local bun_ver
    bun_ver=$(bun --version 2>/dev/null)
    local major minor patch
    IFS='.' read -r major minor patch <<< "$bun_ver"

    if [[ "$major" -gt 1 ]] || [[ "$major" -eq 1 && "$minor" -gt 2 ]] || [[ "$major" -eq 1 && "$minor" -eq 2 && "$patch" -ge 21 ]]; then
      echo -e "  ${GREEN}[OK]${NC} bun $bun_ver (>= 1.2.21)"
    else
      echo -e "  ${RED}[FAIL]${NC} bun $bun_ver -- requires >= 1.2.21"
      all_ok=false
    fi
  else
    echo -e "  ${RED}[FAIL]${NC} bun not found"
    all_ok=false
  fi

  # 2. CRE CLI
  if command -v cre &>/dev/null; then
    local cre_ver
    cre_ver=$(cre version 2>/dev/null | head -1)
    echo -e "  ${GREEN}[OK]${NC} cre CLI: $cre_ver"
  else
    echo -e "  ${RED}[FAIL]${NC} cre CLI not found"
    all_ok=false
  fi

  # 3. CRE_ETH_PRIVATE_KEY
  if [[ -n "${CRE_ETH_PRIVATE_KEY:-}" ]]; then
    echo -e "  ${GREEN}[OK]${NC} CRE_ETH_PRIVATE_KEY is set"
  else
    echo -e "  ${YELLOW}[WARN]${NC} CRE_ETH_PRIVATE_KEY not set (needed for on-chain write workflows)"
  fi

  # 4. Deployer wallet file
  if [[ -f "$SCRIPT_DIR/../../.deployer-wallet.json" ]]; then
    echo -e "  ${GREEN}[OK]${NC} .deployer-wallet.json found"
  else
    echo -e "  ${YELLOW}[WARN]${NC} .deployer-wallet.json not found (needed for some workflows)"
  fi

  # 5. Check workflow directories exist
  local wf_count
  wf_count=$(ls -d "$SCRIPT_DIR"/workflow-*/ 2>/dev/null | wc -l | tr -d ' ')
  echo -e "  ${GREEN}[OK]${NC} $wf_count workflow directories found"

  # 6. Check mock payloads exist
  local mock_count
  mock_count=$(ls "$MOCK_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
  echo -e "  ${GREEN}[OK]${NC} $mock_count mock payload files found in mock-payloads/"

  # 7. Check placeholder secrets are set
  echo -e "  ${GREEN}[OK]${NC} Placeholder secrets exported (SUPABASE, SHIVA, ACE, MOTORA)"

  echo ""

  if $all_ok; then
    echo -e "  ${GREEN}All critical prerequisites met.${NC}"
  else
    echo -e "  ${RED}Some prerequisites are missing. Simulations may fail.${NC}"
  fi

  echo ""
  return 0
}

# Run a single workflow simulation
run_simulation() {
  local name="$1"
  local trigger="$2"
  local trigger_index="$3"
  local required_secrets="$4"
  local description="$5"
  local mock_payload="$6"

  local display_name="${name} [${trigger}:${trigger_index}]"
  local log_file="$LOG_DIR/${TIMESTAMP}_${name}_${trigger}_${trigger_index}.log"

  echo -e "${BOLD}${CYAN}────────────────────────────────────────────────────────────────${NC}"
  echo -e "${BOLD}  Running: ${display_name}${NC}"
  echo -e "  ${description}"
  echo -e "  Log: ${log_file}"
  echo ""

  # ── Skip EVM Log triggers (need real tx hash) ──────────────────────────
  if [[ "$mock_payload" == "SKIP_EVM_LOG" ]]; then
    echo -e "  ${YELLOW}[SKIP]${NC} EVM Log trigger -- needs real tx hash (--evm-tx-hash + --evm-event-index)"
    RESULTS_NAME+=("$display_name")
    RESULTS_STATUS+=("SKIP")
    RESULTS_DETAIL+=("needs real tx hash")
    RESULTS_TRIGGER+=("$trigger")
    ((SKIP_COUNT++))
    return
  fi

  # Check if workflow directory exists
  local wf_dir="$SCRIPT_DIR/$name"
  if [[ ! -d "$wf_dir" ]]; then
    echo -e "  ${RED}[SKIP]${NC} Directory not found: $wf_dir"
    RESULTS_NAME+=("$display_name")
    RESULTS_STATUS+=("SKIP")
    RESULTS_DETAIL+=("directory not found")
    RESULTS_TRIGGER+=("$trigger")
    ((SKIP_COUNT++))
    return
  fi

  # Check if main.ts exists
  if [[ ! -f "$wf_dir/main.ts" ]]; then
    echo -e "  ${RED}[SKIP]${NC} main.ts not found in $wf_dir"
    RESULTS_NAME+=("$display_name")
    RESULTS_STATUS+=("SKIP")
    RESULTS_DETAIL+=("main.ts missing")
    RESULTS_TRIGGER+=("$trigger")
    ((SKIP_COUNT++))
    return
  fi

  # Check required env vars (non-fatal, just warn)
  if [[ "$required_secrets" != "none" ]]; then
    IFS=',' read -ra secrets_arr <<< "$required_secrets"
    local missing_secrets=()
    for secret in "${secrets_arr[@]}"; do
      if [[ -z "${!secret:-}" ]]; then
        missing_secrets+=("$secret")
      fi
    done
    if [[ ${#missing_secrets[@]} -gt 0 ]]; then
      echo -e "  ${YELLOW}[WARN]${NC} Missing env vars: ${missing_secrets[*]}"
      echo -e "  ${YELLOW}       Simulation will likely fail at secret resolution${NC}"
    fi
  fi

  # ── Build the cre simulate command ────────────────────────────────────
  local wf_name
  wf_name=$(basename "$wf_dir")

  local cmd="cre workflow simulate $wf_name --non-interactive --trigger-index $trigger_index --target local-simulation"

  # Add --http-payload for HTTP triggers with a mock payload file
  if [[ "$trigger" == "http" && -n "$mock_payload" && "$mock_payload" != "SKIP_EVM_LOG" ]]; then
    local payload_file="$MOCK_DIR/$mock_payload"
    if [[ -f "$payload_file" ]]; then
      cmd="$cmd --http-payload @$payload_file"
      echo -e "  ${BLUE}Payload: $payload_file${NC}"
    else
      echo -e "  ${YELLOW}[WARN]${NC} Mock payload not found: $payload_file"
    fi
  fi

  echo -e "  ${BLUE}$cmd${NC}"
  echo ""

  local start_time
  start_time=$(date +%s)

  {
    echo "=== CRE Simulation Log ==="
    echo "Workflow:      $name"
    echo "Trigger:       $trigger (index $trigger_index)"
    echo "Description:   $description"
    echo "Mock Payload:  ${mock_payload:-none}"
    echo "Timestamp:     $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo "Working Dir:   $wf_dir"
    echo "Command:       $cmd"
    echo "==========================="
    echo ""
  } > "$log_file"

  # Run cre workflow simulate from the apps/cre project root
  local exit_code=0
  (
    cd "$SCRIPT_DIR"
    eval "$cmd" 2>&1
  ) >> "$log_file" 2>&1 || exit_code=$?

  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - start_time))

  {
    echo ""
    echo "==========================="
    echo "Exit code:     $exit_code"
    echo "Duration:      ${duration}s"
    echo "==========================="
  } >> "$log_file"

  # Report result
  if [[ $exit_code -eq 0 ]]; then
    echo -e "  ${GREEN}[PASS]${NC} Completed in ${duration}s"
    RESULTS_NAME+=("$display_name")
    RESULTS_STATUS+=("PASS")
    RESULTS_DETAIL+=("${duration}s")
    RESULTS_TRIGGER+=("$trigger")
    ((PASS_COUNT++))
  else
    echo -e "  ${RED}[FAIL]${NC} Exit code $exit_code (${duration}s)"
    # Show last few lines of output for diagnosis
    echo -e "  ${RED}Last 5 lines of output:${NC}"
    tail -7 "$log_file" | head -5 | while IFS= read -r line; do
      echo -e "    ${RED}${line}${NC}"
    done
    RESULTS_NAME+=("$display_name")
    RESULTS_STATUS+=("FAIL")
    RESULTS_DETAIL+=("exit=$exit_code ${duration}s")
    RESULTS_TRIGGER+=("$trigger")
    ((FAIL_COUNT++))
  fi

  echo ""
}

print_summary() {
  echo ""
  echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${BLUE}║                    SIMULATION SUMMARY                        ║${NC}"
  echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  printf "  ${BOLD}%-45s %-8s %-8s %s${NC}\n" "WORKFLOW" "TRIGGER" "STATUS" "DETAIL"
  echo "  ───────────────────────────────────────────── ──────── ──────── ──────────────"

  for i in "${!RESULTS_NAME[@]}"; do
    local status_color="$NC"
    case "${RESULTS_STATUS[$i]}" in
      PASS) status_color="$GREEN" ;;
      FAIL) status_color="$RED" ;;
      SKIP) status_color="$YELLOW" ;;
    esac
    printf "  %-45s %-8s ${status_color}%-8s${NC} %s\n" \
      "${RESULTS_NAME[$i]}" \
      "${RESULTS_TRIGGER[$i]}" \
      "${RESULTS_STATUS[$i]}" \
      "${RESULTS_DETAIL[$i]}"
  done

  echo ""
  echo "  ─────────────────────────────────────────────────────────────────────"
  echo -e "  ${GREEN}PASS: $PASS_COUNT${NC}  ${RED}FAIL: $FAIL_COUNT${NC}  ${YELLOW}SKIP: $SKIP_COUNT${NC}  Total: $((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))"
  echo ""
  echo -e "  Logs: ${CYAN}$LOG_DIR/${TIMESTAMP}_*${NC}"
  echo ""

  if [[ $FAIL_COUNT -gt 0 ]]; then
    echo -e "  ${RED}Some simulations failed. Check logs for details.${NC}"
    echo ""
  fi

  if [[ $SKIP_COUNT -gt 0 ]]; then
    echo -e "  ${YELLOW}Skipped $SKIP_COUNT EVM Log triggers (need real tx hash to simulate).${NC}"
    echo -e "  ${YELLOW}To run them manually:${NC}"
    echo -e "  ${YELLOW}  cre workflow simulate <name> --non-interactive --trigger-index N --target local-simulation --evm-tx-hash 0x... --evm-event-index 0${NC}"
    echo ""
  fi
}

# Find workflow entry by name (partial match)
find_workflow_entries() {
  local search="$1"
  local found=()

  # Normalize: add "workflow-" prefix if not present
  if [[ "$search" != workflow-* ]]; then
    search="workflow-$search"
  fi

  for entry in "${WORKFLOWS[@]}"; do
    IFS='|' read -r name trigger idx secrets desc payload <<< "$entry"
    if [[ "$name" == "$search" ]]; then
      found+=("$entry")
    fi
  done

  printf '%s\n' "${found[@]}"
}

# ==========================================================================
# Main
# ==========================================================================

main() {
  local command="${1:-}"

  if [[ -z "$command" ]]; then
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  all                   Run all workflow simulations"
    echo "  <workflow-name>       Run a specific workflow (e.g., ghost-deposit)"
    echo "  --list                List all available workflows"
    echo "  --check               Check prerequisites only"
    echo ""
    echo "Examples:"
    echo "  $0 all"
    echo "  $0 ghost-deposit"
    echo "  $0 escrow-monitor"
    echo "  $0 workflow-example"
    echo "  $0 --list"
    echo ""
    echo "Environment:"
    echo "  Placeholder secrets are auto-exported for CLI validation."
    echo "  Set real values to override (e.g., export SUPABASE_URL_VAR=https://...)."
    echo "  EVM Log triggers are auto-skipped (need --evm-tx-hash)."
    exit 1
  fi

  case "$command" in
    --list)
      list_workflows
      exit 0
      ;;
    --check)
      print_header
      check_prerequisites
      exit 0
      ;;
    all)
      print_header
      check_prerequisites
      mkdir -p "$LOG_DIR"

      for entry in "${WORKFLOWS[@]}"; do
        IFS='|' read -r name trigger idx secrets desc payload <<< "$entry"
        run_simulation "$name" "$trigger" "$idx" "$secrets" "$desc" "$payload"
      done

      print_summary
      ;;
    *)
      print_header
      check_prerequisites
      mkdir -p "$LOG_DIR"

      # Find matching workflow entries
      local entries
      entries=$(find_workflow_entries "$command")

      if [[ -z "$entries" ]]; then
        echo -e "${RED}No workflow found matching: $command${NC}"
        echo ""
        echo "Available workflows:"
        for entry in "${WORKFLOWS[@]}"; do
          IFS='|' read -r name _ _ _ _ _ <<< "$entry"
          echo "  $name"
        done | sort -u
        exit 1
      fi

      while IFS= read -r entry; do
        IFS='|' read -r name trigger idx secrets desc payload <<< "$entry"
        run_simulation "$name" "$trigger" "$idx" "$secrets" "$desc" "$payload"
      done <<< "$entries"

      print_summary
      ;;
  esac
}

main "$@"
