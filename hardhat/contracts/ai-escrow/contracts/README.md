
# BUFI Contracts

### *PandaDocs meets escrow — with adversarial AI arbitration.*

BUFI Contracts makes smart contracts actually smart:

* **Clients get delivery guarantees**
* **Providers get payment guarantees**
* **Disputes are resolved automatically by adversarial AI**
* **Escrow releases/refunds execute on-chain**
* **Every decision is auditable** via hashes + immutable document storage
* **Jurors and agents are discoverable via ERC-8004 (Trustless Agents)**

---

## What this repo contains

This codebase implements:

* **Contract ingestion + analysis**
  PDF/DOCX → machine-readable agreement (milestones + acceptance criteria)

* **Escrow deployment + deposit + release/revert**
  Circle Smart Contract Platform + Developer Controlled Wallets

* **AI verification + multi-layer arbitration**
  Happy path + disputes + appeals

* **On-chain/off-chain audit trail**
  JSON reports → SHA-256 → Supabase/IPFS storage

* **ERC-8004 agent identity registration**
  BUFI oracle agent + juror agents (tribunal / supreme court)

---

## System overview

### Happy path (no disputes)

1. Upload contract (PDF/DOCX)
2. AI extracts amounts + milestones + acceptance criteria
3. Escrow contract is deployed and funded
4. Provider submits deliverable
5. **Layer 1 Verifier** checks deliverable against criteria
6. If PASS with confidence ≥ threshold → dispute window opens
7. If no dispute → escrow releases to provider

---

### Dispute path

If either party disputes:

* **Layer 2: AI Advocates** generate the strongest argument for each side
* **Layer 3: AI Tribunal** (3 different providers) votes 2/3 majority
* If split decision (2–1), an appeal window opens
* **Layer 4: AI Supreme Court** (5 different providers excluding L3 providers) can overturn only by 4/5

All decisions are:

* serialized to JSON
* hashed (SHA-256)
* stored off-chain (Supabase / IPFS)
* referenced in the dispute audit trail

---

## Layers

### Layer 1 — AI Verifier

Evaluates deliverable vs acceptance criteria (handles ~85–90% of cases).

**Outputs**

* `VerificationReport` (JSON + SHA-256)

---

### Layer 2 — AI Advocates (adversarial)

Two models from the same provider:

* Advocate A argues for provider
* Advocate B argues for client

**Outputs**

* `AdvocateBrief_Provider`
* `AdvocateBrief_Client`

---

### Layer 3 — AI Tribunal

3 models from 3 different providers vote independently.

**Outputs**

* 3× `TribunalVerdict`
* `TribunalDecision_Aggregate`

---

### Layer 4 — AI Supreme Court

5 models from 5 different providers (excluding L3) handle appeals.
Overturn requires **4/5**.

**Outputs**

* 5× `SupremeCourtVerdict`
* `SupremeCourtDecision_Aggregate`

---

## ERC-8004: Trustless Agents

This project registers:

* the **BUFI Oracle Agent** (the on-chain executor)
* **Juror Agents** (providers used in tribunal/supreme court)

on the ERC-8004 **IdentityRegistry**, so agents are discoverable and can accumulate reputation signals over time.

Each agent identity:

* is an ERC-721 token (`agentId`)
* points to an `agentURI` JSON registration file
* can later receive standardized feedback via the **ReputationRegistry**

---

## Repo entry points (today)

### Contract analysis

`POST /api/contracts/analyze`
Accepts PDF/DOCX and returns JSON with extracted amounts and tasks (and milestones/criteria in newer versions).

---

### Escrow

* `POST /api/contracts/escrow` deploys the escrow contract
* `POST /api/contracts/escrow/deposit/approve` approves USDC allowance
* `POST /api/contracts/escrow/deposit` deposits into escrow

---

### Work validation (legacy Layer 1 demo)

`POST /api/contracts/validate-work`
Validates an image deliverable and releases escrow if valid.

---

### Circle webhook

`POST /api/webhook/circle`
Updates transaction and escrow agreement state from Circle notifications.

---

## Environment variables (high level)

You will need:

* Circle API keys for Smart Contract Platform + DCW
* `CIRCLE_BLOCKCHAIN`
* `NEXT_PUBLIC_USDC_CONTRACT_ADDRESS`
* `NEXT_PUBLIC_AGENT_WALLET_ID`
* `NEXT_PUBLIC_AGENT_WALLET_ADDRESS`
* Supabase project keys

(See `.env.example` if present; otherwise create one.)

---

## Roadmap

* **v0.1**: Layer 1 + dispute scaffolding + document hashing + Supabase storage
* **v0.2**: Full Layers 1–4 + ERC-8004 registration flows
* **v0.3**: Partial payments + split escrow (`EscrowWithAgentV2`)
* **v0.4**: Chainlink CRE workflows for decentralized verification/consensus

---

## Notes / constraints

* v0.1 escrow supports **full release or full revert only**.
  “Partial” decisions are recorded but not executed until escrow supports splitting.

* The system is designed so **no human is in the decision loop** and every output is auditable.

---

If you want, I can also add a **1-paragraph “Why BUFI Contracts exists”** at the top that hits like a landing page (very PandaDocs-ish) *and* a **Quickstart** section with bun/turbo commands once you paste your repo’s scripts.
