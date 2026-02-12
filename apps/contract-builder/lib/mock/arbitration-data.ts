import type {
  DisputeRecord,
  VerificationReport,
  AdvocateBrief,
  TribunalDecision,
  SupremeCourtDecision,
  AuditDocument,
} from '@/types/arbitration'

// =============================================================================
// Layer 1 — AI Verification Report
// =============================================================================

const verificationReport: VerificationReport = {
  reportId: 'vr-001',
  timestamp: '2026-02-01T14:30:00Z',
  model: { provider: 'Anthropic', modelId: 'claude-sonnet-4-5-20250929', version: '2025-09-29' },
  verdict: 'PASS',
  confidence: 72,
  criteriaEvaluation: [
    {
      criterionId: 'c1',
      criterionDescription: 'Responsive website with 5+ pages matching approved wireframes',
      met: true,
      confidence: 91,
      reasoning: 'All 5 pages implemented with responsive breakpoints. Layout matches wireframes within acceptable tolerance. Minor spacing differences on mobile noted but within acceptable range.',
    },
    {
      criterionId: 'c2',
      criterionDescription: 'Performance: Lighthouse score >= 90 on all pages',
      met: true,
      confidence: 95,
      reasoning: 'Lighthouse scores: Home 94, About 92, Services 91, Portfolio 93, Contact 90. All meet or exceed the 90 threshold.',
    },
    {
      criterionId: 'c3',
      criterionDescription: 'CMS integration with ability to edit all text content',
      met: false,
      confidence: 62,
      reasoning: 'CMS is integrated for blog posts and main pages. However, footer content and navigation labels are hardcoded. The criterion states "all text content" which is ambiguous — it could mean all primary content or literally every text string.',
    },
    {
      criterionId: 'c4',
      criterionDescription: 'Cross-browser compatibility (Chrome, Firefox, Safari, Edge)',
      met: true,
      confidence: 88,
      reasoning: 'Tested across all four browsers. Consistent rendering confirmed. Minor CSS gradient difference in Safari noted but does not affect functionality.',
    },
  ],
  summary: 'The deliverable passes 3 of 4 criteria with high confidence. Criterion C3 (CMS integration) is a borderline case — the CMS covers primary content but not all text elements. The confidence of 72 reflects this ambiguity. Recommend dispute window with advisory flag.',
  evidenceAnalyzed: ['website-deploy-url', 'lighthouse-reports.zip', 'cms-admin-screenshot.png', 'browser-testing-matrix.pdf'],
  hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
}

// =============================================================================
// Layer 2 — AI Advocate Briefs
// =============================================================================

const advocateBriefProvider: AdvocateBrief = {
  briefId: 'ab-provider-001',
  timestamp: '2026-02-04T10:00:00Z',
  advocateRole: 'pro_provider',
  model: { provider: 'Anthropic', modelId: 'claude-sonnet-4-5-20250929', version: '2025-09-29' },
  positionSummary: 'The provider has substantially fulfilled all contract obligations. The website meets all specified technical criteria, with the CMS integration covering all primary and editable content. The criterion for "all text content" should be interpreted in the context of standard CMS practice, where navigation and structural elements are typically managed through code rather than CMS. The provider delivered a high-quality product that exceeds performance benchmarks.',
  criteriaAnalysis: [
    {
      criterionId: 'c1',
      criterionDescription: 'Responsive website with 5+ pages matching approved wireframes',
      position: 'met',
      argument: 'All 5 pages are implemented with full responsive design. The AI verifier confirmed layouts match wireframes. Minor spacing variations are well within industry-standard tolerance and do not constitute a breach of the criterion.',
      evidenceCited: ['wireframe-comparison.pdf', 'responsive-screenshots.zip'],
    },
    {
      criterionId: 'c2',
      criterionDescription: 'Performance: Lighthouse score >= 90',
      position: 'met',
      argument: 'Every single page exceeds the 90 threshold. The lowest score is 90 (Contact page) which still meets the requirement. Average score of 92 demonstrates exceptional performance optimization.',
      evidenceCited: ['lighthouse-reports.zip'],
    },
    {
      criterionId: 'c3',
      criterionDescription: 'CMS integration with ability to edit all text content',
      position: 'met',
      argument: 'The CMS covers all user-facing content that a content editor would reasonably need to change: page titles, body text, blog posts, meta descriptions, and image alt text. Navigation labels and footer content are structural elements that change extremely rarely and are standard practice to manage through code deployments. The phrase "all text content" in a CMS context industry-standardly refers to editable content, not hardcoded structural elements. No reasonable client would expect footer copyright text to be CMS-managed.',
      evidenceCited: ['cms-admin-screenshot.png', 'cms-content-audit.xlsx'],
    },
    {
      criterionId: 'c4',
      criterionDescription: 'Cross-browser compatibility',
      position: 'met',
      argument: 'Full compatibility confirmed across all four specified browsers. The minor Safari gradient difference is a known WebKit rendering variation that does not affect user experience.',
      evidenceCited: ['browser-testing-matrix.pdf'],
    },
  ],
  keyArguments: [
    {
      argument: 'The provider exceeded the performance benchmark on every page, demonstrating exceptional technical skill and attention to quality.',
      strength: 'strong',
      evidence: ['lighthouse-reports.zip'],
    },
    {
      argument: 'The CMS criterion should be interpreted using the "reasonable person" standard — no CMS implementation in industry practice manages 100% of text strings through the CMS interface.',
      strength: 'strong',
      evidence: ['industry-cms-standards.md'],
    },
    {
      argument: 'The client approved the CMS architecture during the design review phase and did not raise concerns about footer/nav management at that time.',
      strength: 'moderate',
      evidence: ['design-review-approval-email.pdf'],
    },
  ],
  recommendedVerdict: 'APPROVE',
  recommendedAmountPct: 100,
  hash: 'b2c3d4e5f67890123456789012345678abcdef1234567890abcdef1234567890',
}

