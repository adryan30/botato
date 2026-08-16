import type { Track } from '../music-node/music-node-port.js';
import type {
  MusicSessionLifecycleEvent,
  MusicSessionService,
} from '../session/music-session-service.js';
import { normalizeDjText, suggestionKey } from './normalize.js';
import type { DjTrackSuggestion, OpenRouterPort } from './openrouter-port.js';

const SUGGESTION_COUNT = 5;
const UPCOMING_BUFFER = 3;
const DEFAULT_DEBOUNCE_MS = 1_000;

export type DjVibeResult = {
  vibe: string;
  enqueued: number;
};

export type DjOffResult = {
  alreadyOff: boolean;
};

export type DjModeServiceOptions = {
  /** Per-guild debounce before evaluating the upcoming buffer. Default 1000ms. */
  debounceMs?: number;
};

type GuildRefillState = {
  debounceTimer: ReturnType<typeof setTimeout> | null;
  inFlight: Promise<void> | null;
  /** Bumped on session-end so in-flight work abandons results. */
  generation: number;
};

export class DjModeService {
  readonly #sessions: MusicSessionService;
  readonly #openRouter: OpenRouterPort;
  readonly #debounceMs: number;
  readonly #guilds = new Map<string, GuildRefillState>();

  constructor(
    sessions: MusicSessionService,
    openRouter: OpenRouterPort,
    options: DjModeServiceOptions = {},
  ) {
    this.#sessions = sessions;
    this.#openRouter = openRouter;
    this.#debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.#sessions.onLifecycle((event) => {
      this.#onLifecycle(event);
    });
  }

  async vibe(
    guildId: string,
    vibe: string,
    voiceChannelId: string,
  ): Promise<DjVibeResult> {
    const trimmed = vibe.trim();
    if (!trimmed) {
      throw new Error('DJ vibe cannot be empty.');
    }
    if (trimmed.length > 200) {
      throw new Error('DJ vibe must be at most 200 characters.');
    }

    await this.#sessions.ensure(guildId, voiceChannelId);
    const before = this.#sessions.snapshot(guildId);
    const need = tracksNeeded(before.nowPlaying !== null, before.queue.length);

    const suggestions = await this.#openRouter.suggestTracks({
      vibe: trimmed,
      historyTitles: before.history.map((t) => t.title),
      upcomingTitles: [
        ...(before.nowPlaying ? [before.nowPlaying.title] : []),
        ...before.queue.map((t) => t.title),
      ],
      count: SUGGESTION_COUNT,
    });

    const enqueued = await this.#resolveAndEnqueue(
      guildId,
      voiceChannelId,
      suggestions,
      need,
      this.#guildState(guildId).generation,
    );

    if (need > 0 && enqueued === 0) {
      throw new Error(
        'Could not resolve any DJ tracks for that vibe. DJ mode was not enabled.',
      );
    }

    this.#sessions.setDj(guildId, {
      enabled: true,
      vibe: trimmed,
      retrying: false,
    });

    return { vibe: trimmed, enqueued };
  }

  async off(guildId: string): Promise<DjOffResult> {
    let snapshot;
    try {
      snapshot = this.#sessions.snapshot(guildId);
    } catch {
      return { alreadyOff: true };
    }
    if (!snapshot.dj.enabled) {
      return { alreadyOff: true };
    }
    this.#sessions.setDj(guildId, { enabled: false });
    // Stop pending debounce and abandon in-flight enqueue work.
    this.#cancelGuild(guildId);
    return { alreadyOff: false };
  }

  #onLifecycle(event: MusicSessionLifecycleEvent): void {
    if (event.kind === 'session-end') {
      this.#cancelGuild(event.guildId);
      return;
    }

    if (event.kind !== 'state-change' && event.kind !== 'track-start') {
      return;
    }

    this.#scheduleRefillCheck(event.guildId);
  }

  #scheduleRefillCheck(guildId: string): void {
    let snap;
    try {
      snap = this.#sessions.snapshot(guildId);
    } catch {
      return;
    }

    const state = this.#guildState(guildId);
    if (!snap.dj.enabled || snap.queue.length >= UPCOMING_BUFFER) {
      if (state.debounceTimer !== null) {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = null;
      }
      return;
    }

    if (state.debounceTimer !== null) {
      clearTimeout(state.debounceTimer);
    }
    state.debounceTimer = setTimeout(() => {
      state.debounceTimer = null;
      void this.#refillIfNeeded(guildId);
    }, this.#debounceMs);
  }

  async #refillIfNeeded(guildId: string): Promise<void> {
    const state = this.#guildState(guildId);
    if (state.inFlight) {
      return;
    }

    let snap;
    try {
      snap = this.#sessions.snapshot(guildId);
    } catch {
      return;
    }
    if (!snap.dj.enabled || snap.queue.length >= UPCOMING_BUFFER) {
      return;
    }
    if (!snap.voiceChannelId) {
      return;
    }

    const generation = state.generation;
    const vibe = snap.dj.vibe;
    const voiceChannelId = snap.voiceChannelId;
    const need = tracksNeeded(snap.nowPlaying !== null, snap.queue.length);

    const run = (async () => {
      try {
        const suggestions = await this.#openRouter.suggestTracks({
          vibe,
          historyTitles: snap.history.map((t) => t.title),
          upcomingTitles: [
            ...(snap.nowPlaying ? [snap.nowPlaying.title] : []),
            ...snap.queue.map((t) => t.title),
          ],
          count: SUGGESTION_COUNT,
        });
        if (generation !== this.#guildState(guildId).generation) {
          return;
        }
        await this.#resolveAndEnqueue(
          guildId,
          voiceChannelId,
          suggestions,
          need,
          generation,
        );
      } catch {
        // Happy-path quiet refills only — failure UX is a later ticket.
      }
    })();

    state.inFlight = run;
    try {
      await run;
    } finally {
      if (this.#guilds.get(guildId)?.inFlight === run) {
        state.inFlight = null;
      }
    }

    if (generation !== this.#guildState(guildId).generation) {
      return;
    }
    // Post-settle re-check: clear mid-flight or another drain still converges.
    this.#scheduleRefillCheck(guildId);
  }

  #cancelGuild(guildId: string): void {
    const state = this.#guilds.get(guildId);
    if (!state) {
      return;
    }
    if (state.debounceTimer !== null) {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = null;
    }
    // Keep the entry so generation stays elevated and abandoned work cannot
    // enqueue into a later session that reused generation 0.
    state.generation += 1;
    state.inFlight = null;
  }

  #guildState(guildId: string): GuildRefillState {
    let state = this.#guilds.get(guildId);
    if (!state) {
      state = { debounceTimer: null, inFlight: null, generation: 0 };
      this.#guilds.set(guildId, state);
    }
    return state;
  }

  async #resolveAndEnqueue(
    guildId: string,
    voiceChannelId: string,
    suggestions: DjTrackSuggestion[],
    need: number,
    generation: number,
  ): Promise<number> {
    if (need <= 0) {
      return 0;
    }

    let remaining = need;
    let enqueued = 0;
    const seenSuggestionKeys = new Set<string>();

    for (const suggestion of suggestions) {
      if (generation !== this.#guildState(guildId).generation) {
        break;
      }
      if (remaining <= 0) {
        break;
      }

      const key = suggestionKey(suggestion.artist, suggestion.title);
      if (seenSuggestionKeys.has(key)) {
        continue;
      }
      seenSuggestionKeys.add(key);

      const snap = this.#sessions.snapshot(guildId);
      if (isSuggestionDuplicate(suggestion, snap)) {
        continue;
      }

      const results = await this.#sessions.search(
        `${suggestion.artist} ${suggestion.title}`,
      );
      if (generation !== this.#guildState(guildId).generation) {
        break;
      }
      const top = results.find((track) => track.source === 'youtube') ?? null;
      if (!top) {
        continue;
      }

      if (isResolvedDuplicate(top, sessionEntries(snap))) {
        continue;
      }

      await this.#sessions.enqueueTracks(
        guildId,
        [top],
        voiceChannelId,
        'dj',
      );
      enqueued += 1;
      remaining -= 1;
    }

    return enqueued;
  }
}

