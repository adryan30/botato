import { describe, expect, it } from 'vitest';
import type { Track } from '../music-node/music-node-port.js';
import type { MusicSessionSnapshot } from '../session/music-session-service.js';
import {
  buildSessionControlRows,
  buildSessionEmbed,
  formatFullQueueList,
  nextRepeatMode,
  parseSessionControlCustomId,
  resummonEphemeralContent,
  sessionControlCustomId,
  sessionReplyPayload,
} from './session-ui.js';

function track(
  id: string,
  title = id,
  extras: Partial<Pick<Track, 'artworkUrl' | 'durationMs' | 'source'>> = {},
): Track {
  return {
    id,
    title,
    uri: `https://youtube.com/watch?v=${id}`,
    source: extras.source ?? 'youtube',
    ...extras,
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

function embedData(snapshotValue: MusicSessionSnapshot) {
  return buildSessionEmbed(snapshotValue).toJSON() as Record<string, unknown>;
}

function buttonData(snapshotValue: MusicSessionSnapshot) {
  const row = buildSessionControlRows(snapshotValue)[0]!;
  return row.components.map(
    (button) => button.toJSON() as unknown as Record<string, unknown>,
  );
}

describe('session-ui', () => {
  it('cycles repeat mode off → track → queue → off', () => {
    expect(nextRepeatMode('off')).toBe('track');
    expect(nextRepeatMode('track')).toBe('queue');
    expect(nextRepeatMode('queue')).toBe('off');
  });

  it('builds and parses session control custom ids including shuffle and leave', () => {
    expect(sessionControlCustomId('pause')).toBe('music:session:pause');
    expect(sessionControlCustomId('resume')).toBe('music:session:resume');
    expect(sessionControlCustomId('skip')).toBe('music:session:skip');
    expect(sessionControlCustomId('repeat')).toBe('music:session:repeat');
    expect(sessionControlCustomId('shuffle')).toBe('music:session:shuffle');
    expect(sessionControlCustomId('leave')).toBe('music:session:leave');

    expect(parseSessionControlCustomId('music:session:pause')).toBe('pause');
    expect(parseSessionControlCustomId('music:session:shuffle')).toBe(
      'shuffle',
    );
    expect(parseSessionControlCustomId('music:session:leave')).toBe('leave');
    expect(parseSessionControlCustomId('music:search:abc')).toBeNull();
    expect(parseSessionControlCustomId('music:session:unknown')).toBeNull();
  });

  it('builds a playing embed with linked title, status, fields, and thumbnail', () => {
    const data = embedData(
      snapshot({
        nowPlaying: track('np', 'Never Gonna Give You Up', {
          artworkUrl: 'https://i.ytimg.com/vi/np/hqdefault.jpg',
          durationMs: 212_000,
        }),
        queue: [track('a', 'Alpha'), track('b', 'Beta'), track('c', 'Gamma')],
        repeat: 'off',
      }),
    );

    expect(data.author).toEqual({ name: 'Botato' });
    expect(data.color).toBe(0x011117);
    expect(data.title).toBe('Never Gonna Give You Up');
    expect(data.url).toBe('https://youtube.com/watch?v=np');
    expect(data.description).toBe('Playing · Repeat: Off');
    expect(data.thumbnail).toEqual({
      url: 'https://i.ytimg.com/vi/np/hqdefault.jpg',
    });
    expect(data.fields).toEqual([
      { name: 'Source', value: 'YouTube', inline: true },
      { name: 'Duration', value: '3:32', inline: true },
      {
        name: 'Up next',
        value: '1. Alpha\n2. Beta\n3. Gamma',
        inline: false,
      },
    ]);
  });

  it('builds a paused embed with empty up next and omits missing metadata', () => {
    const data = embedData(
      snapshot({
        nowPlaying: track('np', 'Blue Monday'),
        paused: true,
        repeat: 'track',
      }),
    );

    expect(data.title).toBe('Blue Monday');
    expect(data.description).toBe('Paused · Repeat: Track');
    expect(data.thumbnail).toBeUndefined();
    expect(data.fields).toEqual([
      { name: 'Source', value: 'YouTube', inline: true },
      { name: 'Up next', value: '*(empty)*', inline: false },
    ]);
  });

  it('builds an idle embed without clutter fields', () => {
    const data = embedData(snapshot({ repeat: 'queue' }));

    expect(data.author).toEqual({ name: 'Botato' });
    expect(data.color).toBe(0x011117);
    expect(data.title).toBe('Nothing playing');
    expect(data.url).toBeUndefined();
    expect(data.description).toBe('Queue a track with /play or /search');
    expect(data.thumbnail).toBeUndefined();
    expect(data.fields).toBeUndefined();
  });

  it('truncates up next to three tracks plus an and-N-more cue', () => {
    const data = embedData(
      snapshot({
        nowPlaying: track('np', 'Now'),
        queue: [
          track('1', 'One'),
          track('2', 'Two'),
          track('3', 'Three'),
          track('4', 'Four'),
          track('5', 'Five'),
        ],
      }),
    );

    expect(data.fields).toEqual(
      expect.arrayContaining([
        {
          name: 'Up next',
          value: '1. One\n2. Two\n3. Three\n…and 2 more',
          inline: false,
        },
      ]),
    );
  });

  it('shows up next while idle when tracks are already queued', () => {
    const data = embedData(
      snapshot({
        queue: [track('a', 'Alpha')],
      }),
    );

    expect(data.title).toBe('Nothing playing');
    expect(data.fields).toEqual([
      { name: 'Up next', value: '1. Alpha', inline: false },
    ]);
  });

  it('builds the full transport row while playing', () => {
    const buttons = buttonData(
      snapshot({ nowPlaying: track('np'), repeat: 'off' }),
    );

    expect(buttons.map((button) => button.custom_id)).toEqual([
      'music:session:pause',
      'music:session:skip',
      'music:session:repeat',
      'music:session:shuffle',
      'music:session:leave',
    ]);
    expect(buttons.map((button) => button.label)).toEqual([
      'Pause',
      'Skip',
      'Repeat: Off',
      'Shuffle',
      'Leave',
    ]);
    expect(buttons.map((button) => button.disabled ?? false)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('builds resume instead of pause when the session is paused', () => {
    const buttons = buttonData(
      snapshot({ nowPlaying: track('np'), paused: true, repeat: 'track' }),
    );

    expect(buttons.map((button) => button.custom_id)).toEqual([
      'music:session:resume',
      'music:session:skip',
      'music:session:repeat',
      'music:session:shuffle',
      'music:session:leave',
    ]);
    expect(buttons.map((button) => button.label)).toEqual([
      'Resume',
      'Skip',
      'Repeat: Track',
      'Shuffle',
      'Leave',
    ]);
  });

  it('disables pause and skip when idle but keeps repeat, shuffle, and leave', () => {
    const buttons = buttonData(snapshot({ repeat: 'queue' }));

    expect(buttons.map((button) => button.custom_id)).toEqual([
      'music:session:pause',
      'music:session:skip',
      'music:session:repeat',
      'music:session:shuffle',
      'music:session:leave',
    ]);
    expect(buttons.map((button) => button.disabled ?? false)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(buttons.map((button) => button.label)).toEqual([
      'Pause',
      'Skip',
      'Repeat: Queue',
      'Shuffle',
      'Leave',
    ]);
  });

  it('returns embed and components only with no content body', () => {
    const payload = sessionReplyPayload(
      snapshot({
        nowPlaying: track('np', 'Solo', { durationMs: 90_000 }),
      }),
    );

    expect(payload).not.toHaveProperty('content');
    expect(payload.embeds).toHaveLength(1);
    expect(payload.components).toHaveLength(1);
  });

  it('formats a full queue list with now playing and numbered tracks', () => {
    expect(
      formatFullQueueList(
        snapshot({
          nowPlaying: track('np', 'Now Playing'),
          queue: [track('a', 'Alpha'), track('b', 'Beta'), track('c', 'Gamma')],
        }),
      ),
    ).toBe(
      [
        '**Now playing:** Now Playing',
        '**Queue:**',
        '1. Alpha',
        '2. Beta',
        '3. Gamma',
      ].join('\n'),
    );
  });

  it('formats a full queue list when idle with an empty queue', () => {
    expect(formatFullQueueList(snapshot())).toBe(
      ['**Now playing:** Nothing playing', '**Queue:** *(empty)*'].join('\n'),
    );
  });

  it('formats a full queue list when playing with an empty queue', () => {
    expect(
      formatFullQueueList(snapshot({ nowPlaying: track('np', 'Solo') })),
    ).toBe(['**Now playing:** Solo', '**Queue:** *(empty)*'].join('\n'));
  });

  it('formats resummon ephemeral copy for same and cross-channel invokes', () => {
    expect(resummonEphemeralContent('text-1', 'text-1')).toBe(
      'Re-summoned the control surface.',
    );
    expect(resummonEphemeralContent('text-1', 'text-other')).toBe(
      'Control surface is in <#text-1>.',
    );
  });
});
