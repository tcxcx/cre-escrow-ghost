export const CONTRACT_ABIS = {
  ERC20: [
    {
      name: 'approve',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    },
  ],
  // 🔥 CONSOLIDATED: Comprehensive EIP-2612 ABI
  // Includes all ERC-20 functions + EIP-2612 permit functionality for USDC and other tokens
  EIP2612: [
    // Standard ERC-20 functions
    {
      name: 'approve',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    },
    {
      name: 'transfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    },
    {
      name: 'transferFrom',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    },
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      name: 'allowance',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      name: 'totalSupply',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      name: 'name',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'string' }],
    },
    {
      name: 'symbol',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'string' }],
    },
    {
      name: 'decimals',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint8' }],
    },
    // EIP-2612 permit-specific functions
    {
      name: 'permit',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'v', type: 'uint8' },
        { name: 'r', type: 'bytes32' },
        { name: 's', type: 'bytes32' },
      ],
      outputs: [],
    },
    {
      name: 'nonces',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      name: 'version',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'string' }],
    },
    {
      name: 'DOMAIN_SEPARATOR',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'bytes32' }],
    },
  ],
  LINK_TOKEN: [
    {
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
      ],
      name: 'transfer',
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
      ],
      name: 'approve',
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [{ name: 'account', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  ],
  // Rain V2 Coordinator Contract ABI
  // https://snowtrace.io/address/0xE09916E8777cf88E634578C3875CF54d20769fAa/contract/43114/code
  RAIN_COORDINATOR_V2: [
    {
      name: 'withdrawAsset',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'collateralProxy', type: 'address' },
        { name: 'assetAddress', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'recipient', type: 'address' },
        { name: 'expiresAt', type: 'uint256' },
        { name: 'executorPublisherSalt', type: 'bytes32' },
        { name: 'executorPublisherSig', type: 'bytes' },
        { name: 'adminSalts', type: 'bytes32[]' },
        { name: 'adminSignatures', type: 'bytes[]' },
        { name: 'directTransfer', type: 'bool' },
      ],
      outputs: [],
    },
  ],
  // Rain V2 Collateral Contract ABI
  // https://snowtrace.io/address/0xbc2F19427EE4224a561Bc04bF16C829B967beB11/contract/43114/code
  RAIN_COLLATERAL_V2: [
    {
      name: 'adminNonce',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
    },
  ],
} as const;
