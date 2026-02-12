-- BUFI Contracts - Complete Database Schema
-- Migration: 001_initial_schema
-- Description: Initial schema for the BUFI Contracts platform
-- Created: 2026-01-30

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Contract lifecycle status
CREATE TYPE contract_status AS ENUM (
  'draft',
  'pending_sign',
  'active',
  'completed',
  'disputed',
  'cancelled'
);

-- Milestone lifecycle status
CREATE TYPE milestone_status AS ENUM (
  'pending',
  'active',
  'submitted',
  'verifying',
  'approved',
  'rejected',
  'released',
  'disputed'
);

-- Submission status
CREATE TYPE submission_status AS ENUM (
  'pending',
  'verifying',
  'approved',
  'rejected'
);

-- Party role
CREATE TYPE party_role AS ENUM (
  'payer',
  'payee'
);

-- Yield recipient type
CREATE TYPE yield_recipient_type AS ENUM (
  'payer',
  'payee',
  'split',
  'performance'
);

-- Yield strategy
CREATE TYPE yield_strategy AS ENUM (
  'aave-v3',
  'compound-v3',
  'none'
);

-- Bonus trigger type
CREATE TYPE bonus_trigger AS ENUM (
  'first_attempt',
  'early_delivery',
  'high_confidence',
  'perfect_score'
);

-- Clawback trigger type
CREATE TYPE clawback_trigger AS ENUM (
  'retry_required',
  'late_delivery',
  'dispute',
  'cancellation'
);

-- Deliverable type
CREATE TYPE deliverable_type AS ENUM (
  'pdf',
  'image',
  'figma',
  'github',
  'url',
  'zip',
  'other'
);

-- Link type
CREATE TYPE link_type AS ENUM (
  'figma',
  'github',
  'notion',
  'other'
);

-- Payment type
CREATE TYPE payment_type AS ENUM (
  'escrow_deposit',
  'milestone_release',
  'yield_distribution',
  'commission',
  'refund'
);

-- Dispute status
CREATE TYPE dispute_status AS ENUM (
  'open',
  'resolved',
  'arbitration'
);

-- Import status
CREATE TYPE import_status AS ENUM (
  'uploading',
  'processing',
  'review',
  'saving',
  'saved',
  'failed'
);

-- Clause type
CREATE TYPE clause_type AS ENUM (
  'nda',
  'ip_assignment',
  'termination',
  'liability',
  'non_compete',
  'non_solicitation',
  'dispute_resolution',
  'indemnification',
  'warranty'
);

-- Notification type
CREATE TYPE notification_type AS ENUM (
  'contract_received',
  'signature_required',
  'signature_complete',
  'funding_required',
  'funding_complete',
  'milestone_active',
  'submission_received',
  'verification_complete',
  'payment_released',
  'dispute_opened',
  'dispute_resolved',
  'yield_distributed',
  'reminder'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  bufi_handle VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  
  -- Wallet info
  primary_wallet_address VARCHAR(42),
  
  -- KYC/KYB
  kyc_verified BOOLEAN DEFAULT FALSE,
  kyc_verified_at TIMESTAMPTZ,
  kyb_verified BOOLEAN DEFAULT FALSE,
  kyb_verified_at TIMESTAMPTZ,
  
  -- Settings
  notification_preferences JSONB DEFAULT '{"email": true, "inApp": true}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- User wallets (users can have multiple wallets)
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  label VARCHAR(100),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, wallet_address, chain)
);

