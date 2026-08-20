import type { Client } from 'discord.js';
import { Kazagumo, type KazagumoTrack } from 'kazagumo';
import { Connectors, type NodeOption } from 'shoukaku';
import type { MusicNodeConfig } from '../../../../lib/config.js';
import type {
  MusicNodeAvailabilityListener,
  MusicNodePort,
  MusicNodeTrackFinishedListener,
  Track,
} from './music-node-port.js';

const MUSIC_NODE_READD_DELAY_MS = 5_000;

export function createKazagumoMusicNode(
  client: Client,
  connection: MusicNodeConfig,
): MusicNodePort {
  const nodeOption: NodeOption = {
    name: 'main',
    url: `${connection.host}:${connection.port}`,
    auth: connection.password,
  };

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
    [nodeOption],
    {
      // Single-attempt connect: Shoukaku keeps a stale connectError across
      // retries, so a late success after failures tears the socket down and
      // removes the node. Botato re-adds the node on disconnect instead.
      reconnectTries: 1,
      reconnectInterval: 5,
    },
  );

  const encodedTracks = new Map<string, KazagumoTrack>();
  const availabilityListeners = new Set<MusicNodeAvailabilityListener>();
  const trackFinishedListeners = new Set<MusicNodeTrackFinishedListener>();
  let available = false;
  let readdScheduled = false;

  const setAvailable = (next: boolean): void => {
    if (available === next) {
      return;
    }
    available = next;
    for (const listener of availabilityListeners) {
      void Promise.resolve(listener(next)).catch((error) => {
        client.logger.error(
          `Music node availability listener failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }
  };

  const scheduleNodeReadd = (): void => {
    if (readdScheduled) {
      return;
    }
    readdScheduled = true;
    setTimeout(() => {
      readdScheduled = false;
      if (kazagumo.shoukaku.nodes.has(nodeOption.name)) {
        return;
      }
      client.logger.warn(
        `Music node "${nodeOption.name}" was removed; reconnecting`,
      );
      setAvailable(false);
      kazagumo.shoukaku.addNode(nodeOption);
    }, MUSIC_NODE_READD_DELAY_MS);
  };

  kazagumo.on('playerEmpty', (player) => {
    for (const listener of trackFinishedListeners) {
      void Promise.resolve(listener(player.guildId)).catch(() => {
        // Session went idle between the event and advance — ignore.
      });
    }
  });

  const shoukaku = kazagumo.shoukaku;

  shoukaku.on('ready', (name) => {
    client.logger.info(`Music node "${name}" is available`);
    setAvailable(true);
  });

  shoukaku.on('close', (name, code, reason) => {
    client.logger.warn(
      `Music node "${name}" closed (${code}): ${reason || 'no reason'}`,
    );
    setAvailable(false);
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
    setAvailable(false);
    scheduleNodeReadd();
  });

  const toDomainTrack = (track: KazagumoTrack): Track => {
    track.setKazagumo(kazagumo);
    encodedTracks.set(track.track, track);
    const domain: Track = {
      id: track.track,
      title: track.title,
      uri: track.uri ?? track.realUri ?? '',
      source: mapSource(track.sourceName),
    };
    if (track.thumbnail) {
      domain.artworkUrl = track.thumbnail;
    }
    if (track.length != null && track.length > 0) {
      domain.durationMs = track.length;
    }
    return domain;
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

  return {
    isAvailable() {
      return available;
    },
    onAvailabilityChange(listener) {
      availabilityListeners.add(listener);
    },
    onTrackFinished(listener) {
      trackFinishedListeners.add(listener);
    },

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
}

function mapSource(sourceName: string): Track['source'] {
  const normalized = sourceName.toLowerCase();
  if (normalized.includes('youtube')) {
    return 'youtube';
  }
  return 'other';
}
