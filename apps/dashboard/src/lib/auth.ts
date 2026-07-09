import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { db } from './db/client';
import { user as userTable } from './db/schema';
import { env } from './env';

/**
 * Self-hosted by design (plan §3/§7): GitHub OAuth via better-auth, sessions in
 * Postgres, server-side validation. Reuses the trust-gate-dev GitHub App's own
 * client id/secret (GitHub Apps support the standard OAuth authorize/token flow,
 * same as a plain OAuth App) rather than provisioning a second App just for login.
 *
 * Do NOT rely on Next.js middleware alone for session checks (plan §3, citing
 * CVE-2025-29927) -- validate server-side in route handlers / server components via
 * `auth.api.getSession`, not just via a middleware redirect.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg' }),
  socialProviders: {
    github: {
      clientId: env.GITHUB_APP_CLIENT_ID,
      clientSecret: env.GITHUB_APP_CLIENT_SECRET,
    },
  },
  databaseHooks: {
    session: {
      create: {
        /**
         * The access boundary for a self-hosted, single-tenant instance: everyone
         * with a session sees the same shared data (no per-user scoping -- see
         * PROGRESS.md), so gating who can get a session at all is what actually
         * matters. Runs on every sign-in, not just first-time signup, so removing
         * an email from the allowlist also revokes access for existing users.
         */
        before: async (session) => {
          if (!env.ALLOWED_EMAILS) return true;

          const [dbUser] = await db
            .select({ email: userTable.email })
            .from(userTable)
            .where(eq(userTable.id, session.userId));

          return dbUser ? env.ALLOWED_EMAILS.includes(dbUser.email.toLowerCase()) : false;
        },
      },
    },
  },
});
