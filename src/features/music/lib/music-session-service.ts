import type { MusicNodePort, Track } from './music-node-port.js';

const NO_SESSION = 'No active music session';
const NO_VOICE = 'No voice channel';
const INDEX_BOUNDS = 'Queue index out of bounds';

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
};

type MusicSession = {
  voiceChannelId: string | null;
  nowPlaying: Track | null;
  queue: Track[];
  volume: number;
  repeat: RepeatMode;
  paused: boolean;
};

export class MusicSessionService {
  readonly #musicNode: MusicNodePort;
  readonly #sessions = new Map<string, MusicSession>();
  readonly #shuffle: (items: Track[]) => Track[];

  constructor(
    musicNode: MusicNodePort,
    options: MusicSessionServiceOptions = {},
  ) {
    this.#musicNode = musicNode;
    this.#shuffle = options.shuffle ?? defaultShuffle;
  }

  async ensure(guildId: string, voiceChannelId: string): Promise<void> {
    await this.join(guildId, voiceChannelId);
  }

  async join(guildId: string, voiceChannelId: string): Promise<void> {
    await this.#musicNode.connect(guildId, voiceChannelId);
    const session = this.#ensureSession(guildId);
    session.voiceChannelId = voiceChannelId;
  }

  async leave(guildId: string): Promise<void> {
    this.#requireSession(guildId);
    await this.#musicNode.disconnect(guildId);
    this.#sessions.delete(guildId);
  }

  async play(
    guildId: string,
    query: string,
    voiceChannelId?: string,
  ): Promise<void> {
    const existing = this.#sessions.get(guildId);
    const channelId = voiceChannelId ?? existing?.voiceChannelId ?? null;
    if (!channelId) {
      throw new Error(NO_VOICE);
    }

    const session = this.#ensureSession(guildId);

    if (session.voiceChannelId !== channelId) {
      await this.#musicNode.connect(guildId, channelId);
      session.voiceChannelId = channelId;
    }

    const resolved = await this.#musicNode.resolve(query);
    const tracks =
      resolved.kind === 'track' ? [resolved.track] : resolved.tracks;
    if (tracks.length === 0) {
      return;
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

  async search(query: string): Promise<Track[]> {
    return this.#musicNode.search(query);
  }

  async pause(guildId: string): Promise<void> {
    const session = this.#requireSession(guildId);
    await this.#musicNode.pause(guildId);
    session.paused = true;
  }

  async resume(guildId: string): Promise<void> {
    const session = this.#requireSession(guildId);
    await this.#musicNode.resume(guildId);
    session.paused = false;
  }

  async skip(guildId: string): Promise<void> {
    const session = this.#requireSession(guildId);
    await this.#advance(guildId, session);
  }

  async skipTo(guildId: string, index: number): Promise<void> {
    const session = this.#requireSession(guildId);
    this.#requireQueueIndex(session, index);
    const removed = session.queue.splice(0, index);
    const next = removed[index - 1]!;
    await this.#playTrack(guildId, session, next);
  }

  async restart(guildId: string): Promise<void> {
    this.#requireSession(guildId);
    await this.#musicNode.seek(guildId, 0);
  }

  async setVolume(guildId: string, volume: number): Promise<void> {
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
    const session = this.#requireSession(guildId);
    session.queue = [];
  }

  async shuffle(guildId: string): Promise<void> {
    const session = this.#requireSession(guildId);
    session.queue = this.#shuffle(session.queue);
  }

  async remove(guildId: string, index: number): Promise<void> {
    const session = this.#requireSession(guildId);
    this.#requireQueueIndex(session, index);
    session.queue.splice(index - 1, 1);
  }

  async move(guildId: string, from: number, to: number): Promise<void> {
    const session = this.#requireSession(guildId);
    this.#requireQueueIndex(session, from);
    this.#requireQueueIndex(session, to);
    const [item] = session.queue.splice(from - 1, 1);
    session.queue.splice(to - 1, 0, item);
  }

  async setRepeat(guildId: string, mode: RepeatMode): Promise<void> {
    const session = this.#requireSession(guildId);
    session.repeat = mode;
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
    await this.#musicNode.play(guildId, track);
    session.nowPlaying = track;
    session.paused = false;
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
