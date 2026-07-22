import { container } from '@sapphire/framework';
import type { Client } from 'discord.js';
import type { BotatoConfig } from '../../../lib/config.js';
import './container-augment.js';
import {
  createKazagumoMusicNode,
  type KazagumoMusicNode,
} from './kazagumo-music-node.js';
import { MusicSessionService } from './music-session-service.js';

export function attachMusicFeature(
  client: Client,
  config: BotatoConfig,
): MusicSessionService {
  const musicNode = createKazagumoMusicNode(client, config.musicNode);
  const musicSessions = new MusicSessionService(musicNode);
  bindSessionAdvanceOnTrackEnd(musicNode, musicSessions);
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
