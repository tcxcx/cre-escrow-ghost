// @ts-nocheck
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { AgreementJSON } from '../agreement/schema'

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#333333',
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerMetaItem: {
    fontSize: 8,
    color: '#666666',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 8,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  value: {
    fontSize: 9,
    color: '#333333',
    marginBottom: 6,
  },
  partiesRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  partyBox: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 4,
    marginRight: 8,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 4,
  },
  partyRole: {
    fontSize: 8,
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 7,
    color: '#666666',
    fontFamily: 'Courier',
  },
  // Milestones table
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  colIndex: { width: 30 },
  colTitle: { flex: 1 },
  colAmount: { width: 80, textAlign: 'right' },
  colDueDate: { width: 80, textAlign: 'right' },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#666666',
    textTransform: 'uppercase',
  },
  tableCell: {
    fontSize: 9,
    color: '#333333',
  },
  // Value section
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#CCCCCC',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  totalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  // Clauses
  clauseTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#222222',
    marginBottom: 4,
    marginTop: 8,
  },
  clauseContent: {
    fontSize: 9,
    color: '#444444',
    lineHeight: 1.5,
    marginBottom: 8,
  },
  // Dispute
  disputeBox: {
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 4,
    marginTop: 8,
  },
  disputeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  // Signatures
  signatureBox: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 4,
    marginRight: 8,
    minHeight: 80,
  },
  signatureRole: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    marginTop: 24,
    marginBottom: 4,
  },
  signatureMeta: {
    fontSize: 7,
    color: '#888888',
    fontFamily: 'Courier',
    marginBottom: 2,
  },
  awaitingText: {
    fontSize: 9,
    color: '#999999',
    fontStyle: 'italic',
    marginTop: 12,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#999999',
  },
  pageNumber: {
    fontSize: 7,
    color: '#999999',
  },
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(rawAmount: string, currency: string): string {
  const num = Number(rawAmount) / 1_000_000
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function secondsToDays(seconds: number): string {
  const days = Math.round(seconds / 86400)
  return `${days} day${days !== 1 ? 's' : ''}`
}

function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

// ── Component ───────────────────────────────────────────────────────────────

export function AgreementPdf({ agreement }: { agreement: AgreementJSON }) {
  const payer = agreement.parties.find((p) => p.role === 'payer')
  const payee = agreement.parties.find((p) => p.role === 'payee')

  const totalAmount = agreement.milestones.reduce(
    (sum, m) => sum + Number(m.amount),
    0,
  )

  const protocolFeeBps = agreement.fees?.protocolFeeBps ?? 50
  const protocolFee = Math.round(totalAmount * (protocolFeeBps / 10000))

  // Default dispute config for summary
  const defaultDispute = agreement.milestones[0]?.dispute

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>{agreement.title}</Text>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaItem}>
              Agreement ID: {agreement.agreementId}
            </Text>
            <Text style={styles.headerMetaItem}>
              Currency: {agreement.currency}
            </Text>
            <Text style={styles.headerMetaItem}>
              Chain: {agreement.chain}
            </Text>
          </View>
        </View>

        {/* ── Parties ─────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Parties</Text>
        <View style={styles.partiesRow}>
          {payer && (
            <View style={styles.partyBox}>
              <Text style={styles.partyRole}>Payer</Text>
              <Text style={styles.partyName}>{payer.name}</Text>
              {payer.email && (
                <Text style={styles.value}>{payer.email}</Text>
              )}
              {payer.walletAddress && (
                <Text style={styles.walletAddress}>
                  {payer.walletAddress}
                </Text>
              )}
            </View>
          )}
          {payee && (
            <View style={[styles.partyBox, { marginRight: 0 }]}>
              <Text style={styles.partyRole}>Payee</Text>
              <Text style={styles.partyName}>{payee.name}</Text>
              {payee.email && (
                <Text style={styles.value}>{payee.email}</Text>
              )}
              {payee.walletAddress && (
                <Text style={styles.walletAddress}>
                  {payee.walletAddress}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* ── Contract Value ──────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Contract Value</Text>
        <View style={{ marginBottom: 16 }}>
          <View style={styles.valueRow}>
            <Text style={styles.value}>Subtotal</Text>
            <Text style={styles.value}>
              {formatAmount(String(totalAmount), agreement.currency)}
            </Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.value}>
              Protocol Fee ({bpsToPercent(protocolFeeBps)})
            </Text>
            <Text style={styles.value}>
              {formatAmount(String(protocolFee), agreement.currency)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatAmount(
                String(totalAmount + protocolFee),
                agreement.currency,
              )}
            </Text>
          </View>
        </View>

        {/* ── Milestones ──────────────────────────────────────────── */}
        {agreement.milestones.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Milestones</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colIndex]}>#</Text>
              <Text style={[styles.tableHeaderText, styles.colTitle]}>
                Title
              </Text>
              <Text style={[styles.tableHeaderText, styles.colDueDate]}>
                Due Date
              </Text>
              <Text style={[styles.tableHeaderText, styles.colAmount]}>
                Amount
              </Text>
            </View>
            {agreement.milestones.map((milestone, index) => (
              <View style={styles.tableRow} key={milestone.milestoneId}>
                <Text style={[styles.tableCell, styles.colIndex]}>
                  {index + 1}
                </Text>
                <View style={styles.colTitle}>
                  <Text style={styles.tableCell}>{milestone.title}</Text>
                  {milestone.description ? (
                    <Text
                      style={[
                        styles.tableCell,
                        { fontSize: 8, color: '#888888', marginTop: 2 },
                      ]}
                    >
                      {milestone.description}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.tableCell, styles.colDueDate]}>
                  {formatDate(milestone.dueDate)}
                </Text>
                <Text style={[styles.tableCell, styles.colAmount]}>
                  {formatAmount(milestone.amount, agreement.currency)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Terms & Conditions ──────────────────────────────────── */}
        {agreement.clauses.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            {agreement.clauses.map((clause, index) => (
              <View key={clause.clauseId}>
                <Text style={styles.clauseTitle}>
                  {index + 1}. {clause.title}
                </Text>
                <Text style={styles.clauseContent}>{clause.content}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Dispute Resolution ──────────────────────────────────── */}
        {defaultDispute && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Dispute Resolution</Text>
            <View style={styles.disputeBox}>
              <View style={styles.disputeRow}>
                <Text style={styles.label}>Dispute Window</Text>
                <Text style={styles.value}>
                  {secondsToDays(defaultDispute.disputeWindowSeconds)}
                </Text>
              </View>
              <View style={styles.disputeRow}>
                <Text style={styles.label}>Appeal Window</Text>
                <Text style={styles.value}>
                  {secondsToDays(defaultDispute.appealWindowSeconds)}
                </Text>
              </View>
              <View style={styles.disputeRow}>
                <Text style={styles.label}>Evidence Window</Text>
                <Text style={styles.value}>
                  {secondsToDays(defaultDispute.evidenceWindowSeconds)}
                </Text>
              </View>
              <View style={styles.disputeRow}>
                <Text style={styles.label}>Max Resubmissions</Text>
                <Text style={styles.value}>
                  {defaultDispute.maxResubmissions}
                </Text>
              </View>
              <View style={styles.disputeRow}>
                <Text style={styles.label}>
                  AI Verification Confidence Threshold
                </Text>
                <Text style={styles.value}>
                  {defaultDispute.verificationConfidenceThreshold}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Signatures ──────────────────────────────────────────── */}
        <View wrap={false} style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          <View style={styles.partiesRow}>
            {agreement.signatures.length > 0 ? (
              agreement.signatures.map((sig) => (
                <View
                  style={styles.signatureBox}
                  key={sig.signatureId}
                >
                  <Text style={styles.signatureRole}>{sig.signerRole}</Text>
                  {sig.signedAt ? (
                    <View>
                      <View style={styles.signatureLine} />
                      <Text style={styles.signatureMeta}>
                        Signed: {formatDate(sig.signedAt)}
                      </Text>
                      {sig.signerAddress && (
                        <Text style={styles.signatureMeta}>
                          Address: {sig.signerAddress}
                        </Text>
                      )}
                      {sig.signature && (
                        <Text style={styles.signatureMeta}>
                          Sig: {sig.signature.slice(0, 20)}...
                          {sig.signature.slice(-8)}
                        </Text>
                      )}
                      {sig.messageHash && (
                        <Text style={styles.signatureMeta}>
                          Hash: {sig.messageHash.slice(0, 20)}...
                          {sig.messageHash.slice(-8)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.awaitingText}>
                      Awaiting signature
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <>
                <View style={styles.signatureBox}>
                  <Text style={styles.signatureRole}>Payer</Text>
                  <Text style={styles.awaitingText}>Awaiting signature</Text>
                </View>
                <View style={[styles.signatureBox, { marginRight: 0 }]}>
                  <Text style={styles.signatureRole}>Payee</Text>
                  <Text style={styles.awaitingText}>Awaiting signature</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {agreement.title} | {agreement.agreementId}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
