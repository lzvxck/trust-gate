import { headers } from 'next/headers';
import Link from 'next/link';
import { SignInButton } from '@/components/auth/sign-in-button';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="mx-auto max-w-(--breakpoint-xl) px-6 py-12">
      <h1 className="text-display-md text-ink">Trust Gate</h1>
      <p className="mt-2 max-w-prose text-body-md text-body">
        Trajectory-aware regression gate for autonomous coding agents.
      </p>

      <div className="mt-8 flex gap-3">
        {session ? (
          <Link href="/runs" className={buttonVariants({ variant: 'primary' })}>
            View runs
          </Link>
        ) : (
          <SignInButton variant="primary" />
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card variant="flat">
          <div className="flex items-center justify-between">
            <span className="text-title-sm text-ink">example-repo</span>
            <Badge variant="fail">FAIL</Badge>
          </div>
          <p className="mt-2 text-body-md text-muted">2 pass-to-pass regressions</p>
        </Card>
        <Card variant="flat">
          <div className="flex items-center justify-between">
            <span className="text-title-sm text-ink">another-repo</span>
            <Badge variant="pass">PASS</Badge>
          </div>
          <p className="mt-2 text-body-md text-muted">14 at-risk tests run</p>
        </Card>
        <Card variant="cream">
          <span className="text-title-sm">Judge advisory score</span>
          <p className="mt-2 text-body-md">Intent match: 5/5 &middot; Scope: 4/5</p>
        </Card>
      </div>
    </main>
  );
}
