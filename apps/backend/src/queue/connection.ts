import IORedis from 'ioredis';
import { env } from '../env.js';

// BullMQ requires this on any connection it's handed -- it manages its own retry/blocking semantics.
export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
