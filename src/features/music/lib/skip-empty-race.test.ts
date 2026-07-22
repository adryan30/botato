import { describe, expect, it } from 'vitest';
import { createFakeMusicNode } from './fake-music-node.js';
import type { Track } from './music-node-port.js';
import { MusicSessionService } from './music-session-service.js';

function track(id: string): Track {
  return {
    id,
    title: id,
    uri: `https://youtube.com/watch?v=${id}`,
    source: 'youtube',
  };
}

describe('MusicSessionService.handleTrackEnd', () => {
  it('advances to the next queued track when the current track ends', async () => {
    const a = track('a');
    const b = track('b');
    let call = 0;
    const service = new MusicSessionService(
      createFakeMusicNode({
        resolveImpl: async () => {
          call += 1;
          return { kind: 'track', track: call === 1 ? a : b };
        },
      }),
    );
    await service.play('guild-1', 'a', 'voice-1');
    await service.play('guild-1', 'b');

    await service.handleTrackEnd('guild-1');

    expect(service.snapshot('guild-1')).toMatchObject({
      nowPlaying: b,
      queue: [],
    });
  });

  it('clears now playing when the last track ends with repeat off', async () => {
    const service = new MusicSessionService(
      createFakeMusicNode({
        resolveImpl: async () => ({ kind: 'track', track: track('only') }),
      }),
    );
    await service.play('guild-1', 'only', 'voice-1');

    await service.handleTrackEnd('guild-1');

    expect(service.snapshot('guild-1')).toMatchObject({
      nowPlaying: null,
      queue: [],
    });
  });

  it('ignores track-end while a skip advance is already in flight', async () => {
    const a = track('a');
    const b = track('b');
    const c = track('c');
    let call = 0;
    const node = createFakeMusicNode({
      resolveImpl: async () => {
        const tracks = [a, b, c];
        const next = tracks[Math.min(call, tracks.length - 1)]!;
        call += 1;
        return { kind: 'track', track: next };
      },
    });

    let releasePlay!: () => void;
    const playGate = new Promise<void>((resolve) => {
      releasePlay = resolve;
    });
    const originalPlay = node.play.bind(node);
    let playCalls = 0;
    node.play = async (guildId, next) => {
      playCalls += 1;
      if (playCalls === 2) {
        // Second play is the skip → b transition; hold it so handleTrackEnd races.
        await playGate;
      }
      await originalPlay(guildId, next);
    };

    const service = new MusicSessionService(node);
    await service.play('guild-1', 'a', 'voice-1');
    await service.play('guild-1', 'b');
    await service.play('guild-1', 'c');

    const skipPromise = service.skip('guild-1');
    await Promise.resolve();
    // Node empty event during replace must not double-advance past b.
    await service.handleTrackEnd('guild-1');
    releasePlay();
    await skipPromise;

    expect(service.snapshot('guild-1')).toMatchObject({
      nowPlaying: b,
      queue: [c],
    });
  });
});
