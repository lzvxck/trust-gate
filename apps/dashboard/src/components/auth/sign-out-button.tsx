'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() =>
        authClient.signOut({
          fetchOptions: { onSuccess: () => router.refresh() },
        })
      }
    >
      Sign out
    </Button>
  );
}
