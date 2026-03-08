import { describe, expect, test } from 'bun:test';
import { InMemoryTaskStore } from '@a2a-js/sdk/server';
import type { Task } from '@a2a-js/sdk';

describe('A2A TaskStore', () => {
  test('InMemoryTaskStore: save and load round-trips a task', async () => {
    const store = new InMemoryTaskStore();
    const task: Task = {
      kind: 'task',
      id: 'test-1',
      contextId: 'ctx-1',
      status: { state: 'submitted', timestamp: new Date().toISOString() },
    };
    await store.save(task);
    const loaded = await store.load('test-1');
    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe('test-1');
    expect(loaded!.status.state).toBe('submitted');
  });

  test('InMemoryTaskStore: load returns undefined for unknown ID', async () => {
    const store = new InMemoryTaskStore();
    const loaded = await store.load('nonexistent');
    expect(loaded).toBeUndefined();
  });

  test('InMemoryTaskStore: save overwrites existing task', async () => {
    const store = new InMemoryTaskStore();
    const task: Task = {
      kind: 'task',
      id: 'test-1',
      contextId: 'ctx-1',
      status: { state: 'submitted', timestamp: new Date().toISOString() },
    };
    await store.save(task);

    const updated: Task = {
      ...task,
      status: { state: 'working', timestamp: new Date().toISOString() },
    };
    await store.save(updated);

    const loaded = await store.load('test-1');
    expect(loaded!.status.state).toBe('working');
  });

  test('createTaskStore returns InMemoryTaskStore', async () => {
    const { createTaskStore } = await import('./task-store');
    const store = createTaskStore();
    expect(store).toBeDefined();

    // Verify it implements TaskStore interface
    const task: Task = {
      kind: 'task',
      id: 'factory-test',
      contextId: 'ctx-1',
      status: { state: 'submitted', timestamp: new Date().toISOString() },
    };
    await store.save(task);
    const loaded = await store.load('factory-test');
    expect(loaded!.id).toBe('factory-test');
  });
});
