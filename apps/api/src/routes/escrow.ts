import { Hono } from "hono";
import type { Env } from "../lib/env";
import type { EscrowAgreementWithDetails } from "@repo/types/escrow";
import { createSupabaseClient } from "../lib/supabase";
import { convertUSDCToContractAmount } from "../lib/amount";

// ── Types ──────────────────────────────────────────────────────────────────

interface CreateEscrowRequest {
  agreement: EscrowAgreementWithDetails;
  agentAddress: string;
  amountUSDC: number;
}

// ── Circle SDK helpers (HTTP-based, no Node SDK needed in Workers) ─────────

async function circleRequest(
  env: Env,
  method: string,
  path: string,
  body?: any
) {
  const res = await fetch(`https://api.circle.com/v2${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.CIRCLE_API_KEY}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Circle API error ${res.status}: ${JSON.stringify(err)}`
    );
  }
  return res.json() as Promise<any>;
}

async function waitForTransactionStatus(env: Env, id: string) {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    try {
      const response = await circleRequest(
        env,
        "GET",
        `/w3s/developer/transactions/${id}`
      );

      if (!response.data) {
        throw new Error("No data returned from transaction status check");
      }

      const status = response.data.transaction?.state;
      if (status === "COMPLETE") return response.data;
      if (status === "FAILED") {
        throw new Error(
          `Transaction failed: ${response.data.transaction?.errorReason || "Unknown error"}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    } catch (error: any) {
      if (error.message?.includes("404")) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
        continue;
      }
      throw error;
    }
  }

  throw new Error("Transaction status check timeout");
}

// ── Route ─────────────────────────────────────────────────────────────────

const escrow = new Hono<{ Bindings: Env }>();

escrow.post("/", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const body: CreateEscrowRequest = await c.req.json();

    // Validate request
    if (
      !body.agreement.depositor_wallet?.wallet_address ||
      !body.agreement.beneficiary_wallet?.wallet_address ||
      !body.agentAddress ||
      !body.amountUSDC
    ) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Validate Ethereum addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (
      !addressRegex.test(body.agreement.depositor_wallet.wallet_address) ||
      !addressRegex.test(body.agreement.beneficiary_wallet.wallet_address) ||
      !addressRegex.test(body.agentAddress)
    ) {
      return c.json({ error: "Invalid Ethereum address format" }, 400);
    }

    const contractAmount = Number(
      convertUSDCToContractAmount(body.amountUSDC)
    );

    if (!c.env.CIRCLE_BLOCKCHAIN) {
      throw new Error("CIRCLE_BLOCKCHAIN environment variable is not set");
    }

    // Deploy escrow contract via Circle API
    const createResponse = await circleRequest(
      c.env,
      "POST",
      "/w3s/contracts/deploy",
      {
        name: `Escrow ${body.agreement.beneficiary_wallet.wallet_address}`,
        description: `Escrow ${body.agreement.beneficiary_wallet.wallet_address}`,
        walletId: c.env.AGENT_WALLET_ID,
        blockchain: c.env.CIRCLE_BLOCKCHAIN,
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
        constructorParameters: [
          body.agreement.depositor_wallet.wallet_address,
          body.agreement.beneficiary_wallet.wallet_address,
          c.env.AGENT_WALLET_ADDRESS,
          contractAmount,
          c.env.USDC_CONTRACT_ADDRESS,
        ],
      }
    );

    if (!createResponse.data) {
      throw new Error("No data returned from contract deployment");
    }

    // Update circle_contract_id in the agreement
    const { error: agreementError } = await supabase
      .from("escrow_agreements")
      .update({ circle_contract_id: createResponse.data.contractId })
      .eq("id", body.agreement.id);

    if (agreementError) {
      throw new Error("Failed to update Circle contract ID");
    }

    // Update circle_transaction_id in the transaction
    const { error: transactionError } = await supabase
      .from("transactions")
      .update({ circle_transaction_id: createResponse.data.transactionId })
      .eq("id", body.agreement.transaction_id);

    if (transactionError) {
      throw new Error("Failed to update Circle transaction ID");
    }

    return c.json(
      {
        success: true,
        id: createResponse.data.contractId,
        transactionId: createResponse.data.transactionId,
        status: "PENDING",
        message: "Escrow contract creation initiated",
        addresses: {
          depositor: body.agreement.depositor_wallet.wallet_address,
          beneficiary: body.agreement.beneficiary_wallet.wallet_address,
          agent: body.agentAddress,
        },
      },
      201
    );
  } catch (error: any) {
    console.error("Error creating escrow:", error);
    return c.json(
      {
        error: "Failed to create escrow contract",
        details: error.response?.data || error.message,
      },
      500
    );
  }
});

escrow.get("/", async (c) => {
  try {
    const id = c.req.query("id");

    if (!id) {
      return c.json({ error: "Transaction ID is required" }, 400);
    }

    const transactionStatus = await waitForTransactionStatus(c.env, id);

    return c.json({
      success: true,
      status: transactionStatus.transaction?.state,
      transaction: transactionStatus,
    });
  } catch (error: any) {
    console.error("Error checking transaction status:", error);
    return c.json(
      {
        error: "Failed to get transaction status",
        details: error.message,
      },
      500
    );
  }
});

export default escrow;
