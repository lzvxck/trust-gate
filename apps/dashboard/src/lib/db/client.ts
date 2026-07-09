import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

/**
 * Scoped to better-auth's own tables only (user/session/account/verification) --
 * this Drizzle instance is not for trust-gate domain data (repos/runs/etc.). Those
 * live behind the backend's REST API; the dashboard only needs direct Postgres access
 * for the tables better-auth itself requires for session validation.
 */
export const queryClient = postgres(env.DATABASE_URL);
export const db = drizzle(queryClient, { schema });