-- Contract templates (both system and user-created)
CREATE TABLE contract_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Template info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT 'FileText',
  tags TEXT[] DEFAULT '{}',
  
  -- Template configuration
  node_configuration JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_clauses JSONB DEFAULT '[]'::jsonb,
  
  -- Options
  require_kyc BOOLEAN DEFAULT FALSE,
  require_kyb BOOLEAN DEFAULT FALSE,
  enable_yield BOOLEAN DEFAULT TRUE,
  default_yield_strategy yield_strategy DEFAULT 'aave-v3',
  
  -- Ownership
  is_system_template BOOLEAN DEFAULT FALSE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Import source (if created from PDF import)
  source_file_name VARCHAR(255),
  source_file_hash VARCHAR(64),
  
  -- Stats
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main contracts table
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status contract_status DEFAULT 'draft',
  
  -- Template reference
  template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL,
  template_type VARCHAR(100),
  
  -- Parties (references to users table)
  payer_id UUID NOT NULL REFERENCES users(id),
  payee_id UUID NOT NULL REFERENCES users(id),
  
  -- Financial
  total_amount DECIMAL(18, 6) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDC',
  chain VARCHAR(50) NOT NULL,
  
  -- Smart contract
  smart_contract_address VARCHAR(42),
  deployment_tx_hash VARCHAR(66),
  deployment_block_number BIGINT,
  
  -- Content
  scope_of_work TEXT,
  terms TEXT,
  custom_clauses JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  funded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT different_parties CHECK (payer_id != payee_id)
);

-- Contract signatures
CREATE TABLE contract_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role party_role NOT NULL,
  
  -- Signature data
  signed BOOLEAN DEFAULT FALSE,
  signature_hash TEXT,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  
  -- Timestamps
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(contract_id, role)
);

-- Yield configuration
CREATE TABLE yield_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Strategy
  strategy yield_strategy DEFAULT 'aave-v3',
  recipient_type yield_recipient_type DEFAULT 'split',
  payer_percentage DECIMAL(5, 2) DEFAULT 50.00,
  payee_percentage DECIMAL(5, 2) DEFAULT 50.00,
  
  -- Pool/protocol addresses
  lending_pool_address VARCHAR(42),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT percentages_sum_100 CHECK (payer_percentage + payee_percentage = 100)
);

-- Yield bonuses
CREATE TABLE yield_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  yield_config_id UUID NOT NULL REFERENCES yield_configurations(id) ON DELETE CASCADE,
  
  trigger bonus_trigger NOT NULL,
  beneficiary party_role NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yield clawbacks
CREATE TABLE yield_clawbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  yield_config_id UUID NOT NULL REFERENCES yield_configurations(id) ON DELETE CASCADE,
  
  trigger clawback_trigger NOT NULL,
  beneficiary party_role DEFAULT 'payer',
  percentage DECIMAL(5, 2) NOT NULL,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yield status (real-time tracking)
CREATE TABLE yield_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Accrued amounts
  total_accrued DECIMAL(18, 6) DEFAULT 0,
  current_apy DECIMAL(8, 4) DEFAULT 0,
  
  -- Projected distributions
  projected_payer_yield DECIMAL(18, 6) DEFAULT 0,
  projected_payee_yield DECIMAL(18, 6) DEFAULT 0,
  
  -- Final (after settlement)
  final_payer_yield DECIMAL(18, 6),
  final_payee_yield DECIMAL(18, 6),
  settlement_tx_hash VARCHAR(66),
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applied bonuses
CREATE TABLE applied_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  yield_status_id UUID NOT NULL REFERENCES yield_status(id) ON DELETE CASCADE,
  bonus_id UUID NOT NULL REFERENCES yield_bonuses(id),
  milestone_id UUID,
  
  amount DECIMAL(18, 6) NOT NULL,
  reason TEXT,
  
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applied clawbacks
CREATE TABLE applied_clawbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  yield_status_id UUID NOT NULL REFERENCES yield_status(id) ON DELETE CASCADE,
  clawback_id UUID NOT NULL REFERENCES yield_clawbacks(id),
  milestone_id UUID,
  
  amount DECIMAL(18, 6) NOT NULL,
  reason TEXT,
  
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commissions
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  recipient_name VARCHAR(255) NOT NULL,
  recipient_address VARCHAR(42) NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,
  
  -- Paid tracking
  amount_paid DECIMAL(18, 6) DEFAULT 0,
  last_paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escrow status
