import type { Client } from 'discord.js';
import { Kazagumo, type KazagumoTrack } from 'kazagumo';
import { Connectors, type NodeOption } from 'shoukaku';
import type { MusicNodeConfig } from '../../../lib/config.js';
import type { MusicNodePort, Track } from './music-node-port.js';

export type KazagumoMusicNode = MusicNodePort & {
  readonly kazagumo: Kazagumo;
};

export function createKazagumoMusicNode(
  client: Client,
  connection: MusicNodeConfig,
): KazagumoMusicNode {
  const nodes: NodeOption[] = [
    {
      name: 'main',
      url: `${connection.host}:${connection.port}`,
      auth: connection.password,
    },
  ];

  const kazagumo = new Kazagumo(
    {
      defaultSearchEngine: 'youtube',
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          guild.shard.send(payload);
        }
      },
    },
    new Connectors.DiscordJS(client),
    nodes,
    {
      // Keep retrying so a late-starting or restarted music node can recover
      // without restarting Botato (Shoukaku default is 3 tries).
      reconnectTries: Number.POSITIVE_INFINITY,
    },
  );

  const encodedTracks = new Map<string, KazagumoTrack>();

  const toDomainTrack = (track: KazagumoTrack): Track => {
    track.setKazagumo(kazagumo);
    encodedTracks.set(track.track, track);
    return {
      id: track.track,
      title: track.title,
      uri: track.uri ?? track.realUri ?? '',
      source: mapSource(track.sourceName),
    };
  };

  const requirePlayer = (guildId: string) => {
    const player = kazagumo.getPlayer(guildId);
    if (!player) {
      throw new Error('No active music session');
    }
    return player;
  };

  const requireEncodedTrack = (track: Track): KazagumoTrack => {
    const encoded = encodedTracks.get(track.id);
    if (!encoded) {
      throw new Error('Track is not available for playback');
    }
    return encoded;
  };

  const node: KazagumoMusicNode = {
    kazagumo,

    async connect(guildId, channelId) {
      const existing = kazagumo.getPlayer(guildId);
      if (existing) {
        if (existing.voiceId !== channelId) {
          existing.setVoiceChannel(channelId);
        }
        return;
      }

      await kazagumo.createPlayer({
        guildId,
        voiceId: channelId,
        deaf: true,
      });
    },

    async disconnect(guildId) {
      const player = kazagumo.getPlayer(guildId);
      if (!player) {
        return;
      }
      await player.destroy();
    },

    async resolve(query) {
      const result = await kazagumo.search(query, { requester: null });
      if (result.tracks.length === 0) {
        return { kind: 'playlist', tracks: [] };
      }

      if (result.type === 'PLAYLIST') {
        return {
          kind: 'playlist',
          tracks: result.tracks.map(toDomainTrack),
        };
      }

      return {
        kind: 'track',
        track: toDomainTrack(result.tracks[0]!),
      };
    },

    async search(query) {
      const result = await kazagumo.search(query, { requester: null });
      return result.tracks.map(toDomainTrack);
    },

    async play(guildId, track) {
      const player = requirePlayer(guildId);
      // Botato owns the queue in MusicSessionService. Without replaceCurrent,
      // Kazagumo unshifts the previous track into its own queue and will
      // auto-play it when the "last" session track is stopped.
      await player.play(requireEncodedTrack(track), { replaceCurrent: true });
    },

    async pause(guildId) {
      requirePlayer(guildId).pause(true);
    },

    async resume(guildId) {
      requirePlayer(guildId).pause(false);
    },

    async seek(guildId, positionMs) {
      await requirePlayer(guildId).seek(positionMs);
    },

    async stop(guildId) {
      const player = kazagumo.getPlayer(guildId);
      if (!player) {
        return;
      }
      player.queue.clear();
      player.queue.current = null;
      player.shoukaku.stopTrack();
    },

    async setVolume(guildId, volume) {
      await requirePlayer(guildId).setVolume(volume);
    },
  };

  return node;
}

function mapSource(sourceName: string): Track['source'] {
  const normalized = sourceName.toLowerCase();
  if (normalized.includes('youtube')) {
    return 'youtube';
  }
  return 'other';
}
