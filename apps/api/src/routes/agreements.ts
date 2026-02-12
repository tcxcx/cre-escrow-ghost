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
import { triggerCreWorkflow } from "../lib/cre";

const agreements = new Hono<{ Bindings: Env }>();

const nowIso = () => new Date().toISOString();

const getDocTypeFromPayeeBps = (payeeBps: number): "APPROVE" | "DENY" | "PARTIAL" => {
  if (payeeBps >= 10000) return "APPROVE";
  if (payeeBps <= 0) return "DENY";
  return "PARTIAL";
};

const safeString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const safeNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

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

agreements.get("/", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const limit = Number(c.req.query("limit") || 20);
    const offset = Number(c.req.query("offset") || 0);

    const { data, error } = await supabase
      .from("escrow_agreements_v3")
      .select("agreement_id,title,status,total_amount,created_at,updated_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ agreements: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
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
    const contentType = file.type || "application/octet-stream";
    const buffer = await file.arrayBuffer();
    const documentBase64 = Buffer.from(buffer).toString("base64");

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

    const analysis = await triggerCreWorkflow<{
      agreementJson: Record<string, unknown>;
      artifactHash: string;
      storageRef: string;
    }>(c.env, {
      action: "analyze",
      agreementId,
      fileName: file.name,
      contentType,
      documentBase64,
    });

    const milestones = Array.isArray(analysis.agreementJson.milestones)
      ? (analysis.agreementJson.milestones as Array<Record<string, unknown>>)
      : [];

    const totalAmount = milestones.reduce(
      (acc, ms) => acc + safeNumber(ms.amount, 0),
      0
    );

    await supabase
      .from("escrow_agreements_v3")
      .update({
        title: safeString(analysis.agreementJson.title, file.name.replace(/\.[^.]+$/, "")),
        agreement_json: analysis.agreementJson,
        agreement_hash: analysis.artifactHash,
        total_amount: totalAmount,
        updated_at: nowIso(),
      })
      .eq("agreement_id", agreementId);

    if (milestones.length > 0) {
      const inserts = milestones.map((ms, index) => ({
        agreement_id: agreementId,
        index,
        title: safeString(ms.title, `Milestone ${index + 1}`),
        amount: safeNumber(ms.amount, 0),
        criteria: Array.isArray(ms.acceptanceCriteria) ? ms.acceptanceCriteria : [],
        state: "PENDING",
        due_date: safeString(ms.dueDate) || null,
      }));
      await supabase.from("milestones").insert(inserts);
    }

    return c.json({
      success: true,
      agreementId,
      documentPath: filePath,
      agreementJson: analysis.agreementJson,
      message: "Document uploaded and analyzed via CRE.",
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

agreements.post("/:id/sign", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const agreementId = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const role = safeString(body.role, "payer");
    const signerAddress = safeString(body.signerAddress, "");

    const { data: agreement, error } = await supabase
      .from("escrow_agreements_v3")
      .select("*")
      .eq("agreement_id", agreementId)
      .single();

    if (error || !agreement) {
      return c.json({ error: "Agreement not found" }, 404);
    }

    const agreementJson =
      typeof agreement.agreement_json === "object" && agreement.agreement_json !== null
        ? { ...(agreement.agreement_json as Record<string, unknown>) }
        : {};
    const signatures = Array.isArray(agreementJson.signatures)
      ? [...(agreementJson.signatures as Array<Record<string, unknown>>)]
      : [];

    signatures.push({
      role,
      signerAddress,
      signedAt: nowIso(),
    });
    agreementJson.signatures = signatures;

    const uniqueRoles = new Set(
      signatures.map((signature) => safeString(signature.role).toLowerCase())
    );
    const status = uniqueRoles.has("payer") && uniqueRoles.has("payee") ? "ACTIVE" : "PENDING_SIGN";

    await supabase
      .from("escrow_agreements_v3")
      .update({
        agreement_json: agreementJson,
        status,
        updated_at: nowIso(),
      })
      .eq("agreement_id", agreementId);

    return c.json({ success: true, status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

agreements.post("/:id/fund", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const agreementId = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const amount = safeNumber(body.amount, 0);
    const txHash = safeString(body.txHash, "");

    const { data: agreement, error } = await supabase
      .from("escrow_agreements_v3")
      .select("*")
      .eq("agreement_id", agreementId)
      .single();

    if (error || !agreement) {
      return c.json({ error: "Agreement not found" }, 404);
    }

    const agreementJson =
      typeof agreement.agreement_json === "object" && agreement.agreement_json !== null
        ? { ...(agreement.agreement_json as Record<string, unknown>) }
        : {};
    agreementJson.funding = {
      amount,
      txHash,
      fundedAt: nowIso(),
    };

    await supabase
      .from("escrow_agreements_v3")
      .update({
        agreement_json: agreementJson,
        status: "ACTIVE",
        updated_at: nowIso(),
      })
      .eq("agreement_id", agreementId);

    await supabase
      .from("milestones")
      .update({ state: "FUNDED", updated_at: nowIso() })
      .eq("agreement_id", agreementId)
      .eq("state", "PENDING");

    return c.json({ success: true, fundedAmount: amount });
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
        state: "VERIFYING",
        current_attempt: (milestone.current_attempt || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", milestoneId);

    const verification = await triggerCreWorkflow<{
      verdict: "PASS" | "FAIL";
      confidence: number;
      summary: string;
      criteriaResults: unknown[];
      hash: string;
    }>(c.env, {
      action: "verify",
      milestoneId,
      milestoneTitle: milestone.title,
      criteria: Array.isArray(milestone.criteria) ? milestone.criteria : [],
      submissionFiles: fileRefs,
      submissionNotes: notes ?? "",
    });

    const verificationLink = {
      type: "verification_report",
      report: verification,
    };

    await supabase
      .from("submissions")
      .update({
        status: verification.verdict === "PASS" ? "VERIFIED" : "REJECTED",
        links: [verificationLink],
      })
      .eq("id", submission.id);

    const milestoneState = verification.verdict === "PASS" ? "APPROVED" : "REJECTED";
    await supabase
      .from("milestones")
      .update({
        state: milestoneState,
        dispute_window_end:
          verification.verdict === "PASS"
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        updated_at: nowIso(),
      })
      .eq("id", milestoneId);

    return c.json({
      success: true,
      submissionId: submission.id,
      verification,
      message: "Deliverable submitted and verified via CRE.",
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

    const { data: milestone } = await supabase
      .from("milestones")
      .select("*")
      .eq("id", milestoneId)
      .single();

    const { data: latestSubmission } = await supabase
      .from("submissions")
      .select("*")
      .eq("milestone_id", milestoneId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const verificationReport = Array.isArray(latestSubmission?.links)
      ? latestSubmission?.links.find(
          (item: unknown) =>
            typeof item === "object" &&
            item !== null &&
            "type" in item &&
            (item as { type?: string }).type === "verification_report"
        )
      : undefined;

    const verificationSummary =
      typeof verificationReport === "object" &&
      verificationReport !== null &&
      "report" in verificationReport
        ? safeString(
            (verificationReport as { report?: { summary?: string } }).report?.summary,
            "No summary available"
          )
        : "No summary available";

    const verificationConfidence =
      typeof verificationReport === "object" &&
      verificationReport !== null &&
      "report" in verificationReport
        ? safeNumber(
            (verificationReport as { report?: { confidence?: number } }).report?.confidence,
            0
          )
        : 0;

    const arbitration = await triggerCreWorkflow<{
      advocateBriefs: {
        provider: Record<string, unknown>;
        client: Record<string, unknown>;
      };
      tribunalVerdicts: Array<Record<string, unknown>>;
      aggregate: Record<string, unknown>;
      allHashes: string[];
    }>(c.env, {
      action: "dispute",
      milestoneId,
      milestoneTitle: safeString(milestone?.title, "Untitled milestone"),
      criteria: Array.isArray(milestone?.criteria) ? milestone.criteria : [],
      filedBy: body.filedBy,
      reason: body.reason,
      evidence: Array.isArray(body.evidenceFiles) ? body.evidenceFiles : [],
      verificationReportSummary: verificationSummary,
      verificationConfidence,
    });

    const docsToInsert = [
      {
        layer: 2,
        doc_type: "AdvocateBriefProvider",
        model_provider: safeString(arbitration.advocateBriefs.provider.provider),
        model_id: safeString(arbitration.advocateBriefs.provider.model),
        content_json: arbitration.advocateBriefs.provider,
        sha256: safeString(arbitration.advocateBriefs.provider.hash),
      },
      {
        layer: 2,
        doc_type: "AdvocateBriefClient",
        model_provider: safeString(arbitration.advocateBriefs.client.provider),
        model_id: safeString(arbitration.advocateBriefs.client.model),
        content_json: arbitration.advocateBriefs.client,
        sha256: safeString(arbitration.advocateBriefs.client.hash),
      },
      ...arbitration.tribunalVerdicts.map((verdict) => ({
        layer: 3,
        doc_type: "TribunalVerdict",
        model_provider: safeString(verdict.provider),
        model_id: safeString(verdict.model),
        content_json: verdict,
        sha256: safeString(verdict.hash),
      })),
      {
        layer: 3,
        doc_type: "TribunalAggregate",
        model_provider: "aggregate",
        model_id: "2of3",
        content_json: arbitration.aggregate,
        sha256: safeString(arbitration.allHashes[arbitration.allHashes.length - 1]),
      },
    ].map((doc) => ({
      dispute_id: dispute.id,
      ...doc,
      storage_ref: `inline://dispute/${dispute.id}/${doc.doc_type}`,
    }));

    const validDocs = docsToInsert.filter((doc) => doc.sha256.length > 0);
    if (validDocs.length > 0) {
      await supabase.from("arbitration_documents").insert(validDocs);
    }

    await supabase
      .from("disputes")
      .update({ status: "L3_RUNNING" })
      .eq("id", dispute.id);

    return c.json({
      success: true,
      disputeId: dispute.id,
      arbitration,
      message: "Dispute filed and sent to CRE tribunal.",
    }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

agreements.post("/:id/milestones/:msId/appeal", async (c) => {
  return c.json(
    {
      success: false,
      message: "Appeal workflow endpoint is reserved for WF-12 integration.",
    },
    501
  );
});

agreements.post("/:id/milestones/:msId/finalize", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const agreementId = c.req.param("id");
    const milestoneId = c.req.param("msId");
    const body = await c.req.json().catch(() => ({}));

    const { data: agreement } = await supabase
      .from("escrow_agreements_v3")
      .select("*")
      .eq("agreement_id", agreementId)
      .single();

    const { data: milestone } = await supabase
      .from("milestones")
      .select("*")
      .eq("id", milestoneId)
      .single();

    const { data: dispute } = await supabase
      .from("disputes")
      .select("*")
      .eq("milestone_id", milestoneId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!agreement || !milestone || !dispute) {
      return c.json({ error: "Missing agreement, milestone, or dispute context" }, 400);
    }

    const payeeBps = safeNumber(
      body.payeeBps,
      safeNumber(dispute.final_payee_bps, 7000)
    );
    const escrowAddress = safeString(agreement.escrow_address, "");
    if (!escrowAddress) {
      return c.json({ error: "Escrow address is required before finalization" }, 400);
    }

    const { data: docs } = await supabase
      .from("arbitration_documents")
      .select("sha256")
      .eq("dispute_id", dispute.id);

    const allArtifactHashes = (docs ?? [])
      .map((doc) => safeString(doc.sha256))
      .filter((hash) => hash.length > 0);

    const finalizeResult = await triggerCreWorkflow<{
      receiptHash: string;
      setDecisionTxHash: string;
      executeDecisionTxHash: string;
    }>(c.env, {
      action: "finalize",
      agreementId,
      milestoneId,
      milestoneIndex: safeNumber(milestone.index, 0),
      escrowAddress,
      payeeBps,
      allArtifactHashes,
      agentIdentities: {
        executorAgentId: safeString(body.executorAgentId, "0"),
        verifierAgentId: safeString(body.verifierAgentId, ""),
        advocateAgentIds: Array.isArray(body.advocateAgentIds) ? body.advocateAgentIds : [],
        tribunalAgentIds: Array.isArray(body.tribunalAgentIds) ? body.tribunalAgentIds : [],
      },
    });

    await supabase.from("arbitration_documents").insert({
      dispute_id: dispute.id,
      layer: 4,
      doc_type: "FinalReceiptJSON",
      model_provider: "cre",
      model_id: "wf13",
      content_json: finalizeResult,
      sha256: safeString(finalizeResult.receiptHash),
      storage_ref: `inline://dispute/${dispute.id}/FinalReceiptJSON`,
    });

    await supabase
      .from("disputes")
      .update({
        status: "FINAL",
        final_verdict: getDocTypeFromPayeeBps(payeeBps),
        final_payee_bps: payeeBps,
        resolved_at: nowIso(),
      })
      .eq("id", dispute.id);

    await supabase
      .from("milestones")
      .update({ state: "RELEASED", updated_at: nowIso() })
      .eq("id", milestoneId);

    await supabase
      .from("escrow_agreements_v3")
      .update({ status: "COMPLETED", updated_at: nowIso() })
      .eq("agreement_id", agreementId);

    if (Array.isArray(body.jurorAgentIds) && body.jurorAgentIds.length > 0) {
      await triggerCreWorkflow(c.env, {
        action: "reputation",
        disputeId: dispute.id,
        jurorAgentIds: body.jurorAgentIds,
        majorityAgentIds: Array.isArray(body.majorityAgentIds)
          ? body.majorityAgentIds
          : [],
        overturned: Boolean(body.overturned),
      });
    }

    return c.json({ success: true, finalizeResult });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

agreements.get("/:id/milestones/:msId/verification", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const milestoneId = c.req.param("msId");

    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("milestone_id", milestoneId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return c.json({ error: "No verification report found" }, 404);
    }

    const verification =
      Array.isArray(data.links) &&
      data.links.find(
        (item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          (item as { type?: string }).type === "verification_report"
      );

    if (!verification) {
      return c.json({ error: "No verification report found" }, 404);
    }

    return c.json({ verification, submissionId: data.id });
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
