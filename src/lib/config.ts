export type BotatoConfig = {
  discordToken: string;
};

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): BotatoConfig {
  const discordToken = env.DISCORD_TOKEN?.trim();
  if (!discordToken) {
    throw new Error('DISCORD_TOKEN is required');
  }

  return { discordToken };
}