const advocateBriefClient: AdvocateBrief = {
  briefId: 'ab-client-001',
  timestamp: '2026-02-04T10:05:00Z',
  advocateRole: 'pro_client',
  model: { provider: 'Anthropic', modelId: 'claude-sonnet-4-5-20250929', version: '2025-09-29' },
  positionSummary: 'The provider failed to meet Criterion C3 as written. The contract explicitly states "all text content" — not "most text content" or "primary content." The provider chose to hardcode footer and navigation text, which violates the plain language of the agreement. Additionally, the AI verifier assigned only 62% confidence to C3, confirming uncertainty. When a deliverable fails to clearly meet a criterion, the burden of proof falls on the provider to demonstrate compliance, not the client to demonstrate non-compliance.',
  criteriaAnalysis: [
    {
      criterionId: 'c1',
      criterionDescription: 'Responsive website with 5+ pages matching approved wireframes',
      position: 'met',
      argument: 'While the pages are generally responsive, "minor spacing differences on mobile" were noted. The criterion requires matching approved wireframes, and deviations — however minor — constitute partial non-compliance.',
      evidenceCited: ['wireframe-comparison.pdf'],
    },
    {
      criterionId: 'c2',
      criterionDescription: 'Performance: Lighthouse score >= 90',
      position: 'met',
      argument: 'Performance criteria met. No dispute on this criterion.',
      evidenceCited: ['lighthouse-reports.zip'],
    },
    {
      criterionId: 'c3',
      criterionDescription: 'CMS integration with ability to edit all text content',
      position: 'not_met',
      argument: 'The contract states "all text content" without qualification. Footer text, navigation labels, and contact information are text content that a client may need to update (e.g., phone number change, copyright year, navigation restructuring). The provider\'s decision to hardcode these elements directly contradicts the written criterion. The provider should have requested clarification if they believed the scope was ambiguous rather than unilaterally deciding which text to exclude. The 62% confidence score from the AI verifier supports the position that this criterion is not clearly met.',
      evidenceCited: ['cms-admin-screenshot.png', 'contract-criteria-section.pdf'],
    },
    {
      criterionId: 'c4',
      criterionDescription: 'Cross-browser compatibility',
      position: 'met',
      argument: 'Generally compatible, though the Safari rendering difference should be documented as a known limitation.',
      evidenceCited: ['browser-testing-matrix.pdf'],
    },
  ],
  keyArguments: [
    {
      argument: 'Contract language is unambiguous: "all text content" means all text content. Courts consistently interpret contract terms by their plain meaning.',
      strength: 'strong',
      evidence: ['contract-criteria-section.pdf'],
    },
    {
      argument: 'The AI verifier itself was only 62% confident that C3 was met — below the 80% threshold. This confirms the deliverable does not clearly satisfy the criterion.',
      strength: 'strong',
      evidence: ['verification-report.json'],
    },
    {
      argument: 'The provider should have sought clarification on ambiguous criteria before delivery. Proceeding with assumptions and then arguing interpretation after the fact shifts risk unfairly to the client.',
      strength: 'moderate',
      evidence: [],
    },
  ],
  recommendedVerdict: 'PARTIAL',
  recommendedAmountPct: 75,
  hash: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678ab',
}

