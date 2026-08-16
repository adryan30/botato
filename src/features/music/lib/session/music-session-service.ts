import type { MusicNodeAvailability } from '../music-node/music-node-availability.js';
import type { MusicNodePort, Track } from '../music-node/music-node-port.js';
import { youtubeResolveCandidates } from '../youtube-query.js';
import { requireMusicAvailable } from './require-music-available.js';

const NO_SESSION = 'No active music session';
const NO_VOICE = 'No voice channel';
const INDEX_BOUNDS = 'Queue index out of bounds';
const SPOTIFY_UNSUPPORTED =
  'Spotify is not supported. Use a YouTube URL or search query.';

export type RepeatMode = 'off' | 'track' | 'queue';

/** Who enqueued the track into the music session (not the music-node Track). */
export type TrackProvenance = 'user' | 'dj';

export type SessionTrack = Track & {
  provenance: TrackProvenance;
};

/** Session-scoped DJ mode state carried on the music session snapshot. */
export type MusicSessionDj =
  | { enabled: false }
  | { enabled: true; vibe: string; retrying: boolean };

export type MusicSessionSnapshot = {
  guildId: string;
  voiceChannelId: string | null;
  nowPlaying: SessionTrack | null;
  queue: SessionTrack[];
  volume: number;
  repeat: RepeatMode;
  paused: boolean;
  dj: MusicSessionDj;
  /** Last ~20 tracks that left now-playing in this session (oldest first). */
  history: SessionTrack[];
};

export function asSessionTrack(
  track: Track,
  provenance: TrackProvenance = 'user',
): SessionTrack {
  return { ...track, provenance };
}

function toMusicNodeTrack(track: SessionTrack): Track {
  const { provenance: _provenance, ...nodeTrack } = track;
  return nodeTrack;
}

export type MusicSessionLifecycleEvent =
  | { kind: 'session-birth'; guildId: string }
  | { kind: 'track-start'; guildId: string }
  | { kind: 'state-change'; guildId: string }
  | {
      kind: 'session-end';
      guildId: string;
      reason: 'leave' | 'music-node-lost';
    };

export type MusicSessionLifecycleListener = (
  event: MusicSessionLifecycleEvent,
) => void;

export type MusicSessionServiceOptions = {
  shuffle?: (items: SessionTrack[]) => SessionTrack[];
  availability?: MusicNodeAvailability;
};

type MusicSession = {
  voiceChannelId: string | null;
  nowPlaying: SessionTrack | null;
  queue: SessionTrack[];
  volume: number;
  repeat: RepeatMode;
  paused: boolean;
  dj: MusicSessionDj;
  history: SessionTrack[];
};

