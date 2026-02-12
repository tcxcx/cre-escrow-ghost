/**
 * Agent Routes — ERC-8004 agent management
 *
 * GET  /agents/erc8004           — list registered agents
 * POST /agents/erc8004/register  — register a new agent (admin)
 */

import { Hono } from "hono";
import type { Env } from "../lib/env";
import { createSupabaseClient } from "../lib/supabase";

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

export default agents;
