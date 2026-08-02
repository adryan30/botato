import { describe, expect, it } from 'vitest';
import type { Track } from './music-node/music-node-port.js';
import { playConfirmation } from './play-confirmation.js';

function track(id: string, title: string): Track {
  return {
    id,
    title,
    uri: `https://youtube.com/watch?v=${id}`,
    source: 'youtube',
  };
}

describe('playConfirmation', () => {
  it('reports no tracks when resolve added nothing', () => {
    expect(playConfirmation(false, [])).toBe('No tracks found for that query.');
    expect(playConfirmation(true, [])).toBe('No tracks found for that query.');
  });

  it('reports Playing for the first added track when starting playback', () => {
    expect(playConfirmation(false, [track('a', 'Alpha')])).toBe(
      'Playing **Alpha**',
    );
  });

  it('reports Playing with a +N more cue for multi-track starts', () => {
    expect(
      playConfirmation(false, [
        track('a', 'Alpha'),
        track('b', 'Beta'),
        track('c', 'Gamma'),
      ]),
    ).toBe('Playing **Alpha** (+2 more)');
  });

  it('reports Queued with a +N more cue while already playing', () => {
    const linked = track('link', 'Linked Video From URL');
    const mixTail = track('tail', 'Mix Tail Last Track');
    expect(playConfirmation(true, [linked, track('m2', 'Mix 2'), mixTail])).toBe(
      `Queued **${linked.title}** (+2 more)`,
    );
  });
});
