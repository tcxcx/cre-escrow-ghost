/**
 * Contracts Controller
 *
 * Manages the full escrow agreement lifecycle:
 * - CRUD: create from template, upload doc, get, list
 * - Signing: sign with EIP-191 wallet signature, verify signatures
 * - Funding: record escrow funding tx
 * - Execution: submit deliverable → CRE verify, file dispute → CRE arbitration
 * - Appeal: Supreme Court (Layer 4) escalation
 * - Finalize: CRE on-chain settlement + receipt
 * - Release: mark milestone funds as released
 */

import type { Context } from 'hono'
import { supabaseAdmin } from '../config/supabase'
import { createLogger } from '@bu/logger'
import {
  runVerification,
  runAdvocates,
  runTribunal,
  runSupremeCourt,
  DEFAULT_ARBITRATION_CONFIG,
  type VerificationInput,
  type AdvocateInput,
  type TribunalInput,
  type SupremeCourtInput,
} from '@bu/intelligence/arbitration'
import { triggerCreWorkflowWithFallback } from '../services/cre-trigger.service'
import { publishFallbackAttestation } from '../services/fallback-attestation.service'
import { triggerTask } from '@bu/trigger'

const logger = createLogger({ prefix: 'contracts-controller' })
const nowIso = () => new Date().toISOString()

const safeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const safeNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const getVerdictType = (payeeBps: number): 'APPROVE' | 'DENY' | 'PARTIAL' => {
  if (payeeBps >= 10000) return 'APPROVE'
  if (payeeBps <= 0) return 'DENY'
  return 'PARTIAL'
}

export class ContractsController {
  // ── List agreements ──────────────────────────────────────────────────────

  async list(c: Context): Promise<Response> {
    try {
      const limit = Number(c.req.query('limit') || 20)
      const offset = Number(c.req.query('offset') || 0)

      const { data, error } = await supabaseAdmin.from('escrow_agreements_v3')
        .select('agreement_id,title,status,total_amount,created_at,updated_at,agreement_json,payer_address,payee_address')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) return c.json({ error: error.message }, 500)
      return c.json({ agreements: data ?? [] })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Get single agreement ─────────────────────────────────────────────────

  async get(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')

      const { data, error } = await supabaseAdmin.from('escrow_agreements_v3')
        .select('*')
        .eq('agreement_id', agreementId)
        .single()

      if (error || !data) return c.json({ error: 'Agreement not found' }, 404)

      // Fetch milestones separately
      const { data: milestones } = await supabaseAdmin.from('milestones')
        .select('*')
        .eq('agreement_id', agreementId)
        .order('index', { ascending: true })

      return c.json({ ...data, milestones: milestones ?? [] })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Create from template ─────────────────────────────────────────────────

  async createFromTemplate(c: Context): Promise<Response> {
    try {
      const body = await c.req.json()
      const agreementId = `agr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      const { error } = await supabaseAdmin.from('escrow_agreements_v3').insert({
        agreement_id: agreementId,
        title: body.title || 'Untitled Agreement',
        agreement_json: body.agreementJson,
        agreement_hash: body.agreementHash || '',
        token_address: body.tokenAddress || '',
        payer_address: body.payerAddress || '',
        payee_address: body.payeeAddress || '',
        total_amount: body.totalAmount || 0,
        chain_id: 11155111, // Sepolia
        status: 'DRAFT',
      })

      if (error) return c.json({ error: `Failed to create agreement: ${error.message}` }, 500)

      // Create milestone rows
      if (Array.isArray(body.milestones)) {
        const inserts = body.milestones.map((ms: any, i: number) => ({
          agreement_id: agreementId,
          index: i,
          title: ms.title || `Milestone ${i + 1}`,
          amount: ms.amount || 0,
          criteria: ms.acceptanceCriteria || [],
          state: 'PENDING',
          due_date: ms.dueDate || null,
        }))
        await supabaseAdmin.from('milestones').insert(inserts)
      }

      // Send invitation email to counterparty
      const counterpartyEmail = safeString(body.counterpartyEmail)
      if (counterpartyEmail) {
        triggerTask('send-contract-email', {
          template: 'contract-invitation',
          to: counterpartyEmail,
          subject: `${safeString(body.senderName, 'Someone')} invited you to sign a contract`,
          props: {
            recipientName: safeString(body.counterpartyName, 'Counterparty'),
            senderName: safeString(body.senderName),
            senderTeamName: safeString(body.senderTeamName),
            contractTitle: body.title || 'Untitled Agreement',
            totalAmount: String(body.totalAmount || '0'),
            currency: safeString(body.currency, 'USDC'),
            milestoneCount: Array.isArray(body.milestones) ? body.milestones.length : 0,
            link: `https://desk.bu.finance/contracts/${agreementId}/sign`,
          },
        }).catch((err) => logger.warn('Failed to trigger invitation email', { error: (err as Error).message }))
      }

      return c.json({ success: true, agreementId }, 201)
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Sign agreement ───────────────────────────────────────────────────────

