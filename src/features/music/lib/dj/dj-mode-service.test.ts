import { describe, expect, it } from 'vitest';
import { createFakeMusicNode } from '../music-node/fake-music-node.js';
import type { Track } from '../music-node/music-node-port.js';
import { MusicSessionService } from '../session/music-session-service.js';
import { createFakeOpenRouter } from './fake-openrouter.js';
import { DjModeService } from './dj-mode-service.js';
import { OpenRouterError } from './openrouter-port.js';

function track(id: string, title = id): Track {
  return {
    id,
    title,
    uri: `https://youtube.com/watch?v=${id}`,
    source: 'youtube',
  };
}

describe('DjModeService', () => {
  it('enables DJ mode, commits vibe, and tops upcoming to 3 with DJ provenance', async () => {
    const suggestions = [
      { artist: 'A', title: 'One' },
      { artist: 'B', title: 'Two' },
      { artist: 'C', title: 'Three' },
      { artist: 'D', title: 'Four' },
      { artist: 'E', title: 'Five' },
    ];
    const openRouter = createFakeOpenRouter({
      suggestImpl: async () => suggestions,
    });
    const node = createFakeMusicNode({
      searchImpl: async (query) => {
        const hit = suggestions.find(
          (s) => query === `${s.artist} ${s.title}`,
        );
        return hit
          ? [track(hit.title.toLowerCase(), `${hit.artist} - ${hit.title}`)]
          : [];
      },
    });
    const sessions = new MusicSessionService(node);
    const dj = new DjModeService(sessions, openRouter);

    const result = await dj.vibe('guild-1', 'late night jazz', 'voice-1');

    expect(result).toEqual({
      vibe: 'late night jazz',
      enqueued: 4,
    });
    const snap = sessions.snapshot('guild-1');
    expect(snap.dj).toEqual({
      enabled: true,
      vibe: 'late night jazz',
      retrying: false,
    });
    expect(snap.nowPlaying?.provenance).toBe('dj');
    expect(snap.queue).toHaveLength(3);
    expect(snap.queue.every((t) => t.provenance === 'dj')).toBe(true);
    expect(openRouter.calls[0]).toMatchObject({
      vibe: 'late night jazz',
      count: 5,
      historyTitles: [],
      upcomingTitles: [],
    });
  });

  it('does not enable DJ mode when OpenRouter fails on the first turn', async () => {
    const openRouter = createFakeOpenRouter({
      suggestImpl: async () => {
        throw new OpenRouterError('Out of credits', {
          status: 402,
          code: 'credits',
        });
      },
    });
    const sessions = new MusicSessionService(createFakeMusicNode());
    const dj = new DjModeService(sessions, openRouter);

    await expect(
      dj.vibe('guild-1', 'synthwave', 'voice-1'),
    ).rejects.toThrow('Out of credits');

    expect(sessions.snapshot('guild-1').dj).toEqual({ enabled: false });
  });

  it('does not enable DJ mode when nothing resolves for an empty session', async () => {
    const openRouter = createFakeOpenRouter({
      suggestImpl: async () => [
        { artist: 'X', title: 'Miss' },
        { artist: 'Y', title: 'Also' },
      ],
    });
    const node = createFakeMusicNode({
      searchImpl: async () => [],
    });
    const sessions = new MusicSessionService(node);
    const dj = new DjModeService(sessions, openRouter);

    await expect(
      dj.vibe('guild-1', 'empty', 'voice-1'),
    ).rejects.toThrow(/could not resolve/i);

    expect(sessions.snapshot('guild-1').dj).toEqual({ enabled: false });
    expect(sessions.snapshot('guild-1').nowPlaying).toBeNull();
  });

  it('dual-dedupes against history and upcoming before and after resolve', async () => {
    const node = createFakeMusicNode({
      resolveImpl: async () => ({
        kind: 'track',
        track: track('seed', 'Seed Track'),
      }),
      searchImpl: async (query) => {
        if (query === 'A Alpha') {
          return [track('alpha', 'Alpha')];
        }
        if (query === 'B Beta') {
          return [track('seed', 'Seed Track Dup')];
        }
        if (query === 'C Gamma') {
          return [track('gamma', 'Gamma')];
        }
        if (query === 'D Delta') {
          return [track('delta', 'Delta')];
        }
        if (query === 'E Echo') {
          return [track('echo', 'Echo')];
        }
        return [];
      },
    });
    const sessions = new MusicSessionService(node);
    await sessions.play('guild-1', 'seed', 'voice-1');
    await sessions.playTrack('guild-1', track('queued', 'Queued User'), 'voice-1');
    await sessions.skip('guild-1');

    const openRouter = createFakeOpenRouter({
      suggestImpl: async () => [
        { artist: 'Q', title: 'Queued User' },
        { artist: 'S', title: 'Seed Track' },
        { artist: 'A', title: 'Alpha' },
        { artist: 'B', title: 'Beta' },
        { artist: 'C', title: 'Gamma' },
        { artist: 'D', title: 'Delta' },
        { artist: 'E', title: 'Echo' },
      ],
    });
    const dj = new DjModeService(sessions, openRouter);

    await dj.vibe('guild-1', 'fill', 'voice-1');

    const snap = sessions.snapshot('guild-1');
    expect(snap.queue.map((t) => t.id)).toEqual(['alpha', 'gamma', 'delta']);
    expect(snap.queue.every((t) => t.provenance === 'dj')).toBe(true);
    expect(openRouter.calls[0]?.historyTitles).toContain('Seed Track');
    expect(openRouter.calls[0]?.upcomingTitles).toContain('Queued User');
  });

  it('turns DJ mode off without leaving voice or clearing the queue', async () => {
    const suggestions = [
      { artist: 'A', title: 'One' },
      { artist: 'B', title: 'Two' },
      { artist: 'C', title: 'Three' },
      { artist: 'D', title: 'Four' },
    ];
    const openRouter = createFakeOpenRouter({
      suggestImpl: async () => suggestions,
    });
    const node = createFakeMusicNode({
      searchImpl: async (query) => {
        const hit = suggestions.find(
          (s) => query === `${s.artist} ${s.title}`,
        );
        return hit ? [track(hit.title.toLowerCase(), hit.title)] : [];
      },
    });
    const sessions = new MusicSessionService(node);
    const dj = new DjModeService(sessions, openRouter);
    await dj.vibe('guild-1', 'vibe', 'voice-1');

    const before = sessions.snapshot('guild-1');
    const result = await dj.off('guild-1');

    expect(result).toEqual({ alreadyOff: false });
    const after = sessions.snapshot('guild-1');
    expect(after.dj).toEqual({ enabled: false });
    expect(after.nowPlaying).toEqual(before.nowPlaying);
    expect(after.queue).toEqual(before.queue);
    expect(node.connected.get('guild-1')).toBe('voice-1');
  });

  it('no-ops when turning DJ off while already off', async () => {
    const node = createFakeMusicNode({
      resolveImpl: async () => ({
        kind: 'track',
        track: track('np'),
      }),
    });
    const sessions = new MusicSessionService(node);
    await sessions.play('guild-1', 'q', 'voice-1');
    const dj = new DjModeService(sessions, createFakeOpenRouter());

    await expect(dj.off('guild-1')).resolves.toEqual({ alreadyOff: true });
    expect(sessions.snapshot('guild-1').dj).toEqual({ enabled: false });
  });

  it('last vibe wins on a second successful turn', async () => {
    const openRouter = createFakeOpenRouter({
      suggestImpl: async ({ vibe }) => [
        { artist: 'A', title: `${vibe}-1` },
        { artist: 'B', title: `${vibe}-2` },
        { artist: 'C', title: `${vibe}-3` },
        { artist: 'D', title: `${vibe}-4` },
        { artist: 'E', title: `${vibe}-5` },
      ],
    });
    const node = createFakeMusicNode({
      searchImpl: async (query) => {
        const title = query.replace(/^[A-E] /, '');
        return [track(title, title)];
      },
    });
    const sessions = new MusicSessionService(node);
    const dj = new DjModeService(sessions, openRouter);

    await dj.vibe('guild-1', 'first', 'voice-1');
    await dj.vibe('guild-1', 'second', 'voice-1');

    expect(sessions.snapshot('guild-1').dj).toEqual({
      enabled: true,
      vibe: 'second',
      retrying: false,
    });
  });
});
