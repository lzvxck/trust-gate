import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, queryClient } from './client';

const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url));

await migrate(db, { migrationsFolder });
await queryClient.end();

console.log('Migrations applied.');
