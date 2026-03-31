#!/bin/bash
# ==========================================================================
# Simulate CRE workflows.
#
# Usage:
#   ./scripts/simulate.sh <workflow-name> [target]
#   ./scripts/simulate.sh --list
#
# Examples:
#   ./scripts/simulate.sh workflow-example local-simulation
#   ./scripts/simulate.sh workflow-transfer-verify staging
#   ./scripts/simulate.sh --list
# ==========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# List all workflows
if [ "${1:-}" = "--list" ]; then
  echo "Available workflows:"
  for dir in "$PROJECT_DIR"/workflow-*/; do
    if [ -f "$dir/main.ts" ]; then
      echo "  - $(basename "$dir")"
    fi
  done
  exit 0
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 <workflow-name> [target]"
  echo "       $0 --list"
  exit 1
fi

WORKFLOW_NAME="$1"
TARGET="${2:-local-simulation}"

if [ ! -d "$PROJECT_DIR/$WORKFLOW_NAME" ]; then
  echo "Error: Workflow '$WORKFLOW_NAME' not found."
  echo "Run '$0 --list' to see available workflows."
  exit 1
fi

echo "Simulating workflow: $WORKFLOW_NAME (target: $TARGET)"
echo "---"

cd "$PROJECT_DIR"
cre workflow simulate "$WORKFLOW_NAME" --target "$TARGET"
