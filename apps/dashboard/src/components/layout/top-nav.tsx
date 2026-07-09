import Link from 'next/link';
import { UserMenu } from '@/components/auth/user-menu';

/** Maps to airtable-DESIGN.md's `top-nav` token: 64px white bar, wordmark left, stays light (the doc explicitly never inverts nav over dark sections). */
export function TopNav() {
  return (
    <header className="h-16 border-b border-hairline bg-canvas">
      <div className="mx-auto flex h-full max-w-(--breakpoint-xl) items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-title-sm text-ink">
            Trust Gate
          </Link>
          <Link href="/runs" className="text-body-md text-body">
            Runs
          </Link>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
