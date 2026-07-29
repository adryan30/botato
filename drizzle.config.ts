import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/features/afk/lib/mark/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://botato:botato@127.0.0.1:5432/botato',
  },
});
