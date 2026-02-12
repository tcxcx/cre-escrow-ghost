/**
 * Agent Routes — ERC-8004 agent management
 *
 * GET  /agents/erc8004           — list registered agents
 * POST /agents/erc8004/register  — register a new agent (admin)
 */

import { Hono } from "hono";
import type { Env } from "../lib/env";
import { createSupabaseClient } from "../lib/supabase";
import { avalancheFuji } from "viem/chains";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { registerAgent } from "@repo/erc-8004/identity";
import { buildAllBufiRegistrations } from "@repo/erc-8004/registration";
import type { Address } from "@repo/erc-8004";

const agents = new Hono<{ Bindings: Env }>();

// ── List agents ────────────────────────────────────────────────────────────

agents.get("/", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const kind = c.req.query("kind");

    let query = supabase
      .from("agents_erc8004")
      .select()
      .order("created_at", { ascending: true });

    if (kind) {
      query = query.eq("kind", kind);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ agents: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ── Get single agent ───────────────────────────────────────────────────────

agents.get("/:agentId", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const agentId = c.req.param("agentId");

    const { data, error } = await supabase
      .from("agents_erc8004")
      .select()
      .eq("agent_id", agentId)
      .single();

    if (error || !data) {
      return c.json({ error: "Agent not found" }, 404);
    }

    return c.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ── Register agent (store in DB — on-chain registration is separate) ───────

agents.post("/register", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const body = await c.req.json();

    if (!body.kind || !body.agentId || !body.agentUri || !body.ownerAddress) {
      return c.json(
        { error: "kind, agentId, agentUri, and ownerAddress are required" },
        400
      );
    }

    const validKinds = [
      "executor",
      "verifier",
      "advocate_provider",
      "advocate_client",
      "juror",
    ];
    if (!validKinds.includes(body.kind)) {
      return c.json({ error: `Invalid kind. Must be one of: ${validKinds.join(", ")}` }, 400);
    }

    const { data, error } = await supabase
      .from("agents_erc8004")
      .insert({
        kind: body.kind,
        chain_id: body.chainId || 43113,
        identity_registry:
          body.identityRegistry ||
          "0x8004A818BFB912233c491871b3d84c89A494BD9e",
        reputation_registry:
          body.reputationRegistry ||
          "0x8004B663056A597Dffe9eCcC1965A193B7388713",
        agent_id: body.agentId,
        agent_uri: body.agentUri,
        owner_address: body.ownerAddress,
        agent_wallet: body.agentWallet || null,
        model_id: body.modelId || null,
        provider: body.provider || null,
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: `Failed to register: ${error.message}` }, 500);
    }

    return c.json({ success: true, agent: data }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

agents.post("/bootstrap", async (c) => {
  try {
    if (!c.env.ERC8004_PRIVATE_KEY) {
      return c.json({ error: "ERC8004_PRIVATE_KEY is required" }, 400);
    }

    const body = await c.req.json();
    const domain = typeof body.domain === "string" ? body.domain : "bufi.local";
    const imageBaseUrl =
      typeof body.imageBaseUrl === "string" ? body.imageBaseUrl : `https://${domain}/images/agents`;
    const identityRegistry = (
      typeof body.identityRegistry === "string"
        ? body.identityRegistry
        : "0x8004A818BFB912233c491871b3d84c89A494BD9e"
    ) as Address;
    const reputationRegistry = (
      typeof body.reputationRegistry === "string"
        ? body.reputationRegistry
        : "0x8004B663056A597Dffe9eCcC1965A193B7388713"
    ) as Address;

    const jurorModels = Array.isArray(body.jurorModels)
      ? body.jurorModels
      : [
          { provider: "anthropic", modelId: "claude-sonnet-4-5-20250929" },
          { provider: "openai", modelId: "gpt-4o" },
          { provider: "google", modelId: "gemini-2.0-flash" },
          { provider: "xai", modelId: "grok-4-fast" },
          { provider: "fireworks", modelId: "deepseek-v3" },
        ];

    const supabase = createSupabaseClient(c.env);
    const registrations = buildAllBufiRegistrations({
      domain,
      chainId: 43113,
      identityRegistry,
      imageBaseUrl,
      jurorModels,
    });

    const account = privateKeyToAccount(c.env.ERC8004_PRIVATE_KEY as Address);
    const transport = http(
      c.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc"
    );
    const publicClient = createPublicClient({ chain: avalancheFuji, transport });
    const walletClient = createWalletClient({ account, chain: avalancheFuji, transport });

    const created = [];
    for (const item of registrations) {
      const uri = JSON.stringify(item.registration);
      const txHash = await registerAgent(walletClient, identityRegistry, uri);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      const block = await publicClient.getBlock({
        blockNumber: receipt.blockNumber,
      });
      const inferredAgentId = block.number;

      const { data: row, error } = await supabase
        .from("agents_erc8004")
        .insert({
          kind: item.kind,
          chain_id: 43113,
          identity_registry: identityRegistry,
          reputation_registry: reputationRegistry,
          agent_id: inferredAgentId.toString(),
          agent_uri: uri,
          owner_address: account.address,
          agent_wallet: account.address,
          model_id: item.provider || null,
          provider: item.provider || null,
        })
        .select()
        .single();

      if (error) {
        return c.json({ error: `Failed to persist ${item.kind}: ${error.message}` }, 500);
      }

      created.push({
        kind: item.kind,
        provider: item.provider,
        txHash,
        row,
      });
    }

    return c.json({ success: true, created }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default agents;
