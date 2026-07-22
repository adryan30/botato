import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBotatoClient } from './lib/client.js';
import { loadConfig } from './lib/config.js';

const config = loadConfig();
const client = createBotatoClient({
  rootDir: dirname(fileURLToPath(import.meta.url)),
});

client.once('clientReady', () => {
  client.logger.info(`Logged in as ${client.user?.tag ?? 'unknown'}`);
});

try {
  await client.login(config.discordToken);
} catch (error) {
  client.logger.fatal(error);
  process.exitCode = 1;
}
