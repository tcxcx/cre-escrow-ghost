/**
 * Database and cache credentials (Upstash Redis, BullMQ Redis).
 */

import { resolve, required } from './core';

export function getUpstashRedisUrl(override?: string): string | undefined {
  return resolve('UPSTASH_REDIS_REST_URL', override);
}

export function requireUpstashRedisUrl(override?: string): string {
  return required('UPSTASH_REDIS_REST_URL', override);
}

export function getUpstashRedisToken(override?: string): string | undefined {
  return resolve('UPSTASH_REDIS_REST_TOKEN', override);
}

export function requireUpstashRedisToken(override?: string): string {
  return required('UPSTASH_REDIS_REST_TOKEN', override);
}

// -- BullMQ Redis (job queues) ---------------------------------------------

export function getRedisQueueUrl(): string | undefined {
  return resolve('REDIS_QUEUE_URL');
}

export function requireRedisQueueUrl(): string {
  return required('REDIS_QUEUE_URL');
}

// -- Bun Redis (application cache) -------------------------------------------

export function getRedisUrl(): string | undefined {
  return resolve('REDIS_URL');
}

export function requireRedisUrl(): string {
  return required('REDIS_URL');
}

export function getRailwayEnvironment(): string | undefined {
  return resolve('RAILWAY_ENVIRONMENT');
}
