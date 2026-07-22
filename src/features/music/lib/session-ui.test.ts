import { describe, expect, it } from 'vitest';
import type { Track } from './music-node-port.js';
import type { MusicSessionSnapshot } from './music-session-service.js';
import {
  buildSessionControlRows,
  formatSessionMessage,
  nextRepeatMode,
  parseSessionControlCustomId,
  sessionControlCustomId,
} from './session-ui.js';

function track(id: string, title = id): Track {
  return {
    id,
    title,
    uri: `https://youtube.com/watch?v=${id}`,
    source: 'youtube',
  };
}

function snapshot(
  overrides: Partial<MusicSessionSnapshot> = {},
): MusicSessionSnapshot {
  return {
    guildId: 'guild-1',
    voiceChannelId: 'voice-1',
    nowPlaying: null,
    queue: [],
    volume: 100,
    repeat: 'off',
    paused: false,
    ...overrides,
  };
}

describe('session-ui', () => {
  it('cycles repeat mode off → track → queue → off', () => {
    expect(nextRepeatMode('off')).toBe('track');
    expect(nextRepeatMode('track')).toBe('queue');
    expect(nextRepeatMode('queue')).toBe('off');
  });

  it('formats an empty session with nothing playing', () => {
    expect(formatSessionMessage(snapshot())).toBe(
      'Nothing is playing right now.\nRepeat: off',
    );
  });

  it('formats now playing and upcoming queue with 1-based indexes', () => {
    const now = track('np', 'Now');
    const a = track('a', 'Alpha');
    const b = track('b', 'Beta');

    expect(
      formatSessionMessage(
        snapshot({ nowPlaying: now, queue: [a, b], repeat: 'track' }),
      ),
    ).toBe(
      [
        'Now playing: **Now**',
        'https://youtube.com/watch?v=np',
        '',
        'Up next:',
        '1. Alpha',
        '2. Beta',
        '',
        'Repeat: track',
      ].join('\n'),
    );
  });

  it('formats a playing session with an empty queue', () => {
    expect(
      formatSessionMessage(
        snapshot({
          nowPlaying: track('np', 'Solo'),
          repeat: 'queue',
          paused: true,
        }),
      ),
    ).toBe(
      [
        'Now playing: **Solo** *(paused)*',
        'https://youtube.com/watch?v=np',
        '',
        'Up next: *(empty)*',
        '',
        'Repeat: queue',
      ].join('\n'),
    );
  });

  it('builds and parses session control custom ids', () => {
    expect(sessionControlCustomId('pause')).toBe('music:session:pause');
    expect(sessionControlCustomId('resume')).toBe('music:session:resume');
    expect(sessionControlCustomId('skip')).toBe('music:session:skip');
    expect(sessionControlCustomId('repeat')).toBe('music:session:repeat');

    expect(parseSessionControlCustomId('music:session:pause')).toBe('pause');
    expect(parseSessionControlCustomId('music:session:resume')).toBe('resume');
    expect(parseSessionControlCustomId('music:session:skip')).toBe('skip');
    expect(parseSessionControlCustomId('music:session:repeat')).toBe('repeat');
    expect(parseSessionControlCustomId('music:search:abc')).toBeNull();
    expect(parseSessionControlCustomId('music:session:unknown')).toBeNull();
  });

  it('builds pause/skip/repeat controls while playing', () => {
    const row = buildSessionControlRows(
      snapshot({ nowPlaying: track('np'), repeat: 'off' }),
    )[0]!;
    const buttons = row.components.map(
      (button) => button.toJSON() as unknown as Record<string, unknown>,
    );

    expect(buttons.map((button) => button.custom_id)).toEqual([
      'music:session:pause',
      'music:session:skip',
      'music:session:repeat',
    ]);
    expect(buttons.map((button) => button.label)).toEqual([
      'Pause',
      'Skip',
      'Repeat: Off',
    ]);
  });

  it('builds resume instead of pause when the session is paused', () => {
    const row = buildSessionControlRows(
      snapshot({ nowPlaying: track('np'), paused: true, repeat: 'track' }),
    )[0]!;
    const buttons = row.components.map(
      (button) => button.toJSON() as unknown as Record<string, unknown>,
    );

    expect(buttons.map((button) => button.custom_id)).toEqual([
      'music:session:resume',
      'music:session:skip',
      'music:session:repeat',
    ]);
    expect(buttons.map((button) => button.label)).toEqual([
      'Resume',
      'Skip',
      'Repeat: Track',
    ]);
  });

  it('disables pause and skip when nothing is playing', () => {
    const row = buildSessionControlRows(snapshot({ repeat: 'queue' }))[0]!;
    const buttons = row.components.map(
      (button) => button.toJSON() as unknown as Record<string, unknown>,
    );

    expect(buttons.map((button) => button.custom_id)).toEqual([
      'music:session:pause',
      'music:session:skip',
      'music:session:repeat',
    ]);
    expect(buttons.map((button) => button.disabled ?? false)).toEqual([
      true,
      true,
      false,
    ]);
    expect(buttons.map((button) => button.label)).toEqual([
      'Pause',
      'Skip',
      'Repeat: Queue',
    ]);
  });
});
