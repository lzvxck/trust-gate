function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  PORT: Number(process.env.PORT ?? 3001),
  HOST: process.env.HOST ?? '0.0.0.0',
  RUNS_API_TOKEN: required('RUNS_API_TOKEN'),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  GITHUB_APP_ID: required('GITHUB_APP_ID'),
  GITHUB_APP_PRIVATE_KEY_PATH: required('GITHUB_APP_PRIVATE_KEY_PATH'),
  GITHUB_WEBHOOK_SECRET: required('GITHUB_WEBHOOK_SECRET'),
};
