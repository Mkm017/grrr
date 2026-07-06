import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from './env';

const client = postgres(env.DATABASE_URL, { max: 1, idle_timeout: 15 });
export const db = drizzle(client, { schema });

// Export all schemas
export * from './schema';
export { client };