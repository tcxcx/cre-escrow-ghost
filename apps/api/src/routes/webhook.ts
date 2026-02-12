import { Hono } from "hono";
import type { Env } from "../lib/env";
import { createSupabaseClient } from "../lib/supabase";

// ── Helpers ────────────────────────────────────────────────────────────────

async function verifyCircleSignature(
  env: Env,
  bodyString: string,
  signature: string,
  keyId: string
): Promise<boolean> {
  // Fetch Circle's public key
  const response = await fetch(
    `https://api.circle.com/v2/notifications/publicKey/${keyId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${env.CIRCLE_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch public key: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const rawPublicKey = data.data.publicKey;

  // Import the public key for Web Crypto API
  const pemPublicKey = `-----BEGIN PUBLIC KEY-----\n${rawPublicKey.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----`;

  // Convert PEM to binary for Web Crypto API
  const pemContents = rawPublicKey; // already base64 without PEM headers
  const binaryDer = Uint8Array.from(atob(pemContents), (c) =>
    c.charCodeAt(0)
  );

  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );

  const signatureBytes = Uint8Array.from(atob(signature), (c) =>
    c.charCodeAt(0)
  );
  const bodyBytes = new TextEncoder().encode(bodyString);

  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    signatureBytes,
    bodyBytes
  );
}

async function updateAgreementTransaction(
  env: Env,
  supabase: ReturnType<typeof createSupabaseClient>,
  transactionId: string,
  notification: Record<string, any>
) {
  // Fetch the current status
  const { data: transactionToUpdate, error: transactionError } =
    await supabase
      .from("transactions")
      .select()
      .eq("circle_transaction_id", transactionId)
      .single();

  if (transactionError || transactionToUpdate.status === notification.state)
    return;

  // Update the transaction status
  await supabase
    .from("transactions")
    .update({
      status: notification.state,
      circle_contract_address: notification.contractAddress,
    })
    .eq("circle_transaction_id", transactionId);

  const { data: agreement, error: agreementError } = await supabase
    .from("escrow_agreements")
    .select()
    .eq(
      transactionToUpdate.escrow_agreement_id ? "id" : "transaction_id",
      transactionToUpdate.escrow_agreement_id || transactionToUpdate.id
    )
    .single();

  if (agreementError) {
    console.error(
      "Could not find an escrow agreement with the given transaction id",
      agreementError
    );
    return;
  }

  // Handle DEPLOY_CONTRACT
  if (transactionToUpdate.transaction_type === "DEPLOY_CONTRACT") {
    if (notification.state === "COMPLETE") {
      await supabase
        .from("escrow_agreements")
        .update({ status: "OPEN" })
        .eq("id", agreement.id);
      return;
    }
    if (agreement.status === "PENDING") return;
    await supabase
      .from("escrow_agreements")
      .update({ status: "PENDING" })
      .eq("id", agreement.id);
    return;
  }

  // Handle DEPOSIT_APPROVAL failure
  if (
    transactionToUpdate.transaction_type === "DEPOSIT_APPROVAL" &&
    notification.state === "FAILED"
  ) {
    await supabase
      .from("escrow_agreements")
      .update({ status: "OPEN" })
      .eq("id", agreement.id);
    return;
  }

  // Handle DEPOSIT_PAYMENT
  if (transactionToUpdate.transaction_type === "DEPOSIT_PAYMENT") {
    if (notification.state === "FAILED") {
      await supabase
        .from("escrow_agreements")
        .update({ status: "OPEN" })
        .eq("id", agreement.id);
    }
    if (notification.state !== "CONFIRMED") return;
    await supabase
      .from("escrow_agreements")
      .update({ status: "LOCKED" })
      .eq("id", agreement.id);
    return;
  }

  // Handle RELEASE_PAYMENT
  if (transactionToUpdate.transaction_type === "RELEASE_PAYMENT") {
    if (notification.state === "FAILED") {
      await supabase
        .from("escrow_agreements")
        .update({ status: "LOCKED" })
        .eq("id", agreement.id);
    }
    if (notification.state !== "CONFIRMED") return;
    await supabase
      .from("escrow_agreements")
      .update({ status: "CLOSED" })
      .eq("id", agreement.id);
  }
}

// ── Route ─────────────────────────────────────────────────────────────────

const webhook = new Hono<{ Bindings: Env }>();

webhook.post("/", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const signature = c.req.header("x-circle-signature");
    const keyId = c.req.header("x-circle-key-id");

    if (!signature || !keyId) {
      return c.json(
        { error: "Missing signature or keyId in headers" },
        400
      );
    }

    const bodyString = await c.req.text();
    const body = JSON.parse(bodyString);

    const isVerified = await verifyCircleSignature(
      c.env,
      bodyString,
      signature,
      keyId
    );

    if (!isVerified) {
      return c.json({ error: "Invalid signature" }, 403);
    }

    console.log("Received notification:", body);

    const {
      id: transactionId,
      walletId,
      state: transactionState,
    } = body.notification;

    // If a wallet balance update is needed
    if (walletId && transactionState === "CONFIRMED") {
      // Fetch wallet balance from Circle
      const balanceRes = await fetch(
        `https://api.circle.com/v2/w3s/developer/wallets/${walletId}/balances`,
        {
          headers: {
            Authorization: `Bearer ${c.env.CIRCLE_API_KEY}`,
          },
        }
      );
      const balanceData = (await balanceRes.json()) as any;
      const usdcBalance =
        balanceData.data?.tokenBalances?.find(
          (b: any) => b.token?.symbol === "USDC"
        )?.amount ?? "0";

      await supabase
        .from("wallets")
        .update({ balance: usdcBalance })
        .eq("circle_wallet_id", walletId);
    }

    await updateAgreementTransaction(
      c.env,
      supabase,
      transactionId,
      body.notification
    );

    return c.json({ received: true });
  } catch (error) {
    console.error("Failed to process notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json(
      { error: `Failed to process notification: ${message}` },
      500
    );
  }
});

// HEAD endpoint for Circle to verify endpoint availability
webhook.on("HEAD", "/", (c) => {
  return c.body(null, 200);
});

export default webhook;
