import { defineConfig } from 'drizzle-kit';

const DATABASE_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://lwc:lwc_dev@localhost:5432/kaibase';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*',
  out: './src/migrations',
  dbCredentials: {
    url: DATABASE_URL,
  },
  migrations: {
    prefix: 'timestamp',
  },
  verbose: true,
  strict: true,
});