// =============================================================================
// Layer 3 — AI Tribunal
// =============================================================================

const tribunalDecision: TribunalDecision = {
  direction: 'APPROVE',
  paymentPct: 90,
  unanimous: false,
  appealable: true,
  vote: '2-1',
  dissenter: 3,
  verdicts: [
    {
      verdictId: 'tv-judge1',
      timestamp: '2026-02-05T08:00:00Z',
      judgeIndex: 1,
      model: { provider: 'Anthropic', modelId: 'claude-sonnet-4-5-20250929', version: '2025-09-29' },
      verdict: 'APPROVE',
      paymentPct: 95,
      confidence: 82,
      reasoning: {
        summary: 'The provider substantially met all contract obligations. The CMS criterion ambiguity does not warrant withholding payment. I recommend 95% release with 5% withheld to cover the cost of a minor CMS scope extension.',
        criteriaAnalysis: [
          { criterionId: 'c1', met: true, reasoning: 'Pages match wireframes within standard tolerance.' },
          { criterionId: 'c2', met: true, reasoning: 'All pages exceed the 90 Lighthouse threshold.' },
          { criterionId: 'c3', met: true, reasoning: 'CMS covers all reasonably editable content. The provider\'s interpretation of "all text content" is the industry-standard reading.' },
          { criterionId: 'c4', met: true, reasoning: 'Cross-browser compatibility confirmed.' },
        ],
        responseToAdvocateA: 'I agree with the provider advocate that the "reasonable person" standard applies. However, I note that the provider could have been more proactive in documenting scope assumptions.',
        responseToAdvocateB: 'The client advocate raises a valid textual argument, but contract interpretation should consider industry context, not just literal reading. The 62% confidence reflects ambiguity, not failure.',
      },
      hash: 'd4e5f6789012345678901234567890abcdef1234567890abcdef123456789abc',
    },
    {
      verdictId: 'tv-judge2',
      timestamp: '2026-02-05T08:15:00Z',
      judgeIndex: 2,
      model: { provider: 'OpenAI', modelId: 'gpt-4o', version: '2024-08-06' },
      verdict: 'PARTIAL',
      paymentPct: 85,
      confidence: 78,
      reasoning: {
        summary: 'The provider met three of four criteria clearly. Criterion C3 is genuinely ambiguous. Given the ambiguity, a partial payment of 85% is fair — recognizing the substantial work completed while acknowledging the scope gap. The remaining 15% should be held pending CMS scope resolution.',
        criteriaAnalysis: [
          { criterionId: 'c1', met: true, reasoning: 'Wireframe matching confirmed within tolerance.' },
          { criterionId: 'c2', met: true, reasoning: 'Lighthouse scores all pass.' },
          { criterionId: 'c3', met: false, reasoning: 'The literal reading of "all text content" is not met. While industry practice supports the provider\'s interpretation, the written criterion is the governing document. Ambiguity should not default in favor of the provider.' },
          { criterionId: 'c4', met: true, reasoning: 'Cross-browser compatibility confirmed.' },
        ],
        responseToAdvocateA: 'The industry-standard argument has merit but is weakened by the contract\'s explicit language. If the provider wanted a narrower scope, they should have specified "primary content" in the criterion.',
        responseToAdvocateB: 'The literal interpretation is compelling but I stop short of a full denial. Three of four criteria are clearly met, and the CMS provides substantial content management capability.',
      },
      hash: 'e5f6789012345678901234567890abcdef1234567890abcdef123456789abcde',
    },
    {
      verdictId: 'tv-judge3',
      timestamp: '2026-02-05T08:30:00Z',
      judgeIndex: 3,
      model: { provider: 'Google', modelId: 'gemini-2.0-flash', version: '2025-01' },
      verdict: 'DENY',
      paymentPct: 0,
      confidence: 71,
      reasoning: {
        summary: 'The deliverable does not meet Criterion C3 as written. The contract is the binding document, and "all text content" is clear. The provider delivered a product that fails to meet the agreed specification. While the work has value, the contract terms must be enforced as written to maintain the integrity of the escrow system.',
        criteriaAnalysis: [
          { criterionId: 'c1', met: true, reasoning: 'Pages match wireframes.' },
          { criterionId: 'c2', met: true, reasoning: 'Performance criteria met.' },
          { criterionId: 'c3', met: false, reasoning: 'Plain language reading: "all text content" means all text content. The provider failed to deliver what was specified. Industry practice is irrelevant — the contract governs.' },
          { criterionId: 'c4', met: true, reasoning: 'Browser compatibility confirmed.' },
        ],
        responseToAdvocateA: 'The reasonable person standard has merit in some contexts, but when contract language is explicit, it should be enforced as written. The provider assumed risk by not seeking clarification.',
        responseToAdvocateB: 'I agree with the client advocate. The contract terms are clear, and the provider\'s unilateral scope decision is not a valid defense.',
      },
      hash: 'f6789012345678901234567890abcdef1234567890abcdef123456789abcdef0',
    },
  ],
}

