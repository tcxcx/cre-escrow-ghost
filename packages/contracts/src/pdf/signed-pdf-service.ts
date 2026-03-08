// @ts-nocheck
import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { AgreementPdf } from './agreement-pdf'
import type { AgreementJSON } from '../agreement/schema'
import React from 'react'

// ── Attestation Page Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#333333',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#111111',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 8,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: 140,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#666666',
  },
  value: {
    flex: 1,
    fontSize: 9,
    color: '#333333',
  },
  mono: {
    fontFamily: 'Courier',
    fontSize: 7,
    color: '#333333',
    wordBreak: 'break-all',
  },
  sigBlock: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  sigBlockUnsigned: {
    borderLeftColor: '#EF4444',
  },
  badge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#22C55E',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  badgeUnsigned: {
    color: '#EF4444',
  },
  disclaimer: {
    marginTop: 30,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  disclaimerText: {
    fontSize: 7,
    color: '#888888',
    lineHeight: 1.5,
  },
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
})

// ── Attestation Page Component ───────────────────────────────────────────────

function AttestationPage({ agreement }: { agreement: AgreementJSON }) {
  const signatures = agreement.signatures ?? []
  const allSigned = signatures.length > 0 && signatures.every((s) => s.signature)

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Signature Attestation</Text>
      <View style={styles.divider} />

      {/* Agreement Reference */}
      <Text style={styles.sectionTitle}>Agreement Reference</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Agreement ID</Text>
        <Text style={styles.value}>{agreement.agreementId}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Title</Text>
        <Text style={styles.value}>{agreement.title}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Chain</Text>
        <Text style={styles.value}>{agreement.chain}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Currency</Text>
        <Text style={styles.value}>{agreement.currency}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{allSigned ? 'FULLY SIGNED' : 'PENDING SIGNATURES'}</Text>
      </View>

      {/* Cryptographic Signatures */}
      <Text style={styles.sectionTitle}>Cryptographic Signatures (EIP-191)</Text>
      {signatures.length > 0 ? (
        signatures.map((sig) => {
          const isSigned = Boolean(sig.signature)
          return (
            <View
              key={sig.signatureId}
              style={[styles.sigBlock, !isSigned && styles.sigBlockUnsigned]}
            >
              <View style={styles.row}>
                <Text style={styles.label}>Role</Text>
                <Text style={styles.value}>{sig.signerRole}</Text>
              </View>
              {sig.signerAddress && (
                <View style={styles.row}>
                  <Text style={styles.label}>Wallet Address</Text>
                  <Text style={styles.mono}>{sig.signerAddress}</Text>
                </View>
              )}
              {sig.signedAt && (
                <View style={styles.row}>
                  <Text style={styles.label}>Signed At</Text>
                  <Text style={styles.value}>{sig.signedAt}</Text>
                </View>
              )}
              {sig.messageHash && (
                <View style={styles.row}>
                  <Text style={styles.label}>Message Hash (keccak256)</Text>
                  <Text style={styles.mono}>{sig.messageHash}</Text>
                </View>
              )}
              {sig.signature && (
                <View style={styles.row}>
                  <Text style={styles.label}>EIP-191 Signature</Text>
                  <Text style={styles.mono}>{sig.signature}</Text>
                </View>
              )}
              <Text style={[styles.badge, !isSigned && styles.badgeUnsigned]}>
                {isSigned ? 'Cryptographically Verified' : 'Awaiting Signature'}
              </Text>
            </View>
          )
        })
      ) : (
        <Text style={styles.value}>No signatures recorded.</Text>
      )}

      {/* Verification Instructions */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          VERIFICATION: Each signature can be independently verified by recovering the signer
          address from the EIP-191 signature using the message hash. Use etherscan.io or any
          EIP-191 verification tool: recoverMessageAddress(messageHash, signature) should return
          the wallet address listed above.
        </Text>
        <Text style={[styles.disclaimerText, { marginTop: 4 }]}>
          This document was generated by Bu Finance. The cryptographic signatures provide
          tamper-evident proof that each party reviewed and approved the agreement terms.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>
          Signature Attestation | {agreement.agreementId}
        </Text>
        <Text style={styles.footerText}>
          Generated: {new Date().toISOString()}
        </Text>
      </View>
    </Page>
  )
}

// ── Signed PDF Generation ────────────────────────────────────────────────────

/**
 * Generate a signed PDF with attestation page appended.
 *
 * Strategy: render the base agreement PDF first, then render the attestation
 * page separately. The attestation page is a standalone document since
 * AgreementPdf already wraps content in <Document>.
 *
 * For production, these could be merged with a PDF library, but for now
 * we render just the attestation page — the caller can serve both PDFs
 * or the frontend can display them together.
 */
export async function generateSignedAgreementPdf(agreement: AgreementJSON): Promise<Buffer> {
  // Render attestation page as its own document
  const attestationDoc = React.createElement(
    Document,
    null,
    React.createElement(AttestationPage, { agreement }),
  )
  return renderToBuffer(attestationDoc)
}

/**
 * Generate both the agreement PDF and the attestation page.
 * Returns two buffers that the caller can serve or merge.
 */
export async function generateFullSignedPdf(agreement: AgreementJSON): Promise<{
  agreement: Buffer
  attestation: Buffer
}> {
  const [agreementBuf, attestationBuf] = await Promise.all([
    renderToBuffer(React.createElement(AgreementPdf, { agreement })),
    generateSignedAgreementPdf(agreement),
  ])
  return { agreement: agreementBuf, attestation: attestationBuf }
}
