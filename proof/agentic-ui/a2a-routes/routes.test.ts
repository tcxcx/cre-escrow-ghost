import { describe, expect, test, mock } from 'bun:test';
mock.module('server-only', () => ({}));

describe('A2A Routes', () => {
  test('GET /.well-known/agent-card.json returns bufi host card', async () => {
    const { a2aRoutes } = await import('./index');
    const res = await a2aRoutes.request('/.well-known/agent-card.json');
    expect(res.status).toBe(200);
    const card = await res.json();
    expect(card.name).toBe('bufi');
    expect(card.version).toBeDefined();
    expect(card.skills).toBeDefined();
  });

  test('GET /a2a/bufi-cfo/.well-known/agent-card.json returns bufi-cfo card', async () => {
    const { a2aRoutes } = await import('./index');
    const res = await a2aRoutes.request(
      '/a2a/bufi-cfo/.well-known/agent-card.json',
    );
    expect(res.status).toBe(200);
    const card = await res.json();
    expect(card.name).toBe('bufi-cfo');
  });

  test('GET /a2a/bufi-payroll/.well-known/agent-card.json returns bufi-payroll card', async () => {
    const { a2aRoutes } = await import('./index');
    const res = await a2aRoutes.request(
      '/a2a/bufi-payroll/.well-known/agent-card.json',
    );
    expect(res.status).toBe(200);
    const card = await res.json();
    expect(card.name).toBe('bufi-payroll');
  });

  test('GET /a2a/unknown/.well-known/agent-card.json returns 404', async () => {
    const { a2aRoutes } = await import('./index');
    const res = await a2aRoutes.request(
      '/a2a/unknown/.well-known/agent-card.json',
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('unknown');
  });

  test('POST /a2a/unknown returns 404 JSON-RPC error', async () => {
    const { a2aRoutes } = await import('./index');
    const res = await a2aRoutes.request('/a2a/unknown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'message/send',
        params: {
          message: {
            kind: 'message',
            messageId: 'msg-1',
            role: 'user',
            parts: [{ kind: 'text', text: 'hello' }],
          },
        },
      }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.jsonrpc).toBe('2.0');
    expect(body.error.code).toBe(-32602);
  });

  test('POST /a2a/bufi-cfo with message/send returns valid JSON-RPC response', async () => {
    const { a2aRoutes } = await import('./index');
    const res = await a2aRoutes.request('/a2a/bufi-cfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'message/send',
        params: {
          message: {
            kind: 'message',
            messageId: 'msg-test',
            role: 'user',
            parts: [{ kind: 'text', text: 'What is our burn rate?' }],
          },
        },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Validates JSON-RPC 2.0 envelope — must have jsonrpc + id
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBe(1);
    // Response must contain either result or error (valid JSON-RPC)
    const hasResult = body.result !== undefined;
    const hasError = body.error !== undefined;
    expect(hasResult || hasError).toBe(true);
  });
});
