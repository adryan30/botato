import type { Track } from '../music-node/music-node-port.js';
import type {
  MusicSessionLifecycleEvent,
  MusicSessionService,
} from '../session/music-session-service.js';
import { normalizeDjText, suggestionKey } from './normalize.js';
import {
  OpenRouterError,
  type DjTrackSuggestion,
  type OpenRouterPort,
} from './openrouter-port.js';

const SUGGESTION_COUNT = 5;
const UPCOMING_BUFFER = 3;
const DEFAULT_DEBOUNCE_MS = 1_000;
const STRIKE_LIMIT = 3;

const FAIL_FAST_CODES = new Set([
  'unauthorized',
  'credits',
  'unknown_model',
  'missing_key',
]);

export type DjVibeResult = {
  vibe: string;
  enqueued: number;
};

export type DjOffResult = {
  alreadyOff: boolean;
};

export type DjFailureLog = {
  guildId: string;
  phase: 'foreground' | 'refill';
  httpStatus: number | null;
  errorCode: string;
  strikeCount: number;
  resolvedCount: number;
  modelId: string;
};

export type DjModeServiceOptions = {
  /** Per-guild debounce before evaluating the upcoming buffer. Default 1000ms. */
  debounceMs?: number;
  /** Configured OpenRouter model id for structured failure logs. */
  modelId?: string;
  /** Post one plain-text notice in the guild's noted music text channel. */
  notify?: (guildId: string, content: string) => void | Promise<void>;
  /** Structured failure logs (no vibe, prompt, raw body, or secrets). */
  logFailure?: (entry: DjFailureLog) => void;
  /** Clock for Retry-After backoff. */
  nowMs?: () => number;
};

type GuildRefillState = {
  debounceTimer: ReturnType<typeof setTimeout> | null;
  inFlight: Promise<void> | null;
  /** Bumped on session-end so in-flight work abandons results. */
  generation: number;
  strikeCount: number;
  retryAfterUntilMs: number;
};

export class DjModeService {
  readonly #sessions: MusicSessionService;
  readonly #openRouter: OpenRouterPort;
  readonly #debounceMs: number;
  readonly #modelId: string;
  readonly #notify: (guildId: string, content: string) => void | Promise<void>;
  readonly #logFailure: (entry: DjFailureLog) => void;
  readonly #nowMs: () => number;
  readonly #guilds = new Map<string, GuildRefillState>();

