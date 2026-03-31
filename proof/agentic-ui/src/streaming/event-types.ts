/**
 * AG-UI Protocol Event Types
 *
 * Maps Vercel AI SDK data stream protocol lines to a standardised
 * set of agentic-UI events that downstream renderers can subscribe to.
 */

export enum AGUIEventType {
  TEXT_MESSAGE_START = 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT = 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END = 'TEXT_MESSAGE_END',
  TOOL_CALL_START = 'TOOL_CALL_START',
  TOOL_CALL_ARGS = 'TOOL_CALL_ARGS',
  TOOL_CALL_END = 'TOOL_CALL_END',
  STATE_SNAPSHOT = 'STATE_SNAPSHOT',
  STATE_DELTA = 'STATE_DELTA',
  RUN_STARTED = 'RUN_STARTED',
  RUN_FINISHED = 'RUN_FINISHED',
  RUN_ERROR = 'RUN_ERROR',
  CUSTOM = 'CUSTOM',
}

export interface AGUIEvent {
  type: AGUIEventType;
  timestamp: number;
  runId?: string;
  messageId?: string;
  delta?: string;
  toolCallId?: string;
  toolCallName?: string;
  args?: unknown;
  snapshot?: unknown;
  [key: string]: unknown;
}
