import { describe, expect, it, vi } from 'vitest';
import {
  buildUserPrompt,
  createOpenRouterClient,
  OPENROUTER_DEFAULT_MODEL,
} from './openrouter-client.js';
import { OpenRouterError } from './openrouter-port.js';

describe('openrouter-client', () => {
  it('posts non-streaming chat completions with response_format and parses tracks', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tracks: [
                  { artist: 'Miles', title: 'So What' },
                  { artist: 'Coltrane', title: 'Naima' },
                ],
              }),
            },
          },
        ],
      }),
    );

    const client = createOpenRouterClient({
      apiKey: 'sk-test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const tracks = await client.suggestTracks({
      vibe: 'modal jazz',
      historyTitles: ['Blue in Green'],
      upcomingTitles: ['Freddie Freeloader'],
      count: 5,
    });

    expect(tracks).toEqual([
      { artist: 'Miles', title: 'So What' },
      { artist: 'Coltrane', title: 'Naima' },
    ]);

    expect(fetchImpl).toHaveBeenCalledOnce();
    const call = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit | undefined,
    ];
    const [url, init] = call;
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init?.method).toBe('POST');
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      stream: boolean;
      response_format: { type: string };
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe(OPENROUTER_DEFAULT_MODEL);
    expect(body.stream).toBe(false);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.messages[1]?.content).toContain('modal jazz');
    expect(body.messages[1]?.content).toContain('Blue in Green');
  });

  it('maps 402 to OpenRouterError', async () => {
    const client = createOpenRouterClient({
      apiKey: 'sk-test',
      fetchImpl: (async () =>
        new Response('pay', { status: 402 })) as unknown as typeof fetch,
    });

    await expect(
      client.suggestTracks({
        vibe: 'x',
        historyTitles: [],
        upcomingTitles: [],
        count: 5,
      }),
    ).rejects.toBeInstanceOf(OpenRouterError);
  });

  it('maps 429 Retry-After into retryAfterMs', async () => {
    const client = createOpenRouterClient({
      apiKey: 'sk-test',
      fetchImpl: (async () =>
        new Response('slow', {
          status: 429,
          headers: { 'Retry-After': '7' },
        })) as unknown as typeof fetch,
    });

    const error = await client
      .suggestTracks({
        vibe: 'x',
        historyTitles: [],
        upcomingTitles: [],
        count: 5,
      })
      .then(
        () => null,
        (err: unknown) => err,
      );

    expect(error).toBeInstanceOf(OpenRouterError);
    expect(error).toMatchObject({
      code: 'rate_limit',
      status: 429,
      retryAfterMs: 7_000,
    });
  });

  it('maps unknown model responses to unknown_model', async () => {
    const client = createOpenRouterClient({
      apiKey: 'sk-test',
      fetchImpl: (async () =>
        Response.json(
          { error: { message: 'Model not found' } },
          { status: 400 },
        )) as unknown as typeof fetch,
    });

    await expect(
      client.suggestTracks({
        vibe: 'x',
        historyTitles: [],
        upcomingTitles: [],
        count: 5,
      }),
    ).rejects.toMatchObject({ code: 'unknown_model' });
  });

  it('does not treat a bare HTTP 404 as unknown_model', async () => {
    const client = createOpenRouterClient({
      apiKey: 'sk-test',
      fetchImpl: (async () =>
        new Response('missing', { status: 404 })) as unknown as typeof fetch,
    });

    await expect(
      client.suggestTracks({
        vibe: 'x',
        historyTitles: [],
        upcomingTitles: [],
        count: 5,
      }),
    ).rejects.toMatchObject({ code: 'http_error', status: 404 });
  });

  it('builds user content with vibe, history, and upcoming do-not-repeat lists', () => {
    expect(
      buildUserPrompt({
        vibe: 'lofi',
        historyTitles: ['A'],
        upcomingTitles: ['B'],
        count: 5,
      }),
    ).toContain('Suggest exactly 5');
  });
});
