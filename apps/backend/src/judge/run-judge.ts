import type { RegressionVerdict } from '@trust-gate/orchestrator';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { judgeResults, runs, trajectories } from '../db/schema.js';
import { env } from '../env.js';
import { getJudgeClient } from './client.js';
import { buildJudgePrompt, CRITERIA, judgeResponseSchema } from './rubric.js';

/**
 * Runs the LLM-judge pipeline for a run and inserts one judge_results row per
 * criterion. Advisory only -- the deterministic pass-to-pass signal in `runs.status`
 * is the actual gate (plan §6); this never touches that column.
 *
 * No-ops (does not throw) when there's nothing to judge: no API key configured, no
 * trajectory was submitted for this run (agent path only -- the PR/Actions path
 * doesn't send one), or the trajectory has no reasoning text to compare the diff
 * against. A malformed or unparseable LLM response *does* throw, so BullMQ's
 * existing 3-attempt exponential backoff (queues.ts) covers the "3x retry with
 * backoff" from the plan without a second retry loop in here.
 */
export async function runJudge(runId: string): Promise<void> {
  if (!env.GROQ_API_KEY || !env.GROQ_MODEL) return;

  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) throw new Error(`Run ${runId} not found`);

  const [trajectory] = await db.select().from(trajectories).where(eq(trajectories.runId, runId));
  if (!trajectory?.reasoningText) return;

  const verdict = run.verdict as RegressionVerdict;
  if (!verdict.diff || verdict.diff.trim() === '') return;

  const { system, user } = buildJudgePrompt({
    reasoningText: trajectory.reasoningText,
    diff: verdict.diff,
    atRiskTests: verdict.blast.atRiskTests,
    verdictStatus: verdict.status,
  });

  const client = getJudgeClient();
  const completion = await client.chat.completions.create({
    model: env.GROQ_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error(`Judge response for run ${runId} had no content`);

  const parsed = judgeResponseSchema.parse(JSON.parse(raw));

  await db.insert(judgeResults).values(
    CRITERIA.map((c) => ({
      runId,
      criterion: c.id,
      scoreInt: parsed[c.id].score,
      reasoning: parsed[c.id].reasoning,
      model: env.GROQ_MODEL as string,
    })),
  );
}
