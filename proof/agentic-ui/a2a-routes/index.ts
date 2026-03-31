/**
 * A2A Protocol Routes — Agent card discovery + JSON-RPC transport.
 *
 * Three endpoints:
 *  1. GET  /.well-known/agent-card.json          — Host agent card (bufi)
 *  2. GET  /a2a/:agentId/.well-known/agent-card.json — Per-agent card
 *  3. POST /a2a/:agentId                         — JSON-RPC dispatch
 */
import { OpenAPIHono } from '@hono/zod-openapi';
import { defaultRegistry } from '@bu/intelligence/agents';
import { createLogger } from '@bu/logger';
import { createTaskStore } from './task-store';
import { BuAgentExecutor } from './executor';

const logger = createLogger({ prefix: 'a2a:routes' });

export const a2aRoutes = new OpenAPIHono();

// ---------------------------------------------------------------------------
// GET /.well-known/agent-card.json — host agent card
// ---------------------------------------------------------------------------
a2aRoutes.get('/.well-known/agent-card.json', (c) => {
  const bufiCard = defaultRegistry.getCard('bufi');
  if (!bufiCard) {
    return c.json({ error: 'Host agent card not found' }, 404);
  }
  return c.json(bufiCard);
});

// ---------------------------------------------------------------------------
// GET /a2a/:agentId/.well-known/agent-card.json — per-agent card
// ---------------------------------------------------------------------------
a2aRoutes.get('/a2a/:agentId/.well-known/agent-card.json', (c) => {
  const { agentId } = c.req.param();
  const card = defaultRegistry.getCard(agentId);
  if (!card) {
    return c.json({ error: `Agent '${agentId}' not found` }, 404);
  }
  return c.json(card);
});

// ---------------------------------------------------------------------------
// POST /a2a/:agentId — JSON-RPC handler
// ---------------------------------------------------------------------------
a2aRoutes.post('/a2a/:agentId', async (c) => {
  const { agentId } = c.req.param();
  const card = defaultRegistry.getCard(agentId);
  if (!card) {
    return c.json(
      {
        jsonrpc: '2.0',
        error: { code: -32602, message: `Agent '${agentId}' not found` },
        id: null,
      },
      404,
    );
  }

  try {
    const {
      DefaultRequestHandler,
      JsonRpcTransportHandler,
    } = await import('@a2a-js/sdk/server');

    const taskStore = createTaskStore();
    const executor = new BuAgentExecutor({
      generateResponse: async (_agentId: string, prompt: string) => {
        // TODO: Wire to buildAgentContext() + AI SDK in Phase 4
        return `[${_agentId}] Received: ${prompt}`;
      },
    });

    const requestHandler = new DefaultRequestHandler(
      card,
      taskStore,
      executor,
    );
    const transportHandler = new JsonRpcTransportHandler(requestHandler);

    const body = await c.req.json();
    const result = await transportHandler.handle(body);

    // handle() may return a JSONRPCResponse object or an AsyncGenerator (streaming).
    // For non-streaming requests it returns a plain object — return it directly.
    if (
      result &&
      typeof result === 'object' &&
      Symbol.asyncIterator in result
    ) {
      // Streaming: collect first response for now (full SSE in Phase 5)
      const gen = result as AsyncGenerator<unknown, void, undefined>;
      const first = await gen.next();
      if (first.done) {
        return c.json(
          {
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Empty stream' },
            id: null,
          },
          500,
        );
      }
      return c.json(first.value as Record<string, unknown>);
    }

    return c.json(result as Record<string, unknown>);
  } catch (error) {
    logger.error('A2A JSON-RPC error', {
      agentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error' },
        id: null,
      },
      500,
    );
  }
});
