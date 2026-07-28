import { describe, expect, it } from 'vitest';
import { createFakeMusicNode } from '../music-node/fake-music-node.js';
import type { Track } from '../music-node/music-node-port.js';
import { playConfirmation } from '../play-confirmation.js';
import { MusicSessionService } from './music-session-service.js';

function track(id: string, title: string): Track {
  return {
    id,
    title,
    uri: `https://youtube.com/watch?v=${id}`,
    source: 'youtube',
  };
}

describe('play YouTube link (regression)', () => {
  it('while playing, empty URL resolve does not claim the current track was (re)played', async () => {
    const current = track('cur', 'Already Playing');
    const node = createFakeMusicNode({
      resolveImpl: async (query) => {
        if (query.includes('youtu') || query === 'M7D2oz6Em48') {
          return { kind: 'playlist', tracks: [] };
        }
        return { kind: 'track', track: current };
      },
    });
    const sessions = new MusicSessionService(node);
    await sessions.play('guild-1', 'bootstrap', 'voice-1');

    const wasPlaying = true;
    const added = await sessions.play(
      'guild-1',
      'https://youtu.be/M7D2oz6Em48',
      'voice-1',
    );

    expect(added).toEqual([]);
    expect(playConfirmation(wasPlaying, added)).toBe(
      'No tracks found for that query.',
    );
    expect(sessions.nowPlaying('guild-1')?.title).toBe(current.title);
    expect(sessions.snapshot('guild-1').queue).toEqual([]);
  });

  it('with no session, empty resolve reports no tracks instead of No active music session', async () => {
    const node = createFakeMusicNode({
      resolveImpl: async () => ({ kind: 'playlist', tracks: [] }),
    });
    const sessions = new MusicSessionService(node);

    const added = await sessions.play(
      'guild-1',
      'https://youtu.be/M7D2oz6Em48',
      'voice-1',
    );

    expect(playConfirmation(false, added)).toBe('No tracks found for that query.');
    expect(() => sessions.snapshot('guild-1')).toThrow('No active music session');
  });

  it('retries bare video id when the URL resolve is empty', async () => {
    const target = track('M7D2oz6Em48', 'lil vinicinho');
    const seen: string[] = [];
    const node = createFakeMusicNode({
      resolveImpl: async (query) => {
        seen.push(query);
        if (query === 'M7D2oz6Em48') {
          return { kind: 'track', track: target };
        }
        return { kind: 'playlist', tracks: [] };
      },
    });
    const sessions = new MusicSessionService(node);

    const added = await sessions.play(
      'guild-1',
      'https://youtu.be/M7D2oz6Em48',
      'voice-1',
    );

    expect(seen).toEqual(['https://youtu.be/M7D2oz6Em48', 'M7D2oz6Em48']);
    expect(added).toEqual([target]);
    expect(playConfirmation(false, added)).toBe('Playing **lil vinicinho**');
  });

  it('while playing, a mix/playlist URL reports the linked (first) track', async () => {
    const linked = track('link', 'Linked Video From URL');
    const mixTail = track('tail', 'Mix Tail Last Track');
    const current = track('cur', 'Already Playing');
    const node = createFakeMusicNode({
      resolveImpl: async (query) => {
        if (query.includes('list=') || query === 'link') {
          return {
            kind: 'playlist',
            tracks: [linked, track('m2', 'Mix 2'), mixTail],
          };
        }
        return { kind: 'track', track: current };
      },
    });
    const sessions = new MusicSessionService(node);
    await sessions.play('guild-1', 'bootstrap', 'voice-1');

    const added = await sessions.play(
      'guild-1',
      'https://www.youtube.com/watch?v=link&list=RDlink',
      'voice-1',
    );

    expect(playConfirmation(true, added)).toBe(`Queued **${linked.title}**`);
    expect(playConfirmation(true, added)).not.toBe(
      `Queued **${mixTail.title}**`,
    );
  });
});
