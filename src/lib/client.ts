import '@sapphire/plugin-hmr/register';
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-subcommands/register';

import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { join } from 'node:path';

export type BotatoNodeEnv = 'development' | 'production' | 'test';

export type CreateBotatoClientOptions = {
  rootDir: string;
  nodeEnv?: BotatoNodeEnv;
};

export function createBotatoClient(
  options: CreateBotatoClientOptions,
): SapphireClient {
  const nodeEnv = options.nodeEnv ?? normalizeNodeEnv(process.env.NODE_ENV);

  const client = new SapphireClient({
    baseUserDirectory: null,
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    loadMessageCommandListeners: false,
    logger: {
      level: LogLevel.Info,
    },
    hmr: {
      enabled: nodeEnv === 'development',
    },
  });

  client.stores.registerPath(join(options.rootDir, 'features', 'music'));

  return client;
}

function normalizeNodeEnv(value: string | undefined): BotatoNodeEnv {
  if (value === 'development' || value === 'test') {
    return value;
  }
  return 'production';
}
