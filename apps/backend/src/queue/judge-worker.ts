import { Worker } from 'bullmq';
import { runJudge } from '../judge/run-judge.js';
import { connection } from './connection.js';

interface JudgeJobData {
  runId: string;
}

/** Advisory-only LLM judge (plan §6). runJudge no-ops gracefully when there's no API key, no trajectory, or no reasoning text -- see its own docs. */
export function startJudgeWorker(): Worker<JudgeJobData> {
  return new Worker<JudgeJobData>('judge', async (job) => runJudge(job.data.runId), { connection });
}
