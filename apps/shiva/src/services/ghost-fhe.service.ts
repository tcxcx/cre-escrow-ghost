/**
 * Ghost FHE Service — On-chain reads + writes for GhostUSDC (Layer 4).
 *
 * Built on the Fhenix FHERC20Wrapper reference implementation with real CoFHE.
 * All FHE encryption happens on-chain via CoFHE TaskManager.
 * Server sends plaintext amounts; contracts encrypt internally.
 *
 * Reads: viem public client (balanceOf, getUserClaims, getClaim, totalSupply)
 * Writes: Circle SDK createContractExecutionTransaction (wrap, unwrap, claim, transferAmount)
 * ACE API: EIP-712 signed requests for DON state (real balance)
 */

import { getCircleApiKey, getCircleEntitySecret } from '@bu/env/circle';
import { getGhostUsdcAddress, getAceApiUrl, getUsdgTokenAddress, getUsdcAddress } from '@bu/env/ace';
import { createLogger } from '@bu/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger({ prefix: 'ghost-fhe-service' });

// ---------------------------------------------------------------------------
// ABI fragments (viem-compatible) — matches reference FHERC20Wrapper + GhostUSDC
// ---------------------------------------------------------------------------

const GHOST_USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
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
    name: 'getUserClaims',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'ctHash', type: 'bytes32' },
          { name: 'requestedAmount', type: 'uint64' },
          { name: 'decryptedAmount', type: 'uint64' },
          { name: 'decrypted', type: 'bool' },
          { name: 'to', type: 'address' },
          { name: 'claimed', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ctHash', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'ctHash', type: 'bytes32' },
          { name: 'requestedAmount', type: 'uint64' },
          { name: 'decryptedAmount', type: 'uint64' },
          { name: 'decrypted', type: 'bool' },
          { name: 'to', type: 'address' },
          { name: 'claimed', type: 'bool' },
        ],
      },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Sepolia public client (lazy) — matches deployed contract chain
// ---------------------------------------------------------------------------

async function getPublicClient() {
  const { createPublicClient, http } = await import('viem');
  const { sepolia } = await import('viem/chains');

  return createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
  });
}

// ---------------------------------------------------------------------------
// Circle SDK (lazy — same pattern as RainWithdrawalService)
// ---------------------------------------------------------------------------

async function getCircleSdk() {
  const apiKey = getCircleApiKey();
  const entitySecret = getCircleEntitySecret();

  if (!apiKey || !entitySecret) {
    throw new Error('CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are required');
  }

  const { createCircleSdk } = await import('@bu/circle/client');
  return createCircleSdk(apiKey, entitySecret);
}

// ---------------------------------------------------------------------------
// On-chain Reads
// ---------------------------------------------------------------------------

