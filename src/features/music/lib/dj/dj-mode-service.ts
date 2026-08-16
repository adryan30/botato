import type { Track } from '../music-node/music-node-port.js';
import type { MusicSessionService } from '../session/music-session-service.js';
import { normalizeDjText, suggestionKey } from './normalize.js';
import type { DjTrackSuggestion, OpenRouterPort } from './openrouter-port.js';

const SUGGESTION_COUNT = 5;
const UPCOMING_BUFFER = 3;

export type DjVibeResult = {
  vibe: string;
  enqueued: number;
};

export type DjOffResult = {
  alreadyOff: boolean;
};

export class DjModeService {
  readonly #sessions: MusicSessionService;
  readonly #openRouter: OpenRouterPort;

  constructor(sessions: MusicSessionService, openRouter: OpenRouterPort) {
    this.#sessions = sessions;
    this.#openRouter = openRouter;
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
    return { alreadyOff: false };
  }

  async #resolveAndEnqueue(
    guildId: string,
    voiceChannelId: string,
    suggestions: DjTrackSuggestion[],
    need: number,
  ): Promise<number> {
    if (need <= 0) {
      return 0;
    }

    let remaining = need;
    let enqueued = 0;
    const seenSuggestionKeys = new Set<string>();

    for (const suggestion of suggestions) {
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
