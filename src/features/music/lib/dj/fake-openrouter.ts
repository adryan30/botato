import type {
  DjSuggestContext,
  DjTrackSuggestion,
  OpenRouterPort,
} from './openrouter-port.js';

export type FakeOpenRouter = OpenRouterPort & {
  calls: DjSuggestContext[];
  suggestImpl: (context: DjSuggestContext) => Promise<DjTrackSuggestion[]>;
};

export function createFakeOpenRouter(
  overrides: Partial<Pick<FakeOpenRouter, 'suggestImpl'>> = {},
): FakeOpenRouter {
  const calls: DjSuggestContext[] = [];
  const fake: FakeOpenRouter = {
    calls,
    suggestImpl:
      overrides.suggestImpl ??
      (async () => {
        throw new Error('suggestImpl not configured');
      }),
    async suggestTracks(context) {
      calls.push(context);
      return fake.suggestImpl(context);
    },
  };
  return fake;
}
