import { describe, it, expect, beforeEach } from 'vitest';
import { createAGUIAdapter } from '../ag-ui-adapter';
import { AGUIEventType } from '../event-types';
import type { AGUIEvent } from '../event-types';

describe('AG-UI Adapter', () => {
  let adapter: ReturnType<typeof createAGUIAdapter>;
  let events: AGUIEvent[];

  beforeEach(() => {
    adapter = createAGUIAdapter();
    events = [];
    adapter.on((e) => events.push(e));
  });

  it('emits RUN_STARTED + TEXT_MESSAGE_START + TEXT_MESSAGE_CONTENT on first text delta', () => {
    adapter.processLine('0:"Hello"');

    expect(events).toHaveLength(3);
    expect(events[0]!.type).toBe(AGUIEventType.RUN_STARTED);
    expect(events[0]!.runId).toBeDefined();
    expect(events[1]!.type).toBe(AGUIEventType.TEXT_MESSAGE_START);
    expect(events[2]!.type).toBe(AGUIEventType.TEXT_MESSAGE_CONTENT);
    expect(events[2]!.delta).toBe('Hello');
  });

  it('emits only TEXT_MESSAGE_CONTENT on subsequent text deltas', () => {
    adapter.processLine('0:"Hello"');
    events.length = 0;

    adapter.processLine('0:" world"');

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe(AGUIEventType.TEXT_MESSAGE_CONTENT);
    expect(events[0]!.delta).toBe(' world');
  });

  it('emits TEXT_MESSAGE_END + RUN_FINISHED on finish', () => {
    adapter.processLine('0:"Hi"');
    events.length = 0;

    adapter.processLine('d:{"finishReason":"stop"}');

    expect(events).toHaveLength(2);
    expect(events[0]!.type).toBe(AGUIEventType.TEXT_MESSAGE_END);
    expect(events[1]!.type).toBe(AGUIEventType.RUN_FINISHED);
  });

  it('skips TEXT_MESSAGE_END on finish if no message was started', () => {
    adapter.processLine('d:{"finishReason":"stop"}');

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe(AGUIEventType.RUN_FINISHED);
  });

  it('emits CUSTOM event with subtype a2ui for data-a2ui payloads', () => {
    adapter.processLine('8:[{"type":"data-a2ui","action":"create_surface"}]');

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe(AGUIEventType.CUSTOM);
    expect(events[0]!.subtype).toBe('a2ui');
    expect((events[0]!.data as { action: string }).action).toBe(
      'create_surface',
    );
  });

  it('emits STATE_DELTA for non-a2ui data payloads', () => {
    adapter.processLine('8:[{"some":"state"}]');

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe(AGUIEventType.STATE_DELTA);
    expect(events[0]!.snapshot).toEqual({ some: 'state' });
  });

  it('emits RUN_ERROR on error line', () => {
    adapter.processLine('e:{"message":"something went wrong"}');

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe(AGUIEventType.RUN_ERROR);
    expect(events[0]!.error).toEqual({ message: 'something went wrong' });
  });

  it('emits TOOL_CALL_START on 9: prefix', () => {
    adapter.processLine(
      '9:{"toolCallId":"tc1","toolName":"get_weather"}',
    );

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe(AGUIEventType.TOOL_CALL_START);
    expect(events[0]!.toolCallId).toBe('tc1');
    expect(events[0]!.toolCallName).toBe('get_weather');
  });

  it('emits TOOL_CALL_START on b: prefix', () => {
    adapter.processLine(
      'b:{"toolCallId":"tc2","toolName":"search"}',
    );

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe(AGUIEventType.TOOL_CALL_START);
    expect(events[0]!.toolCallId).toBe('tc2');
    expect(events[0]!.toolCallName).toBe('search');
  });

  it('emits TOOL_CALL_ARGS on a: prefix', () => {
    adapter.processLine(
      'a:{"toolCallId":"tc1","argsTextDelta":"{\\"city\\":\\"NYC\\"}"}',
    );

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe(AGUIEventType.TOOL_CALL_ARGS);
    expect(events[0]!.toolCallId).toBe('tc1');
    expect(events[0]!.delta).toBe('{"city":"NYC"}');
  });

  it('emits TOOL_CALL_END on c: prefix', () => {
    adapter.processLine(
      'c:{"toolCallId":"tc1","result":{"temp":72}}',
    );

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe(AGUIEventType.TOOL_CALL_END);
    expect(events[0]!.toolCallId).toBe('tc1');
    expect(events[0]!.args).toEqual({ temp: 72 });
  });

  it('skips malformed lines gracefully', () => {
    adapter.processLine('0:{not valid json');
    adapter.processLine('');
    adapter.processLine('x');

    expect(events).toHaveLength(0);
  });

  it('generates a new runId after finish', () => {
    adapter.processLine('0:"Hi"');
    const firstRunId = events[0]!.runId;
    events.length = 0;

    adapter.processLine('d:{"finishReason":"stop"}');
    const finishRunId = events[1]!.runId;
    expect(finishRunId).toBe(firstRunId);

    events.length = 0;
    adapter.processLine('0:"Next"');
    const secondRunId = events[0]!.runId;
    expect(secondRunId).not.toBe(firstRunId);
  });

  it('unsubscribe removes the listener', () => {
    const extra: AGUIEvent[] = [];
    const unsub = adapter.on((e) => extra.push(e));

    adapter.processLine('0:"test"');
    expect(extra.length).toBeGreaterThan(0);

    unsub();
    const count = extra.length;
    adapter.processLine('0:"more"');
    expect(extra.length).toBe(count);
  });

  it('reset clears listeners and state', () => {
    adapter.processLine('0:"Hi"');
    events.length = 0;

    adapter.reset();

    // Listener was cleared, so no events should arrive
    adapter.processLine('0:"After reset"');
    expect(events).toHaveLength(0);
  });
});
