import { describe, test, expect } from 'bun:test';
import { parseA2UIResponse, A2UI_DELIMITER } from '../parse-a2ui';

/**
 * Task 8: Canonical query tests — 5 realistic LLM responses parsed through
 * parseA2UIResponse to validate the full text + A2UI JSON contract.
 */
describe('canonical A2UI queries', () => {
  test('Q1: Revenue comparison — Row + Text metrics', () => {
    const a2ui = [
      {
        createSurface: {
          surfaceId: 'revenue-cmp-1',
          catalogId: 'metric-comparison',
        },
      },
      {
        updateComponents: {
          surfaceId: 'revenue-cmp-1',
          components: [
            {
              id: 'row-1',
              component: 'Row',
              children: ['q3-metric', 'q4-metric'],
            },
            {
              id: 'q3-metric',
              component: 'Text',
              content: 'Q3 Revenue: $45,000',
              variant: 'metric',
            },
            {
              id: 'q4-metric',
              component: 'Text',
              content: 'Q4 Revenue: $62,000',
              variant: 'metric',
            },
          ],
        },
      },
    ];

    const raw = `Your Q3 revenue was $45,000 and Q4 was $62,000, showing a 37.8% increase.\n${A2UI_DELIMITER}\n${JSON.stringify(a2ui)}`;
    const result = parseA2UIResponse(raw);

    expect(result.hasA2UI).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.text).toContain('37.8% increase');
  });

  test('Q2: Overdue invoices — List + Cards', () => {
    const a2ui = [
      {
        createSurface: {
          surfaceId: 'overdue-inv-1',
          catalogId: 'invoice-list',
        },
      },
      {
        updateComponents: {
          surfaceId: 'overdue-inv-1',
          components: [
            {
              id: 'list-1',
              component: 'List',
              children: ['card-inv-101', 'card-inv-102'],
            },
            {
              id: 'card-inv-101',
              component: 'Card',
              title: 'INV-101 — Acme Corp',
              subtitle: '$3,200 overdue by 15 days',
            },
            {
              id: 'card-inv-102',
              component: 'Card',
              title: 'INV-102 — Globex Inc',
              subtitle: '$1,800 overdue by 7 days',
            },
          ],
        },
      },
    ];

    const raw = `You have 2 overdue invoices totaling $5,000.\n${A2UI_DELIMITER}\n${JSON.stringify(a2ui)}`;
    const result = parseA2UIResponse(raw);

    expect(result.hasA2UI).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.text).toContain('2 overdue invoices');
  });

  test('Q3: Monthly summary — multiple metric Cards in a Row', () => {
    const a2ui = [
      {
        createSurface: {
          surfaceId: 'monthly-summary-1',
          catalogId: 'dashboard-summary',
        },
      },
      {
        updateComponents: {
          surfaceId: 'monthly-summary-1',
          components: [
            {
              id: 'metrics-row',
              component: 'Row',
              children: ['card-revenue', 'card-expenses', 'card-profit'],
            },
            {
              id: 'card-revenue',
              component: 'Card',
              title: 'Revenue',
              value: '$124,500',
            },
            {
              id: 'card-expenses',
              component: 'Card',
              title: 'Expenses',
              value: '$89,200',
            },
            {
              id: 'card-profit',
              component: 'Card',
              title: 'Net Profit',
              value: '$35,300',
            },
          ],
        },
      },
    ];

    const raw = `Here is your February summary: revenue $124,500, expenses $89,200, net profit $35,300.\n${A2UI_DELIMITER}\n${JSON.stringify(a2ui)}`;
    const result = parseA2UIResponse(raw);

    expect(result.hasA2UI).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.text).toContain('February summary');
  });

  test('Q4: Transfer approval — Card with approve/reject Buttons', () => {
    const a2ui = [
      {
        createSurface: {
          surfaceId: 'transfer-approval-1',
          catalogId: 'approval-card',
        },
      },
      {
        updateComponents: {
          surfaceId: 'transfer-approval-1',
          components: [
            {
              id: 'approval-card',
              component: 'Card',
              title: 'Transfer Request',
              subtitle: '$15,000 to Vendor ABC',
              children: ['btn-approve', 'btn-reject'],
            },
            {
              id: 'btn-approve',
              component: 'Button',
              label: 'Approve',
              action: { type: 'approve-transfer', transferId: 'txn-789' },
              variant: 'primary',
            },
            {
              id: 'btn-reject',
              component: 'Button',
              label: 'Reject',
              action: { type: 'reject-transfer', transferId: 'txn-789' },
              variant: 'destructive',
            },
          ],
        },
      },
    ];

    const raw = `A transfer of $15,000 to Vendor ABC requires your approval.\n${A2UI_DELIMITER}\n${JSON.stringify(a2ui)}`;
    const result = parseA2UIResponse(raw);

    expect(result.hasA2UI).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.text).toContain('requires your approval');
  });

  test('Q5: Action plan — List with ordered Text items', () => {
    const a2ui = [
      {
        createSurface: {
          surfaceId: 'action-plan-1',
          catalogId: 'action-list',
        },
      },
      {
        updateComponents: {
          surfaceId: 'action-plan-1',
          components: [
            {
              id: 'plan-list',
              component: 'List',
              ordered: true,
              children: ['step-1', 'step-2', 'step-3'],
            },
            {
              id: 'step-1',
              component: 'Text',
              content: 'Review and reconcile February bank statements',
            },
            {
              id: 'step-2',
              component: 'Text',
              content: 'Follow up on 2 overdue invoices totaling $5,000',
            },
            {
              id: 'step-3',
              component: 'Text',
              content: 'Schedule quarterly tax estimate payment by March 15',
            },
          ],
        },
      },
    ];

    const raw = `Here is your recommended action plan for this week:\n${A2UI_DELIMITER}\n${JSON.stringify(a2ui)}`;
    const result = parseA2UIResponse(raw);

    expect(result.hasA2UI).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.text).toContain('action plan');
  });
});
