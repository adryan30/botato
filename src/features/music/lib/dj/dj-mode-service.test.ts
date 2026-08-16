import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createFakeMusicNode } from '../music-node/fake-music-node.js';
import type { Track } from '../music-node/music-node-port.js';
import { MusicSessionService } from '../session/music-session-service.js';
import { createFakeOpenRouter } from './fake-openrouter.js';
import { DjModeService } from './dj-mode-service.js';
import type { DjTrackSuggestion } from './openrouter-port.js';
import { OpenRouterError } from './openrouter-port.js';

function track(id: string, title = id): Track {
  return {
    id,
    title,
    uri: `https://youtube.com/watch?v=${id}`,
    source: 'youtube',
  };
}

const DEFAULT_SUGGESTIONS: DjTrackSuggestion[] = [
  { artist: 'A', title: 'One' },
  { artist: 'B', title: 'Two' },
  { artist: 'C', title: 'Three' },
  { artist: 'D', title: 'Four' },
  { artist: 'E', title: 'Five' },
];

function createDjHarness(
  suggestions: DjTrackSuggestion[] = DEFAULT_SUGGESTIONS,
) {
  const openRouter = createFakeOpenRouter({
    suggestImpl: async () => suggestions,
  });
  const node = createFakeMusicNode({
    searchImpl: async (query) => {
      const hit = suggestions.find((s) => query === `${s.artist} ${s.title}`);
      return hit
        ? [track(hit.title.toLowerCase(), `${hit.artist} - ${hit.title}`)]
        : [];
    },
  });
  const sessions = new MusicSessionService(node);
  const dj = new DjModeService(sessions, openRouter);
  return { openRouter, node, sessions, dj, suggestions };
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

  describe('auto-refill', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('refills toward 3 after /clear once the debounce elapses', async () => {
      const { openRouter, sessions, dj } = createDjHarness();
      await dj.vibe('guild-1', 'vibe', 'voice-1');
      const callsAfterVibe = openRouter.calls.length;

      await sessions.clear('guild-1');
      expect(sessions.snapshot('guild-1').queue).toHaveLength(0);
      expect(openRouter.calls).toHaveLength(callsAfterVibe);

      await vi.advanceTimersByTimeAsync(1_000);

      expect(openRouter.calls.length).toBeGreaterThan(callsAfterVibe);
      expect(sessions.snapshot('guild-1').queue.length).toBeGreaterThanOrEqual(
        3,
      );
      expect(sessions.snapshot('guild-1').dj.enabled).toBe(true);
    });

    it('refills after skip drains upcoming below 3', async () => {
      const { openRouter, sessions, dj } = createDjHarness();
      await dj.vibe('guild-1', 'vibe', 'voice-1');
      const callsAfterVibe = openRouter.calls.length;
      expect(sessions.snapshot('guild-1').queue).toHaveLength(3);

      await sessions.skip('guild-1');
      expect(sessions.snapshot('guild-1').queue).toHaveLength(2);

      await vi.advanceTimersByTimeAsync(1_000);

      expect(openRouter.calls.length).toBe(callsAfterVibe + 1);
      expect(sessions.snapshot('guild-1').queue.length).toBeGreaterThanOrEqual(
        3,
      );
    });

    it('coalesces a state-change burst into one OpenRouter call', async () => {
      const { openRouter, sessions, dj } = createDjHarness();
      await dj.vibe('guild-1', 'vibe', 'voice-1');
      const callsAfterVibe = openRouter.calls.length;

      await sessions.remove('guild-1', 1);
      await sessions.remove('guild-1', 1);
      await sessions.remove('guild-1', 1);
      expect(sessions.snapshot('guild-1').queue).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(999);
      expect(openRouter.calls).toHaveLength(callsAfterVibe);

      await vi.advanceTimersByTimeAsync(1);
      expect(openRouter.calls).toHaveLength(callsAfterVibe + 1);
    });

    it('allows only one in-flight refill and re-checks after it settles', async () => {
      let releaseSuggest!: () => void;
      const suggestGate = new Promise<void>((resolve) => {
        releaseSuggest = resolve;
      });
      let suggestStarts = 0;
      const openRouter = createFakeOpenRouter({
        suggestImpl: async () => {
          suggestStarts += 1;
          if (suggestStarts === 1) {
            await suggestGate;
          }
          return [
            { artist: 'R', title: `Wave${suggestStarts}a` },
            { artist: 'R', title: `Wave${suggestStarts}b` },
            { artist: 'R', title: `Wave${suggestStarts}c` },
            { artist: 'R', title: `Wave${suggestStarts}d` },
            { artist: 'R', title: `Wave${suggestStarts}e` },
          ];
        },
      });
      const node = createFakeMusicNode({
        searchImpl: async (query) => {
          const title = query.replace(/^R /, '');
          return [track(title.toLowerCase(), title)];
        },
        resolveImpl: async () => ({
          kind: 'track',
          track: track('seed', 'Seed'),
        }),
      });
      const sessions = new MusicSessionService(node);
      new DjModeService(sessions, openRouter);

      await sessions.play('guild-1', 'seed', 'voice-1');
      await sessions.playTrack(
        'guild-1',
        track('u1', 'User1'),
        'voice-1',
      );
      await sessions.playTrack(
        'guild-1',
        track('u2', 'User2'),
        'voice-1',
      );
      // queue length 2 → first refill only needs 1 track
      sessions.setDj('guild-1', {
        enabled: true,
        vibe: 'gate',
        retrying: false,
      });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(suggestStarts).toBe(1);

      // Mid-flight clear leaves the original need=1 insufficient.
      await sessions.clear('guild-1');
      await vi.advanceTimersByTimeAsync(1_000);
      expect(suggestStarts).toBe(1);

      releaseSuggest();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
      await Promise.resolve();
      // Post-settle re-check schedules another refill for the empty queue.
      await vi.advanceTimersByTimeAsync(1_000);

      expect(suggestStarts).toBe(2);
      expect(sessions.snapshot('guild-1').queue.length).toBeGreaterThanOrEqual(
        3,
      );
    });

    it('treats the buffer as a floor: mid-flight user enqueues are not trimmed', async () => {
      let releaseSuggest!: () => void;
      const suggestGate = new Promise<void>((resolve) => {
        releaseSuggest = resolve;
      });
      const djSuggestions: DjTrackSuggestion[] = [
        { artist: 'D', title: 'DjOne' },
        { artist: 'D', title: 'DjTwo' },
        { artist: 'D', title: 'DjThree' },
        { artist: 'D', title: 'DjFour' },
        { artist: 'D', title: 'DjFive' },
      ];
      const openRouter = createFakeOpenRouter({
        suggestImpl: async () => {
          await suggestGate;
          return djSuggestions;
        },
      });
      const node = createFakeMusicNode({
        searchImpl: async (query) => {
          const title = query.replace(/^D /, '');
          return [track(title.toLowerCase(), title)];
        },
        resolveImpl: async (query) => ({
          kind: 'track',
          track: track(query, query),
        }),
      });
      const sessions = new MusicSessionService(node);
      new DjModeService(sessions, openRouter);

      await sessions.play('guild-1', 'seed', 'voice-1');
      sessions.setDj('guild-1', {
        enabled: true,
        vibe: 'floor',
        retrying: false,
      });
      await sessions.clear('guild-1');
      await vi.advanceTimersByTimeAsync(1_000);

      await sessions.play('guild-1', 'user-a', 'voice-1');
      await sessions.play('guild-1', 'user-b', 'voice-1');
      await sessions.play('guild-1', 'user-c', 'voice-1');
      await sessions.play('guild-1', 'user-d', 'voice-1');
      expect(sessions.snapshot('guild-1').queue.length).toBeGreaterThanOrEqual(
        3,
      );
      const queueBeforeDjResults = sessions
        .snapshot('guild-1')
        .queue.map((t) => t.id);

      releaseSuggest();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
      await Promise.resolve();

      const after = sessions.snapshot('guild-1');
      expect(after.queue.length).toBeGreaterThan(queueBeforeDjResults.length);
      for (const id of queueBeforeDjResults) {
        expect(after.queue.map((t) => t.id)).toContain(id);
      }
      expect(after.queue.some((t) => t.provenance === 'dj')).toBe(true);
    });

    it('does not refill after /dj off', async () => {
      const { openRouter, sessions, dj } = createDjHarness();
      await dj.vibe('guild-1', 'vibe', 'voice-1');
      await dj.off('guild-1');
      const callsAfterOff = openRouter.calls.length;

      await sessions.clear('guild-1');
      await vi.advanceTimersByTimeAsync(1_000);

      expect(openRouter.calls).toHaveLength(callsAfterOff);
      expect(sessions.snapshot('guild-1').queue).toHaveLength(0);
    });

    it('abandons an in-flight refill when /dj off is used', async () => {
      let releaseSuggest!: () => void;
      const suggestGate = new Promise<void>((resolve) => {
        releaseSuggest = resolve;
      });
      let searches = 0;
      const openRouter = createFakeOpenRouter({
        suggestImpl: async () => {
          await suggestGate;
          return [
            { artist: 'X', title: 'Late1' },
            { artist: 'X', title: 'Late2' },
            { artist: 'X', title: 'Late3' },
            { artist: 'X', title: 'Late4' },
            { artist: 'X', title: 'Late5' },
          ];
        },
      });
      const node = createFakeMusicNode({
        searchImpl: async (query) => {
          searches += 1;
          const title = query.replace(/^X /, '');
          return [track(title.toLowerCase(), title)];
        },
        resolveImpl: async () => ({
          kind: 'track',
          track: track('seed', 'Seed'),
        }),
      });
      const sessions = new MusicSessionService(node);
      const dj = new DjModeService(sessions, openRouter);

      await sessions.play('guild-1', 'seed', 'voice-1');
      sessions.setDj('guild-1', {
        enabled: true,
        vibe: 'off-mid',
        retrying: false,
      });
      await sessions.clear('guild-1');
      await vi.advanceTimersByTimeAsync(1_000);

      await dj.off('guild-1');
      releaseSuggest();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();

      expect(searches).toBe(0);
      expect(sessions.snapshot('guild-1').queue).toHaveLength(0);
      expect(sessions.snapshot('guild-1').dj).toEqual({ enabled: false });
    });

    it('cancels in-flight refill on session-end and drops DJ state', async () => {
      let releaseSuggest!: () => void;
      const suggestGate = new Promise<void>((resolve) => {
        releaseSuggest = resolve;
      });
      let enqueuedAfterCancel = 0;
      const openRouter = createFakeOpenRouter({
        suggestImpl: async () => {
          await suggestGate;
          return [
            { artist: 'X', title: 'AfterEnd1' },
            { artist: 'X', title: 'AfterEnd2' },
            { artist: 'X', title: 'AfterEnd3' },
            { artist: 'X', title: 'AfterEnd4' },
            { artist: 'X', title: 'AfterEnd5' },
          ];
        },
      });
      const node = createFakeMusicNode({
        searchImpl: async (query) => {
          enqueuedAfterCancel += 1;
          const title = query.replace(/^X /, '');
          return [track(title.toLowerCase(), title)];
        },
        resolveImpl: async () => ({
          kind: 'track',
          track: track('seed', 'Seed'),
        }),
      });
      const sessions = new MusicSessionService(node);
      new DjModeService(sessions, openRouter);

      await sessions.play('guild-1', 'seed', 'voice-1');
      sessions.setDj('guild-1', {
        enabled: true,
        vibe: 'end',
        retrying: false,
      });
      await sessions.clear('guild-1');
      await vi.advanceTimersByTimeAsync(1_000);

      await sessions.leave('guild-1');
      releaseSuggest();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();

      expect(enqueuedAfterCancel).toBe(0);
      expect(() => sessions.snapshot('guild-1')).toThrow(/no active music session/i);
    });
  });
});
