import { headers } from 'next/headers';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { SignInButton } from './sign-in-button';
import { SignOutButton } from './sign-out-button';

/**
 * Server component -- calls auth.api.getSession directly rather than trusting a
 * middleware-set header, per the plan's explicit CVE-2025-29927 note (don't rely on
 * Next.js middleware alone for session checks).
 */
export async function UserMenu() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return <SignInButton variant="secondary" size="sm" />;
  }

  return (
    <div className="flex items-center gap-3">
      {session.user.image ? (
        <Image
          src={session.user.image}
          alt={session.user.name}
          width={28}
          height={28}
          className="rounded-full"
        />
      ) : null}
      <span className="text-body-md text-body">{session.user.name}</span>
      <SignOutButton />
    </div>
  );
}