export async function readGhostBalance(walletAddress: string) {
  const client = await getPublicClient();
  const ghostUsdc = getGhostUsdcAddress() as `0x${string}`;

  const [indicator, totalSupply] = await Promise.all([
    client.readContract({
      address: ghostUsdc,
      abi: GHOST_USDC_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`],
    }),
    client.readContract({
      address: ghostUsdc,
      abi: GHOST_USDC_ABI,
      functionName: 'totalSupply',
    }),
  ]);

  return {
    indicator: indicator.toString(),
    totalEncryptedSupply: totalSupply.toString(),
  };
}

interface ClaimResult {
  ctHash: string;
  requestedAmount: string;
  decryptedAmount: string;
  decrypted: boolean;
  to: string;
  claimed: boolean;
  status: 'pending' | 'decrypting' | 'claimable' | 'claimed';
}

export async function readGhostClaims(walletAddress: string): Promise<ClaimResult[]> {
  const client = await getPublicClient();
  const ghostUsdc = getGhostUsdcAddress() as `0x${string}`;

  const rawClaims = await client.readContract({
    address: ghostUsdc,
    abi: GHOST_USDC_ABI,
    functionName: 'getUserClaims',
    args: [walletAddress as `0x${string}`],
  });

  if (!rawClaims || rawClaims.length === 0) return [];

  return rawClaims.map((c) => {
    let status: ClaimResult['status'] = 'pending';
    if (c.claimed) {
      status = 'claimed';
    } else if (c.decrypted) {
      status = 'claimable';
    } else {
      status = 'decrypting';
    }

    return {
      ctHash: c.ctHash,
      requestedAmount: c.requestedAmount.toString(),
      decryptedAmount: c.decryptedAmount.toString(),
      decrypted: c.decrypted,
      to: c.to,
      claimed: c.claimed,
      status,
    };
  });
}

// ---------------------------------------------------------------------------
// ACE API — DON State Balance (EIP-712 authenticated)
// ---------------------------------------------------------------------------

export async function readDonBalance(walletAddress: string, walletId: string) {
  try {
    const sdk = await getCircleSdk();
    const { buildBalancesTypedData } = await import('@bu/private-transfer/eip712');
    const { signWithCircleDcw } = await import('@bu/private-transfer/signer');

    const typedData = buildBalancesTypedData(walletAddress);
    const signature = await signWithCircleDcw(sdk, walletId, typedData);

    const aceApiUrl = getAceApiUrl();
    const res = await fetch(`${aceApiUrl}/balances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: walletAddress,
        signature,
      }),
    });

    if (!res.ok) {
      logger.warn('ACE API /balances failed', { status: res.status });
      return null;
    }

    const data = (await res.json()) as { balances?: Record<string, string> };
    const usdgAddress = getUsdgTokenAddress().toLowerCase();
    const balance = data.balances?.[usdgAddress] ?? '0';
    return balance;
  } catch (error) {
    logger.warn('DON balance read failed (non-fatal)', { error: (error as Error).message });
    return null;
  }
}

// ---------------------------------------------------------------------------
// USDC Balance Check (pre-deposit validation)
// ---------------------------------------------------------------------------

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Read USDC balance for a wallet on ETH-Sepolia.
 * Used to validate funds have arrived before attempting deposit.
 */
export async function readUsdcBalance(walletAddress: string): Promise<bigint> {
  const client = await getPublicClient();
  const usdcToken = getUsdcAddress() as `0x${string}`;

  const balance = await client.readContract({
    address: usdcToken,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [walletAddress as `0x${string}`],
  });

  return balance;
}

// ---------------------------------------------------------------------------
// Contract Writes via Circle SDK
// ---------------------------------------------------------------------------

/**
 * Deposit: USDC → approve → GhostUSDC.wrap → eUSDCg (2 Circle DCW calls).
 *
 * GhostUSDC v2 wraps USDC directly (deployed 2026-03-08).
 * Pipeline:
 *   1. USDC.approve(GhostUSDC, amount)
 *   2. GhostUSDC.wrap(walletAddress, amount) — pulls USDC, FHE-encrypts via CoFHE
 */
