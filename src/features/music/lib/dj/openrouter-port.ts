export type DjTrackSuggestion = {
  artist: string;
  title: string;
};

export type DjSuggestContext = {
  vibe: string;
  /** Last ~20 played titles in this music session (oldest first). */
  historyTitles: string[];
  /** Upcoming queue titles (do not repeat). */
  upcomingTitles: string[];
  /** How many suggestions to ask for (locked at 5 for a buffer of 3). */
  count: number;
};

export type OpenRouterPort = {
  suggestTracks(context: DjSuggestContext): Promise<DjTrackSuggestion[]>;
};

export class OpenRouterError extends Error {
  readonly status: number | null;
  readonly code: string;

  constructor(message: string, options: { status?: number; code: string }) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = options.status ?? null;
    this.code = options.code;
  }
}
