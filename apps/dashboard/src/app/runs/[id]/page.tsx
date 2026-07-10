import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ImpactGraph } from '@/components/impact-graph';
import { LiveRunStatus } from '@/components/live-run-status';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { RunStatus } from '@/lib/api';
import { getRun } from '@/lib/api';
import { auth } from '@/lib/auth';

const STATUS_BADGE: Record<RunStatus, BadgeProps['variant']> = {
  pass: 'pass',
  fail: 'fail',
  error: 'error',
  queued: 'pending',
  running: 'pending',
};

const VERDICT_CARD: Record<RunStatus, 'forest' | 'coral' | 'soft'> = {
  pass: 'forest',
  fail: 'coral',
  error: 'coral',
  queued: 'soft',
  running: 'soft',
};

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/');

  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();

  const trajectory = run.trajectories[0];

  return (
    <main className="mx-auto max-w-(--breakpoint-xl) px-6 py-12">
      <Link href="/runs" className="text-body-sm text-muted">
        &larr; All runs
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-display-sm text-ink">{run.repo.fullName}</h1>
          <p className="mt-1 text-body-sm text-muted">
            {run.headSha.slice(0, 7)} against {run.baseSha.slice(0, 7)} &middot; {run.source}{' '}
            &middot; {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={STATUS_BADGE[run.status]}>{run.status.toUpperCase()}</Badge>
          <LiveRunStatus runId={run.id} initialStatus={run.status} />
        </div>
      </div>

      <Card variant={VERDICT_CARD[run.status]} className="mt-8">
        <span className="text-title-sm">Verdict</span>
        <p className="mt-2 text-body-md">
          {run.verdict ? `${run.verdict.testsRun} test(s) run.` : 'No verdict recorded yet.'}
        </p>
        {run.verdict?.errorMessage ? (
          <p className="mt-2 text-body-sm">{run.verdict.errorMessage}</p>
        ) : null}
      </Card>

      {run.verdict?.diff && run.impactEdges.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-title-sm text-ink">Impact graph</h2>
          <p className="mt-1 text-body-sm text-muted">
            Blast radius: the changed file(s), what reaches them, and the tests at risk.
          </p>
          <div className="mt-3">
            <ImpactGraph
              edges={run.impactEdges}
              atRiskTests={run.atRiskTests}
              diff={run.verdict.diff}
            />
          </div>
        </section>
      ) : null}

      {run.verdict && run.verdict.passToPassFailures.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-title-sm text-ink">
            Pass-to-pass regressions ({run.verdict.passToPassFailures.length})
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {run.verdict.passToPassFailures.map((f) => (
              <Card key={`${f.testFile}::${f.testName}`} variant="flat">
                <p className="text-body-md text-ink">
                  {f.testFile} :: {f.testName}
                </p>
                {f.message ? <p className="mt-1 text-body-sm text-muted">{f.message}</p> : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {run.judgeResults.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-title-sm text-ink">Judge advisory score</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {run.judgeResults.map((j) => (
              <Card key={j.id} variant="cream">
                <span className="text-label-md capitalize">{j.criterion.replace(/_/g, ' ')}</span>
                <p className="mt-1 text-title-sm">{j.scoreInt}/5</p>
                {j.reasoning ? <p className="mt-2 text-body-sm">{j.reasoning}</p> : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {run.atRiskTests.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-title-sm text-ink">At-risk tests ({run.atRiskTests.length})</h2>
          <div className="mt-3 flex flex-col gap-2">
            {run.atRiskTests.map((t) => (
              <Card key={t.id} variant="soft">
                <div className="flex items-center justify-between">
                  <p className="text-body-md text-ink">
                    {t.testFile}
                    {t.testName ? ` :: ${t.testName}` : ''}
                  </p>
                  <span className="text-body-sm text-muted">score {t.score.toFixed(2)}</span>
                </div>
                {t.reasons.length > 0 ? (
                  <p className="mt-1 text-body-sm text-muted">{t.reasons.join(', ')}</p>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {trajectory ? (
        <section className="mt-8">
          <h2 className="text-title-sm text-ink">Trajectory ({trajectory.agent})</h2>
          <Card variant="flat" className="mt-3">
            {trajectory.reasoningText ? (
              <p className="text-body-md text-body">{trajectory.reasoningText}</p>
            ) : null}
            {trajectory.filesTouched.length > 0 ? (
              <p className="mt-2 text-body-sm text-muted">
                Files touched: {trajectory.filesTouched.join(', ')}
              </p>
            ) : null}
          </Card>
        </section>
      ) : null}

      {run.testResults.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-title-sm text-ink">Test results ({run.testResults.length})</h2>
          <div className="mt-3 flex flex-col gap-1">
            {run.testResults.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b border-hairline py-2"
              >
                <span className="text-body-sm text-ink">
                  {t.testFile} :: {t.testName}
                </span>
                <Badge
                  variant={t.status === 'pass' ? 'pass' : t.status === 'fail' ? 'fail' : 'neutral'}
                >
                  {t.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
