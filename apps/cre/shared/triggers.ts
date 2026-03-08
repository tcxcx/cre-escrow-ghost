/**
 * Trigger Composers
 *
 * Factory functions that create CRE handler(trigger, callback) pairs.
 * No more manual capability instantiation -- just pass your callback.
 *
 * @example
 * ```ts
 * const initWorkflow = (config: Config) => [
 *   withCron<Config>((runtime) => { ... })(config),
 *   withLog<Config>({ ... }, (runtime, log) => { ... })(config),
 * ]
 * ```
 */

import {
  CronCapability,
  EVMClient,
  HTTPCapability,
  handler,
  getNetwork,
  type Runtime,
  type CronPayload,
  type HTTPPayload,
  type EVMLog,
} from "@chainlink/cre-sdk"

// ============================================================================
// Cron Trigger
// ============================================================================

/**
 * Create a cron-triggered handler.
 * The schedule is read from config.schedule by default.
 *
 * @param callback - Function to execute on each cron fire
 * @param getSchedule - Optional custom schedule extractor (defaults to config.schedule)
 * @returns Factory that takes config and returns a handler
 */
export function withCron<C>(
  callback: (runtime: Runtime<C>, payload: CronPayload) => string,
  getSchedule?: (config: C) => string
) {
  return (config: C) => {
    const schedule = getSchedule
      ? getSchedule(config)
      : (config as Record<string, unknown>)["schedule"]

    if (typeof schedule !== "string" || schedule.length === 0) {
      throw new Error("withCron: schedule must be a non-empty string. Provide it via config.schedule or getSchedule()")
    }

    return handler(
      new CronCapability().trigger({ schedule }),
      callback
    )
  }
}

// ============================================================================
// HTTP Trigger
// ============================================================================

/**
 * Create an HTTP-triggered handler.
 * The workflow is invoked when its HTTP endpoint receives a request.
 *
 * @param callback - Function to execute on each HTTP request
 * @returns Factory that takes config and returns a handler
 */
export function withHttp<C>(
  callback: (runtime: Runtime<C>, payload: HTTPPayload) => string,
  getAuthorizedKeys?: (config: C) => Array<{
    type: "KEY_TYPE_ECDSA_EVM"
    publicKey: string
  }>
) {
  return (config: C) => {
    const http = new HTTPCapability()

    const triggerConfig = getAuthorizedKeys
      ? { authorizedKeys: getAuthorizedKeys(config) }
      : {}

    return handler(
      http.trigger(triggerConfig),
      callback
    )
  }
}

// ============================================================================
// EVM Log Trigger
// ============================================================================

/** Options for creating an EVM log trigger */
interface LogTriggerOptions<C> {
  /** Extract monitored contract addresses from config */
  getAddresses: (config: C) => string[]
  /** Extract event topic hashes to filter for */
  getTopics: (config: C) => string[]
  /** Confidence level (default: CONFIDENCE_LEVEL_FINALIZED) */
  confidence?: string
  /** Whether this is a testnet chain (default: true) */
  isTestnet?: boolean
  /** Config field to use for chain selector (default: "chainSelectorName") */
  chainSelectorField?: keyof C
}

/**
 * Create an EVM log-triggered handler.
 * Fires when matching on-chain events are detected.
 *
 * Requires config to have `chainSelectorName` field.
 *
 * @param options - Log trigger configuration
 * @param callback - Function to execute when a matching log is detected
 * @returns Factory that takes config and returns a handler
 */
export function withLog<C extends { chainSelectorName: string }>(
  options: LogTriggerOptions<C>,
  callback: (runtime: Runtime<C>, log: EVMLog) => string
) {
  return (config: C) => {
    const selectorField = options.chainSelectorField ?? ("chainSelectorName" as keyof C)
    const chainSelectorName = config[selectorField] as string

    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName,
      isTestnet: options.isTestnet ?? true,
    })

    if (!network) {
      throw new Error(`withLog: Network not found for chain selector: ${chainSelectorName}`)
    }

    const evmClient = new EVMClient(network.chainSelector.selector)

    return handler(
      evmClient.logTrigger({
        addresses: options.getAddresses(config),
        topics: [{ values: options.getTopics(config) }],
        confidence: options.confidence ?? "CONFIDENCE_LEVEL_FINALIZED",
      }),
      callback
    )
  }
}
