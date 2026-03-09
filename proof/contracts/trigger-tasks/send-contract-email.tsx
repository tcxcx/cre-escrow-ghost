import { sendEmail } from '@bu/resend';
import {
  ContractInvitationEmail,
  ContractSignedEmail,
  ContractFundedEmail,
  ContractSigningReminderEmail,
  ContractDeliverableSubmittedEmail,
  ContractVerificationResultEmail,
  ContractDisputeResolvedEmail,
  ContractCompletedEmail,
} from '@bu/email';
import { task } from '@trigger.dev/sdk';
import { createLogger } from '@bu/logger';
import { z } from 'zod/v3';

const logger = createLogger({ prefix: 'trigger:send-contract-email', theme: 'tag' });

const schema = z.object({
  template: z.enum([
    'contract-invitation',
    'contract-signed',
    'contract-funded',
    'contract-signing-reminder',
    'contract-deliverable-submitted',
    'contract-verification-result',
    'contract-dispute-resolved',
    'contract-completed',
  ]),
  to: z.string().email(),
  subject: z.string(),
  props: z.record(z.unknown()),
});

type Schema = z.infer<typeof schema>;

const TEMPLATE_MAP: Record<string, React.FC<any>> = {
  'contract-invitation': ContractInvitationEmail,
  'contract-signed': ContractSignedEmail,
  'contract-funded': ContractFundedEmail,
  'contract-signing-reminder': ContractSigningReminderEmail,
  'contract-deliverable-submitted': ContractDeliverableSubmittedEmail,
  'contract-verification-result': ContractVerificationResultEmail,
  'contract-dispute-resolved': ContractDisputeResolvedEmail,
  'contract-completed': ContractCompletedEmail,
};

export const sendContractEmail = task<'send-contract-email', Schema>({
  id: 'send-contract-email',
  queue: { concurrencyLimit: 10 },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async ({ template, to, subject, props }) => {
    logger.info('Sending contract email', { template, to });

    const Component = TEMPLATE_MAP[template];
    if (!Component) throw new Error(`Unknown template: ${template}`);

    const result = await sendEmail({
      from: 'CONTRACTS',
      to,
      subject,
      react: <Component {...props} />,
      category: 'contract',
    });

    if (!result.success) {
      logger.error('Email send failed', { template, to, error: result.error });
      throw new Error(result.error);
    }

    logger.info('Contract email sent', { template, to, messageId: result.messageId });
    return { success: true, messageId: result.messageId };
  },
});
