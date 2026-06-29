import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

// DATABASE_URL accepts any libsql-compatible URL:
//   file:./payroll.db          — local SQLite (default, good for dev)
//   libsql://your-db.turso.io  — Turso cloud
//   file::memory:              — in-memory SQLite (tests)
const client = createClient({
  url: process.env.DATABASE_URL ?? 'file:payroll.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export { client };
export default db;
