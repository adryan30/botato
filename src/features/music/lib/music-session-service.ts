import type { MusicNodeAvailability } from './music-node-availability.js';
import type { MusicNodePort, Track } from './music-node-port.js';
import { requireMusicAvailable } from './require-music-available.js';

const NO_SESSION = 'No active music session';
const NO_VOICE = 'No voice channel';
const INDEX_BOUNDS = 'Queue index out of bounds';
const SPOTIFY_UNSUPPORTED =
  'Spotify is not supported. Use a YouTube URL or search query.';

export type RepeatMode = 'off' | 'track' | 'queue';

export type MusicSessionSnapshot = {
  guildId: string;
  voiceChannelId: string | null;
  nowPlaying: Track | null;
  queue: Track[];
  volume: number;
  repeat: RepeatMode;
  paused: boolean;
};

export type MusicSessionServiceOptions = {
  shuffle?: (items: Track[]) => Track[];
  availability?: MusicNodeAvailability;
};

type MusicSession = {
  voiceChannelId: string | null;
  nowPlaying: Track | null;
  queue: Track[];
  volume: number;
  repeat: RepeatMode;
  paused: boolean;
};

export function isSpotifyQuery(query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  return (
    trimmed.includes('open.spotify.com/') ||
    trimmed.includes('spotify.link/') ||
    trimmed.startsWith('spotify:')
  );
}

export class MusicSessionService {
  readonly #musicNode: MusicNodePort;
  readonly #sessions = new Map<string, MusicSession>();
  readonly #shuffle: (items: Track[]) => Track[];
  readonly #availability: MusicNodeAvailability | null;
  readonly #advancing = new Set<string>();

  constructor(
    musicNode: MusicNodePort,
    options: MusicSessionServiceOptions = {},
  ) {
    this.#musicNode = musicNode;
    this.#shuffle = options.shuffle ?? defaultShuffle;
    this.#availability = options.availability ?? null;
  }

  async ensure(guildId: string, voiceChannelId: string): Promise<void> {
    this.#requireAvailable();
    await this.join(guildId, voiceChannelId);
  }

  async join(guildId: string, voiceChannelId: string): Promise<void> {
    this.#requireAvailable();
    await this.#musicNode.connect(guildId, voiceChannelId);
    const session = this.#ensureSession(guildId);
    session.voiceChannelId = voiceChannelId;
  }

  async leave(guildId: string): Promise<void> {
    this.#requireAvailable();
    this.#requireSession(guildId);
    await this.#musicNode.disconnect(guildId);
    this.#sessions.delete(guildId);
  }

  async handleMusicNodeLost(): Promise<void> {
    const guildIds = [...this.#sessions.keys()];
    this.#sessions.clear();
    this.#advancing.clear();
    await Promise.all(
      guildIds.map(async (guildId) => {
        try {
          await this.#musicNode.disconnect(guildId);
        } catch {
          // Best-effort: the music node may already be unreachable.
        }
      }),
    );
  }

  async play(
    guildId: string,
    query: string,
    voiceChannelId?: string,
  ): Promise<void> {
    this.#requireAvailable();
    if (isSpotifyQuery(query)) {
      throw new Error(SPOTIFY_UNSUPPORTED);
    }

    const existing = this.#sessions.get(guildId);
    const channelId = voiceChannelId ?? existing?.voiceChannelId ?? null;
    if (!channelId) {
      throw new Error(NO_VOICE);
    }

    const resolved = await this.#musicNode.resolve(query);
    const tracks =
      resolved.kind === 'track' ? [resolved.track] : resolved.tracks;
    if (tracks.length === 0) {
      return;
    }

    await this.#enqueueTracks(guildId, tracks, channelId);
  }

  async playTrack(
    guildId: string,
    track: Track,
    voiceChannelId?: string,
  ): Promise<void> {
    this.#requireAvailable();
    const existing = this.#sessions.get(guildId);
    const channelId = voiceChannelId ?? existing?.voiceChannelId ?? null;
    if (!channelId) {
      throw new Error(NO_VOICE);
    }

    await this.#enqueueTracks(guildId, [track], channelId);
  }

  async search(query: string): Promise<Track[]> {
    this.#requireAvailable();
    if (isSpotifyQuery(query)) {
      throw new Error(SPOTIFY_UNSUPPORTED);
    }
    return this.#musicNode.search(query);
  }

  async pause(guildId: string): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    await this.#musicNode.pause(guildId);
    session.paused = true;
  }