CREATE TABLE escrow_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,
  
  total_deposited DECIMAL(18, 6) DEFAULT 0,
  current_balance DECIMAL(18, 6) DEFAULT 0,
  total_released DECIMAL(18, 6) DEFAULT 0,
  yield_earned DECIMAL(18, 6) DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  
  -- Financial
  amount DECIMAL(18, 6) NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,
  
  -- Verification
  verification_criteria TEXT,
  status milestone_status DEFAULT 'pending',
  max_retries INTEGER DEFAULT 3,
  current_attempt INTEGER DEFAULT 0,
  
  -- Timeline
  due_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(contract_id, order_index)
);

-- Deliverable requirements
CREATE TABLE deliverable_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  
  type deliverable_type NOT NULL,
  description TEXT NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  
  attempt_number INTEGER NOT NULL,
  status submission_status DEFAULT 'pending',
  notes TEXT,
  
  -- IPFS
  ipfs_hash VARCHAR(64),
  
  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- Uploaded files
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  ipfs_hash VARCHAR(64),
  deliverable_type VARCHAR(50),
  
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submission links
CREATE TABLE submission_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  type link_type DEFAULT 'other',
  validated BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Verification reports
CREATE TABLE verification_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  
  -- Result
  passed BOOLEAN NOT NULL,
  confidence DECIMAL(5, 2) NOT NULL,
  summary TEXT,
  suggestions TEXT[],
  
  -- Blockchain proof
  proof_tx_hash VARCHAR(66),
  proof_block_number BIGINT,
  proof_chain_id VARCHAR(20),
  don_nodes_count INTEGER,
  consensus_reached BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification criteria results
CREATE TABLE verification_criteria_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES verification_reports(id) ON DELETE CASCADE,
  
  criterion TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'pass', 'fail', 'partial'
  finding TEXT,
  evidence TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment records
CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  
  type payment_type NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDC',
  
  -- Recipient
  recipient_address VARCHAR(42) NOT NULL,
  recipient_name VARCHAR(255),
  
  -- Blockchain
  tx_hash VARCHAR(66) NOT NULL,
  block_number BIGINT,
  chain VARCHAR(50),
  
  -- Status
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  
  raised_by_user_id UUID NOT NULL REFERENCES users(id),
  raised_by_role party_role NOT NULL,
  
  reason TEXT NOT NULL,
  status dispute_status DEFAULT 'open',
  resolution TEXT,
  
  -- Arbitration
  arbitrator_id UUID REFERENCES users(id),
  arbitration_started_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Dispute evidence
CREATE TABLE dispute_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  submitted_by_user_id UUID NOT NULL REFERENCES users(id),
  
  description TEXT NOT NULL,
  file_url TEXT,
  file_name VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contract comments (collaboration)
