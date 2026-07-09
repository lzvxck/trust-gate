import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { RunStatus } from '@/lib/api';
import { listRuns } from '@/lib/api';
import { auth } from '@/lib/auth';

const STATUS_BADGE: Record<RunStatus, BadgeProps['variant']> = {
  pass: 'pass',
  fail: 'fail',
  error: 'error',
  queued: 'pending',
  running: 'pending',
};

export default async function RunsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/');

  const { runs } = await listRuns({ limit: 50 });

  return (
    <main className="mx-auto max-w-(--breakpoint-xl) px-6 py-12">
      <h1 className="text-display-sm text-ink">Runs</h1>
      <p className="mt-2 text-body-md text-body">
        Latest regression gate results across all repos.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {runs.length === 0 ? (
          <Card variant="soft">
            <p className="text-body-md text-muted">No runs yet.</p>
          </Card>
        ) : (
          runs.map((run) => (
            <Link key={run.id} href={`/runs/${run.id}`}>
              <Card variant="flat" className="active:bg-surface-soft">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-title-sm text-ink">{run.repoFullName}</span>
                    <p className="mt-1 text-body-sm text-muted">
                      {run.headSha.slice(0, 7)} &middot; {run.source} &middot;{' '}
                      {new Date(run.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {run.passToPassFailures > 0 ? (
                      <span className="text-body-sm text-signature-coral">
                        {run.passToPassFailures} regression{run.passToPassFailures === 1 ? '' : 's'}
                      </span>
                    ) : null}
                    <Badge variant={STATUS_BADGE[run.status]}>{run.status.toUpperCase()}</Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
