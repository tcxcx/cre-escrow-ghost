/**
 * BuAgentExecutor — A2A AgentExecutor implementation for Bu platform.
 *
 * Receives a user message via A2A protocol, extracts the agent context,
 * calls the AI service, and publishes results back via ExecutionEventBus.
 *
 * In production, `generateResponse` will be wired to `buildAgentContext()` +
 * AI SDK `generateText()`. For testing, it accepts a mock function.
 */
import type {
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
} from '@a2a-js/sdk/server';
import type {
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
} from '@a2a-js/sdk';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'a2a:executor' });

export interface BuAgentExecutorOptions {
  /**
   * Generate a response for the given agent and prompt.
   * In production: loads SOUL.md + context + calls AI SDK.
   * In tests: returns a mock string.
   */
  generateResponse: (agentId: string, prompt: string) => Promise<string>;
}

export class BuAgentExecutor implements AgentExecutor {
  private options: BuAgentExecutorOptions;

  constructor(options: BuAgentExecutorOptions) {
    this.options = options;
  }

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    const { taskId, contextId, userMessage } = requestContext;

    // Extract text from user message parts
    const userText = userMessage.parts
      .filter((p): p is { kind: 'text'; text: string } => p.kind === 'text')
      .map((p) => p.text)
      .join('\n');

    // Extract agentId from context metadata or default to 'bufi'
    const agentId =
      (requestContext.context as Record<string, unknown> | undefined)
        ?.agentId ??
      'bufi';

    logger.info('Executing A2A task', { taskId, agentId, contextId });

    // 1. Publish working status
    eventBus.publish({
      kind: 'status-update',
      taskId,
      contextId,
      status: { state: 'working', timestamp: new Date().toISOString() },
      final: false,
    } satisfies TaskStatusUpdateEvent);

    try {
      // 2. Generate response
      const response = await this.options.generateResponse(
        agentId as string,
        userText,
      );

      // 3. Publish artifact with response
      eventBus.publish({
        kind: 'artifact-update',
        taskId,
        contextId,
        artifact: {
          artifactId: `${taskId}-response`,
          name: 'Agent Response',
          parts: [{ kind: 'text', text: response }],
        },
      } satisfies TaskArtifactUpdateEvent);

      // 4. Publish completed status
      eventBus.publish({
        kind: 'status-update',
        taskId,
        contextId,
        status: { state: 'completed', timestamp: new Date().toISOString() },
        final: true,
      } satisfies TaskStatusUpdateEvent);

      logger.info('A2A task completed', { taskId, agentId });
    } catch (error) {
      logger.error('A2A task failed', {
        taskId,
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Publish failed status
      eventBus.publish({
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'failed',
          timestamp: new Date().toISOString(),
          message: {
            kind: 'message',
            messageId: `${taskId}-error`,
            role: 'agent',
            parts: [
              {
                kind: 'text',
                text:
                  error instanceof Error ? error.message : 'Unknown error',
              },
            ],
          },
        },
        final: true,
      } satisfies TaskStatusUpdateEvent);
    }

    eventBus.finished();
  }

  async cancelTask(
    taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    logger.info('Canceling A2A task', { taskId });

    eventBus.publish({
      kind: 'status-update',
      taskId,
      contextId: '',
      status: { state: 'canceled', timestamp: new Date().toISOString() },
      final: true,
    } satisfies TaskStatusUpdateEvent);

    eventBus.finished();
  }
}
