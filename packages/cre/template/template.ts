// 1. IMPORTS
import { cre, Runner, type Runtime, type HTTPPayload } from "@chainlink/cre-sdk";
import { z } from "zod";

// 2. CONFIG SCHEMA
const configSchema = z.object({
  // Define your configuration shape
});

// Optional: infer the Config type from the schema
type Config = z.infer<typeof configSchema>;

// 3. BUSINESS LOGIC FUNCTIONS
const myHandler = (runtime: Runtime<Config>, payload: HTTPPayload) => {
  // Your logic here
};

// 4. INIT WORKFLOW - Initialize capabilities and bind triggers
const initWorkflow = (config: Config) => {
  // 4a. Initialize capabilities
  const httpTrigger = new cre.capabilities.HTTPCapability();

  const evmClient = new cre.capabilities.EVMClient(config.chainSelector);

  // 4b. Bind triggers to handlers
  return [
    cre.handler(httpTrigger.trigger({}), (runtime, payload) =>
      myHandler(runtime, payload)
    ),
  ];
};

// 5. MAIN - Bootstrap the runner
export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

main();