export async function executeDeposit(walletId: string, walletAddress: string, amount: string) {
  const usdcToken = getUsdcAddress();
  const ghostUsdc = getGhostUsdcAddress();

  logger.info('Ghost deposit: starting 2-step pipeline', {
    walletId, walletAddress, amount, usdcToken, ghostUsdc,
  });

  // Pre-check: verify wallet has sufficient USDC
  const usdcBalance = await readUsdcBalance(walletAddress);
  const amountBigInt = BigInt(amount);
  logger.info('Ghost deposit: USDC balance check', {
    walletAddress, usdcBalance: usdcBalance.toString(), requiredAmount: amount,
    sufficient: usdcBalance >= amountBigInt,
  });

  if (usdcBalance < amountBigInt) {
    const balanceFormatted = (Number(usdcBalance) / 1e6).toFixed(2);
    const amountFormatted = (Number(amountBigInt) / 1e6).toFixed(2);
    throw new Error(
      `USDC_BALANCE_INSUFFICIENT: Wallet has ${balanceFormatted} USDC but deposit requires ${amountFormatted} USDC. ` +
      `If you bridged recently, CCTP mint may still be in progress (typically 60-90 seconds).`
    );
  }

  const sdk = await getCircleSdk();

  // Step 1: Approve USDC for GhostUSDC contract
  logger.info('Ghost deposit step 1/2: approve USDC → GhostUSDC', { walletId, amount, usdcToken, ghostUsdc });
  const approveRes = await sdk.createContractExecutionTransaction({
    idempotencyKey: uuidv4(),
    walletId,
    contractAddress: usdcToken,
    abiFunctionSignature: 'approve(address,uint256)',
    abiParameters: [ghostUsdc, amount],
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
  });
  const approveTxId = (approveRes.data as Record<string, unknown>)?.id as string;
  logger.info('Ghost deposit step 1/2: approve tx submitted', { txId: approveTxId });
  if (!approveTxId) throw new Error('USDC approve for GhostUSDC failed — no tx id');
  const approveTxHash = await waitForCircleTx(sdk, approveTxId);
  logger.info('Ghost deposit step 1/2: approve confirmed', { txHash: approveTxHash });

  // Step 2: GhostUSDC.wrap(walletAddress, amount) — pulls USDC, FHE-encrypts
  // wrap() calls _erc20.safeTransferFrom(msg.sender, address(this), value)
  logger.info('Ghost deposit step 2/2: GhostUSDC.wrap()', { walletId, walletAddress, amount, ghostUsdc });
  const wrapRes = await sdk.createContractExecutionTransaction({
    idempotencyKey: uuidv4(),
    walletId,
    contractAddress: ghostUsdc,
    abiFunctionSignature: 'wrap(address,uint64)',
    abiParameters: [walletAddress, amount],
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
  });

  const wrapTxId = (wrapRes.data as Record<string, unknown>)?.id as string | undefined;
  logger.info('Ghost deposit step 2/2: wrap tx submitted', { txId: wrapTxId });
  if (!wrapTxId) throw new Error('GhostUSDC wrap failed — no transaction id');
  const txHash = await waitForCircleTx(sdk, wrapTxId);
  logger.info('Ghost deposit step 2/2: wrap confirmed', { txHash });

  logger.info('Ghost deposit complete', { walletId, txHash });

  // Yield allocation is NOT done inline — it's orchestrated by CRE as a
  // trustless Chainlink function. After this deposit, Shiva triggers:
  //   1. CRE workflow-ghost-deposit (HTTP) → compliance verify + attestation
  //   2. CRE workflow-treasury-rebalance (cron) → detects excess USDC buffer
  //      → publishes "allocate_to_yield" attestation → Shiva executes subscribe()
  // This ensures yield allocation is verifiable on-chain, not a trusted server call.

  return { txHash: txHash ?? '0x' + '0'.repeat(64) };
}

/**
 * Withdraw: unwrap GhostUSDC → async FHE decrypt → creates claim.
 * Reference API: unwrap(address to, uint64 value)
 */
export async function executeWithdraw(walletId: string, walletAddress: string, amount: string) {
  const sdk = await getCircleSdk();
  const ghostUsdc = getGhostUsdcAddress();

  logger.info('Ghost withdraw: unwrap()', { walletId, amount });
  const response = await sdk.createContractExecutionTransaction({
    idempotencyKey: uuidv4(),
    walletId,
    contractAddress: ghostUsdc,
    abiFunctionSignature: 'unwrap(address,uint64)',
    abiParameters: [walletAddress, amount],
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
  });

  const txId = (response.data as Record<string, unknown>)?.id as string | undefined;
  if (!txId) throw new Error('GhostUSDC unwrap failed — no transaction id');
  const txHash = await waitForCircleTx(sdk, txId);

  logger.info('Ghost withdraw complete', { walletId, txHash });
  return { txHash: txHash ?? '0x' + '0'.repeat(64) };
}

