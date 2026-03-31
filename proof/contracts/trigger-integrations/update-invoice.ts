import { createClient } from '@bu/supabase/job';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'trigger:update-invoice' });

export async function updateInvoiceStatus({
  invoiceId,
  status,
  paymentTxHash,
}: {
  invoiceId: string;
  status: 'overdue' | 'paid';
  paymentTxHash?: string;
}): Promise<void> {
  const supabase = createClient();

  const updatePayload: Record<string, unknown> = { status };
  if (status === 'paid') {
    updatePayload.paid_at = new Date().toISOString();
  }

  await supabase
    .from('invoices')
    .update(updatePayload)
    .eq('id', invoiceId);

  // Trigger CRE on-chain attestation for invoice settlement (fire-and-forget).
  // Payload matches workflow-invoice-settle handler:
  // { invoiceId, paymentTxHash, amount, currency }
  if (status === 'paid') {
    try {
      // Fetch invoice details needed for the CRE payload
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, amount, currency')
        .eq('id', invoiceId)
        .single();

      if (invoice) {
        const creGatewayUrl = process.env.CRE_GATEWAY_URL ?? 'http://localhost:8088';
        const creUrl = `${creGatewayUrl}/workflows/workflow-invoice-settle/trigger`;
        const creResp = await fetch(creUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'invoice_settle',
            invoiceId,
            paymentTxHash: paymentTxHash ?? 'auto-matched',
            amount: String(invoice.amount ?? '0'),
            currency: invoice.currency ?? 'USD',
          }),
        });
        if (!creResp.ok) {
          const errText = await creResp.text().catch(() => 'unknown');
          logger.warn('CRE invoice settlement HTTP error', { status: creResp.status, errText });
        } else {
          logger.info('CRE invoice settlement triggered', { invoiceId });
        }
      }
    } catch (creErr) {
      logger.warn('CRE invoice settlement failed (non-fatal)', {
        error: (creErr as Error).message,
      });
    }
  }
}
