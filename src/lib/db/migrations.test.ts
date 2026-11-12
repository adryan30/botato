import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsFolder = join(import.meta.dirname, '../../../drizzle');

describe('drizzle migrations', () => {
  it('keeps foreign keys on the same schema as the unqualified tables', () => {
    const sqlFiles = readdirSync(migrationsFolder).filter((name) =>
      name.endsWith('.sql'),
    );

    const offenders = sqlFiles.filter((name) =>
      readFileSync(join(migrationsFolder, name), 'utf8').includes(
        'REFERENCES "public".',
      ),
    );

    expect(offenders).toEqual([]);
  });
});