  async resume(guildId: string): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    await this.#musicNode.resume(guildId);
    session.paused = false;
  }

  async skip(guildId: string): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    await this.#withAdvance(guildId, () => this.#advance(guildId, session));
  }

  /**
   * Advance after the music node reports the current track ended.
   * No-ops while a skip/advance is already in flight so node empty events
   * from replace/stop do not double-advance the session.
   */
  async handleTrackEnd(guildId: string): Promise<void> {
    if (this.#availability && !this.#availability.isAvailable()) {
      return;
    }
    if (this.#advancing.has(guildId)) {
      return;
    }
    try {
      if (!this.nowPlaying(guildId)) {
        return;
      }
    } catch {
      return;
    }
    await this.skip(guildId);
  }

  async skipTo(guildId: string, index: number): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    this.#requireQueueIndex(session, index);
    await this.#withAdvance(guildId, async () => {
      const removed = session.queue.splice(0, index);
      const next = removed[index - 1]!;
      await this.#playTrack(guildId, session, next);
    });
  }

  async restart(guildId: string): Promise<void> {
    this.#requireAvailable();
    this.#requireSession(guildId);
    await this.#musicNode.seek(guildId, 0);
  }

  async setVolume(guildId: string, volume: number): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    await this.#musicNode.setVolume(guildId, volume);
    session.volume = volume;
  }

  nowPlaying(guildId: string): Track | null {
    return this.snapshot(guildId).nowPlaying;
  }

  queue(guildId: string): Track[] {
    return this.snapshot(guildId).queue;
  }

  snapshot(guildId: string): MusicSessionSnapshot {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    return {
      guildId,
      voiceChannelId: session.voiceChannelId,
      nowPlaying: session.nowPlaying,
      queue: [...session.queue],
      volume: session.volume,
      repeat: session.repeat,
      paused: session.paused,
    };
  }

  async clear(guildId: string): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    session.queue = [];
  }

  async shuffle(guildId: string): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    session.queue = this.#shuffle(session.queue);
  }

  async remove(guildId: string, index: number): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    this.#requireQueueIndex(session, index);
    session.queue.splice(index - 1, 1);
  }

  async move(guildId: string, from: number, to: number): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    this.#requireQueueIndex(session, from);
    this.#requireQueueIndex(session, to);
    const [item] = session.queue.splice(from - 1, 1);
    session.queue.splice(to - 1, 0, item);
  }

  async setRepeat(guildId: string, mode: RepeatMode): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    session.repeat = mode;
  }

  async #enqueueTracks(
    guildId: string,
    tracks: Track[],
    channelId: string,
  ): Promise<void> {
    const session = this.#ensureSession(guildId);

    if (session.voiceChannelId !== channelId) {
      await this.#musicNode.connect(guildId, channelId);
      session.voiceChannelId = channelId;
    }

    if (!session.nowPlaying) {
      const [first, ...rest] = tracks;
      await this.#musicNode.play(guildId, first);
      session.nowPlaying = first;
      session.queue.push(...rest);
      session.paused = false;
      return;
    }

    session.queue.push(...tracks);
  }

  async #advance(guildId: string, session: MusicSession): Promise<void> {
    if (session.repeat === 'track' && session.nowPlaying) {
      await this.#playTrack(guildId, session, session.nowPlaying);
      return;
    }

    const finished = session.nowPlaying;
    const next = session.queue.shift() ?? null;

    if (session.repeat === 'queue' && finished) {
      session.queue.push(finished);
    }

    if (next) {
      await this.#playTrack(guildId, session, next);
      return;
    }

    if (session.repeat === 'queue' && session.queue.length > 0) {
      const replay = session.queue.shift()!;
      await this.#playTrack(guildId, session, replay);
      return;
    }

    session.nowPlaying = null;
    session.paused = false;
    await this.#musicNode.stop(guildId);
  }

  async #playTrack(
    guildId: string,
    session: MusicSession,
    track: Track,
  ): Promise<void> {
    session.nowPlaying = track;
    session.paused = false;
    await this.#musicNode.play(guildId, track);
  }

  async #withAdvance(
    guildId: string,
    run: () => Promise<void>,
  ): Promise<void> {
    this.#advancing.add(guildId);
    try {
      await run();
    } finally {
      this.#advancing.delete(guildId);
    }
  }

  #ensureSession(guildId: string): MusicSession {
    const existing = this.#sessions.get(guildId);
    if (existing) {
      return existing;
    }
    const session = createEmptySession();
    this.#sessions.set(guildId, session);
    return session;
  }

  #requireAvailable(): void {
    if (!this.#availability) {
      return;
    }
    requireMusicAvailable(this.#availability.isAvailable());
  }

  #requireSession(guildId: string): MusicSession {
    const session = this.#sessions.get(guildId);
    if (!session) {
      throw new Error(NO_SESSION);
    }
    return session;
  }

  #requireQueueIndex(session: MusicSession, index: number): void {
    if (index < 1 || index > session.queue.length) {
      throw new Error(INDEX_BOUNDS);
    }
  }
}

function createEmptySession(): MusicSession {
  return {
    voiceChannelId: null,
    nowPlaying: null,
    queue: [],
    volume: 100,
    repeat: 'off',
    paused: false,
  };
}

function defaultShuffle(items: Track[]): Track[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
