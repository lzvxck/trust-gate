import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RegressionChart } from '@/components/regression-chart';
import { RepoSettingsForm } from '@/components/repo-settings-form';
import { Card } from '@/components/ui/card';
import { getRepo, getRepoRegressions, listRuns } from '@/lib/api';
import { auth } from '@/lib/auth';
import { updateRepoSettingsAction } from './actions';

export default async function RepoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/');

  const { id } = await params;
  const repo = await getRepo(id);
  if (!repo) notFound();

  const [series, { runs }] = await Promise.all([
    getRepoRegressions(id),
    listRuns({ repoId: id, limit: 10 }),
  ]);

  const totalPassToPass = series.reduce((sum, day) => sum + day.passToPass, 0);
  const totalNewFail = series.reduce((sum, day) => sum + day.newFail, 0);

  return (
    <main className="mx-auto max-w-(--breakpoint-xl) px-6 py-12">
      <Link href="/repos" className="text-body-sm text-muted">
        &larr; All repos
      </Link>

      <div className="mt-4">
        <h1 className="text-display-sm text-ink">{repo.fullName}</h1>
        <p className="mt-1 text-body-sm text-muted">
          Default branch {repo.defaultBranch} &middot; added{' '}
          {new Date(repo.createdAt).toLocaleDateString()}
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-title-sm text-ink">Regressions over time</h2>
        {series.length === 0 ? (
          <Card variant="soft" className="mt-3">
            <p className="text-body-md text-muted">No regression events recorded yet.</p>
          </Card>
        ) : (
          <>
            <p className="mt-1 text-body-sm text-muted">
              {totalPassToPass} pass-to-pass regression{totalPassToPass === 1 ? '' : 's'} &middot;{' '}
              {totalNewFail} new failure{totalNewFail === 1 ? '' : 's'} across {series.length} day
              {series.length === 1 ? '' : 's'} with activity.
            </p>
            <Card variant="flat" className="mt-3">
              <RegressionChart series={series} />
            </Card>
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-title-sm text-ink">Recent runs</h2>
        <div className="mt-3 flex flex-col gap-2">
          {runs.length === 0 ? (
            <Card variant="soft">
              <p className="text-body-md text-muted">No runs yet.</p>
            </Card>
          ) : (
            runs.map((run) => (
              <Link key={run.id} href={`/runs/${run.id}`}>
                <Card variant="flat" className="active:bg-surface-soft">
                  <div className="flex items-center justify-between">
                    <span className="text-body-md text-ink">
                      {run.headSha.slice(0, 7)} &middot; {run.source}
                    </span>
                    <span className="text-body-sm text-muted">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-title-sm text-ink">Settings</h2>
        <Card variant="flat" className="mt-3">
          <RepoSettingsForm repo={repo} action={updateRepoSettingsAction.bind(null, id)} />
        </Card>
      </section>
    </main>
  );
}
