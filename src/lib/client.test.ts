import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createBotatoClient } from './client.js';

describe('createBotatoClient', () => {
  const roots: string[] = [];

  afterEach(async () => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function makeRoot(): string {
    const root = mkdtempSync(join(tmpdir(), 'botato-'));
    mkdirSync(join(root, 'features', 'music'), { recursive: true });
    roots.push(root);
    return root;
  }

  it('enables HMR only in development', async () => {
    const rootDir = makeRoot();

    const devClient = createBotatoClient({
      rootDir,
      nodeEnv: 'development',
    });
    const prodClient = createBotatoClient({
      rootDir,
      nodeEnv: 'production',
    });

    expect(devClient.options.hmr?.enabled).toBe(true);
    expect(prodClient.options.hmr?.enabled).toBe(false);

    await Promise.all([devClient.destroy(), prodClient.destroy()]);
  });

  it('registers the music feature module path', async () => {
    const rootDir = makeRoot();
    const musicCommandsPath = join(rootDir, 'features', 'music', 'commands');

    const client = createBotatoClient({ rootDir, nodeEnv: 'test' });

    expect(client.stores.get('commands').paths.has(musicCommandsPath)).toBe(
      true,
    );

    await client.destroy();
  });
});