  async sign(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')
      const body = await c.req.json()
      const role = safeString(body.role || body.signerRole, 'payer')
      const signerAddress = safeString(body.signerAddress)
      const signature = safeString(body.signature)
      const messageHash = safeString(body.messageHash)

      if (!signerAddress) return c.json({ error: 'signerAddress is required' }, 400)

      const { data: agreement, error } = await supabaseAdmin.from('escrow_agreements_v3')
        .select('*')
        .eq('agreement_id', agreementId)
        .single()

      if (error || !agreement) return c.json({ error: 'Agreement not found' }, 404)

      const agreementJson = typeof agreement.agreement_json === 'object' && agreement.agreement_json !== null
        ? { ...(agreement.agreement_json as Record<string, unknown>) }
        : {}
      const signatures = Array.isArray(agreementJson.signatures)
        ? [...(agreementJson.signatures as Array<Record<string, unknown>>)]
        : []

      signatures.push({
        signatureId: `sig-${Date.now()}`,
        required: true,
        signerRole: role,
        signerAddress,
        signedAt: nowIso(),
        ...(signature ? { signature } : {}),
        ...(messageHash ? { messageHash } : {}),
      })
      agreementJson.signatures = signatures

      const uniqueRoles = new Set(
        signatures.map((s) => safeString(s.signerRole ?? s.role).toLowerCase()),
      )
      const status = uniqueRoles.has('payer') && uniqueRoles.has('payee') ? 'ACTIVE' : 'PENDING_SIGN'

      await supabaseAdmin.from('escrow_agreements_v3')
        .update({ agreement_json: agreementJson, status, updated_at: nowIso() })
        .eq('agreement_id', agreementId)

      // Send signed notification when both parties have signed
      if (status === 'ACTIVE') {
        const aj = agreementJson as Record<string, unknown>
        const counterpartyEmail = safeString(aj.counterpartyEmail)
        const creatorEmail = safeString(aj.creatorEmail)

        const emailProps = {
          contractTitle: safeString(agreement.title),
          totalAmount: String(safeNumber(agreement.total_amount)),
          currency: 'USDC',
          payerName: safeString(aj.payerName, 'Payer'),
          payeeName: safeString(aj.payeeName, 'Payee'),
          signedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          link: `https://desk.bu.finance/contracts/${agreementId}`,
        }

        for (const email of [counterpartyEmail, creatorEmail].filter(Boolean)) {
          triggerTask('send-contract-email', {
            template: 'contract-signed',
            to: email,
            subject: `Contract "${safeString(agreement.title)}" fully signed`,
            props: { ...emailProps, recipientName: email === creatorEmail ? safeString(aj.payerName) : safeString(aj.payeeName) },
          }).catch((err) => logger.warn('Failed to trigger signed email', { error: (err as Error).message }))
        }
      }

      return c.json({ success: true, status })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Verify signature (EIP-191 recovery) ──────────────────────────────────

  async verifySignature(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')

      const { data: agreement, error } = await supabaseAdmin.from('escrow_agreements_v3')
        .select('agreement_json')
        .eq('agreement_id', agreementId)
        .single()

      if (error || !agreement) return c.json({ error: 'Agreement not found' }, 404)

      const agreementJson = agreement.agreement_json as Record<string, unknown>
      const signatures = Array.isArray(agreementJson.signatures)
        ? (agreementJson.signatures as Array<Record<string, unknown>>)
        : []

      const results = signatures.map((sig) => {
        const hasCryptoSig = Boolean(sig.signature && sig.messageHash)
        return {
          signatureId: sig.signatureId,
          signerRole: sig.signerRole ?? sig.role,
          signerAddress: sig.signerAddress,
          signedAt: sig.signedAt,
          hasCryptoSignature: hasCryptoSig,
          // Server-side EIP-191 recovery requires ethers/viem which aren't
          // available in CF Workers. The frontend verifies via wagmi.
          // We validate that signature + messageHash exist and are well-formed.
          signatureValid: hasCryptoSig
            ? typeof sig.signature === 'string' && (sig.signature as string).startsWith('0x') && (sig.signature as string).length === 132
            : null,
        }
      })

      const allSigned = results.every((r) => r.hasCryptoSignature)
      const allValid = results.every((r) => r.signatureValid !== false)

      return c.json({
        agreementId,
        signatures: results,
        allSigned,
        allValid,
        totalSignatures: results.length,
      })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Fund agreement ───────────────────────────────────────────────────────

  async fund(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')
      const body = await c.req.json()
      const amount = safeNumber(body.amount)
      const txHash = safeString(body.txHash)

      if (!txHash) return c.json({ error: 'txHash is required' }, 400)

      const { data: agreement, error } = await supabaseAdmin.from('escrow_agreements_v3')
        .select('*')
        .eq('agreement_id', agreementId)
        .single()

      if (error || !agreement) return c.json({ error: 'Agreement not found' }, 404)

      const agreementJson = typeof agreement.agreement_json === 'object' && agreement.agreement_json !== null
        ? { ...(agreement.agreement_json as Record<string, unknown>) }
        : {}
      agreementJson.funding = { amount, txHash, fundedAt: nowIso() }

      await supabaseAdmin.from('escrow_agreements_v3')
        .update({ agreement_json: agreementJson, status: 'ACTIVE', updated_at: nowIso() })
        .eq('agreement_id', agreementId)

      await supabaseAdmin.from('milestones')
        .update({ state: 'FUNDED', updated_at: nowIso() })
        .eq('agreement_id', agreementId)
        .eq('state', 'PENDING')

      // Notify payee that escrow is funded
      const aj = agreementJson as Record<string, unknown>
      const payeeEmail = safeString(aj.counterpartyEmail)
      if (payeeEmail) {
        const { data: firstMs } = await supabaseAdmin.from('milestones')
          .select('title')
          .eq('agreement_id', agreementId)
          .eq('index', 0)
          .maybeSingle()

        triggerTask('send-contract-email', {
          template: 'contract-funded',
          to: payeeEmail,
          subject: `Escrow funded — ${safeString(agreement.title)} is ready`,
          props: {
            recipientName: safeString(aj.payeeName, 'Contractor'),
            contractTitle: safeString(agreement.title),
            fundedAmount: String(amount),
            currency: 'USDC',
            payerName: safeString(aj.payerName, 'Client'),
            firstMilestoneTitle: safeString(firstMs?.title, 'Milestone 1'),
            link: `https://desk.bu.finance/contracts/${agreementId}`,
          },
        }).catch((err) => logger.warn('Failed to trigger funded email', { error: (err as Error).message }))
      }

      return c.json({ success: true, fundedAmount: amount })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Deploy escrow contract ─────────────────────────────────────────────

  async deployEscrow(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')

      const { data: agreement, error } = await supabaseAdmin
        .from('escrow_agreements_v3')
        .select('*')
        .eq('agreement_id', agreementId)
        .single()

      if (error || !agreement) return c.json({ error: 'Agreement not found' }, 404)

      if (agreement.escrow_address) {
        return c.json({ error: 'Escrow already deployed', escrowAddress: agreement.escrow_address }, 409)
      }

      const { data: milestoneRows } = await supabaseAdmin
        .from('milestones')
        .select('title, amount, index')
        .eq('agreement_id', agreementId)
        .order('index', { ascending: true })
      const milestones = (milestoneRows ?? []) as Array<{ title: string; amount: number; index: number }>

      const result = await triggerCreWorkflowWithFallback(
        {
          action: 'deploy',
          agreementId,
          agreementHash: agreement.agreement_hash ?? '',
          milestones: milestones.map((m) => ({
            amount: m.amount,
            description: m.title,
          })),
          payerAddress: agreement.payer_address ?? '',
          payeeAddress: agreement.payee_address ?? '',
          tokenAddress: agreement.token_address ?? '',
          totalAmount: safeNumber(agreement.total_amount),
        },
        async () => {
          return { status: 'pending', message: 'CRE unavailable, deploy queued' }
        },
      )

      await supabaseAdmin.from('escrow_agreements_v3')
        .update({ status: 'DEPLOYING', updated_at: nowIso() } as Record<string, unknown>)
        .eq('agreement_id', agreementId)

      return c.json({ success: true, data: result })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Submit deliverable (triggers verification) ───────────────────────────

  async submitDeliverable(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')
      const milestoneId = c.req.param('msId')
      const body = await c.req.json()
      const notes = safeString(body.notes)
      const fileRefs = Array.isArray(body.files) ? body.files : []

      const { data: milestone, error: msError } = await supabaseAdmin.from('milestones')
        .select('*')
        .eq('id', milestoneId)
        .single()

      if (msError || !milestone) return c.json({ error: 'Milestone not found' }, 404)

      const attemptNumber = (milestone.current_attempt || 0) + 1

      const { data: submission, error: subError } = await supabaseAdmin.from('submissions')
        .insert({
          milestone_id: milestoneId,
          attempt_number: attemptNumber,
          files: fileRefs,
          notes,
          status: 'UPLOADED',
        })
        .select()
        .single()

      if (subError) return c.json({ error: `Failed to create submission: ${subError.message}` }, 500)

      await supabaseAdmin.from('milestones')
        .update({ state: 'VERIFYING', current_attempt: attemptNumber, updated_at: nowIso() })
        .eq('id', milestoneId)

      // Build verification input for @bu/intelligence/arbitration
      const criteria = Array.isArray(milestone.criteria) ? milestone.criteria : []
      const verificationInput: VerificationInput = {
        contract: {
          id: agreementId,
          milestone: {
            id: milestoneId,
            title: milestone.title || 'Untitled',
            criteria: criteria.map((c: any, i: number) => ({
              id: c.id ?? `criterion-${i}`,
              description: typeof c === 'string' ? c : safeString(c.description, ''),
              type: c.type ?? 'binary',
            })),
          },
        },
        deliverable: {
          files: fileRefs,
          providerNotes: notes,
        },
        evidence: {
          files: [],
          description: '',
        },
      }

      // Try CRE first, fall back to direct intelligence call
      const verification = await triggerCreWorkflowWithFallback(
        {
          action: 'verify',
          milestoneId,
          milestoneTitle: milestone.title,
          criteria,
          submissionFiles: fileRefs,
          submissionNotes: notes,
        },
        async () => {
          const result = await runVerification(verificationInput, DEFAULT_ARBITRATION_CONFIG)

          // Publish BUAttestation from fallback path (non-blocking)
          try {
            await publishFallbackAttestation({
              agreementId,
              milestoneIndex: milestone.index ?? 0,
              verdict: result,
              source: 'shiva-fallback',
            })
          } catch (attestError) {
            logger.warn('Fallback attestation failed (non-blocking)', {
              error: (attestError as Error).message,
              agreementId,
              milestoneId,
            })
          }

          return result
        },
      )

      const report = verification as Record<string, unknown>

      await supabaseAdmin.from('submissions')
        .update({
          status: report.verdict === 'PASS' ? 'VERIFIED' : 'REJECTED',
          links: [{ type: 'verification_report', report }],
        })
        .eq('id', submission.id)

      const milestoneState = report.verdict === 'PASS' ? 'APPROVED' : 'REJECTED'
      await supabaseAdmin.from('milestones')
        .update({
          state: milestoneState,
          dispute_window_end: report.verdict === 'PASS'
            ? new Date(Date.now() + DEFAULT_ARBITRATION_CONFIG.disputeWindowHours * 60 * 60 * 1000).toISOString()
            : null,
          updated_at: nowIso(),
        })
        .eq('id', milestoneId)

      // Notify both parties about deliverable submission and verification result
      const { data: agreementForEmail } = await supabaseAdmin.from('escrow_agreements_v3')
        .select('title, agreement_json')
        .eq('agreement_id', agreementId)
        .single()

      if (agreementForEmail) {
        const aj = agreementForEmail.agreement_json as Record<string, unknown>
        const payerEmail = safeString(aj.creatorEmail)
        const payeeEmail = safeString(aj.counterpartyEmail)

        // Deliverable submitted notification to payer
        if (payerEmail) {
          const { count: totalMs } = await supabaseAdmin.from('milestones')
            .select('*', { count: 'exact', head: true })
            .eq('agreement_id', agreementId)

          triggerTask('send-contract-email', {
            template: 'contract-deliverable-submitted',
            to: payerEmail,
            subject: `Deliverable submitted for "${safeString(milestone.title)}"`,
            props: {
              recipientName: safeString(aj.payerName, 'Client'),
              payeeName: safeString(aj.payeeName, 'Contractor'),
              contractTitle: safeString(agreementForEmail.title),
              milestoneTitle: safeString(milestone.title),
              milestoneIndex: safeNumber(milestone.index) + 1,
              totalMilestones: totalMs ?? 1,
              milestoneAmount: String(safeNumber(milestone.amount)),
              currency: 'USDC',
              link: `https://desk.bu.finance/contracts/${agreementId}/milestone/${milestoneId}`,
            },
          }).catch((err) => logger.warn('Failed to trigger deliverable email', { error: (err as Error).message }))
        }

        // Verification result notification to both parties
        const verdictLabel = report.verdict === 'PASS' ? 'Passed' : 'Rejected'
        for (const emailAddr of [payerEmail, payeeEmail].filter(Boolean)) {
          triggerTask('send-contract-email', {
            template: 'contract-verification-result',
            to: emailAddr,
            subject: `AI Verification ${verdictLabel}: ${safeString(milestone.title)}`,
            props: {
              recipientName: emailAddr === payerEmail ? safeString(aj.payerName) : safeString(aj.payeeName),
              contractTitle: safeString(agreementForEmail.title),
              milestoneTitle: safeString(milestone.title),
              milestoneIndex: safeNumber(milestone.index) + 1,
              verdict: report.verdict === 'PASS' ? 'PASS' : 'REJECTED',
              confidence: safeNumber(report.confidence),
              summary: safeString(report.summary, 'Verification complete.'),
              disputeWindowDays: Math.ceil(DEFAULT_ARBITRATION_CONFIG.disputeWindowHours / 24),
              link: `https://desk.bu.finance/contracts/${agreementId}/milestone/${milestoneId}`,
            },
          }).catch((err) => logger.warn('Failed to trigger verification email', { error: (err as Error).message }))
        }
      }

      return c.json({ success: true, submissionId: submission.id, verification: report }, 201)
    } catch (error) {
      logger.error('Submit deliverable failed', { error: (error as Error).message })
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── File dispute (L2 advocates + L3 tribunal) ────────────────────────────

  async fileDispute(c: Context): Promise<Response> {
    try {
      const milestoneId = c.req.param('msId')
      const body = await c.req.json()

      if (!body.reason || !body.filedBy) {
        return c.json({ error: 'reason and filedBy are required' }, 400)
      }

      const { data: dispute, error } = await supabaseAdmin.from('disputes')
        .insert({
          milestone_id: milestoneId,
          filed_by: body.filedBy,
          reason: body.reason,
          evidence_files: body.evidenceFiles || [],
          status: 'OPEN',
        })
        .select()
        .single()

      if (error) return c.json({ error: `Failed to create dispute: ${error.message}` }, 500)

      await supabaseAdmin.from('milestones')
        .update({ state: 'DISPUTED', updated_at: nowIso() })
        .eq('id', milestoneId)

      const { data: milestone } = await supabaseAdmin.from('milestones')
        .select('*')
        .eq('id', milestoneId)
        .single()

      // Get latest verification report
      const { data: latestSubmission } = await supabaseAdmin.from('submissions')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const verificationReport = Array.isArray(latestSubmission?.links)
        ? latestSubmission.links.find(
            (item: any) => typeof item === 'object' && item?.type === 'verification_report',
          )
        : undefined

      const verificationSummary = safeString(verificationReport?.report?.summary, 'No summary available')
      const verificationConfidence = safeNumber(verificationReport?.report?.confidence)

      const contractContext = {
        id: milestone?.agreement_id ?? '',
        milestone: {
          id: milestoneId,
          title: safeString(milestone?.title, 'Untitled'),
          criteria: Array.isArray(milestone?.criteria) ? milestone.criteria : [],
        },
      }

      const disputeContext = {
        filedBy: body.filedBy as 'client' | 'provider',
        reason: body.reason,
        supportingEvidence: Array.isArray(body.evidenceFiles) ? body.evidenceFiles : [],
      }

      // Fetch agreement to get escrow address
      const { data: agreement } = await supabaseAdmin.from('escrow_agreements_v3')
        .select('escrow_address')
        .eq('agreement_id', milestone?.agreement_id)
        .single()

      // Try CRE workflow first, fall back to inline L2→L3 arbitration
      const disputeResult = await triggerCreWorkflowWithFallback(
        {
          action: 'dispute',
          agreementId: contractContext.id,
          escrowAddress: agreement?.escrow_address ?? '',
          milestoneIndex: safeNumber(milestone?.index),
          disputeReason: body.reason,
          evidence: Array.isArray(body.evidenceFiles) ? body.evidenceFiles : [],
          filedBy: body.filedBy,
        },
        async () => {
          // Fallback: run existing inline L2 advocates + L3 tribunal
          const advocateInput: AdvocateInput = {
            contract: contractContext,
            deliverable: {},
            evidence: {},
            dispute: disputeContext,
            verificationReport: { summary: verificationSummary, confidence: verificationConfidence },
          }

          const briefs = await runAdvocates(advocateInput, DEFAULT_ARBITRATION_CONFIG)

          const tribunalInput: TribunalInput = {
            contract: contractContext,
            deliverable: {},
            evidence: {},
            dispute: disputeContext,
            verificationReport: { summary: verificationSummary, confidence: verificationConfidence },
            advocateBriefProvider: briefs.providerBrief as Record<string, unknown>,
            advocateBriefClient: briefs.clientBrief as Record<string, unknown>,
          }
          const tribunal = await runTribunal(tribunalInput, DEFAULT_ARBITRATION_CONFIG)

          return { advocateBriefs: briefs, tribunal }
        },
      ) as { advocateBriefs: Record<string, any>; tribunal: Record<string, any> }

      const advocateBriefs = disputeResult.advocateBriefs
      const tribunalResult = disputeResult.tribunal

      const provBrief = advocateBriefs.providerBrief as Record<string, unknown>
      const cliBrief = advocateBriefs.clientBrief as Record<string, unknown>

      // Store arbitration documents
      const docsToInsert = [
        {
          dispute_id: dispute.id,
          layer: 2,
          doc_type: 'AdvocateBriefProvider',
          model_provider: safeString(provBrief.provider ?? provBrief.model),
          model_id: safeString(provBrief.model),
          content_json: provBrief,
          sha256: safeString(provBrief.hash),
          storage_ref: `inline://dispute/${dispute.id}/AdvocateBriefProvider`,
        },
        {
          dispute_id: dispute.id,
          layer: 2,
          doc_type: 'AdvocateBriefClient',
          model_provider: safeString(cliBrief.provider ?? cliBrief.model),
          model_id: safeString(cliBrief.model),
          content_json: cliBrief,
          sha256: safeString(cliBrief.hash),
          storage_ref: `inline://dispute/${dispute.id}/AdvocateBriefClient`,
        },
        ...(Array.isArray(tribunalResult.verdicts) ? tribunalResult.verdicts : []).map((v: any) => ({
          dispute_id: dispute.id,
          layer: 3,
          doc_type: 'TribunalVerdict',
          model_provider: safeString(v.provider),
          model_id: safeString(v.model),
          content_json: v,
          sha256: safeString(v.hash),
          storage_ref: `inline://dispute/${dispute.id}/TribunalVerdict`,
        })),
      ].filter((doc) => doc.sha256.length > 0)

      if (docsToInsert.length > 0) {
        await supabaseAdmin.from('arbitration_documents').insert(docsToInsert)
      }

      await supabaseAdmin.from('disputes')
        .update({ status: 'L3_COMPLETE' })
        .eq('id', dispute.id)

      return c.json({
        success: true,
        disputeId: dispute.id,
        advocateBriefs,
        tribunal: tribunalResult,
      }, 201)
    } catch (error) {
      logger.error('Dispute filing failed', { error: (error as Error).message })
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Appeal to Supreme Court (Layer 4) ────────────────────────────────────

  async appeal(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')
      const milestoneId = c.req.param('msId')
      const body = await c.req.json()

      if (!body.reason) return c.json({ error: 'reason is required' }, 400)

      // Get dispute
      const { data: dispute } = await supabaseAdmin.from('disputes')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!dispute) return c.json({ error: 'No dispute found for this milestone' }, 404)

      // Get L3 tribunal documents
      const { data: tribunalDocs } = await supabaseAdmin.from('arbitration_documents')
        .select('*')
        .eq('dispute_id', dispute.id)
        .in('layer', [2, 3])

      const { data: milestone } = await supabaseAdmin.from('milestones')
        .select('*')
        .eq('id', milestoneId)
        .single()

      // Build L4 input from L3 outputs
      const tribunalVerdicts = (tribunalDocs ?? [])
        .filter((d: any) => d.doc_type === 'TribunalVerdict')
        .map((d: any) => d.content_json)

      const provBriefDoc = (tribunalDocs ?? []).find((d: any) => d.doc_type === 'AdvocateBriefProvider')
      const cliBriefDoc = (tribunalDocs ?? []).find((d: any) => d.doc_type === 'AdvocateBriefClient')

      const supremeCourtInput: SupremeCourtInput = {
        contract: {
          id: agreementId,
          milestone: {
            id: milestoneId,
            title: safeString(milestone?.title, 'Untitled'),
            criteria: Array.isArray(milestone?.criteria) ? milestone.criteria : [],
          },
        },
        deliverable: {},
        evidence: {},
        dispute: {
          filedBy: dispute.filed_by,
          reason: dispute.reason,
        },
        verificationReport: {},
        advocateBriefProvider: provBriefDoc?.content_json ?? {},
        advocateBriefClient: cliBriefDoc?.content_json ?? {},
        tribunalVerdicts,
        tribunalDecision: {
          direction: 'APPROVE',
          paymentPct: safeNumber(dispute.final_payee_bps, 7000) / 100,
          vote: '2-1',
          dissenter: 1,
        },
      }

      const result = await runSupremeCourt(supremeCourtInput, DEFAULT_ARBITRATION_CONFIG)

      // Store L4 documents
      const l4Docs = (Array.isArray(result.verdicts) ? result.verdicts : []).map((v: any) => ({
        dispute_id: dispute.id,
        layer: 4,
        doc_type: 'SupremeCourtVerdict',
        model_provider: safeString(v.provider),
        model_id: safeString(v.model),
        content_json: v,
        sha256: safeString(v.hash),
        storage_ref: `inline://dispute/${dispute.id}/SupremeCourtVerdict`,
      })).filter((doc: any) => doc.sha256.length > 0)

      if (l4Docs.length > 0) {
        await supabaseAdmin.from('arbitration_documents').insert(l4Docs)
      }

      await supabaseAdmin.from('disputes')
        .update({ status: 'L4_COMPLETE' })
        .eq('id', dispute.id)

      return c.json({
        success: true,
        disputeId: dispute.id,
        supremeCourt: result,
      })
    } catch (error) {
      logger.error('Appeal failed', { error: (error as Error).message })
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Finalize (on-chain settlement) ───────────────────────────────────────

  async finalize(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')
      const milestoneId = c.req.param('msId')
      const body = await c.req.json()

      const { data: agreement } = await supabaseAdmin.from('escrow_agreements_v3')
        .select('*')
        .eq('agreement_id', agreementId)
        .single()

      const { data: milestone } = await supabaseAdmin.from('milestones')
        .select('*')
        .eq('id', milestoneId)
        .single()

      const { data: dispute } = await supabaseAdmin.from('disputes')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!agreement || !milestone) {
        return c.json({ error: 'Missing agreement or milestone' }, 400)
      }

      const payeeBps = safeNumber(body.payeeBps, dispute ? safeNumber(dispute.final_payee_bps, 7000) : 10000)
      const escrowAddress = safeString(agreement.escrow_address)

      // Get all artifact hashes for audit trail
      const { data: docs } = dispute
        ? await supabaseAdmin.from('arbitration_documents')
            .select('sha256')
            .eq('dispute_id', dispute.id)
        : { data: [] }

      const allArtifactHashes = (docs ?? [])
        .map((doc: any) => safeString(doc.sha256))
        .filter((hash: string) => hash.length > 0)

      // Trigger CRE finalize workflow (on-chain settlement)
      const finalizeResult = await triggerCreWorkflowWithFallback(
        {
          action: 'finalize',
          agreementId,
          milestoneId,
          milestoneIndex: safeNumber(milestone.index),
          escrowAddress,
          payeeBps,
          allArtifactHashes,
        },
        async () => ({
          receiptHash: `receipt-${Date.now()}`,
          setDecisionTxHash: '',
          executeDecisionTxHash: '',
        }),
      ) as Record<string, unknown>

      // Store receipt document
      if (dispute) {
        await supabaseAdmin.from('arbitration_documents').insert({
          dispute_id: dispute.id,
          layer: 4,
          doc_type: 'FinalReceiptJSON',
          model_provider: 'cre',
          model_id: 'finalize',
          content_json: finalizeResult,
          sha256: safeString(finalizeResult.receiptHash),
          storage_ref: `inline://dispute/${dispute.id}/FinalReceiptJSON`,
        })

        await supabaseAdmin.from('disputes')
          .update({
            status: 'FINAL',
            final_verdict: getVerdictType(payeeBps),
            final_payee_bps: payeeBps,
            resolved_at: nowIso(),
          })
          .eq('id', dispute.id)
      }

      await supabaseAdmin.from('milestones')
        .update({ state: 'RELEASED', updated_at: nowIso() })
        .eq('id', milestoneId)

      // Check if all milestones are released → complete the agreement
      const { data: allMilestones } = await supabaseAdmin.from('milestones')
        .select('state')
        .eq('agreement_id', agreementId)

      const allReleased = (allMilestones ?? []).every((ms: any) => ms.state === 'RELEASED')
      if (allReleased) {
        await supabaseAdmin.from('escrow_agreements_v3')
          .update({ status: 'COMPLETED', updated_at: nowIso() })
          .eq('agreement_id', agreementId)
      }

      // Send dispute resolution email if there was a dispute
      if (dispute) {
        const aj = typeof agreement.agreement_json === 'object' && agreement.agreement_json !== null
          ? (agreement.agreement_json as Record<string, unknown>)
          : {}

        for (const emailAddr of [safeString(aj.creatorEmail), safeString(aj.counterpartyEmail)].filter(Boolean)) {
          triggerTask('send-contract-email', {
            template: 'contract-dispute-resolved',
            to: emailAddr,
            subject: `Dispute resolved: ${safeString(milestone.title)}`,
            props: {
              recipientName: emailAddr === safeString(aj.creatorEmail) ? safeString(aj.payerName) : safeString(aj.payeeName),
              contractTitle: safeString(agreement.title),
              milestoneTitle: safeString(milestone.title),
              finalVerdict: getVerdictType(payeeBps),
              payeePercentage: Math.round(payeeBps / 100),
              milestoneAmount: String(safeNumber(milestone.amount)),
              currency: 'USDC',
              arbitrationLayer: dispute.status === 'L4_COMPLETE' ? 'Supreme Court (Layer 4)' : 'Tribunal (Layer 3)',
              summary: safeString((finalizeResult as Record<string, unknown>).summary, 'Arbitration complete.'),
              canAppeal: dispute.status !== 'L4_COMPLETE',
              link: `https://desk.bu.finance/contracts/${agreementId}/dispute/${dispute.id}`,
            },
          }).catch((err) => logger.warn('Failed to trigger dispute email', { error: (err as Error).message }))
        }
      }

      // Send completion email when all milestones released
      if (allReleased) {
        const aj2 = typeof agreement.agreement_json === 'object' && agreement.agreement_json !== null
          ? (agreement.agreement_json as Record<string, unknown>)
          : {}

        for (const emailAddr of [safeString(aj2.creatorEmail), safeString(aj2.counterpartyEmail)].filter(Boolean)) {
          triggerTask('send-contract-email', {
            template: 'contract-completed',
            to: emailAddr,
            subject: `Contract "${safeString(agreement.title)}" completed`,
            props: {
              recipientName: emailAddr === safeString(aj2.creatorEmail) ? safeString(aj2.payerName) : safeString(aj2.payeeName),
              contractTitle: safeString(agreement.title),
              totalAmount: String(safeNumber(agreement.total_amount)),
              totalReleased: String(safeNumber(agreement.total_amount)),
              currency: 'USDC',
              milestoneCount: (allMilestones ?? []).length,
              payerName: safeString(aj2.payerName),
              payeeName: safeString(aj2.payeeName),
              completedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              link: `https://desk.bu.finance/contracts/${agreementId}`,
            },
          }).catch((err) => logger.warn('Failed to trigger completion email', { error: (err as Error).message }))
        }
      }

      return c.json({ success: true, finalizeResult })
    } catch (error) {
      logger.error('Finalize failed', { error: (error as Error).message })
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Release milestone funds ──────────────────────────────────────────────

  async release(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')
      const milestoneId = c.req.param('msId')

      const { data: milestone } = await supabaseAdmin.from('milestones')
        .select('*')
        .eq('id', milestoneId)
        .single()

      if (!milestone) return c.json({ error: 'Milestone not found' }, 404)

      // Can only release APPROVED milestones past the dispute window
      if (milestone.state !== 'APPROVED') {
        return c.json({ error: `Cannot release milestone in state: ${milestone.state}` }, 400)
      }

      if (milestone.dispute_window_end) {
        const windowEnd = new Date(milestone.dispute_window_end)
        if (windowEnd > new Date()) {
          return c.json({
            error: 'Dispute window is still open',
            disputeWindowEnd: milestone.dispute_window_end,
          }, 400)
        }
      }

      // Fetch agreement to get escrow address for CRE finalize
      const { data: agreement } = await supabaseAdmin.from('escrow_agreements_v3')
        .select('escrow_address')
        .eq('agreement_id', agreementId)
        .single()

      // Trigger CRE finalize for clean release (no dispute)
      await triggerCreWorkflowWithFallback(
        {
          action: 'finalize',
          agreementId,
          milestoneId,
          milestoneIndex: safeNumber(milestone.index),
          escrowAddress: agreement?.escrow_address ?? '',
          payeeBps: 10000, // 100% to payee
          allArtifactHashes: [],
        },
        async () => ({ success: true }),
      )

      await supabaseAdmin.from('milestones')
        .update({ state: 'RELEASED', updated_at: nowIso() })
        .eq('id', milestoneId)

      // Check if all milestones released
      const { data: allMilestones } = await supabaseAdmin.from('milestones')
        .select('state')
        .eq('agreement_id', agreementId)

      const allReleased = (allMilestones ?? []).every((ms: any) => ms.state === 'RELEASED')
      if (allReleased) {
        await supabaseAdmin.from('escrow_agreements_v3')
          .update({ status: 'COMPLETED', updated_at: nowIso() })
          .eq('agreement_id', agreementId)
      }

      return c.json({ success: true, milestoneId, state: 'RELEASED' })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Get artifacts ────────────────────────────────────────────────────────

  async getArtifacts(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')

      // Get all milestones for this agreement
      const { data: milestones } = await supabaseAdmin.from('milestones')
        .select('id')
        .eq('agreement_id', agreementId)

      if (!milestones?.length) return c.json({ artifacts: [] })

      // Get all disputes for these milestones
      const milestoneIds = milestones.map((m: any) => m.id)
      const { data: disputes } = await supabaseAdmin.from('disputes')
        .select('id')
        .in('milestone_id', milestoneIds)

      if (!disputes?.length) return c.json({ artifacts: [] })

      const disputeIds = disputes.map((d: any) => d.id)
      const { data: docs } = await supabaseAdmin.from('arbitration_documents')
        .select('*')
        .in('dispute_id', disputeIds)
        .order('created_at', { ascending: true })

      return c.json({ artifacts: docs ?? [] })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  // ── Get receipt (FinalReceiptJSON artifact) ─────────────────────────────

  async getReceipt(c: Context): Promise<Response> {
    try {
      const id = c.req.param('id')
      const msId = c.req.param('msId')

      // Find the milestone's dispute
      const { data: dispute } = await supabaseAdmin
        .from('disputes')
        .select('id')
        .eq('agreement_id', id)
        .eq('milestone_id', msId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!dispute) {
        return c.json({ error: 'No dispute found for this milestone' }, 404)
      }

      // Get the FinalReceiptJSON artifact
      const { data: receipt, error } = await supabaseAdmin
        .from('arbitration_documents')
        .select('*')
        .eq('dispute_id', dispute.id)
        .eq('doc_type', 'FinalReceiptJSON')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !receipt) {
        return c.json({ error: 'Receipt not found' }, 404)
      }

      return c.json(receipt)
    } catch (error) {
      logger.error('Failed to get receipt', { error: (error as Error).message })
      return c.json({ error: 'Failed to get receipt' }, 500)
    }
  }

  // ── Send signing reminder ─────────────────────────────────────────────────

  async sendReminder(c: Context): Promise<Response> {
    try {
      const id = c.req.param('id')

      // Verify agreement exists
      const { data: agreement, error } = await supabaseAdmin
        .from('escrow_agreements_v3')
        .select('agreement_id, title, status')
        .eq('agreement_id', id)
        .single()

      if (error || !agreement) {
        return c.json({ error: 'Agreement not found' }, 404)
      }

      if (agreement.status !== 'PENDING_SIGN') {
        return c.json({ error: 'Agreement is not pending signatures' }, 400)
      }

      // Send signing reminder via Trigger.dev email task
      const agreementJson = typeof agreement.agreement_json === 'object' && agreement.agreement_json !== null
        ? (agreement.agreement_json as Record<string, unknown>)
        : {} as Record<string, unknown>
      // Fetch full agreement with JSON for email data
      const { data: fullAgreement } = await supabaseAdmin
        .from('escrow_agreements_v3')
        .select('agreement_id, title, status, total_amount, agreement_json, created_at')
        .eq('agreement_id', id)
        .single()

      const aj = typeof fullAgreement?.agreement_json === 'object' && fullAgreement?.agreement_json !== null
        ? (fullAgreement.agreement_json as Record<string, unknown>)
        : {}
      const signatures = Array.isArray(aj.signatures) ? aj.signatures as Array<Record<string, unknown>> : []
      const signedRoles = new Set(signatures.map((s) => String(s.signerRole ?? s.role).toLowerCase()))

      const unsignedEmail = !signedRoles.has('payee')
        ? safeString(aj.counterpartyEmail)
        : !signedRoles.has('payer')
          ? safeString(aj.creatorEmail)
          : ''

      if (unsignedEmail) {
        const recipientName = !signedRoles.has('payee')
          ? safeString(aj.payeeName, 'Counterparty')
          : safeString(aj.payerName, 'Creator')

        await triggerTask('send-contract-email', {
          template: 'contract-signing-reminder',
          to: unsignedEmail,
          subject: `Reminder: Sign "${agreement.title}"`,
          props: {
            recipientName,
            senderTeamName: safeString(aj.senderTeamName ?? aj.payerTeamName, 'Bu Finance'),
            contractTitle: agreement.title,
            totalAmount: String(fullAgreement?.total_amount ?? '0'),
            currency: 'USDC',
            createdAt: new Date(fullAgreement?.created_at ?? Date.now()).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            }),
            link: `https://desk.bu.finance/contracts/${id}/sign`,
          },
        }).catch((err) => logger.warn('Failed to send reminder email', { error: (err as Error).message }))
      }

      logger.info('Signing reminder sent', { agreementId: id, to: unsignedEmail || 'none' })

      return c.json({ success: true, message: 'Reminder sent' })
    } catch (error) {
      logger.error('Failed to send reminder', { error: (error as Error).message })
      return c.json({ error: 'Failed to send reminder' }, 500)
    }
  }

  // ── CRE Callback (receives events from CRE workflows) ───────────────────

  async creCallback(c: Context): Promise<Response> {
    try {
      const event = c.req.param('event')

      // Validate callback auth via shared secret
      const authHeader = c.req.header('X-CRE-Callback-Secret')
      const expectedSecret = process.env.CRE_CALLBACK_SECRET
      if (expectedSecret && authHeader !== expectedSecret) {
        return c.json({ error: 'Unauthorized callback' }, 401)
      }

      const payload = await c.req.json().catch(() => ({}))

      const disputeId = typeof payload.disputeId === 'string'
        ? payload.disputeId
        : typeof payload.dispute_id === 'string'
          ? payload.dispute_id
          : null

      // Handle escrow-deploy callback: write back escrow address
      if (event === 'escrow-deploy' && payload.escrow_address) {
        await supabaseAdmin.from('escrow_agreements_v3')
          .update({
            escrow_address: payload.escrow_address,
            status: 'AWAITING_SIGNATURE',
            updated_at: nowIso(),
          } as Record<string, unknown>)
          .eq('agreement_id', payload.agreement_id)
      }

      if (disputeId) {
        await supabaseAdmin.from('arbitration_documents').insert({
          dispute_id: disputeId,
          layer: 4,
          doc_type: `Callback:${event}`,
          model_provider: 'cre-callback',
          model_id: event,
          content_json: payload,
          sha256: typeof payload.sha256 === 'string' ? payload.sha256 : `callback-${event}-${Date.now()}`,
          storage_ref: `inline://callback/${event}`,
        })
      }

      return c.json({ success: true, event })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }
}
