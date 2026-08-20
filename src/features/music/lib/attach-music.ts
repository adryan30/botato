import { container } from '@sapphire/framework';
import { ActivityType, type Client } from 'discord.js';
import type { BotatoConfig } from '../../../lib/config.js';
import './container-augment.js';
import { bindControlSurface } from './control-surface/bind-control-surface.js';
import { createDiscordMessagePort } from './control-surface/discord-messages.js';
import { MusicControlSurface } from './control-surface/music-control-surface.js';
import { DjModeService } from './dj/dj-mode-service.js';
import { createOpenRouterClient } from './dj/openrouter-client.js';
import type { OpenRouterPort } from './dj/openrouter-port.js';
import { OpenRouterError } from './dj/openrouter-port.js';
import { createKazagumoMusicNode } from './music-node/kazagumo-music-node.js';
import type { MusicNodePort } from './music-node/music-node-port.js';
import { MusicSessionService } from './session/music-session-service.js';

const MUSIC_UNAVAILABLE_PRESENCE = 'Music unavailable';

export function attachMusicFeature(
  client: Client,
  config: BotatoConfig,
): MusicSessionService {
  const musicNode = createKazagumoMusicNode(client, config.musicNode);
  const musicSessions = new MusicSessionService(musicNode);
  bindMusicUnavailablePresence(client, musicNode);

  const surface = new MusicControlSurface(createDiscordMessagePort(client), {
    logError(message, error) {
      client.logger.error(
        `${message}: ${error instanceof Error ? error.message : String(error)}`,
      );
    },
  });
  const musicControlSurface = bindControlSurface(musicSessions, surface);
  const djMode = new DjModeService(
    musicSessions,
    createConfiguredOpenRouter(config),
    {
      modelId: config.openRouter.model,
      logFailure(entry) {
        client.logger.warn(`dj_failure ${JSON.stringify(entry)}`);
      },
      async notify(guildId, content) {
        const channelId = musicControlSurface.notedChannelId(guildId);
        if (!channelId) {
          return;
        }
        await sendGuildTextNotice(client, channelId, content);
      },
    },
  );

  container.musicSessions = musicSessions;
  container.musicControlSurface = musicControlSurface;
  container.djMode = djMode;
  return musicSessions;
}

function createConfiguredOpenRouter(config: BotatoConfig): OpenRouterPort {
  const apiKey = config.openRouter.apiKey;
  if (!apiKey) {
    return {
      async suggestTracks() {
        throw new OpenRouterError(
          'OPENROUTER_API_KEY is not configured. Set it to use /dj.',
          { code: 'missing_key' },
        );
      },
    };
  }
  return createOpenRouterClient({
    apiKey,
    model: config.openRouter.model,
  });
}

async function sendGuildTextNotice(
  client: Client,
  channelId: string,
  content: string,
): Promise<void> {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      return;
    }
    if (!channel.isSendable()) {
      return;
    }
    await channel.send({ content });
  } catch (error) {
    client.logger.error(
      `Failed to post DJ notice in channel ${channelId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function bindMusicUnavailablePresence(
  client: Client,
  musicNode: MusicNodePort,
): void {
  musicNode.onAvailabilityChange((available) => {
    syncMusicUnavailablePresence(client, available);
  });

  client.once('clientReady', () => {
    syncMusicUnavailablePresence(client, musicNode.isAvailable());
  });
}

function syncMusicUnavailablePresence(
  client: Client,
  musicAvailable: boolean,
): void {
  const user = client.user;
  if (!user) {
    return;
  }

  if (musicAvailable) {
    void user.setPresence({ activities: [] });
    return;
  }

  void user.setPresence({
    activities: [
      {
        name: 'Custom Status',
        type: ActivityType.Custom,
        state: MUSIC_UNAVAILABLE_PRESENCE,
      },
    ],
  });
}
