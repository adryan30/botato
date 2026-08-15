import { describe, expect, it } from 'vitest';
import type { Track } from '../music-node/music-node-port.js';
import {
  asSessionTrack,
  type MusicSessionSnapshot,
  type SessionTrack,
} from '../session/music-session-service.js';
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

function sessionTrack(
  id: string,
  title = id,
  extras: Partial<Pick<Track, 'artworkUrl' | 'durationMs' | 'source'>> & {
    provenance?: SessionTrack['provenance'];
  } = {},
): SessionTrack {
  const { provenance = 'user', ...trackExtras } = extras;
  return asSessionTrack(track(id, title, trackExtras), provenance);
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
    dj: { enabled: false },
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
        nowPlaying: sessionTrack('np', 'Never Gonna Give You Up', {
          artworkUrl: 'https://i.ytimg.com/vi/np/hqdefault.jpg',
          durationMs: 212_000,
        }),
        queue: [
          sessionTrack('a', 'Alpha'),
          sessionTrack('b', 'Beta'),
          sessionTrack('c', 'Gamma'),
        ],
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
        nowPlaying: sessionTrack('np', 'Blue Monday'),
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
        nowPlaying: sessionTrack('np', 'Now'),
        queue: [
          sessionTrack('1', 'One'),
          sessionTrack('2', 'Two'),
          sessionTrack('3', 'Three'),
          sessionTrack('4', 'Four'),
          sessionTrack('5', 'Five'),
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
        queue: [sessionTrack('a', 'Alpha')],
      }),
    );

    expect(data.title).toBe('Nothing playing');
    expect(data.fields).toEqual([
      { name: 'Up next', value: '1. Alpha', inline: false },
    ]);
  });

  it('builds the full transport row while playing', () => {
    const buttons = buttonData(
      snapshot({ nowPlaying: sessionTrack('np'), repeat: 'off' }),
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
      snapshot({
        nowPlaying: sessionTrack('np'),
        paused: true,
        repeat: 'track',
      }),
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
        nowPlaying: sessionTrack('np', 'Solo', { durationMs: 90_000 }),
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
          nowPlaying: sessionTrack('np', 'Now Playing'),
          queue: [
            sessionTrack('a', 'Alpha'),
            sessionTrack('b', 'Beta'),
            sessionTrack('c', 'Gamma'),
          ],
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
      formatFullQueueList(
        snapshot({ nowPlaying: sessionTrack('np', 'Solo') }),
      ),
    ).toBe(['**Now playing:** Solo', '**Queue:** *(empty)*'].join('\n'));
  });

  it('shows an inline DJ field with truncated vibe when DJ mode is on', () => {
    const longVibe =
      'late night jazz with soft piano and rainy city ambience for focus';
    const data = embedData(
      snapshot({
        nowPlaying: sessionTrack('np', 'Blue in Green'),
        dj: { enabled: true, vibe: longVibe, retrying: false },
      }),
    );

    expect(data.fields).toEqual(
      expect.arrayContaining([
        {
          name: 'DJ',
          value: 'late night jazz with soft piano and rainy city ambience for…',
          inline: true,
        },
      ]),
    );
  });

  it('appends retrying to the DJ field when refill is retrying', () => {
    const data = embedData(
      snapshot({
        nowPlaying: sessionTrack('np', 'Solo'),
        dj: { enabled: true, vibe: 'lofi beats', retrying: true },
      }),
    );

    expect(data.fields).toEqual(
      expect.arrayContaining([
        { name: 'DJ', value: 'lofi beats · retrying…', inline: true },
      ]),
    );
  });

  it('omits the DJ field when DJ mode is off', () => {
    const data = embedData(
      snapshot({
        nowPlaying: sessionTrack('np', 'Solo'),
        dj: { enabled: false },
      }),
    );

    expect(data.fields).toEqual([
      { name: 'Source', value: 'YouTube', inline: true },
      { name: 'Up next', value: '*(empty)*', inline: false },
    ]);
  });

  it('shows the DJ field while idle when DJ mode is on', () => {
    const data = embedData(
      snapshot({
        dj: { enabled: true, vibe: 'synthwave', retrying: false },
      }),
    );

    expect(data.title).toBe('Nothing playing');
    expect(data.fields).toEqual([
      { name: 'DJ', value: 'synthwave', inline: true },
    ]);
  });

  it('prefixes DJ-added tracks in Up next', () => {
    const data = embedData(
      snapshot({
        nowPlaying: sessionTrack('np', 'Now'),
        queue: [
          sessionTrack('a', 'Alpha', { provenance: 'dj' }),
          sessionTrack('b', 'Beta'),
          sessionTrack('c', 'Gamma', { provenance: 'dj' }),
        ],
      }),
    );

    expect(data.fields).toEqual(
      expect.arrayContaining([
        {
          name: 'Up next',
          value: '1. DJ · Alpha\n2. Beta\n3. DJ · Gamma',
          inline: false,
        },
      ]),
    );
  });

  it('prefixes DJ-added tracks in the full queue list', () => {
    expect(
      formatFullQueueList(
        snapshot({
          nowPlaying: sessionTrack('np', 'Now Playing', { provenance: 'dj' }),
          queue: [
            sessionTrack('a', 'Alpha'),
            sessionTrack('b', 'Beta', { provenance: 'dj' }),
          ],
        }),
      ),
    ).toBe(
      [
        '**Now playing:** DJ · Now Playing',
        '**Queue:**',
        '1. Alpha',
        '2. DJ · Beta',
      ].join('\n'),
    );
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
