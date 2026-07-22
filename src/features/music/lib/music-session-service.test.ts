import { describe, expect, it } from 'vitest';
import { createFakeMusicNode } from './fake-music-node.js';
import type { Track } from './music-node-port.js';
import { MusicSessionService } from './music-session-service.js';

const youtubeTrack: Track = {
  id: 'yt-1',
  title: 'YouTube Song',
  uri: 'https://youtube.com/watch?v=yt-1',
  source: 'youtube',
};

function track(id: string, title = id): Track {
  return {
    id,
    title,
    uri: `https://youtube.com/watch?v=${id}`,
    source: 'youtube',
  };
}

async function playingService(
  tracks: Track[],
  options: { shuffle?: (items: Track[]) => Track[] } = {},
) {
  let call = 0;
  const node = createFakeMusicNode({
    resolveImpl: async () => {
      const next = tracks[Math.min(call, tracks.length - 1)]!;
      call += 1;
      return { kind: 'track', track: next };
    },
  });
  const service = new MusicSessionService(node, options);
  await service.play('guild-1', 'first', 'voice-1');
  for (let i = 1; i < tracks.length; i += 1) {
    await service.play('guild-1', `track-${i}`);
  }
  return service;
}

describe('MusicSessionService', () => {
  it('rejects pause when there is no music session for the guild', async () => {
    const service = new MusicSessionService(createFakeMusicNode());

    await expect(service.pause('guild-1')).rejects.toThrow(
      'No active music session',
    );
  });

  it('joins a voice channel and exposes connection in the session snapshot', async () => {
    const service = new MusicSessionService(createFakeMusicNode());

    await service.join('guild-1', 'voice-1');

    expect(service.snapshot('guild-1')).toEqual({
      guildId: 'guild-1',
      voiceChannelId: 'voice-1',
      nowPlaying: null,
      queue: [],
      volume: 100,
      repeat: 'off',
      paused: false,
    });
  });

  it('leaves the voice channel and clears the music session', async () => {
    const service = new MusicSessionService(createFakeMusicNode());
    await service.join('guild-1', 'voice-1');

    await service.leave('guild-1');

    expect(() => service.snapshot('guild-1')).toThrow('No active music session');
  });

  it('rejects leave when there is no music session for the guild', async () => {
    const service = new MusicSessionService(createFakeMusicNode());

    await expect(service.leave('guild-1')).rejects.toThrow(
      'No active music session',
    );
  });

  it('rejects play when no voice channel is provided and none is joined', async () => {
    const service = new MusicSessionService(
      createFakeMusicNode({
        resolveImpl: async () => ({ kind: 'track', track: youtubeTrack }),
      }),
    );

    await expect(service.play('guild-1', 'never gonna give you up')).rejects.toThrow(
      'No voice channel',
    );
    await expect(service.pause('guild-1')).rejects.toThrow(
      'No active music session',
    );
  });

  it('does not join voice or create a session when resolve returns no tracks', async () => {
    const node = createFakeMusicNode({
      resolveImpl: async () => ({ kind: 'playlist', tracks: [] }),
    });
    const service = new MusicSessionService(node);

    await service.play('guild-1', 'missing song', 'voice-1');

    expect(node.connected.has('guild-1')).toBe(false);
    expect(() => service.snapshot('guild-1')).toThrow('No active music session');
  });

  it('plays a YouTube resolve result and shows it as now playing', async () => {
    const service = new MusicSessionService(
      createFakeMusicNode({
        resolveImpl: async () => ({ kind: 'track', track: youtubeTrack }),
      }),
    );

    await service.play('guild-1', 'https://youtube.com/watch?v=yt-1', 'voice-1');

    expect(service.snapshot('guild-1')).toMatchObject({
      voiceChannelId: 'voice-1',
      nowPlaying: youtubeTrack,
      queue: [],
      paused: false,
    });
  });

  it('refuses Spotify URLs with a clear unsupported error', async () => {
    const node = createFakeMusicNode({
      resolveImpl: async () => {
        throw new Error('music-node should not be called for Spotify URLs');
      },
    });
    const service = new MusicSessionService(node);

    await expect(
      service.play(
        'guild-1',
        'https://open.spotify.com/track/abc',
        'voice-1',
      ),
    ).rejects.toThrow('Spotify is not supported');
    expect(node.connected.has('guild-1')).toBe(false);
  });

  it('enqueues subsequent tracks behind the current now playing', async () => {
    const second = track('yt-2', 'Second');
    let call = 0;
    const service = new MusicSessionService(
      createFakeMusicNode({
        resolveImpl: async () => {
          call += 1;
          return {
            kind: 'track',
            track: call === 1 ? youtubeTrack : second,
          };
        },
      }),
    );

    await service.play('guild-1', 'first', 'voice-1');
    await service.play('guild-1', 'second');

    expect(service.snapshot('guild-1')).toMatchObject({
      nowPlaying: youtubeTrack,
      queue: [second],
    });
  });

  it('enqueues all tracks from a playlist resolve result', async () => {
    const tracks = [youtubeTrack, track('yt-2', 'Two'), track('yt-3', 'Three')];
    const service = new MusicSessionService(
      createFakeMusicNode({
        resolveImpl: async () => ({ kind: 'playlist', tracks }),
      }),
    );

    await service.play('guild-1', 'playlist-url', 'voice-1');

    expect(service.snapshot('guild-1')).toMatchObject({
      nowPlaying: tracks[0],
      queue: tracks.slice(1),
    });
  });

  it('returns search results from the music-node port without mutating the session', async () => {
    const results = [track('s1'), track('s2')];
    const service = new MusicSessionService(
      createFakeMusicNode({
        searchImpl: async (query) => {
          expect(query).toBe('lofi');
          return results;
        },
      }),
    );
    await service.join('guild-1', 'voice-1');

    await expect(service.search('lofi')).resolves.toEqual(results);
    expect(service.snapshot('guild-1').nowPlaying).toBeNull();
  });

  it('pauses and resumes the current track', async () => {
    const service = await playingService([youtubeTrack]);

    await service.pause('guild-1');
    expect(service.snapshot('guild-1').paused).toBe(true);

    await service.resume('guild-1');
    expect(service.snapshot('guild-1').paused).toBe(false);
  });

  it('rejects resume when there is no music session', async () => {
    const service = new MusicSessionService(createFakeMusicNode());
    await expect(service.resume('guild-1')).rejects.toThrow(
      'No active music session',
    );
  });

  it('skips to the next queued track', async () => {
    const second = track('yt-2');
    const service = await playingService([youtubeTrack, second]);

    await service.skip('guild-1');

    expect(service.snapshot('guild-1')).toMatchObject({
      nowPlaying: second,
      queue: [],
    });
  });

  it('clears now playing when skipping an empty queue with repeat off', async () => {
    const service = await playingService([youtubeTrack]);

    await service.skip('guild-1');

    expect(service.snapshot('guild-1')).toMatchObject({
      nowPlaying: null,
      queue: [],
    });
  });

  it('restarts the current track from the beginning', async () => {
    const node = createFakeMusicNode({
      resolveImpl: async () => ({ kind: 'track', track: youtubeTrack }),
    });
    const service = new MusicSessionService(node);
    await service.play('guild-1', 'song', 'voice-1');

    await service.restart('guild-1');

    expect(node.seekPositions.get('guild-1')).toBe(0);
    expect(service.snapshot('guild-1').nowPlaying).toEqual(youtubeTrack);
  });

  it('sets volume on the session', async () => {
    const service = await playingService([youtubeTrack]);

    await service.setVolume('guild-1', 42);

    expect(service.snapshot('guild-1').volume).toBe(42);
  });

  it('exposes now-playing and queue snapshot helpers', async () => {
    const queued = track('yt-2');
    const service = await playingService([youtubeTrack, queued]);

    expect(service.nowPlaying('guild-1')).toEqual(youtubeTrack);
    expect(service.queue('guild-1')).toEqual([queued]);
  });

  it('ensure joins the requester voice channel like join', async () => {
    const service = new MusicSessionService(createFakeMusicNode());

    await service.ensure('guild-1', 'voice-9');

    expect(service.snapshot('guild-1').voiceChannelId).toBe('voice-9');
  });

  it('skips to a specific 1-based queue position', async () => {
    const a = track('a');
    const b = track('b');
    const c = track('c');
    const service = await playingService([youtubeTrack, a, b, c]);

    await service.skipTo('guild-1', 2);

    expect(service.snapshot('guild-1')).toMatchObject({
      nowPlaying: b,
      queue: [c],
    });
  });

  it('rejects skip-to outside the queue bounds', async () => {
    const service = await playingService([youtubeTrack, track('a')]);

    await expect(service.skipTo('guild-1', 0)).rejects.toThrow(
      'Queue index out of bounds',
    );
    await expect(service.skipTo('guild-1', 2)).rejects.toThrow(
      'Queue index out of bounds',
    );
  });

  it('clears the queue without stopping now playing', async () => {
    const service = await playingService([youtubeTrack, track('a'), track('b')]);

    await service.clear('guild-1');

    expect(service.snapshot('guild-1')).toMatchObject({
      nowPlaying: youtubeTrack,
      queue: [],
    });
  });

  it('shuffles the upcoming queue using the injected shuffle function', async () => {
    const a = track('a');
    const b = track('b');
    const c = track('c');
    const service = await playingService([youtubeTrack, a, b, c], {
      shuffle: (items) => [...items].reverse(),
    });

    await service.shuffle('guild-1');

    expect(service.snapshot('guild-1').queue).toEqual([c, b, a]);
  });

  it('removes a track at a 1-based queue index', async () => {
    const a = track('a');
    const b = track('b');
    const c = track('c');
    const service = await playingService([youtubeTrack, a, b, c]);

    await service.remove('guild-1', 2);

    expect(service.snapshot('guild-1').queue).toEqual([a, c]);
  });

  it('rejects remove outside the queue bounds', async () => {
    const service = await playingService([youtubeTrack, track('a')]);

    await expect(service.remove('guild-1', 0)).rejects.toThrow(
      'Queue index out of bounds',
    );
    await expect(service.remove('guild-1', 2)).rejects.toThrow(
      'Queue index out of bounds',
    );
  });

  it('moves a queue entry from one 1-based index to another', async () => {
    const a = track('a');
    const b = track('b');
    const c = track('c');
    const service = await playingService([youtubeTrack, a, b, c]);

    await service.move('guild-1', 1, 3);

    expect(service.snapshot('guild-1').queue).toEqual([b, c, a]);
  });

  it('rejects move outside the queue bounds', async () => {
    const service = await playingService([youtubeTrack, track('a'), track('b')]);

    await expect(service.move('guild-1', 0, 1)).rejects.toThrow(
      'Queue index out of bounds',
    );
    await expect(service.move('guild-1', 1, 3)).rejects.toThrow(
      'Queue index out of bounds',
    );
  });

  it('cycles repeat mode through off, track, and queue', async () => {
    const service = await playingService([youtubeTrack]);

    await service.setRepeat('guild-1', 'track');
    expect(service.snapshot('guild-1').repeat).toBe('track');

    await service.setRepeat('guild-1', 'queue');
    expect(service.snapshot('guild-1').repeat).toBe('queue');

    await service.setRepeat('guild-1', 'off');
    expect(service.snapshot('guild-1').repeat).toBe('off');
  });

  it('replays the current track when skipping with repeat track', async () => {
    const node = createFakeMusicNode({
      resolveImpl: async () => ({ kind: 'track', track: youtubeTrack }),
    });
    const service = new MusicSessionService(node);
    await service.play('guild-1', 'song', 'voice-1');
    await service.setRepeat('guild-1', 'track');

    await service.skip('guild-1');

    expect(service.snapshot('guild-1').nowPlaying).toEqual(youtubeTrack);
    expect(node.playing.get('guild-1')).toEqual(youtubeTrack);
  });

  it('requeues the finished track when skipping with repeat queue', async () => {
    const second = track('yt-2');
    const service = await playingService([youtubeTrack, second]);
    await service.setRepeat('guild-1', 'queue');

    await service.skip('guild-1');

    expect(service.snapshot('guild-1')).toMatchObject({
      nowPlaying: second,
      queue: [youtubeTrack],
    });
  });

  it('keeps sessions guild-scoped', async () => {
    const service = new MusicSessionService(
      createFakeMusicNode({
        resolveImpl: async () => ({ kind: 'track', track: youtubeTrack }),
      }),
    );

    await service.play('guild-1', 'song', 'voice-1');
    await service.join('guild-2', 'voice-2');

    expect(service.snapshot('guild-1').voiceChannelId).toBe('voice-1');
    expect(service.snapshot('guild-2').nowPlaying).toBeNull();
  });

  it('rejects control commands that require an active session', async () => {
    const service = new MusicSessionService(createFakeMusicNode());

    await expect(service.skip('guild-1')).rejects.toThrow('No active music session');
    await expect(service.skipTo('guild-1', 1)).rejects.toThrow(
      'No active music session',
    );
    await expect(service.restart('guild-1')).rejects.toThrow(
      'No active music session',
    );
    await expect(service.setVolume('guild-1', 10)).rejects.toThrow(
      'No active music session',
    );
    await expect(service.clear('guild-1')).rejects.toThrow(
      'No active music session',
    );
    await expect(service.shuffle('guild-1')).rejects.toThrow(
      'No active music session',
    );
    await expect(service.remove('guild-1', 1)).rejects.toThrow(
      'No active music session',
    );
    await expect(service.move('guild-1', 1, 2)).rejects.toThrow(
      'No active music session',
    );
    await expect(service.setRepeat('guild-1', 'track')).rejects.toThrow(
      'No active music session',
    );
  });
});
