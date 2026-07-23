import { container } from '@sapphire/framework';
import { ActivityType, type Client } from 'discord.js';
import type { BotatoConfig } from '../../../lib/config.js';
import './container-augment.js';
import {
  createKazagumoMusicNode,
  type KazagumoMusicNode,
} from './kazagumo-music-node.js';
import { MusicNodeAvailability } from './music-node-availability.js';
import { MusicSessionService } from './music-session-service.js';

const MUSIC_UNAVAILABLE_PRESENCE = 'Music unavailable';
const MUSIC_NODE_READD_DELAY_MS = 5_000;

export function attachMusicFeature(
  client: Client,
  config: BotatoConfig,
): MusicSessionService {
  const availability = new MusicNodeAvailability();
  const musicNode = createKazagumoMusicNode(client, config.musicNode);
  const musicSessions = new MusicSessionService(musicNode, { availability });
  bindSessionAdvanceOnTrackEnd(musicNode, musicSessions);
  bindMusicNodeAvailability(client, musicNode, availability, musicSessions);
  container.musicSessions = musicSessions;
  return musicSessions;
}

function bindSessionAdvanceOnTrackEnd(
  node: KazagumoMusicNode,
  sessions: MusicSessionService,
): void {
  node.kazagumo.on('playerEmpty', (player) => {
    void sessions.handleTrackEnd(player.guildId).catch(() => {
      // Session went idle between the event and advance — ignore.
    });
  });
}

function bindMusicNodeAvailability(
  client: Client,
  node: KazagumoMusicNode,
  availability: MusicNodeAvailability,
  sessions: MusicSessionService,
): void {
  const shoukaku = node.kazagumo.shoukaku;
  const { nodeOption } = node;
  let readdScheduled = false;

  const scheduleNodeReadd = () => {
    if (readdScheduled) {
      return;
    }
    readdScheduled = true;
    setTimeout(() => {
      readdScheduled = false;
      if (shoukaku.nodes.has(nodeOption.name)) {
        return;
      }
      client.logger.warn(
        `Music node "${nodeOption.name}" was removed; reconnecting`,
      );
      availability.markUnavailable();
      shoukaku.addNode(nodeOption);
    }, MUSIC_NODE_READD_DELAY_MS);
  };

  shoukaku.on('ready', (name) => {
    client.logger.info(`Music node "${name}" is available`);
    availability.markAvailable();
  });

  shoukaku.on('close', (name, code, reason) => {
    client.logger.warn(
      `Music node "${name}" closed (${code}): ${reason || 'no reason'}`,
    );
    availability.markUnavailable();
  });

  shoukaku.on('reconnecting', (name, triesLeft, interval) => {
    client.logger.warn(
      `Music node "${name}" reconnecting in ${interval}s (${triesLeft} tries left)`,
    );
  });

  shoukaku.on('error', (name, error) => {
    client.logger.error(
      `Music node "${name}" error: ${error instanceof Error ? error.message : String(error)}`,
    );
    availability.markUnavailable();
    scheduleNodeReadd();
  });

  availability.onChange((available) => {
    syncMusicUnavailablePresence(client, available);
    if (!available) {
      void sessions.handleMusicNodeLost().catch((error) => {
        client.logger.error(
          `Failed to end music sessions after music node loss: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }
  });

  client.once('clientReady', () => {
    syncMusicUnavailablePresence(client, availability.isAvailable());
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
