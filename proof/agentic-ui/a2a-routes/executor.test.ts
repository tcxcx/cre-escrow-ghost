import { describe, expect, test } from 'bun:test';
import { DefaultExecutionEventBus, RequestContext } from '@a2a-js/sdk/server';
import type { AgentExecutionEvent } from '@a2a-js/sdk/server';
import type {
  Message,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
} from '@a2a-js/sdk';

describe('BuAgentExecutor', () => {
  test('publishes correct event sequence: working → artifact → completed', async () => {
    const { BuAgentExecutor } = await import('./executor');

    const executor = new BuAgentExecutor({
      // Mock AI call — just returns a string
      generateResponse: async (
        _agentId: string,
        _prompt: string,
      ) => 'Analysis complete: burn rate is stable.',
    });

    const events: AgentExecutionEvent[] = [];
    const eventBus = new DefaultExecutionEventBus();
    eventBus.on('event', (event) => events.push(event));

    const userMessage: Message = {
      kind: 'message',
      messageId: 'msg-1',
      role: 'user',
      parts: [{ kind: 'text', text: 'What is our burn rate?' }],
    };

    const requestContext = new RequestContext(
      userMessage,
      'task-1',
      'ctx-1',
    );
    await executor.execute(requestContext, eventBus);

    // Verify event sequence
    expect(events.length).toBeGreaterThanOrEqual(3);

    // First: status-update to working
    const statusWorking = events.find(
      (e): e is TaskStatusUpdateEvent =>
        'kind' in e &&
        e.kind === 'status-update' &&
        'status' in e &&
        (e as TaskStatusUpdateEvent).status?.state === 'working',
    );
    expect(statusWorking).toBeDefined();

    // Middle: artifact-update with response text
    const artifactUpdate = events.find(
      (e): e is TaskArtifactUpdateEvent =>
        'kind' in e && e.kind === 'artifact-update',
    );
    expect(artifactUpdate).toBeDefined();
    expect(artifactUpdate!.artifact.parts[0]).toHaveProperty('text');

    // Last: status-update to completed with final=true
    const statusCompleted = events.find(
      (e): e is TaskStatusUpdateEvent =>
        'kind' in e &&
        e.kind === 'status-update' &&
        'status' in e &&
        (e as TaskStatusUpdateEvent).status?.state === 'completed',
    );
    expect(statusCompleted).toBeDefined();
    expect(statusCompleted!.final).toBe(true);
  });

  test('cancelTask publishes canceled status', async () => {
    const { BuAgentExecutor } = await import('./executor');

    const executor = new BuAgentExecutor({
      generateResponse: async () => 'test',
    });

    const events: AgentExecutionEvent[] = [];
    const eventBus = new DefaultExecutionEventBus();
    eventBus.on('event', (event) => events.push(event));

    await executor.cancelTask('task-1', eventBus);

    const cancelEvent = events.find(
      (e): e is TaskStatusUpdateEvent =>
        'kind' in e &&
        e.kind === 'status-update' &&
        'status' in e &&
        (e as TaskStatusUpdateEvent).status?.state === 'canceled',
    );
    expect(cancelEvent).toBeDefined();
    expect(cancelEvent!.final).toBe(true);
  });

  test('handles execution error gracefully', async () => {
    const { BuAgentExecutor } = await import('./executor');

    const executor = new BuAgentExecutor({
      generateResponse: async () => {
        throw new Error('AI service unavailable');
      },
    });

    const events: AgentExecutionEvent[] = [];
    const eventBus = new DefaultExecutionEventBus();
    eventBus.on('event', (event) => events.push(event));

    const userMessage: Message = {
      kind: 'message',
      messageId: 'msg-1',
      role: 'user',
      parts: [{ kind: 'text', text: 'test' }],
    };

    const requestContext = new RequestContext(
      userMessage,
      'task-err',
      'ctx-1',
    );
    await executor.execute(requestContext, eventBus);

    const failedEvent = events.find(
      (e): e is TaskStatusUpdateEvent =>
        'kind' in e &&
        e.kind === 'status-update' &&
        'status' in e &&
        (e as TaskStatusUpdateEvent).status?.state === 'failed',
    );
    expect(failedEvent).toBeDefined();
    expect(failedEvent!.final).toBe(true);
  });
});