const HISTORY_LIMIT = 20;

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
  readonly #shuffle: (items: SessionTrack[]) => SessionTrack[];
  readonly #availability: MusicNodeAvailability | null;
  readonly #advancing = new Set<string>();
  readonly #lifecycleListeners = new Set<MusicSessionLifecycleListener>();

  constructor(
    musicNode: MusicNodePort,
    options: MusicSessionServiceOptions = {},
  ) {
    this.#musicNode = musicNode;
    this.#shuffle = options.shuffle ?? defaultShuffle;
    this.#availability = options.availability ?? null;
  }

  onLifecycle(listener: MusicSessionLifecycleListener): void {
    this.#lifecycleListeners.add(listener);
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
    this.#emit({ kind: 'session-end', guildId, reason: 'leave' });
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
    for (const guildId of guildIds) {
      this.#emit({
        kind: 'session-end',
        guildId,
        reason: 'music-node-lost',
      });
    }
  }

  /**
   * Resolve and enqueue tracks for a query.
   * @returns Tracks added by this call (empty when resolve found nothing).
   */
  async play(
    guildId: string,
    query: string,
    voiceChannelId?: string,
  ): Promise<Track[]> {
    this.#requireAvailable();
    if (isSpotifyQuery(query)) {
      throw new Error(SPOTIFY_UNSUPPORTED);
    }

    const existing = this.#sessions.get(guildId);
    const channelId = voiceChannelId ?? existing?.voiceChannelId ?? null;
    if (!channelId) {
      throw new Error(NO_VOICE);
    }

    const tracks = await this.#resolveTracks(query);
    if (tracks.length === 0) {
      return [];
    }

    await this.#enqueueTracks(guildId, tracks, channelId);
    return tracks;
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
    this.#emit({ kind: 'state-change', guildId });
  }

  async resume(guildId: string): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    await this.#musicNode.resume(guildId);
    session.paused = false;
    this.#emit({ kind: 'state-change', guildId });
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
    this.#emit({ kind: 'state-change', guildId });
  }

  nowPlaying(guildId: string): SessionTrack | null {
    return this.snapshot(guildId).nowPlaying;
  }

  queue(guildId: string): SessionTrack[] {
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
      dj: session.dj,
      history: [...session.history],
    };
  }

  setDj(guildId: string, dj: MusicSessionDj): void {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    session.dj = dj;
    this.#emit({ kind: 'state-change', guildId });
  }

  /**
   * Enqueue already-resolved tracks with explicit provenance (e.g. DJ-added).
   */
  async enqueueTracks(
    guildId: string,
    tracks: Track[],
    channelId: string,
    provenance: TrackProvenance = 'user',
  ): Promise<void> {
    this.#requireAvailable();
    if (tracks.length === 0) {
      return;
    }
    await this.#enqueueTracks(guildId, tracks, channelId, provenance);
  }

  async clear(guildId: string): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    session.queue = [];
    this.#emit({ kind: 'state-change', guildId });
  }

  async shuffle(guildId: string): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    session.queue = this.#shuffle(session.queue);
    this.#emit({ kind: 'state-change', guildId });
  }

  async remove(guildId: string, index: number): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    this.#requireQueueIndex(session, index);
    session.queue.splice(index - 1, 1);
    this.#emit({ kind: 'state-change', guildId });
  }

  async move(guildId: string, from: number, to: number): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    this.#requireQueueIndex(session, from);
    this.#requireQueueIndex(session, to);
    const [item] = session.queue.splice(from - 1, 1);
    session.queue.splice(to - 1, 0, item);
    this.#emit({ kind: 'state-change', guildId });
  }

  async setRepeat(guildId: string, mode: RepeatMode): Promise<void> {
    this.#requireAvailable();
    const session = this.#requireSession(guildId);
    session.repeat = mode;
    this.#emit({ kind: 'state-change', guildId });
  }

  async #enqueueTracks(
    guildId: string,
    tracks: Track[],
    channelId: string,
    provenance: TrackProvenance = 'user',
  ): Promise<void> {
    const session = this.#ensureSession(guildId);
    const sessionTracks = tracks.map((track) =>
      asSessionTrack(track, provenance),
    );

    if (session.voiceChannelId !== channelId) {
      await this.#musicNode.connect(guildId, channelId);
      session.voiceChannelId = channelId;
    }

    if (!session.nowPlaying) {
      const [first, ...rest] = sessionTracks;
      // Queue remainder before track-start so the control-surface bump
      // snapshots Up next with the full playlist, not an empty queue.
      session.queue.push(...rest);
      await this.#playTrack(guildId, session, first);
      return;
    }

    session.queue.push(...sessionTracks);
    this.#emit({ kind: 'state-change', guildId });
  }

  async #advance(guildId: string, session: MusicSession): Promise<void> {
    if (session.repeat === 'track' && session.nowPlaying) {
      await this.#playTrack(guildId, session, session.nowPlaying);
      return;
    }

    const finished = session.nowPlaying;
    const next = session.queue.shift() ?? null;

    if (finished) {
      this.#recordHistory(session, finished);
    }

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
    this.#emit({ kind: 'state-change', guildId });
  }

  async #resolveTracks(query: string): Promise<Track[]> {
    for (const candidate of youtubeResolveCandidates(query)) {
      const resolved = await this.#musicNode.resolve(candidate);
      const tracks =
        resolved.kind === 'track' ? [resolved.track] : resolved.tracks;
      if (tracks.length > 0) {
        return tracks;
      }
    }
    return [];
  }

  async #playTrack(
    guildId: string,
    session: MusicSession,
    track: SessionTrack,
  ): Promise<void> {
    session.nowPlaying = track;
    session.paused = false;
    await this.#musicNode.play(guildId, toMusicNodeTrack(track));
    this.#emit({ kind: 'track-start', guildId });
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
    this.#emit({ kind: 'session-birth', guildId });
    return session;
  }

  #emit(event: MusicSessionLifecycleEvent): void {
    for (const listener of this.#lifecycleListeners) {
      listener(event);
    }
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

  #recordHistory(session: MusicSession, track: SessionTrack): void {
    session.history.push(track);
    if (session.history.length > HISTORY_LIMIT) {
      session.history.splice(0, session.history.length - HISTORY_LIMIT);
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
    dj: { enabled: false },
    history: [],
  };
}

function defaultShuffle(items: SessionTrack[]): SessionTrack[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
