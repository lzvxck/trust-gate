import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { listRepos } from '@/lib/api';
import { auth } from '@/lib/auth';

export default async function ReposPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/');

  const repos = await listRepos();

  return (
    <main className="mx-auto max-w-(--breakpoint-xl) px-6 py-12">
      <h1 className="text-display-sm text-ink">Repos</h1>
      <p className="mt-2 text-body-md text-body">Every repo that has reported a run.</p>

      <div className="mt-8 flex flex-col gap-3">
        {repos.length === 0 ? (
          <Card variant="soft">
            <p className="text-body-md text-muted">No repos yet.</p>
          </Card>
        ) : (
          repos.map((repo) => (
            <Link key={repo.id} href={`/repos/${repo.id}`}>
              <Card variant="flat" className="active:bg-surface-soft">
                <div className="flex items-center justify-between">
                  <span className="text-title-sm text-ink">{repo.fullName}</span>
                  <span className="text-body-sm text-muted">default: {repo.defaultBranch}</span>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
