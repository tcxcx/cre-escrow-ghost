/**
 * Workflow Entry Point
 *
 * Run: cre workflow simulate workflow-example --target local-simulation
 */

import { Runner } from "@chainlink/cre-sdk"
import { configSchema, type Config } from "./types"
import { initWorkflow } from "./handlers"

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
