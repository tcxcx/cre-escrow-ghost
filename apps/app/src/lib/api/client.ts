/**
 * Typed API client helpers for the contracts/agreements endpoints.
 *
 * All functions throw on non-ok HTTP responses.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface AgreementSummary {
  agreement_id: string;
  title: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  agreement_json?: Record<string, unknown>;
  payer_address?: string;
  payee_address?: string;
  milestones?: Array<{ id: string; state: string }>;
}

export interface Agreement extends AgreementSummary {
  agreement_json: Record<string, unknown>;
  agreement_hash: string;
  token_address: string;
  payer_address: string;
  payee_address: string;
  chain_id: number;
  escrow_address?: string;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  agreement_id: string;
  index: number;
  title: string;
  amount: number;
  criteria: unknown[];
  state: string;
  due_date: string | null;
  current_attempt?: number;
  dispute_window_end?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  dispute_id: string;
  layer: number;
  doc_type: string;
  model_provider: string;
  model_id: string;
  content_json: Record<string, unknown>;
  sha256: string;
  storage_ref: string;
  created_at: string;
}

export interface MilestoneReceipt extends Artifact {
  doc_type: "FinalReceiptJSON";
}

export interface CreateFromTemplateData {
  title?: string;
  agreementJson: Record<string, unknown>;
  agreementHash?: string;
  tokenAddress?: string;
  payerAddress?: string;
  payeeAddress?: string;
  totalAmount?: number;
  milestones?: Array<{
    title?: string;
    amount?: number;
    acceptanceCriteria?: string[];
    dueDate?: string;
  }>;
  // Email fields for lifecycle notifications
  counterpartyEmail?: string;
  counterpartyName?: string;
  creatorEmail?: string;
  senderName?: string;
  senderTeamName?: string;
  payerName?: string;
  payeeName?: string;
  payerTeamName?: string;
  currency?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? (body as { error: string }).error
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * List agreements with optional pagination.
 * GET /api/contracts/agreements
 */
export async function listAgreements(
  params?: { limit?: number; offset?: number }
): Promise<{ agreements: AgreementSummary[] }> {
  return request(`/api/contracts/agreements${qs({ limit: params?.limit, offset: params?.offset })}`);
}

/**
 * Get a single agreement by ID (includes milestones).
 * GET /api/contracts/agreements/:id
 */
export async function getAgreement(id: string): Promise<Agreement> {
  return request(`/api/contracts/agreements/${encodeURIComponent(id)}`);
}

/**
 * Create an agreement from a template.
 * POST /api/contracts/agreements/from-template
 */
export async function createAgreementFromTemplate(
  data: CreateFromTemplateData
): Promise<{ success: true; agreementId: string; message: string }> {
  return request("/api/contracts/agreements/from-template", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/**
 * Trigger on-chain escrow deployment for an agreement.
 * POST /api/contracts/agreements/:id/deploy-escrow
 */
export async function deployEscrow(
  agreementId: string
): Promise<{ success: boolean; data: unknown }> {
  return request(`/api/contracts/agreements/${encodeURIComponent(agreementId)}/deploy-escrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Get all artifacts (arbitration documents) for an agreement.
 * GET /api/contracts/agreements/:contractId/artifacts
 */
export async function getAgreementArtifacts(
  contractId: string
): Promise<{ artifacts: Artifact[] }> {
  return request(`/api/contracts/agreements/${encodeURIComponent(contractId)}/artifacts`);
}

/**
 * Get the finalized receipt for a milestone.
 * GET /api/contracts/agreements/:contractId/milestones/:milestoneId/receipt
 */
export async function getMilestoneReceipt(
  contractId: string,
  milestoneId: string
): Promise<MilestoneReceipt> {
  return request(
    `/api/contracts/agreements/${encodeURIComponent(contractId)}/milestones/${encodeURIComponent(milestoneId)}/receipt`
  );
}

/**
 * File a dispute against a milestone.
 * POST /api/contracts/agreements/:contractId/milestones/:milestoneId/dispute
 */
export interface FileDisputeData {
  reason: string;
  filedBy: 'payer' | 'payee';
  evidenceFiles?: string[];
}

export interface FileDisputeResponse {
  success: true;
  disputeId: string;
  arbitration: Record<string, unknown>;
  message: string;
}

export async function fileDispute(
  contractId: string,
  milestoneId: string,
  data: FileDisputeData
): Promise<FileDisputeResponse> {
  return request(
    `/api/contracts/agreements/${encodeURIComponent(contractId)}/milestones/${encodeURIComponent(milestoneId)}/dispute`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
}