// =============================================================================
// Layer 4 — AI Supreme Court (since tribunal was 2-1)
// =============================================================================

const supremeCourtDecision: SupremeCourtDecision = {
  overturned: false,
  finalDirection: 'APPROVE',
  paymentPct: 90,
  vote: '3-2',
  verdicts: [
    {
      verdictId: 'sc-judge1',
      timestamp: '2026-02-07T12:00:00Z',
      judgeIndex: 1,
      model: { provider: 'Mistral', modelId: 'mistral-large', version: '2025-01' },
      verdict: 'APPROVE',
      paymentPct: 90,
      confidence: 80,
      reasoning: {
        summary: 'The tribunal majority correctly applied industry-standard interpretation. Payment of 90% is fair.',
        criteriaAnalysis: [
          { criterionId: 'c3', met: true, reasoning: 'Industry context supports the provider\'s CMS implementation as substantially complete.' },
        ],
        responseToAdvocateA: 'Agreed — industry standards should contextualize contract language.',
        responseToAdvocateB: 'Valid textual argument but insufficient to override majority.',
        responseToTribunalMajority: 'The majority reasoning is sound. The 90% figure appropriately balances the ambiguity.',
        responseToTribunalDissent: 'Judge 3\'s strict textualist approach, while internally consistent, fails to account for the practical reality of CMS implementations.',
        upholdsTribunal: true,
      },
      hash: 'sc1-hash-placeholder',
    },
    {
      verdictId: 'sc-judge2',
      timestamp: '2026-02-07T12:10:00Z',
      judgeIndex: 2,
      model: { provider: 'Meta', modelId: 'llama-3.3-70b', version: '2025-01' },
      verdict: 'DENY',
      paymentPct: 50,
      confidence: 68,
      reasoning: {
        summary: 'The contract language is clear. While the provider did substantial work, the CMS criterion is not met as written.',
        criteriaAnalysis: [
          { criterionId: 'c3', met: false, reasoning: 'The text says "all" — this is not ambiguous.' },
        ],
        responseToAdvocateA: 'Industry standards cannot override explicit contract terms.',
        responseToAdvocateB: 'Agree with the plain-language reading.',
        responseToTribunalMajority: 'The majority gives too much weight to industry practice over contract text.',
        responseToTribunalDissent: 'Judge 3\'s textualist approach is correct. However, a full denial is too harsh given 3/4 criteria clearly met. 50% is more appropriate.',
        upholdsTribunal: false,
      },
      hash: 'sc2-hash-placeholder',
    },
    {
      verdictId: 'sc-judge3',
      timestamp: '2026-02-07T12:20:00Z',
      judgeIndex: 3,
      model: { provider: 'Cohere', modelId: 'command-r-plus', version: '2025-01' },
      verdict: 'APPROVE',
      paymentPct: 85,
      confidence: 76,
      reasoning: {
        summary: 'Substantial compliance warrants majority payment. The provider delivered 90%+ of the agreed scope.',
        criteriaAnalysis: [
          { criterionId: 'c3', met: true, reasoning: 'Substantial compliance with reasonable interpretation of scope.' },
        ],
        responseToAdvocateA: 'Strong argument on industry standards.',
        responseToAdvocateB: 'Textual argument is valid but context matters.',
        responseToTribunalMajority: 'Concur with the majority approach.',
        responseToTribunalDissent: 'Full denial for a partial scope gap is disproportionate.',
        upholdsTribunal: true,
      },
      hash: 'sc3-hash-placeholder',
    },
    {
      verdictId: 'sc-judge4',
      timestamp: '2026-02-07T12:30:00Z',
      judgeIndex: 4,
      model: { provider: 'xAI', modelId: 'grok-2', version: '2025-01' },
      verdict: 'DENY',
      paymentPct: 60,
      confidence: 72,
      reasoning: {
        summary: 'The contract terms should be enforced as written. However, the work completed has significant value.',
        criteriaAnalysis: [
          { criterionId: 'c3', met: false, reasoning: 'The criterion is explicit. "All" means "all."' },
        ],
        responseToAdvocateA: 'The industry standard argument is interesting but not dispositive.',
        responseToAdvocateB: 'Plain language reading is correct.',
        responseToTribunalMajority: 'The majority underweights the explicit contract language.',
        responseToTribunalDissent: 'Correct on interpretation, too harsh on remedy.',
        upholdsTribunal: false,
      },
      hash: 'sc4-hash-placeholder',
    },
    {
      verdictId: 'sc-judge5',
      timestamp: '2026-02-07T12:40:00Z',
      judgeIndex: 5,
      model: { provider: 'Amazon', modelId: 'nova-pro', version: '2025-01' },
      verdict: 'APPROVE',
      paymentPct: 92,
      confidence: 81,
      reasoning: {
        summary: 'The provider substantially performed. The CMS gap is minor relative to the total scope of work. 92% payment reflects the minor shortfall.',
        criteriaAnalysis: [
          { criterionId: 'c3', met: true, reasoning: 'Substantial performance doctrine applies. The gap is de minimis.' },
        ],
        responseToAdvocateA: 'Agreed on industry standards and reasonable interpretation.',
        responseToAdvocateB: 'While the literal argument has merit, proportional remedy is more appropriate than full denial.',
        responseToTribunalMajority: 'Sound reasoning and proportionate outcome.',
        responseToTribunalDissent: 'Strict textualism without proportional remedy produces unjust outcomes.',
        upholdsTribunal: true,
      },
      hash: 'sc5-hash-placeholder',
    },
  ],
}

