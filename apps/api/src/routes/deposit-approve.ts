import { Hono } from "hono";
import type { Env } from "../lib/env";
import { createSupabaseClient } from "../lib/supabase";
import { createAgreementService } from "@repo/services/agreement";
import { parseAmount, convertUSDCToContractAmount } from "../lib/amount";

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

interface DepositApproveRequest {
  circleContractId: string;
}

const depositApprove = new Hono<{ Bindings: Env }>();

depositApprove.post("/", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const agreementService = createAgreementService(supabase);
    const body: DepositApproveRequest = await c.req.json();

    if (!body.circleContractId) {
      return c.json({ error: "Missing required circleContractId" }, 400);
    }

    // Get the escrow agreement
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

    // The caller must provide wallet info via headers
    const depositorCircleWalletId = c.req.header("x-depositor-wallet-id");
    const depositorWalletId = c.req.header("x-depositor-wallet-db-id");
    const depositorProfileId = c.req.header("x-depositor-profile-id");

    if (
      !depositorCircleWalletId ||
      !depositorWalletId ||
      !depositorProfileId
    ) {
      return c.json(
        {
          error:
            "Missing required headers: x-depositor-wallet-id, x-depositor-wallet-db-id, x-depositor-profile-id",
        },
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

    const parsedAmount = parseAmount(
      contractTransaction.terms.amounts?.[0]?.amount ??
        contractTransaction.terms.amounts?.[0]?.full_amount ??
        "0"
    );
    const contractAmount = Number(
      convertUSDCToContractAmount(parsedAmount)
    );

    // Approve USDC spending
    const circleApprovalResponse = await circleRequest(
      c.env,
      "POST",
      "/w3s/developer/transactions/contractExecution",
      {
        abiFunctionSignature: "approve(address,uint256)",
        abiParameters: [contractAddress, contractAmount],
        contractAddress: c.env.USDC_CONTRACT_ADDRESS,
        fee: { type: "level", config: { feeLevel: "HIGH" } },
        walletId: depositorCircleWalletId,
      }
    );

    // Record the approval transaction
    await agreementService.createTransaction({
      walletId: depositorWalletId,
      circleTransactionId: circleApprovalResponse.data?.id,
      escrowAgreementId: contractTransaction.id,
      transactionType: "DEPOSIT_APPROVAL",
      profileId: depositorProfileId,
      amount: parsedAmount,
      description: "Request for deposit approval",
    });

    console.log(
      "Deposit approval transaction created:",
      circleApprovalResponse.data
    );

    await supabase
      .from("escrow_agreements")
      .update({ status: "PENDING" })
      .eq("circle_contract_id", contractData.data.contract.id);

    return c.json(
      {
        success: true,
        transactionId: circleApprovalResponse.data?.id,
        status: circleApprovalResponse.data?.state,
        message: "Funds deposit approval initiated",
      },
      201
    );
  } catch (error: any) {
    console.error("Error during deposit approval:", error);
    return c.json(
      {
        error: "Failed to initiate deposit approval",
        details: error.message,
      },
      500
    );
  }
});

export default depositApprove;
