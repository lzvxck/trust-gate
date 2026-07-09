function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
// BYO key, judge is optional (plan §6) -- GROQ_MODEL is only required when a key is actually
// set, so self-hosters who don't want the judge don't need to configure a model they'll never use.
if (GROQ_API_KEY && !process.env.GROQ_MODEL) {
  throw new Error('GROQ_MODEL is required when GROQ_API_KEY is set');
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
  /** Judge is advisory and optional -- both undefined means it's disabled, not misconfigured. */
  GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL,
};
