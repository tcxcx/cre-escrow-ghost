/**
 * Agreement Routes — Thin gateway that forwards to CRE workflows
 *
 * POST /agreements/from-template  — compile graph → AgreementJSON → store
 * POST /agreements/upload         — store raw doc → trigger CRE WF-02 analyze
 * GET  /agreements/:id            — read agreement state from Supabase
 * GET  /agreements/:id/artifacts  — list all artifacts with hashes
 * GET  /agreements/:id/milestones/:msId/receipt — read FinalReceiptJSON
 */

import { Hono } from "hono";
import type { Env } from "../lib/env";
import { createSupabaseClient } from "../lib/supabase";

const agreements = new Hono<{ Bindings: Env }>();

// ── Create from template ───────────────────────────────────────────────────

agreements.post("/from-template", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const body = await c.req.json();

    // The compiler runs in the API (lightweight, no LLM needed)
    // Store the AgreementJSON in DB
    const agreementId = `agr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { error } = await supabase.from("escrow_agreements_v3").insert({
      agreement_id: agreementId,
      title: body.title || "Untitled Agreement",
      agreement_json: body.agreementJson,
      agreement_hash: body.agreementHash || "",
      token_address: body.tokenAddress || c.env.USDC_CONTRACT_ADDRESS,
      payer_address: body.payerAddress || "",
      payee_address: body.payeeAddress || "",
      total_amount: body.totalAmount || 0,
      chain_id: 43113,
      status: "DRAFT",
    });

    if (error) {
      return c.json({ error: `Failed to create agreement: ${error.message}` }, 500);
    }

    // Create milestone rows
    if (body.milestones && Array.isArray(body.milestones)) {
      for (let i = 0; i < body.milestones.length; i++) {
        const ms = body.milestones[i];
        await supabase.from("milestones").insert({
          agreement_id: agreementId,
          index: i,
          title: ms.title || `Milestone ${i + 1}`,
          amount: ms.amount || 0,
          criteria: ms.acceptanceCriteria || [],
          state: "PENDING",
          due_date: ms.dueDate || null,
        });
      }
    }

    return c.json({
      success: true,
      agreementId,
      message: "Agreement created from template",
    }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: `Failed to create agreement: ${message}` }, 500);
  }
});

// ── Upload document (triggers CRE WF-02) ───────────────────────────────────

agreements.post("/upload", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const agreementId = `agr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Store raw document in Supabase storage
    const filePath = `raw-docs/${agreementId}/${encodeURIComponent(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("agreement-documents")
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }

    // Create a draft agreement record
    const { error: dbError } = await supabase.from("escrow_agreements_v3").insert({
      agreement_id: agreementId,
      title: file.name.replace(/\.[^.]+$/, ""),
      agreement_json: {},
      agreement_hash: "",
      token_address: c.env.USDC_CONTRACT_ADDRESS || "",
      payer_address: "",
      payee_address: "",
      total_amount: 0,
      chain_id: 43113,
      status: "DRAFT",
    });

    if (dbError) {
      return c.json({ error: `DB error: ${dbError.message}` }, 500);
    }

    // TODO: Trigger CRE WF-02 (AnalyzeDoc) via HTTP
    // const creResponse = await fetch(CRE_WORKFLOW_URL, {
    //   method: 'POST',
    //   body: JSON.stringify({ action: 'analyze', agreementId, documentUrl: filePath }),
    // })

    return c.json({
      success: true,
      agreementId,
      documentPath: filePath,
      message: "Document uploaded. Analysis will be triggered via CRE.",
    }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: `Upload failed: ${message}` }, 500);
  }
});

// ── Get agreement ──────────────────────────────────────────────────────────

agreements.get("/:id", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const agreementId = c.req.param("id");

    const { data, error } = await supabase
      .from("escrow_agreements_v3")
      .select("*, milestones(*)")
      .eq("agreement_id", agreementId)
      .single();

    if (error) {
      return c.json({ error: "Agreement not found" }, 404);
    }

    return c.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ── Submit deliverable (triggers CRE WF-07+08) ────────────────────────────

agreements.post("/:id/milestones/:msId/submit", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const agreementId = c.req.param("id");
    const milestoneId = c.req.param("msId");

    const formData = await c.req.formData();
    const notes = formData.get("notes") as string | null;

    // Get milestone
    const { data: milestone, error: msError } = await supabase
      .from("milestones")
      .select()
      .eq("id", milestoneId)
      .single();

    if (msError || !milestone) {
      return c.json({ error: "Milestone not found" }, 404);
    }

    // Upload files from formData
    const fileRefs: string[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "files" && typeof value !== "string") {
        const file = value as File;
        const filePath = `submissions/${milestoneId}/${Date.now()}_${encodeURIComponent(file.name)}`;
        await supabase.storage.from("agreement-documents").upload(filePath, file);
        fileRefs.push(filePath);
      }
    }

    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .insert({
        milestone_id: milestoneId,
        attempt_number: (milestone.current_attempt || 0) + 1,
        files: fileRefs,
        notes: notes || "",
        status: "UPLOADED",
      })
      .select()
      .single();

    if (subError) {
      return c.json({ error: `Failed to create submission: ${subError.message}` }, 500);
    }

    // Update milestone
    await supabase
      .from("milestones")
      .update({
        state: "SUBMITTED",
        current_attempt: (milestone.current_attempt || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", milestoneId);

    // TODO: Trigger CRE WF-08 (VerifyDeliverable) via HTTP
    // const crePayload = {
    //   action: 'verify',
    //   milestoneId,
    //   milestoneTitle: milestone.title,
    //   criteria: milestone.criteria,
    //   submissionFiles: fileRefs,
    //   submissionNotes: notes,
    // }

    return c.json({
      success: true,
      submissionId: submission.id,
      message: "Deliverable submitted. Verification will be triggered via CRE.",
    }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ── File dispute (triggers CRE WF-09+10+11) ───────────────────────────────

agreements.post("/:id/milestones/:msId/dispute", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const milestoneId = c.req.param("msId");
    const body = await c.req.json();

    if (!body.reason || !body.filedBy) {
      return c.json({ error: "reason and filedBy are required" }, 400);
    }

    // Create dispute record
    const { data: dispute, error } = await supabase
      .from("disputes")
      .insert({
        milestone_id: milestoneId,
        filed_by: body.filedBy,
        reason: body.reason,
        evidence_files: body.evidenceFiles || [],
        status: "OPEN",
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: `Failed to create dispute: ${error.message}` }, 500);
    }

    // Update milestone status
    await supabase
      .from("milestones")
      .update({ state: "DISPUTED", updated_at: new Date().toISOString() })
      .eq("id", milestoneId);

    // TODO: Trigger CRE WF-10+11 (DisputeToTribunal) via HTTP

    return c.json({
      success: true,
      disputeId: dispute.id,
      message: "Dispute filed. Arbitration will be triggered via CRE.",
    }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ── Get artifacts ──────────────────────────────────────────────────────────

agreements.get("/:id/artifacts", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const agreementId = c.req.param("id");

    // Get all disputes for this agreement's milestones
    const { data: milestones } = await supabase
      .from("milestones")
      .select("id")
      .eq("agreement_id", agreementId);

    if (!milestones || milestones.length === 0) {
      return c.json({ artifacts: [] });
    }

    const milestoneIds = milestones.map((m) => m.id);

    const { data: disputes } = await supabase
      .from("disputes")
      .select("id")
      .in("milestone_id", milestoneIds);

    if (!disputes || disputes.length === 0) {
      return c.json({ artifacts: [] });
    }

    const disputeIds = disputes.map((d) => d.id);

    const { data: artifacts } = await supabase
      .from("arbitration_documents")
      .select()
      .in("dispute_id", disputeIds)
      .order("created_at", { ascending: true });

    return c.json({ artifacts: artifacts || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ── Get receipt ────────────────────────────────────────────────────────────

agreements.get("/:id/milestones/:msId/receipt", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const milestoneId = c.req.param("msId");

    const { data: disputes } = await supabase
      .from("disputes")
      .select("id")
      .eq("milestone_id", milestoneId)
      .eq("status", "FINAL");

    if (!disputes || disputes.length === 0) {
      return c.json({ error: "No finalized receipt found" }, 404);
    }

    const { data: receipt } = await supabase
      .from("arbitration_documents")
      .select()
      .eq("dispute_id", disputes[0].id)
      .eq("doc_type", "FinalReceiptJSON")
      .single();

    if (!receipt) {
      return c.json({ error: "Receipt not found" }, 404);
    }

    return c.json(receipt);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default agreements;
