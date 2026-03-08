#!/bin/bash
# ==========================================================================
# Deploy CRE workflows to a Chainlink DON.
#
# Usage:
#   ./scripts/deploy.sh <workflow-name> [target]
#
# Example:
#   ./scripts/deploy.sh workflow-transfer-verify staging
# ==========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <workflow-name> [target]"
  exit 1
fi

WORKFLOW_NAME="$1"
TARGET="${2:-staging}"

if [ ! -d "$PROJECT_DIR/$WORKFLOW_NAME" ]; then
  echo "Error: Workflow '$WORKFLOW_NAME' not found."
  exit 1
fi

echo "Deploying workflow: $WORKFLOW_NAME (target: $TARGET)"
echo "---"

cd "$PROJECT_DIR"
cre workflow deploy "$WORKFLOW_NAME" --target "$TARGET"
