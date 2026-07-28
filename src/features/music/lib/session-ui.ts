import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import type { Track } from './music-node-port.js';
import type {
  MusicSessionSnapshot,
  RepeatMode,
} from './music-session-service.js';

export const SESSION_CONTROL_CUSTOM_ID_PREFIX = 'music:session:';

export const SESSION_CONTROL_ACTIONS = [
  'pause',
  'resume',
  'skip',
  'repeat',
  'shuffle',
  'leave',
] as const;

export type SessionControlAction = (typeof SESSION_CONTROL_ACTIONS)[number];

const BOTATO_EMBED_COLOR = 0x011117;

const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = {
  off: 'track',
  track: 'queue',
  queue: 'off',
};

const REPEAT_LABEL: Record<RepeatMode, string> = {
  off: 'Repeat: Off',
  track: 'Repeat: Track',
  queue: 'Repeat: Queue',
};

const SOURCE_LABEL: Record<Track['source'], string> = {
  youtube: 'YouTube',
  other: 'Other',
};

const UP_NEXT_PREVIEW = 3;

export function nextRepeatMode(mode: RepeatMode): RepeatMode {
  return REPEAT_CYCLE[mode];
}

export function sessionControlCustomId(action: SessionControlAction): string {
  return `${SESSION_CONTROL_CUSTOM_ID_PREFIX}${action}`;
}

export function parseSessionControlCustomId(
  customId: string,
): SessionControlAction | null {
  if (!customId.startsWith(SESSION_CONTROL_CUSTOM_ID_PREFIX)) {
    return null;
  }
  const action = customId.slice(SESSION_CONTROL_CUSTOM_ID_PREFIX.length);
  return SESSION_CONTROL_ACTIONS.includes(action as SessionControlAction)
    ? (action as SessionControlAction)
    : null;
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}

function formatUpNext(queue: Track[]): string {
  const preview = queue.slice(0, UP_NEXT_PREVIEW);
  const lines = preview.map(
    (queued, index) => `${index + 1}. ${queued.title}`,
  );
  const remaining = queue.length - preview.length;
  if (remaining > 0) {
    lines.push(`…and ${remaining} more`);
  }
  return lines.join('\n');
}

export function buildSessionEmbed(
  snapshot: MusicSessionSnapshot,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setAuthor({ name: 'Botato' })
    .setColor(BOTATO_EMBED_COLOR);

  const nowPlaying = snapshot.nowPlaying;
  if (!nowPlaying) {
    embed
      .setTitle('Nothing playing')
      .setDescription('Queue a track with /play or /search');
    if (snapshot.queue.length > 0) {
      embed.addFields({
        name: 'Up next',
        value: formatUpNext(snapshot.queue),
        inline: false,
      });
    }
    return embed;
  }

  embed
    .setTitle(nowPlaying.title)
    .setDescription(
      `${snapshot.paused ? 'Paused' : 'Playing'} · ${REPEAT_LABEL[snapshot.repeat]}`,
    );

  if (nowPlaying.uri) {
    embed.setURL(nowPlaying.uri);
  }
  if (nowPlaying.artworkUrl) {
    embed.setThumbnail(nowPlaying.artworkUrl);
  }

  embed.addFields({
    name: 'Source',
    value: SOURCE_LABEL[nowPlaying.source],
    inline: true,
  });
  if (nowPlaying.durationMs != null && nowPlaying.durationMs > 0) {
    embed.addFields({
      name: 'Duration',
      value: formatDuration(nowPlaying.durationMs),
      inline: true,
    });
  }
  embed.addFields({
    name: 'Up next',
    value:
      snapshot.queue.length === 0
        ? '*(empty)*'
        : formatUpNext(snapshot.queue),
    inline: false,
  });

  return embed;
}

export function buildSessionControlRows(
  snapshot: MusicSessionSnapshot,
): ActionRowBuilder<ButtonBuilder>[] {
  const canControlPlayback = snapshot.nowPlaying !== null;

  const pauseOrResume = snapshot.paused
    ? new ButtonBuilder()
        .setCustomId(sessionControlCustomId('resume'))
        .setLabel('Resume')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!canControlPlayback)
    : new ButtonBuilder()
        .setCustomId(sessionControlCustomId('pause'))
        .setLabel('Pause')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canControlPlayback);

  const skip = new ButtonBuilder()
    .setCustomId(sessionControlCustomId('skip'))
    .setLabel('Skip')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!canControlPlayback);

  const repeat = new ButtonBuilder()
    .setCustomId(sessionControlCustomId('repeat'))
    .setLabel(REPEAT_LABEL[snapshot.repeat])
    .setStyle(ButtonStyle.Secondary);

  const shuffle = new ButtonBuilder()
    .setCustomId(sessionControlCustomId('shuffle'))
    .setLabel('Shuffle')
    .setStyle(ButtonStyle.Secondary);

  const leave = new ButtonBuilder()
    .setCustomId(sessionControlCustomId('leave'))
    .setLabel('Leave')
    .setStyle(ButtonStyle.Danger);

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      pauseOrResume,
      skip,
      repeat,
      shuffle,
      leave,
    ),
  ];
}

export function sessionReplyPayload(snapshot: MusicSessionSnapshot) {
  return {
    embeds: [buildSessionEmbed(snapshot)],
    components: buildSessionControlRows(snapshot),
  };
}
