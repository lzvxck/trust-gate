function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  BETTER_AUTH_SECRET: required('BETTER_AUTH_SECRET'),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  GITHUB_APP_CLIENT_ID: required('GITHUB_APP_CLIENT_ID'),
  GITHUB_APP_CLIENT_SECRET: required('GITHUB_APP_CLIENT_SECRET'),
  BACKEND_URL: process.env.BACKEND_URL ?? 'http://localhost:3001',
  BACKEND_API_TOKEN: required('BACKEND_API_TOKEN'),
  /**
   * Sign-in allowlist (comma-separated emails). Self-hosted instances are
   * single-tenant -- there's no per-user data scoping (see PROGRESS.md) -- so the
   * actual access boundary is who's allowed to create a session at all, not what
   * they can see once signed in. Unset means unrestricted, which is the current
   * default but not the recommended one; self-hosters should set this.
   */
  ALLOWED_EMAILS: process.env.ALLOWED_EMAILS?.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};
