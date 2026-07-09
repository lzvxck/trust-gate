import { Queue } from 'bullmq';
import { connection } from './connection.js';

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
};

export const analyzeQueue = new Queue('analyze', { connection, defaultJobOptions });
export const executeQueue = new Queue('execute', { connection, defaultJobOptions });
export const judgeQueue = new Queue('judge', { connection, defaultJobOptions });

/** jobId: runId makes re-enqueuing the same run a no-op (BullMQ dedupes on jobId). */
export async function enqueueAnalyze(runId: string): Promise<void> {
  await analyzeQueue.add('analyze', { runId }, { jobId: runId });
}
