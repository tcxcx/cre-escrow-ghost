-- Manual migration entrypoint for BUFI tables.
-- Run this file directly in Supabase SQL editor or psql.
--
-- Source migration:
--   supabase/migrations/001_bufi_contracts_tables.sql
--
-- This file intentionally duplicates the SQL so it can be run manually
-- without using MCP migration tooling.

-- Escrow agreements
CREATE TABLE IF NOT EXISTS public.escrow_agreements_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Agreement',
  agreement_json JSONB NOT NULL,
  agreement_hash TEXT NOT NULL,
  escrow_address TEXT,
  chain_id INT NOT NULL DEFAULT 43113,
  token_address TEXT NOT NULL,
  payer_address TEXT NOT NULL,
  payee_address TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PENDING_SIGN','ACTIVE','COMPLETED','DISPUTED','CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Milestones
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id TEXT NOT NULL,
  index INT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  criteria JSONB DEFAULT '[]'::jsonb,
  state TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (state IN ('PENDING','FUNDED','SUBMITTED','VERIFYING','APPROVED','REJECTED','DISPUTED','RELEASED','CANCELLED')),
  due_date TIMESTAMPTZ,
  max_retries INT NOT NULL DEFAULT 3,
  current_attempt INT NOT NULL DEFAULT 0,
  dispute_window_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, index)
);

-- Submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL DEFAULT 1,
  files JSONB DEFAULT '[]'::jsonb,
  links JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  ipfs_hash TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','UPLOADED','VERIFYING','VERIFIED','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  filed_by TEXT NOT NULL CHECK (filed_by IN ('payer','payee')),
  reason TEXT NOT NULL,
  evidence_files JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','L2_RUNNING','L3_RUNNING','APPEAL','FINAL')),
  final_verdict TEXT CHECK (final_verdict IN ('APPROVE','DENY','PARTIAL')),
  final_payee_bps INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Arbitration documents
CREATE TABLE IF NOT EXISTS public.arbitration_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  layer INT NOT NULL CHECK (layer BETWEEN 1 AND 4),
  doc_type TEXT NOT NULL,
  model_provider TEXT,
  model_id TEXT,
  model_version TEXT,
  content_json JSONB,
  sha256 TEXT NOT NULL,
  storage_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ERC-8004 agents
CREATE TABLE IF NOT EXISTS public.agents_erc8004 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('executor','verifier','advocate_provider','advocate_client','juror')),
  chain_id INT NOT NULL,
  identity_registry TEXT NOT NULL,
  reputation_registry TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_uri TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  agent_wallet TEXT,
  model_id TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrow_v3_agreement_id ON public.escrow_agreements_v3(agreement_id);
CREATE INDEX IF NOT EXISTS idx_milestones_agreement ON public.milestones(agreement_id);
CREATE INDEX IF NOT EXISTS idx_submissions_milestone ON public.submissions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_disputes_milestone ON public.disputes(milestone_id);
CREATE INDEX IF NOT EXISTS idx_arbitration_docs_dispute ON public.arbitration_documents(dispute_id);
CREATE INDEX IF NOT EXISTS idx_agents_kind ON public.agents_erc8004(kind);
CREATE INDEX IF NOT EXISTS idx_agents_chain ON public.agents_erc8004(chain_id);
