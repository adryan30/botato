import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Every feature owns its tables next to its domain code. New features only
  // add `src/features/<name>/lib/**/schema.ts` — no config edit required.
  schema: './src/features/**/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://botato:botato@127.0.0.1:5432/botato',
  },
});
