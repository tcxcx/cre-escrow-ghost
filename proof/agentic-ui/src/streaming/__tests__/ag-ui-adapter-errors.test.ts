import { describe, it, expect } from 'vitest';
import { createAGUIAdapter } from '../ag-ui-adapter';
import { AGUIEventType } from '../event-types';

describe('AG-UI adapter error recovery', () => {
  it('emits RUN_ERROR after 3 consecutive parse failures', () => {
    const adapter = createAGUIAdapter();
    const events: any[] = [];
    adapter.on((e) => events.push(e));

    adapter.processLine('0:not-json');
    adapter.processLine('0:{broken');
    adapter.processLine('0:also-broken');

    const errorEvent = events.find((e) => e.type === AGUIEventType.RUN_ERROR);
    expect(errorEvent).toBeDefined();
    expect(errorEvent.error).toContain('consecutive parse failures');
  });

  it('resets failure counter on successful parse', () => {
    const adapter = createAGUIAdapter();
    const events: any[] = [];
    adapter.on((e) => events.push(e));

    adapter.processLine('0:not-json');
    adapter.processLine('0:{broken');
    adapter.processLine('0:"hello"');
    adapter.processLine('0:not-json');
    adapter.processLine('0:{broken');

    const errorEvents = events.filter((e) => e.type === AGUIEventType.RUN_ERROR);
    expect(errorEvents).toHaveLength(0);
  });

  it('resets consecutiveFailures in reset()', () => {
    const adapter = createAGUIAdapter();
    const events: any[] = [];
    adapter.on((e) => events.push(e));

    adapter.processLine('0:not-json');
    adapter.processLine('0:{broken');
    adapter.reset();
    adapter.on((e) => events.push(e));
    adapter.processLine('0:also-broken');

    const errorEvents = events.filter((e) => e.type === AGUIEventType.RUN_ERROR);
    expect(errorEvents).toHaveLength(0);
  });
});
