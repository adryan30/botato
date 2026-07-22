import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
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
] as const;

export type SessionControlAction = (typeof SESSION_CONTROL_ACTIONS)[number];

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

export function nextRepeatMode(mode: RepeatMode): RepeatMode {
  return REPEAT_CYCLE[mode];
}

export function formatSessionMessage(snapshot: MusicSessionSnapshot): string {
  const lines: string[] = [];

  if (!snapshot.nowPlaying) {
    lines.push('Nothing is playing right now.');
  } else {
    const paused = snapshot.paused ? ' *(paused)*' : '';
    lines.push(`Now playing: **${snapshot.nowPlaying.title}**${paused}`);
    if (snapshot.nowPlaying.uri) {
      lines.push(snapshot.nowPlaying.uri);
    }
    lines.push('');
    if (snapshot.queue.length === 0) {
      lines.push('Up next: *(empty)*');
    } else {
      lines.push('Up next:');
      for (const [index, track] of snapshot.queue.entries()) {
        lines.push(`${index + 1}. ${track.title}`);
      }
    }
    lines.push('');
  }

  lines.push(`Repeat: ${snapshot.repeat}`);
  return lines.join('\n');
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

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      pauseOrResume,
      skip,
      repeat,
    ),
  ];
}

export function sessionReplyPayload(snapshot: MusicSessionSnapshot) {
  return {
    content: formatSessionMessage(snapshot),
    components: buildSessionControlRows(snapshot),
  };
}