// =============================================================================
// Audit Trail
// =============================================================================

const auditTrail: AuditDocument[] = [
  { id: 'doc-1', layer: 1, type: 'VerificationReport', title: 'AI Verification Report', hash: verificationReport.hash, ipfsCid: 'QmVerification...', timestamp: '2026-02-01T14:30:00Z' },
  { id: 'doc-2', layer: 2, type: 'AdvocateBrief_Provider', title: 'Provider Advocate Brief', hash: advocateBriefProvider.hash, ipfsCid: 'QmAdvProv...', timestamp: '2026-02-04T10:00:00Z' },
  { id: 'doc-3', layer: 2, type: 'AdvocateBrief_Client', title: 'Client Advocate Brief', hash: advocateBriefClient.hash, ipfsCid: 'QmAdvClient...', timestamp: '2026-02-04T10:05:00Z' },
  { id: 'doc-4', layer: 3, type: 'TribunalVerdict_Judge1', title: 'Tribunal Judge 1 (Anthropic)', hash: tribunalDecision.verdicts[0].hash, ipfsCid: 'QmTribunal1...', timestamp: '2026-02-05T08:00:00Z' },
  { id: 'doc-5', layer: 3, type: 'TribunalVerdict_Judge2', title: 'Tribunal Judge 2 (OpenAI)', hash: tribunalDecision.verdicts[1].hash, ipfsCid: 'QmTribunal2...', timestamp: '2026-02-05T08:15:00Z' },
  { id: 'doc-6', layer: 3, type: 'TribunalVerdict_Judge3', title: 'Tribunal Judge 3 (Google)', hash: tribunalDecision.verdicts[2].hash, ipfsCid: 'QmTribunal3...', timestamp: '2026-02-05T08:30:00Z' },
  { id: 'doc-7', layer: 3, type: 'TribunalDecision_Aggregate', title: 'Tribunal Aggregate Decision', hash: 'agg-tribunal-hash', ipfsCid: 'QmTribunalAgg...', timestamp: '2026-02-05T09:00:00Z' },
  { id: 'doc-8', layer: 4, type: 'SupremeCourtVerdict_1', title: 'Supreme Court Judge 1 (Mistral)', hash: 'sc1-hash-placeholder', ipfsCid: 'QmSC1...', timestamp: '2026-02-07T12:00:00Z' },
  { id: 'doc-9', layer: 4, type: 'SupremeCourtVerdict_2', title: 'Supreme Court Judge 2 (Meta)', hash: 'sc2-hash-placeholder', ipfsCid: 'QmSC2...', timestamp: '2026-02-07T12:10:00Z' },
  { id: 'doc-10', layer: 4, type: 'SupremeCourtVerdict_3', title: 'Supreme Court Judge 3 (Cohere)', hash: 'sc3-hash-placeholder', ipfsCid: 'QmSC3...', timestamp: '2026-02-07T12:20:00Z' },
  { id: 'doc-11', layer: 4, type: 'SupremeCourtVerdict_4', title: 'Supreme Court Judge 4 (xAI)', hash: 'sc4-hash-placeholder', ipfsCid: 'QmSC4...', timestamp: '2026-02-07T12:30:00Z' },
  { id: 'doc-12', layer: 4, type: 'SupremeCourtVerdict_5', title: 'Supreme Court Judge 5 (Amazon)', hash: 'sc5-hash-placeholder', ipfsCid: 'QmSC5...', timestamp: '2026-02-07T12:40:00Z' },
  { id: 'doc-13', layer: 4, type: 'SupremeCourtDecision_Aggregate', title: 'Supreme Court Aggregate Decision', hash: 'agg-sc-hash', ipfsCid: 'QmSCAgg...', timestamp: '2026-02-07T13:00:00Z' },
]