function tracksNeeded(hasNowPlaying: boolean, queueLength: number): number {
  const upcomingGap = Math.max(0, UPCOMING_BUFFER - queueLength);
  return hasNowPlaying ? upcomingGap : upcomingGap + 1;
}

function sessionEntries(
  snap: ReturnType<MusicSessionService['snapshot']>,
): SessionTrackLike[] {
  return [
    ...snap.history,
    ...(snap.nowPlaying ? [snap.nowPlaying] : []),
    ...snap.queue,
  ];
}

type SessionTrackLike = {
  id: string;
  title: string;
  uri: string;
};

function isSuggestionDuplicate(
  suggestion: DjTrackSuggestion,
  snap: ReturnType<MusicSessionService['snapshot']>,
): boolean {
  const titleKey = normalizeDjText(suggestion.title);
  const artistTitleBlob = normalizeDjText(
    `${suggestion.artist} ${suggestion.title}`,
  );
  const key = suggestionKey(suggestion.artist, suggestion.title);

  for (const entry of sessionEntries(snap)) {
    const entryTitle = normalizeDjText(entry.title);
    if (
      entryTitle === titleKey ||
      entryTitle === artistTitleBlob ||
      entryTitle === key.replace('|', ' ')
    ) {
      return true;
    }
  }

  return false;
}

function isResolvedDuplicate(
  track: Track,
  entries: SessionTrackLike[],
): boolean {
  return entries.some(
    (entry) =>
      entry.id === track.id ||
      (entry.uri.length > 0 && entry.uri === track.uri),
  );
}
