import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./lib/env";

import analyze from "./routes/analyze";
import escrow from "./routes/escrow";
import deposit from "./routes/deposit";
import depositApprove from "./routes/deposit-approve";
import validateWork from "./routes/validate-work";
import webhook from "./routes/webhook";
import agreements from "./routes/agreements";
import agents from "./routes/agents";
import creCallback from "./routes/cre-callback";

const app = new Hono<{ Bindings: Env }>();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", cors());

// ── Health check ──────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok" }));

// ── Contract routes ───────────────────────────────────────────────────────
app.route("/contracts/analyze", analyze);
app.route("/contracts/escrow", escrow);
app.route("/contracts/escrow/deposit", deposit);
app.route("/contracts/escrow/deposit/approve", depositApprove);
app.route("/contracts/validate-work", validateWork);

// ── BUFI Contracts v3 routes ──────────────────────────────────────────────
app.route("/agreements", agreements);
app.route("/agents/erc8004", agents);
app.route("/cre/callback", creCallback);

// ── Webhook ───────────────────────────────────────────────────────────────
app.route("/webhook", webhook);

// ── Fallback ──────────────────────────────────────────────────────────────
app.all("*", (c) =>
  c.json({ message: "Not found", docs: "/health" }, 404)
);

export default app;