// =============================================================================
// Full Dispute Record (all layers complete — final state)
// =============================================================================

export const mockDisputeFullRecord: DisputeRecord = {
  id: 'dispute-arb-001',
  contractId: 'contract-5',
  contractName: 'Brand Identity & Website Redesign',
  milestoneId: 'ms-3',
  milestoneName: 'Website Development & CMS Integration',
  filedBy: 'payer',
  filedAt: '2026-02-01T18:00:00Z',
  reason: 'CMS integration does not cover all text content as specified in contract criteria C3.',
  supportingEvidence: ['contract-criteria-section.pdf', 'cms-admin-screenshot.png'],
  disputedAmount: 12000,
  currency: 'USDC',
  phase: 'final',
  escrowState: 'FINAL_SPLIT',
  verificationReport,
  advocateBriefProvider,
  advocateBriefClient,
  tribunalDecision,
  supremeCourtDecision,
  disputeWindowEnd: '2026-02-04T14:30:00Z',
  appealWindowEnd: '2026-02-07T09:00:00Z',
  resolvedAt: '2026-02-07T13:00:00Z',
  finalVerdict: 'PARTIAL',
  finalPaymentPct: 90,
  auditTrail,
}

// Dispute in tribunal_decided phase (waiting for possible appeal)
export const mockDisputeTribunalPhase: DisputeRecord = {
  ...mockDisputeFullRecord,
  id: 'dispute-arb-002',
  phase: 'tribunal_decided',
  escrowState: 'TRIBUNAL_DECIDED',
  supremeCourtDecision: undefined,
  resolvedAt: undefined,
  finalVerdict: undefined,
  finalPaymentPct: undefined,
  auditTrail: auditTrail.filter(d => d.layer <= 3),
}

// Dispute in advocates phase (briefs being generated)
export const mockDisputeAdvocatesPhase: DisputeRecord = {
  ...mockDisputeFullRecord,
  id: 'dispute-arb-003',
  phase: 'advocates',
  escrowState: 'DISPUTED',
  advocateBriefProvider: undefined,
  advocateBriefClient: undefined,
  tribunalDecision: undefined,
  supremeCourtDecision: undefined,
  appealWindowEnd: undefined,
  resolvedAt: undefined,
  finalVerdict: undefined,
  finalPaymentPct: undefined,
  auditTrail: auditTrail.filter(d => d.layer <= 1),
}
