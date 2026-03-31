#!/bin/bash
# ==========================================================================
# Scaffold a new CRE workflow from the workflow-example skeleton.
#
# Usage: ./scripts/new-workflow.sh <workflow-name>
# Example: ./scripts/new-workflow.sh workflow-transfer-verify
# ==========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATE_DIR="$PROJECT_DIR/workflow-example"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <workflow-name>"
  echo "Example: $0 workflow-transfer-verify"
  exit 1
fi

WORKFLOW_NAME="$1"
TARGET_DIR="$PROJECT_DIR/$WORKFLOW_NAME"

if [ -d "$TARGET_DIR" ]; then
  echo "Error: Directory $TARGET_DIR already exists."
  exit 1
fi

echo "Creating workflow: $WORKFLOW_NAME"
echo "  From template: $TEMPLATE_DIR"
echo "  Target: $TARGET_DIR"

# Copy skeleton
cp -r "$TEMPLATE_DIR" "$TARGET_DIR"

# Remove node_modules and lock files from copy
rm -rf "$TARGET_DIR/node_modules" "$TARGET_DIR/bun.lock"

# Update workflow name in workflow.yaml
if command -v sed &> /dev/null; then
  sed -i.bak "s/workflow-example/$WORKFLOW_NAME/g" "$TARGET_DIR/workflow.yaml"
  rm -f "$TARGET_DIR/workflow.yaml.bak"
fi

echo ""
echo "Workflow scaffolded successfully!"
echo ""
echo "Next steps:"
echo "  1. cd $TARGET_DIR"
echo "  2. Edit types.ts -- define your config schema"
echo "  3. Edit config.json -- set your runtime config"
echo "  4. Edit handlers.ts -- implement your business logic"
echo "  5. bun install"
echo "  6. cre workflow simulate $WORKFLOW_NAME --target local-simulation"
