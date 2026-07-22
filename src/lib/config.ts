export type MusicNodeConfig = {
  host: string;
  port: number;
  password: string;
};

export type BotatoConfig = {
  discordToken: string;
  discordGuildIds: string[];
  musicNode: MusicNodeConfig;
};

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): BotatoConfig {
  const discordToken = env.DISCORD_TOKEN?.trim();
  if (!discordToken) {
    throw new Error('DISCORD_TOKEN is required');
  }

  const password = env.MUSIC_NODE_PASSWORD?.trim();
  if (!password) {
    throw new Error('MUSIC_NODE_PASSWORD is required');
  }

  const host = env.MUSIC_NODE_HOST?.trim() || '127.0.0.1';
  const portRaw = env.MUSIC_NODE_PORT?.trim() || '2333';
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('MUSIC_NODE_PORT must be an integer between 1 and 65535');
  }

  return {
    discordToken,
    discordGuildIds: parseGuildIds(env),
    musicNode: { host, port, password },
  };
}

function parseGuildIds(env: NodeJS.ProcessEnv): string[] {
  const fromList = env.DISCORD_GUILD_IDS?.split(',') ?? [];
  const fromSingle = env.DISCORD_GUILD_ID ? [env.DISCORD_GUILD_ID] : [];
  const ids = [...fromList, ...fromSingle]
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return [...new Set(ids)];
}