/**
 * Claim: eUSDCg → USDC (single Circle DCW call).
 *
 * With USDC-backed GhostUSDC, claimUnwrapped returns USDC directly
 * via FHERC20Wrapper._erc20.safeTransfer(claim.to, claim.decryptedAmount).
 * No intermediate USDg step needed.
 *
 * Note: claimUnwrapped takes bytes32 ctHash (not uint256 claimId).
 */
export async function executeClaim(walletId: string, ctHash: string) {
  const sdk = await getCircleSdk();
  const ghostUsdc = getGhostUsdcAddress();

  logger.info('Ghost claim: claimUnwrapped()', { walletId, ctHash, ghostUsdc });
  const claimRes = await sdk.createContractExecutionTransaction({
    idempotencyKey: uuidv4(),
    walletId,
    contractAddress: ghostUsdc,
    abiFunctionSignature: 'claimUnwrapped(bytes32)',
    abiParameters: [ctHash],
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
  });

  const claimTxId = (claimRes.data as Record<string, unknown>)?.id as string | undefined;
  logger.info('Ghost claim: tx submitted', { txId: claimTxId });
  if (!claimTxId) throw new Error('claimUnwrapped failed — no transaction id');
  const claimTxHash = await waitForCircleTx(sdk, claimTxId);
  logger.info('Ghost claim complete: USDC returned to wallet', { walletId, claimTxHash });

  return { txHash: claimTxHash ?? '0x' + '0'.repeat(64) };
}

/**
 * Transfer: server-friendly plaintext transfer on GhostUSDC.
 * Uses transferAmount(address,uint64) — contract encrypts internally via FHE.asEuint64().
 * PolicyEngine compliance enforced at contract level.
 */
export async function executeTransfer(walletId: string, to: string, amount: string) {
  const sdk = await getCircleSdk();
  const ghostUsdc = getGhostUsdcAddress();

  const response = await sdk.createContractExecutionTransaction({
    idempotencyKey: uuidv4(),
    walletId,
    contractAddress: ghostUsdc,
    abiFunctionSignature: 'transferAmount(address,uint64)',
    abiParameters: [to, amount],
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
  });

  const txId = (response.data as Record<string, unknown>)?.id as string | undefined;
  if (!txId) throw new Error('GhostUSDC transfer failed — no transaction id');
  const txHash = await waitForCircleTx(sdk, txId);

  logger.info('Ghost transfer complete', { walletId, txHash });
  return { txHash: txHash ?? '0x' + '0'.repeat(64) };
}

// ---------------------------------------------------------------------------
// Circle TX confirmation (same pattern as EarnExecutionService)
// ---------------------------------------------------------------------------

async function waitForCircleTx(
  sdk: Awaited<ReturnType<typeof getCircleSdk>>,
  transactionId: string,
  timeoutMs = 120_000,
): Promise<string | undefined> {
  const start = Date.now();
  const pollIntervalMs = 3_000;

  while (Date.now() - start < timeoutMs) {
    const response = await sdk.getTransaction({ id: transactionId });
    const tx = response.data?.transaction as Record<string, unknown> | undefined;
    const state = tx?.state as string | undefined;

    logger.info('Polling Circle tx', { transactionId, state, txKeys: tx ? Object.keys(tx).join(',') : 'null' });
    if (state === 'COMPLETE' || state === 'CONFIRMED') {
      const hash = (tx?.txHash ?? tx?.transactionHash) as string | undefined;
      logger.info('Circle tx confirmed', { transactionId, state, txHash: hash, tx: JSON.stringify(tx) });
      return hash;
    }
    if (state === 'FAILED' || state === 'CANCELLED') {
      logger.error('Circle tx failed', { transactionId, state, tx: JSON.stringify(tx) });
      throw new Error(`Transaction ${transactionId} ${state}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Transaction ${transactionId} timed out after ${timeoutMs}ms`);
}