CREATE TABLE contract_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  parent_id UUID REFERENCES contract_comments(id) ON DELETE CASCADE,
  
  -- Selection reference
  selection_node_id VARCHAR(100),
  selection_text TEXT,
  selection_start INTEGER,
  selection_end INTEGER,
  
  -- Comment content
  content TEXT NOT NULL,
  
  -- Status
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by_user_id UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contract share links
CREATE TABLE contract_share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  
  -- Link details
  token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  permission VARCHAR(20) DEFAULT 'view', -- 'view', 'comment', 'sign'
  
  -- Recipient (optional pre-assignment)
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  
  -- Message
  message TEXT,
  
  -- Expiry
  expires_at TIMESTAMPTZ,
  
  -- Usage tracking
  accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  -- Status
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Imported contracts (PDF import tracking)
CREATE TABLE imported_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Original file
  original_file_name VARCHAR(255) NOT NULL,
  original_file_hash VARCHAR(64) NOT NULL,
  original_file_url TEXT,
  
  -- Status
  status import_status DEFAULT 'uploading',
  error_message TEXT,
  
  -- AI extraction results
  extraction_result JSONB,
  confidence_scores JSONB,
  
  -- Result
  created_template_id UUID REFERENCES contract_templates(id),
  created_contract_id UUID REFERENCES contracts(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Extracted clauses from imported contracts
CREATE TABLE extracted_clauses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id UUID NOT NULL REFERENCES imported_contracts(id) ON DELETE CASCADE,
  
  type clause_type NOT NULL,
  detected BOOLEAN DEFAULT TRUE,
  confidence DECIMAL(5, 2),
  original_text TEXT,
  mapped_node VARCHAR(100),
  enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- Related entities
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  
  -- Action URL
  action_url TEXT,
  
  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Email
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Actor
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_wallet_address VARCHAR(42),
  
  -- Action
  action VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Related entities
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions (for custom auth)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  token_hash VARCHAR(64) NOT NULL,
  
  -- Device info
  ip_address INET,
  user_agent TEXT,
  device_name VARCHAR(255),
  
  expires_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_bufi_handle ON users(bufi_handle);
CREATE INDEX idx_users_primary_wallet ON users(primary_wallet_address);

-- User wallets
CREATE INDEX idx_user_wallets_user ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_address ON user_wallets(wallet_address);

-- Templates
CREATE INDEX idx_templates_category ON contract_templates(category);
CREATE INDEX idx_templates_created_by ON contract_templates(created_by_user_id);
CREATE INDEX idx_templates_system ON contract_templates(is_system_template);

-- Contracts
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_payer ON contracts(payer_id);
CREATE INDEX idx_contracts_payee ON contracts(payee_id);
CREATE INDEX idx_contracts_template ON contracts(template_id);
CREATE INDEX idx_contracts_created ON contracts(created_at DESC);
CREATE INDEX idx_contracts_updated ON contracts(updated_at DESC);

-- Signatures
CREATE INDEX idx_signatures_contract ON contract_signatures(contract_id);
CREATE INDEX idx_signatures_user ON contract_signatures(user_id);

-- Milestones
CREATE INDEX idx_milestones_contract ON milestones(contract_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_order ON milestones(contract_id, order_index);

-- Submissions
CREATE INDEX idx_submissions_milestone ON submissions(milestone_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- Files
CREATE INDEX idx_files_submission ON uploaded_files(submission_id);

-- Links
CREATE INDEX idx_links_submission ON submission_links(submission_id);

-- Verification reports
CREATE INDEX idx_verification_submission ON verification_reports(submission_id);

-- Payments
CREATE INDEX idx_payments_contract ON payment_records(contract_id);
CREATE INDEX idx_payments_milestone ON payment_records(milestone_id);
CREATE INDEX idx_payments_type ON payment_records(type);
CREATE INDEX idx_payments_tx ON payment_records(tx_hash);

-- Disputes
CREATE INDEX idx_disputes_contract ON disputes(contract_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- Comments
CREATE INDEX idx_comments_contract ON contract_comments(contract_id);
CREATE INDEX idx_comments_user ON contract_comments(user_id);
CREATE INDEX idx_comments_parent ON contract_comments(parent_id);

-- Share links
CREATE INDEX idx_share_links_contract ON contract_share_links(contract_id);
CREATE INDEX idx_share_links_token ON contract_share_links(token);

-- Imports
CREATE INDEX idx_imports_user ON imported_contracts(user_id);
CREATE INDEX idx_imports_status ON imported_contracts(status);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_contract ON notifications(contract_id);

-- Activity log
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_contract ON activity_log(contract_id);
CREATE INDEX idx_activity_action ON activity_log(action);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- Sessions
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate contract number
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(contract_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM contracts
  WHERE contract_number LIKE 'BUFI-' || year_part || '-%';
  
  NEW.contract_number := 'BUFI-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update milestone status when all submissions approved
CREATE OR REPLACE FUNCTION check_milestone_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE milestones
    SET status = 'approved', completed_at = NOW(), updated_at = NOW()
    WHERE id = NEW.milestone_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update contract status when all milestones completed
CREATE OR REPLACE FUNCTION check_contract_completion()
RETURNS TRIGGER AS $$
DECLARE
  all_released BOOLEAN;
BEGIN
  IF NEW.status = 'released' AND OLD.status != 'released' THEN
    SELECT NOT EXISTS(
      SELECT 1 FROM milestones 
      WHERE contract_id = NEW.contract_id AND status != 'released'
    ) INTO all_released;
    
    IF all_released THEN
      UPDATE contracts
      SET status = 'completed', completed_at = NOW(), updated_at = NOW()
      WHERE id = NEW.contract_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_yield_config_updated_at
  BEFORE UPDATE ON yield_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON contract_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Contract number generation
CREATE TRIGGER generate_contract_number_trigger
  BEFORE INSERT ON contracts
  FOR EACH ROW
  WHEN (NEW.contract_number IS NULL)
  EXECUTE FUNCTION generate_contract_number();

-- Milestone completion check
CREATE TRIGGER check_milestone_completion_trigger
  AFTER UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_milestone_completion();

-- Contract completion check
CREATE TRIGGER check_contract_completion_trigger
  AFTER UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION check_contract_completion();

-- ============================================================================
-- SEED DATA - System Templates
-- ============================================================================

INSERT INTO contract_templates (id, name, description, category, icon, tags, is_system_template, node_configuration) VALUES
  (uuid_generate_v4(), 'Freelance Service Agreement', 'Standard freelance contract with milestone payments', 'business', 'Briefcase', ARRAY['freelance', 'service', 'milestone'], TRUE, '[]'::jsonb),
  (uuid_generate_v4(), 'Milestone-Based Project', 'Project contract with defined deliverables and milestones', 'creative', 'Target', TRUE, ARRAY['project', 'milestone', 'deliverable'], '[]'::jsonb),
  (uuid_generate_v4(), 'Retainer Agreement', 'Monthly retainer with ongoing deliverables', 'business', 'RefreshCw', TRUE, ARRAY['retainer', 'ongoing', 'monthly'], '[]'::jsonb),
  (uuid_generate_v4(), 'Advisory Agreement', 'Advisor compensation with vesting schedule', 'advisory', 'Users', TRUE, ARRAY['advisor', 'equity', 'vesting'], '[]'::jsonb),
  (uuid_generate_v4(), 'Content Creation Contract', 'Video, podcast, or content production agreement', 'creative', 'Video', TRUE, ARRAY['content', 'video', 'production'], '[]'::jsonb),
  (uuid_generate_v4(), 'Software Development Agreement', 'Custom software development with code delivery', 'technical', 'Database', TRUE, ARRAY['software', 'development', 'code'], '[]'::jsonb),
  (uuid_generate_v4(), 'Design Services Agreement', 'UI/UX design with iterative delivery', 'creative', 'PenTool', TRUE, ARRAY['design', 'ui', 'ux'], '[]'::jsonb),
  (uuid_generate_v4(), 'Marketing Services Agreement', 'Marketing campaign with performance metrics', 'marketing', 'TrendingUp', TRUE, ARRAY['marketing', 'campaign', 'performance'], '[]'::jsonb),
  (uuid_generate_v4(), 'Consulting Agreement', 'Professional consulting services', 'business', 'MessageSquare', TRUE, ARRAY['consulting', 'professional', 'advice'], '[]'::jsonb),
  (uuid_generate_v4(), 'NDA / Confidentiality Agreement', 'Mutual non-disclosure agreement', 'legal', 'Shield', TRUE, ARRAY['nda', 'confidential', 'legal'], '[]'::jsonb);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Platform users with wallet connections and verification status';
COMMENT ON TABLE contracts IS 'Main contract records with party references and status tracking';
COMMENT ON TABLE milestones IS 'Contract milestones with verification criteria and payment amounts';
COMMENT ON TABLE submissions IS 'Deliverable submissions for milestone verification';
COMMENT ON TABLE verification_reports IS 'AI verification results with blockchain proof';
COMMENT ON TABLE yield_configurations IS 'Yield strategy and distribution settings per contract';
COMMENT ON TABLE disputes IS 'Contract or milestone disputes with resolution tracking';
COMMENT ON TABLE notifications IS 'User notifications for contract events';
COMMENT ON TABLE activity_log IS 'Audit trail for all contract actions';
