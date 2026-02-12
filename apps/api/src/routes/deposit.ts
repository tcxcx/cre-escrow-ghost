import { Hono } from "hono";
import type { Env } from "../lib/env";
import { createSupabaseClient } from "../lib/supabase";

// ── Circle SDK helper ──────────────────────────────────────────────────────

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

// ── Route ─────────────────────────────────────────────────────────────────

interface DepositRequest {
  circleContractId: string;
}

const deposit = new Hono<{ Bindings: Env }>();

deposit.post("/", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const body: DepositRequest = await c.req.json();

    if (!body.circleContractId) {
      return c.json({ error: "Missing required circleContractId" }, 400);
    }

    // Get the escrow agreement by circle_contract_id
    const { data: contractTransaction, error: contractTransactionError } =
      await supabase
        .from("escrow_agreements")
        .select()
        .eq("circle_contract_id", body.circleContractId)
        .single();

    if (contractTransactionError) {
      console.error(
        "Could not find a contract with such ID",
        contractTransactionError
      );
      return c.json(
        { error: "Could not find a contract with such ID" },
        404
      );
    }

    // For the Hono worker we use a header-based auth approach
    // The caller must provide the depositor wallet ID
    const depositorCircleWalletId = c.req.header("x-depositor-wallet-id");

    if (!depositorCircleWalletId) {
      return c.json(
        { error: "Missing x-depositor-wallet-id header" },
        401
      );
    }

    // Get contract data from Circle
    const contractData = await circleRequest(
      c.env,
      "GET",
      `/w3s/contracts/${contractTransaction.circle_contract_id}`
    );

    if (!contractData.data) {
      return c.json({ error: "Could not retrieve contract data" }, 500);
    }

    const contractAddress = contractData.data?.contract?.contractAddress;

    if (!contractAddress) {
      return c.json(
        { error: "Could not retrieve contract address" },
        500
      );
    }

    // Execute deposit on contract
    const circleDepositResponse = await circleRequest(
      c.env,
      "POST",
      "/w3s/developer/transactions/contractExecution",
      {
        walletId: depositorCircleWalletId,
        contractAddress,
        abiFunctionSignature: "deposit()",
        abiParameters: [],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      }
    );

    console.log(
      "Funds deposit transaction created:",
      circleDepositResponse.data
    );

    await supabase
      .from("escrow_agreements")
      .update({ status: "PENDING" })
      .eq("circle_contract_id", contractTransaction.circle_contract_id);

    return c.json(
      {
        success: true,
        transactionId: circleDepositResponse.data?.id,
        status: circleDepositResponse.data?.state,
        message: "Funds deposit transaction initiated",
      },
      201
    );
  } catch (error: any) {
    console.error("Error during funds deposit initialization:", error);
    return c.json(
      {
        error: "Failed to initiate funds deposit",
        details: error.message,
      },
      500
    );
  }
});

export default deposit;
