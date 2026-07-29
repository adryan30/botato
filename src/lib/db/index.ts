import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export type BotatoDb = ReturnType<typeof createDb>;

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 5 });
  return drizzle(client);
}

export async function migrateDb(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);
  const migrationsFolder = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'drizzle',
  );
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await client.end();
  }
}
