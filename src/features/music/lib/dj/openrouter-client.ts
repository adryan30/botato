import {
  OpenRouterError,
  type DjSuggestContext,
  type DjTrackSuggestion,
  type OpenRouterPort,
} from './openrouter-port.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'nvidia/nemotron-nano-9b-v2:free';

export type OpenRouterClientOptions = {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

const TRACKS_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'dj_tracks',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        tracks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              artist: { type: 'string' },
              title: { type: 'string' },
            },
            required: ['artist', 'title'],
            additionalProperties: false,
          },
        },
      },
      required: ['tracks'],
      additionalProperties: false,
    },
  },
};

export function createOpenRouterClient(
  options: OpenRouterClientOptions,
): OpenRouterPort {
  const fetchImpl = options.fetchImpl ?? fetch;
  const model = options.model?.trim() || DEFAULT_MODEL;
  const apiKey = options.apiKey.trim();

  return {
    async suggestTracks(context: DjSuggestContext): Promise<DjTrackSuggestion[]> {
      const response = await fetchImpl(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-OpenRouter-Title': 'Botato',
        },
        body: JSON.stringify({
          model,
          stream: false,
          response_format: TRACKS_SCHEMA,
          messages: [
            {
              role: 'system',
              content:
                'You curate YouTube music search suggestions. Reply only with JSON matching the schema: { "tracks": [ { "artist": string, "title": string } ] }. Never invent URLs.',
            },
            {
              role: 'user',
              content: buildUserPrompt(context),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw mapHttpError(response.status);
      }

      const body = (await response.json()) as {
        choices?: Array<{
          message?: { content?: string | null };
          error?: { message?: string };
          finish_reason?: string;
        }>;
        error?: { message?: string; code?: string | number };
      };

      if (body.error) {
        throw new OpenRouterError(
          body.error.message ?? 'OpenRouter generation failed',
          { code: 'generation_error' },
        );
      }

      const choice = body.choices?.[0];
      if (choice?.error) {
        throw new OpenRouterError(
          choice.error.message ?? 'OpenRouter choice error',
          { code: 'generation_error' },
        );
      }

      const content = choice?.message?.content;
      if (!content) {
        throw new OpenRouterError('OpenRouter returned empty content', {
          code: 'empty_content',
        });
      }

      return parseTrackSuggestions(content, context.count);
    },
  };
}

export function buildUserPrompt(context: DjSuggestContext): string {
  const history =
    context.historyTitles.length === 0
      ? '(none)'
      : context.historyTitles.map((t) => `- ${t}`).join('\n');
  const upcoming =
    context.upcomingTitles.length === 0
      ? '(none)'
      : context.upcomingTitles.map((t) => `- ${t}`).join('\n');

  return [
    `DJ vibe: ${context.vibe}`,
    `Suggest exactly ${context.count} distinct tracks as artist + title pairs.`,
    'Do not repeat anything from history or the upcoming queue.',
    '',
    'Recently played (do not repeat):',
    history,
    '',
    'Upcoming queue (do not repeat):',
    upcoming,
  ].join('\n');
}

function parseTrackSuggestions(
  content: string,
  count: number,
): DjTrackSuggestion[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OpenRouterError('OpenRouter returned invalid JSON', {
      code: 'invalid_json',
    });
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('tracks' in parsed) ||
    !Array.isArray((parsed as { tracks: unknown }).tracks)
  ) {
    throw new OpenRouterError('OpenRouter JSON missing tracks array', {
      code: 'invalid_shape',
    });
  }

  const tracks: DjTrackSuggestion[] = [];
  for (const item of (parsed as { tracks: unknown[] }).tracks) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as { artist?: unknown }).artist !== 'string' ||
      typeof (item as { title?: unknown }).title !== 'string'
    ) {
      continue;
    }
    const artist = (item as { artist: string }).artist.trim();
    const title = (item as { title: string }).title.trim();
    if (!artist || !title) {
      continue;
    }
    tracks.push({ artist, title });
    if (tracks.length >= count) {
      break;
    }
  }

  if (tracks.length === 0) {
    throw new OpenRouterError('OpenRouter returned no usable tracks', {
      code: 'empty_tracks',
    });
  }

  return tracks;
}

function mapHttpError(status: number): OpenRouterError {
  if (status === 401) {
    return new OpenRouterError('OpenRouter API key is missing or invalid', {
      status,
      code: 'unauthorized',
    });
  }
  if (status === 402) {
    return new OpenRouterError('OpenRouter account is out of credits', {
      status,
      code: 'credits',
    });
  }
  if (status === 429) {
    return new OpenRouterError('OpenRouter rate limit exceeded', {
      status,
      code: 'rate_limit',
    });
  }
  return new OpenRouterError(`OpenRouter HTTP ${status}`, {
    status,
    code: 'http_error',
  });
}

export const OPENROUTER_DEFAULT_MODEL = DEFAULT_MODEL;
