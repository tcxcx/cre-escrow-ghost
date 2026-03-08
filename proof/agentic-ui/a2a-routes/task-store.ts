/**
 * A2A TaskStore Factory
 *
 * Creates a TaskStore for A2A task persistence.
 * Currently uses InMemoryTaskStore from the SDK.
 * Will be replaced with Supabase-backed store in Phase 3.
 */
import { InMemoryTaskStore } from '@a2a-js/sdk/server';
import type { TaskStore } from '@a2a-js/sdk/server';

/**
 * Create an A2A TaskStore instance.
 *
 * Currently returns InMemoryTaskStore (tasks lost on Worker restart).
 * TODO: Replace with Supabase-backed implementation for persistence.
 */
export function createTaskStore(): TaskStore {
  return new InMemoryTaskStore();
}
