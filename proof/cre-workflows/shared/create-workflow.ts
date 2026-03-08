/**
 * Workflow Factory
 *
 * Eliminates all CRE boilerplate. A workflow's main.ts becomes:
 *
 *   import { createWorkflow } from "../shared/create-workflow"
 *   import { configSchema } from "./types"
 *   import { initWorkflow } from "./handlers"
 *
 *   export const main = createWorkflow({ configSchema, init: initWorkflow })
 */

import { Runner } from "@chainlink/cre-sdk"
import type { z, ZodType } from "zod"

/**
 * Definition of a CRE workflow.
 * @template S - Zod schema type for the workflow config
 */
interface WorkflowDefinition<S extends ZodType> {
  /** Zod schema that validates config.json at startup */
  configSchema: S
  /**
   * Initialization function that receives validated config
   * and returns an array of handler(trigger, callback) pairs.
   */
  init: (config: z.infer<S>) => unknown[]
}

/**
 * Create a CRE workflow. Returns an async main() function that:
 * 1. Creates a Runner with the config schema
 * 2. Runs the init function to wire triggers to handlers
 *
 * The returned function is auto-executed by CRE SDK v1.0.2+
 * when exported as `main`.
 *
 * @example
 * ```ts
 * export const main = createWorkflow({
 *   configSchema: mySchema,
 *   init: (config) => [
 *     withCron<Config>((runtime) => { ... })(config),
 *   ],
 * })
 * ```
 */
export function createWorkflow<S extends ZodType>(def: WorkflowDefinition<S>) {
  return async function main() {
    const runner = await Runner.newRunner<z.infer<S>>({
      configSchema: def.configSchema,
    })
    await runner.run(def.init)
  }
}
