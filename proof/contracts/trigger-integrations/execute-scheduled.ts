/**
 * Execute Scheduled Payroll Task
 *
 * Handles automatic payroll execution triggered by Trigger.dev schedules
 */
import { schedules, queue } from '@trigger.dev/sdk';
import { createClient } from '@bu/supabase/job';
import {
  extractPayrollId,
  resolveTeamId,
  fetchPayroll,
  updatePayrollStatus,
} from '../../src/utils/payroll-helpers';
import { isPayrollCancelled } from '../../src/types/common.types';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'trigger:execute-scheduled-payroll', theme: 'tag' });

const payrollExecutionQueue = queue({
  name: 'payroll-execution',
  concurrencyLimit: 5,
});

/**
 * Execute Scheduled Payroll Task
 * 
 * Triggered by Trigger.dev schedules to process payroll payments automatically
 */
export const executeScheduledPayroll = schedules.task({
  id: 'execute-scheduled-payroll',
  queue: payrollExecutionQueue,
  machine: 'medium-1x',
  maxDuration: 30 * 60 * 1000,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: any) => {
    logger.info('Starting');

    const supabase = createClient();

    // Extract IDs using utilities
    const payrollId = extractPayrollId(payload);
    const teamId = await resolveTeamId(payload, supabase, payrollId);

    // Build and validate payload
    const executionPayload = {
      payrollId,
      teamId,
      triggerType: 'scheduled' as const,
      createBillRecord: true,
    };

    // Fetch and validate payroll
    const payroll = await fetchPayroll(supabase, payrollId, teamId);

    // Check if this is a recurring payroll
    const isRecurring = payroll.periodicity && payroll.periodicity !== 'once';

    // Check status for ALL payrolls (recurring AND one-time)
    // Note: 'executing' is NOT terminal — it's a transient lock state
    const terminalStatuses = ['executed', 'cancelled', 'failed'];
    if (terminalStatuses.includes(payroll.status)) {
      logger.info('Skipping payroll - terminal status', { status: payroll.status });

      // Deactivate the schedule for terminal states
      if (payroll.schedule_id) {
        try {
          const { schedules } = await import('@trigger.dev/sdk');
          await schedules.deactivate(payroll.schedule_id);
          logger.info('Schedule deactivated for terminal status', { status: payroll.status });
        } catch (err) {
          logger.warn('Failed to deactivate schedule', { err });
        }
      }
      return { success: true, message: `Skipped: ${payroll.status}` };
    }

    // Handle stuck 'executing' state: if updated_at is older than 10 minutes, reset to 'scheduled'
    if (payroll.status === 'executing') {
      const updatedAt = new Date(payroll.updated_at || payroll.created_at);
      const staleThresholdMs = 10 * 60 * 1000; // 10 minutes
      if (Date.now() - updatedAt.getTime() > staleThresholdMs) {
        logger.info('Resetting stale executing payroll back to scheduled');
        await supabase
          .from('payrolls')
          .update({ status: 'scheduled', updated_at: new Date().toISOString() })
          .eq('id', payrollId)
          .eq('status', 'executing');
        // Continue execution with the reset payroll
      } else {
        logger.debug('Payroll is currently executing, skipping this tick');
        return { success: true, message: 'Payroll is currently executing' };
      }
    }

    // Only execute if status is 'scheduled' (or 'draft' for immediate execution)
    if (payroll.status !== 'scheduled' && payroll.status !== 'draft' && payroll.status !== 'executing') {
      throw new Error(`Cannot execute payroll with status: ${payroll.status}`);
    }

    // Per-team concurrency check: ensure no other payroll is actively executing for this team
    // Only consider payrolls updated in the last 10 minutes as truly executing (not stuck)
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: executingPayrolls } = await supabase
      .from('payrolls')
      .select('id')
      .eq('team_id', teamId)
      .eq('status', 'executing')
      .neq('id', payrollId)
      .gte('updated_at', staleThreshold)
      .limit(1);

    if (executingPayrolls && executingPayrolls.length > 0) {
      logger.info('Another payroll is actively executing for team', { teamId });
      return { success: false, message: 'Another payroll is executing for this team. Try again later.' };
    }

    // For recurring payrolls, generate execution cycle key
    let executionCycle: string | undefined;
    if (isRecurring) {
      const timestamp = payload.timestamp || new Date().toISOString();
      executionCycle = `cycle_${new Date(timestamp).getTime()}`;
      logger.debug('Recurring payroll execution cycle', { executionCycle });
    }

    // Execute payments (dynamic import to avoid loading @bu/transfer-core at startup)
    logger.info('Executing payments', { payrollId, teamId });
    const { PayrollExecutionService } = await import('@bu/services/payroll-execution');
    const executionService = new PayrollExecutionService(supabase);
    const executionResult = await executionService.executePayroll({
      payrollId,
      teamId,
      userId: payroll.user_id,
      createBillRecord: true,
      triggerType: 'scheduled',
      executionCycle: executionCycle,
      sourceScheduledPayrollId: isRecurring ? payrollId : undefined,
    });

    if (!executionResult.success) {
      throw new Error(`Execution failed: ${executionResult.error || 'Unknown'}`);
    }

    // Check if payroll was cancelled due to insufficient funds
    if (isPayrollCancelled(executionResult) && executionResult.cancelReason === 'insufficient_funds') {
      logger.warn('Payroll cancelled due to insufficient funds - deactivating schedule', { payrollId });

      // Deactivate the schedule to prevent further failed attempts
      const scheduleIdToDeactivate = payroll.schedule_id || payload.scheduleId;
      if (scheduleIdToDeactivate) {
        try {
          const { schedules } = await import('@trigger.dev/sdk');
          await schedules.deactivate(scheduleIdToDeactivate);
          logger.info('Schedule deactivated due to insufficient funds');
        } catch (err) {
          logger.warn('Failed to deactivate schedule', { err });
        }
      }

      return {
        success: false,
        message: 'Payroll cancelled - insufficient funds',
        cancelReason: 'insufficient_funds',
      };
    }

    // Update status - for one-time payrolls only, keep recurring payrolls in 'scheduled' status
    if (!isRecurring) {
      await updatePayrollStatus(supabase, payrollId, teamId, 'executed', {
        executed_at: new Date().toISOString(),
      });
      
      // Deactivate the schedule after successful execution
      if (payroll.schedule_id) {
        logger.info('Deactivating one-time payroll schedule', { scheduleId: payroll.schedule_id });
        try {
          const { schedules } = await import('@trigger.dev/sdk');
          await schedules.deactivate(payroll.schedule_id);
        } catch (err) {
          logger.warn('Failed to deactivate schedule', { err });
        }
      }
    } else {
      // Recurring payroll: reset status back to 'scheduled' so the next tick can execute
      await supabase
        .from('payrolls')
        .update({ status: 'scheduled', updated_at: new Date().toISOString() })
        .eq('id', payrollId);
      logger.info('Recurring payroll reset to scheduled for next cycle');
    }

    // Note: Email sending is handled inside PayrollExecutionService.executePayroll()
    // The service automatically sends summary emails after successful execution

    logger.info('Success', { payrollId, processed: executionResult.successfulPayments, total: executionResult.totalRecipients, recurring: isRecurring });

    // Trigger CRE on-chain attestation (fire-and-forget, does not block payroll flow).
    // Payload matches workflow-payroll-attest handler: { payrollId, teamId, batchId? }
    // Direct HTTP POST — the trigger package runs in Node.js, not Cloudflare Workers,
    // so we inline the call rather than importing from apps/shiva.
    try {
      const creGatewayUrl = process.env.CRE_GATEWAY_URL ?? 'http://localhost:8088';
      const creUrl = `${creGatewayUrl}/workflows/workflow-payroll-attest/trigger`;
      const creResp = await fetch(creUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'payroll_attest',
          payrollId,
          teamId,
          batchId: executionResult.batchId,
        }),
      });
      if (!creResp.ok) {
        const errText = await creResp.text().catch(() => 'unknown');
        logger.warn('CRE payroll attestation HTTP error', { status: creResp.status, errText });
      } else {
        logger.info('CRE payroll attestation triggered', { payrollId });
      }
    } catch (creErr) {
      logger.warn('CRE payroll attestation failed (non-fatal)', {
        error: (creErr as Error).message,
      });
    }

    return {
      success: true,
      processedCount: executionResult.successfulPayments,
      failedCount: executionResult.totalRecipients - executionResult.successfulPayments,
    };
  },
});
