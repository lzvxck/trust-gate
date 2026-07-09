'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export function SignInButton(props: ButtonProps) {
  return (
    <Button
      {...props}
      onClick={() => authClient.signIn.social({ provider: 'github', callbackURL: '/' })}
    >
      Sign in with GitHub
    </Button>
  );
}
