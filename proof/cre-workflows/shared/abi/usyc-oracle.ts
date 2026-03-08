/** USYC Oracle ABI — price feed */
export const USYC_ORACLE_ABI = [
  { type: "function", name: "latestAnswer", inputs: [], outputs: [{ name: "", type: "int256" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
] as const