  constructor(
    sessions: MusicSessionService,
    openRouter: OpenRouterPort,
    options: DjModeServiceOptions = {},
  ) {
    this.#sessions = sessions;
    this.#openRouter = openRouter;
    this.#debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.#modelId = options.modelId ?? 'unknown';
    this.#notify = options.notify ?? (() => undefined);
    this.#logFailure = options.logFailure ?? (() => undefined);
    this.#nowMs = options.nowMs ?? Date.now;
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

    const state = this.#guildState(guildId);
    state.strikeCount = 0;
    state.retryAfterUntilMs = 0;

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

    const now = this.#nowMs();
    if (now < state.retryAfterUntilMs) {
      this.#setRetrying(guildId, snap.dj.vibe, true);
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
        const enqueued = await this.#resolveAndEnqueue(
          guildId,
          voiceChannelId,
          suggestions,
          need,
          generation,
        );
        if (generation !== this.#guildState(guildId).generation) {
          return;
        }
        await this.#onRefillOutcome(guildId, vibe, {
          kind: 'resolved',
          enqueued,
        });
      } catch (error) {
        if (generation !== this.#guildState(guildId).generation) {
          return;
        }
        await this.#onRefillOutcome(guildId, vibe, {
          kind: 'thrown',
          error,
        });
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

  async #onRefillOutcome(
    guildId: string,
    vibe: string,
    outcome:
      | { kind: 'resolved'; enqueued: number }
      | { kind: 'thrown'; error: unknown },
  ): Promise<void> {
    const state = this.#guildState(guildId);

    if (outcome.kind === 'resolved') {
      if (outcome.enqueued > 0) {
        state.strikeCount = 0;
        state.retryAfterUntilMs = 0;
        this.#setRetrying(guildId, vibe, false);
        return;
      }
      await this.#registerZeroEnqueueFailure(guildId, vibe, {
        httpStatus: null,
        errorCode: 'zero_enqueue',
        resolvedCount: 0,
      });
      return;
    }

    const error = outcome.error;
    if (error instanceof OpenRouterError && isFailFast(error)) {
      this.#logFailure({
        guildId,
        phase: 'refill',
        httpStatus: error.status,
        errorCode: error.code,
        strikeCount: state.strikeCount,
        resolvedCount: 0,
        modelId: this.#modelId,
      });
      await this.#disableDjWithNotice(guildId, failFastMessage(error));
      return;
    }

    if (error instanceof OpenRouterError && error.code === 'rate_limit') {
      if (error.retryAfterMs != null && error.retryAfterMs > 0) {
        state.retryAfterUntilMs = this.#nowMs() + error.retryAfterMs;
      }
      await this.#registerZeroEnqueueFailure(guildId, vibe, {
        httpStatus: error.status,
        errorCode: error.code,
        resolvedCount: 0,
      });
      return;
    }

    const httpStatus = error instanceof OpenRouterError ? error.status : null;
    const errorCode =
      error instanceof OpenRouterError ? error.code : 'unknown_error';
    await this.#registerZeroEnqueueFailure(guildId, vibe, {
      httpStatus,
      errorCode,
      resolvedCount: 0,
    });
  }

  async #registerZeroEnqueueFailure(
    guildId: string,
    vibe: string,
    details: {
      httpStatus: number | null;
      errorCode: string;
      resolvedCount: number;
    },
  ): Promise<void> {
    const state = this.#guildState(guildId);
    state.strikeCount += 1;
    this.#logFailure({
      guildId,
      phase: 'refill',
      httpStatus: details.httpStatus,
      errorCode: details.errorCode,
      strikeCount: state.strikeCount,
      resolvedCount: details.resolvedCount,
      modelId: this.#modelId,
    });

    if (state.strikeCount >= STRIKE_LIMIT) {
      await this.#disableDjWithNotice(
        guildId,
        'DJ mode turned off after repeated refill failures.',
      );
      return;
    }

    this.#setRetrying(guildId, vibe, true);
  }

  async #disableDjWithNotice(
    guildId: string,
    content: string,
  ): Promise<void> {
    let snap;
    try {
      snap = this.#sessions.snapshot(guildId);
    } catch {
      return;
    }
    if (!snap.dj.enabled) {
      return;
    }
    this.#sessions.setDj(guildId, { enabled: false });
    this.#cancelGuild(guildId);
    await this.#notify(guildId, content);
  }

  #setRetrying(guildId: string, vibe: string, retrying: boolean): void {
    let snap;
    try {
      snap = this.#sessions.snapshot(guildId);
    } catch {
      return;
    }
    if (!snap.dj.enabled) {
      return;
    }
    if (snap.dj.retrying === retrying && snap.dj.vibe === vibe) {
      return;
    }
    this.#sessions.setDj(guildId, { enabled: true, vibe, retrying });
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
    state.strikeCount = 0;
    state.retryAfterUntilMs = 0;
  }

  #guildState(guildId: string): GuildRefillState {
    let state = this.#guilds.get(guildId);
    if (!state) {
      state = {
        debounceTimer: null,
        inFlight: null,
        generation: 0,
        strikeCount: 0,
        retryAfterUntilMs: 0,
      };
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

function isFailFast(error: OpenRouterError): boolean {
  return FAIL_FAST_CODES.has(error.code);
}

function failFastMessage(error: OpenRouterError): string {
  if (error.code === 'credits') {
    return 'DJ mode turned off: OpenRouter account is out of credits.';
  }
  if (error.code === 'unknown_model') {
    return 'DJ mode turned off: configured OpenRouter model is unknown.';
  }
  if (error.code === 'missing_key' || error.code === 'unauthorized') {
    return 'DJ mode turned off: OpenRouter API key is missing or invalid.';
  }
  return `DJ mode turned off: ${error.message}`;
}
