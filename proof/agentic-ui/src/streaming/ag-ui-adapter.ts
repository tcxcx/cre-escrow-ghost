import { AGUIEventType } from './event-types';
import type { AGUIEvent } from './event-types';

export type AGUIListener = (event: AGUIEvent) => void;

export interface AGUIAdapter {
  /** Process a single AI SDK protocol line and emit corresponding AG-UI events. */
  processLine(line: string): void;
  /** Subscribe to AG-UI events. Returns an unsubscribe function. */
  on(listener: AGUIListener): () => void;
  /** Reset internal state (runId, messageStarted flag, listeners). */
  reset(): void;
}

/**
 * Creates a stateful adapter that converts Vercel AI SDK data stream lines
 * into AG-UI protocol events.
 *
 * AI SDK protocol prefixes handled:
 *   0:  — text delta
 *   9:  — tool call start (streaming)
 *   b:  — tool call start (non-streaming)
 *   a:  — tool call args delta
 *   c:  — tool result
 *   8:  — data array
 *   e:  — error
 *   d:  — finish
 */
export function createAGUIAdapter(): AGUIAdapter {
  const listeners = new Set<AGUIListener>();
  let runId = crypto.randomUUID();
  let messageStarted = false;
  let runStarted = false;
  let consecutiveFailures = 0;
  const FAILURE_THRESHOLD = 3;

  function emit(event: AGUIEvent): void {
    for (const listener of listeners) {
      listener(event);
    }
  }

  function processLine(line: string): void {
    if (!line || line.length < 2) return;

    const prefix = line.slice(0, 2);
    const payload = line.slice(2);

    switch (prefix) {
      case '0:': {
        // Text delta
        let text: string;
        try {
          text = JSON.parse(payload) as string;
        } catch {
          consecutiveFailures++;
          if (consecutiveFailures >= FAILURE_THRESHOLD) {
            emit({
              type: AGUIEventType.RUN_ERROR,
              timestamp: Date.now(),
              runId,
              error: `Stream corrupted: ${consecutiveFailures} consecutive parse failures`,
            });
            consecutiveFailures = 0;
          }
          return;
        }
        consecutiveFailures = 0;

        if (!runStarted) {
          runStarted = true;
          emit({
            type: AGUIEventType.RUN_STARTED,
            timestamp: Date.now(),
            runId,
          });
        }

        if (!messageStarted) {
          messageStarted = true;
          emit({
            type: AGUIEventType.TEXT_MESSAGE_START,
            timestamp: Date.now(),
            runId,
          });
        }

        emit({
          type: AGUIEventType.TEXT_MESSAGE_CONTENT,
          timestamp: Date.now(),
          runId,
          delta: text,
        });
        break;
      }

      case '9:':
      case 'b:': {
        // Tool call start
        let parsed: { toolCallId?: string; toolName?: string };
        try {
          parsed = JSON.parse(payload) as {
            toolCallId?: string;
            toolName?: string;
          };
        } catch {
          consecutiveFailures++;
          if (consecutiveFailures >= FAILURE_THRESHOLD) {
            emit({
              type: AGUIEventType.RUN_ERROR,
              timestamp: Date.now(),
              runId,
              error: `Stream corrupted: ${consecutiveFailures} consecutive parse failures`,
            });
            consecutiveFailures = 0;
          }
          return;
        }
        consecutiveFailures = 0;

        emit({
          type: AGUIEventType.TOOL_CALL_START,
          timestamp: Date.now(),
          runId,
          toolCallId: parsed.toolCallId,
          toolCallName: parsed.toolName,
        });
        break;
      }

      case 'a:': {
        // Tool call args delta
        let parsed: { toolCallId?: string; argsTextDelta?: string };
        try {
          parsed = JSON.parse(payload) as {
            toolCallId?: string;
            argsTextDelta?: string;
          };
        } catch {
          consecutiveFailures++;
          if (consecutiveFailures >= FAILURE_THRESHOLD) {
            emit({
              type: AGUIEventType.RUN_ERROR,
              timestamp: Date.now(),
              runId,
              error: `Stream corrupted: ${consecutiveFailures} consecutive parse failures`,
            });
            consecutiveFailures = 0;
          }
          return;
        }
        consecutiveFailures = 0;

        emit({
          type: AGUIEventType.TOOL_CALL_ARGS,
          timestamp: Date.now(),
          runId,
          toolCallId: parsed.toolCallId,
          delta: parsed.argsTextDelta,
        });
        break;
      }

      case 'c:': {
        // Tool result
        let parsed: { toolCallId?: string; result?: unknown };
        try {
          parsed = JSON.parse(payload) as {
            toolCallId?: string;
            result?: unknown;
          };
        } catch {
          consecutiveFailures++;
          if (consecutiveFailures >= FAILURE_THRESHOLD) {
            emit({
              type: AGUIEventType.RUN_ERROR,
              timestamp: Date.now(),
              runId,
              error: `Stream corrupted: ${consecutiveFailures} consecutive parse failures`,
            });
            consecutiveFailures = 0;
          }
          return;
        }
        consecutiveFailures = 0;

        emit({
          type: AGUIEventType.TOOL_CALL_END,
          timestamp: Date.now(),
          runId,
          toolCallId: parsed.toolCallId,
          args: parsed.result,
        });
        break;
      }

      case '8:': {
        // Data array — may contain a2ui custom events or state deltas
        let dataArray: unknown[];
        try {
          dataArray = JSON.parse(payload) as unknown[];
        } catch {
          consecutiveFailures++;
          if (consecutiveFailures >= FAILURE_THRESHOLD) {
            emit({
              type: AGUIEventType.RUN_ERROR,
              timestamp: Date.now(),
              runId,
              error: `Stream corrupted: ${consecutiveFailures} consecutive parse failures`,
            });
            consecutiveFailures = 0;
          }
          return;
        }
        consecutiveFailures = 0;

        for (const item of dataArray) {
          if (
            typeof item === 'object' &&
            item !== null &&
            'type' in item &&
            (item as { type: string }).type === 'data-a2ui'
          ) {
            emit({
              type: AGUIEventType.CUSTOM,
              timestamp: Date.now(),
              runId,
              subtype: 'a2ui',
              data: item,
            });
          } else {
            emit({
              type: AGUIEventType.STATE_DELTA,
              timestamp: Date.now(),
              runId,
              snapshot: item,
            });
          }
        }
        break;
      }

      case 'e:': {
        // Error
        let parsed: { message?: string } | string;
        try {
          parsed = JSON.parse(payload) as { message?: string } | string;
        } catch {
          consecutiveFailures++;
          if (consecutiveFailures >= FAILURE_THRESHOLD) {
            emit({
              type: AGUIEventType.RUN_ERROR,
              timestamp: Date.now(),
              runId,
              error: `Stream corrupted: ${consecutiveFailures} consecutive parse failures`,
            });
            consecutiveFailures = 0;
          }
          parsed = payload;
        }
        consecutiveFailures = 0;

        emit({
          type: AGUIEventType.RUN_ERROR,
          timestamp: Date.now(),
          runId,
          error: parsed,
        });
        break;
      }

      case 'd:': {
        // Finish
        if (messageStarted) {
          emit({
            type: AGUIEventType.TEXT_MESSAGE_END,
            timestamp: Date.now(),
            runId,
          });
        }

        emit({
          type: AGUIEventType.RUN_FINISHED,
          timestamp: Date.now(),
          runId,
        });

        // Reset for next run
        messageStarted = false;
        runStarted = false;
        runId = crypto.randomUUID();
        break;
      }

      default:
        // Unknown prefix — ignore
        break;
    }
  }

  function on(listener: AGUIListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function reset(): void {
    messageStarted = false;
    runStarted = false;
    consecutiveFailures = 0;
    runId = crypto.randomUUID();
    listeners.clear();
  }

  return { processLine, on, reset };
}
