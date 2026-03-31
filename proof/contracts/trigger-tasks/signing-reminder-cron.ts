import { schedules } from '@trigger.dev/sdk';
import { createClient } from '@bu/supabase/job';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'trigger:signing-reminder', theme: 'tag' });

export const signingReminderCron = schedules.task({
  id: 'signing-reminder-cron',
  // Run daily at 9am UTC
  cron: '0 9 * * *',
  run: async () => {
    logger.info('Running signing reminder cron');
    const supabase = createClient();

    // Find agreements pending signature for >24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    type AgreementRow = {
      agreement_id: string;
      title: string;
      total_amount: number;
      agreement_json: Record<string, unknown> | null;
      created_at: string;
    }

    const { data: pendingAgreements, error } = await supabase
      .from('escrow_agreements_v3' as any)
      .select('agreement_id, title, total_amount, agreement_json, created_at')
      .in('status', ['DRAFT', 'PENDING_SIGN'])
      .lt('created_at', oneDayAgo) as unknown as { data: AgreementRow[] | null; error: { message: string } | null };

    if (error) {
      logger.error('Failed to query pending agreements', { error: error.message });
      throw new Error(error.message);
    }

    if (!pendingAgreements?.length) {
      logger.info('No pending agreements found');
      return { sent: 0 };
    }

    let sent = 0;
    const { triggerTask } = await import('@bu/trigger');

    for (const agreement of pendingAgreements) {
      const aj = (typeof agreement.agreement_json === 'object' && agreement.agreement_json !== null
        ? agreement.agreement_json
        : {}) as Record<string, unknown>;
      const signatures = Array.isArray(aj.signatures) ? aj.signatures as Array<Record<string, unknown>> : [];
      const signedRoles = new Set(signatures.map((s) => String(s.signerRole ?? s.role).toLowerCase()));

      // Determine who hasn't signed
      const unsignedEmail = !signedRoles.has('payee')
        ? String(aj.counterpartyEmail ?? '')
        : !signedRoles.has('payer')
          ? String(aj.creatorEmail ?? '')
          : '';

      if (!unsignedEmail) continue;

      const recipientName = !signedRoles.has('payee')
        ? String(aj.payeeName ?? 'Counterparty')
        : String(aj.payerName ?? 'Creator');

      await triggerTask('send-contract-email', {
        template: 'contract-signing-reminder',
        to: unsignedEmail,
        subject: `Reminder: Sign "${agreement.title}"`,
        props: {
          recipientName,
          senderTeamName: String(aj.senderTeamName ?? aj.payerTeamName ?? 'Bu Finance'),
          contractTitle: agreement.title,
          totalAmount: String(agreement.total_amount ?? '0'),
          currency: 'USDC',
          createdAt: new Date(agreement.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          }),
          link: `https://desk.bu.finance/contracts/${agreement.agreement_id}/sign`,
        },
      }).catch((err) => logger.warn('Failed to send reminder', { agreementId: agreement.agreement_id, error: (err as Error).message }));

      sent++;
    }

    logger.info('Signing reminders sent', { sent, total: pendingAgreements.length });
    return { sent, total: pendingAgreements.length };
  },
});
