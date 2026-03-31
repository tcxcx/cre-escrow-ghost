/**
 * Mesh supported network names.
 *
 * These are the Mesh network name strings that BUFI currently supports.
 * Used to filter the full network list returned by the Mesh API.
 */

export const MESH_SUPPORTED_NETWORKS = [
  'AvalancheC',
  'Ethereum',
  'Arbitrum',
  'Optimism',
] as const;

export type MeshSupportedNetwork = (typeof MESH_SUPPORTED_NETWORKS)[number];
