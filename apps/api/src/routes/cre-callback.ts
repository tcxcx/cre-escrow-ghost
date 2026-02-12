import { Hono } from "hono";
import type { Env } from "../lib/env";
import { createSupabaseClient } from "../lib/supabase";

const callbacks = new Hono<{ Bindings: Env }>();

callbacks.post("/:event", async (c) => {
  try {
    const event = c.req.param("event");
    const payload = await c.req.json().catch(() => ({}));
    const supabase = createSupabaseClient(c.env);

    const disputeId =
      typeof payload.disputeId === "string"
        ? payload.disputeId
        : typeof payload.dispute_id === "string"
          ? payload.dispute_id
          : null;

    if (disputeId) {
      await supabase.from("arbitration_documents").insert({
        dispute_id: disputeId,
        layer: 4,
        doc_type: `Callback:${event}`,
        model_provider: "cre-callback",
        model_id: event,
        content_json: payload,
        sha256: typeof payload.sha256 === "string" ? payload.sha256 : `callback-${event}-${Date.now()}`,
        storage_ref: `inline://callback/${event}`,
      });
    }

    return c.json({ success: true, event });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default callbacks;
