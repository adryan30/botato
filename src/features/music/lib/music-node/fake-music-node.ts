import type {
  MusicNodeAvailabilityListener,
  MusicNodePort,
  MusicNodeTrackFinishedListener,
  ResolveResult,
  Track,
} from './music-node-port.js';

export type FakeMusicNode = MusicNodePort & {
  connected: Map<string, string>;
  playing: Map<string, Track>;
  paused: Set<string>;
  volumes: Map<string, number>;
  seekPositions: Map<string, number>;
  resolveImpl: (query: string) => Promise<ResolveResult>;
  searchImpl: (query: string) => Promise<Track[]>;
  setAvailable(available: boolean): Promise<void>;
  finishTrack(guildId: string): Promise<void>;
};

export function createFakeMusicNode(
  overrides: Partial<
    Pick<FakeMusicNode, 'resolveImpl' | 'searchImpl'>
  > & { available?: boolean } = {},
): FakeMusicNode {
  const connected = new Map<string, string>();
  const playing = new Map<string, Track>();
  const paused = new Set<string>();
  const volumes = new Map<string, number>();
  const seekPositions = new Map<string, number>();
  let available = overrides.available ?? true;
  const availabilityListeners = new Set<MusicNodeAvailabilityListener>();
  const trackFinishedListeners = new Set<MusicNodeTrackFinishedListener>();

  const fake: FakeMusicNode = {
    connected,
    playing,
    paused,
    volumes,
    seekPositions,
    resolveImpl:
      overrides.resolveImpl ??
      (async () => {
        throw new Error('resolveImpl not configured');
      }),
    searchImpl:
      overrides.searchImpl ??
      (async () => {
        throw new Error('searchImpl not configured');
      }),
    isAvailable() {
      return available;
    },
    onAvailabilityChange(listener) {
      availabilityListeners.add(listener);
    },
    onTrackFinished(listener) {
      trackFinishedListeners.add(listener);
    },
    async setAvailable(next) {
      if (available === next) {
        return;
      }
      available = next;
      await Promise.all(
        [...availabilityListeners].map((listener) =>
          Promise.resolve(listener(next)),
        ),
      );
    },
    async finishTrack(guildId) {
      await Promise.all(
        [...trackFinishedListeners].map((listener) =>
          Promise.resolve(listener(guildId)),
        ),
      );
    },
    async connect(guildId, channelId) {
      connected.set(guildId, channelId);
    },
    async disconnect(guildId) {
      connected.delete(guildId);
      playing.delete(guildId);
      paused.delete(guildId);
    },
    async resolve(query) {
      return fake.resolveImpl(query);
    },
    async search(query) {
      return fake.searchImpl(query);
    },
    async play(guildId, track) {
      playing.set(guildId, track);
      paused.delete(guildId);
    },
    async pause(guildId) {
      paused.add(guildId);
    },
    async resume(guildId) {
      paused.delete(guildId);
    },
    async seek(guildId, positionMs) {
      seekPositions.set(guildId, positionMs);
    },
    async stop(guildId) {
      playing.delete(guildId);
      paused.delete(guildId);
    },
    async setVolume(guildId, volume) {
      volumes.set(guildId, volume);
    },
  };

  return fake;
}
