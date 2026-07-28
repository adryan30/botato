import {
  GuildMember,
  type BaseInteraction,
  type VoiceBasedChannel,
} from 'discord.js';

export const SESSION_VOICE_CONTROL_DENIED =
  "Join the music session's voice channel to use these controls.";

export function resolveRequesterVoiceChannel(
  interaction: BaseInteraction,
): VoiceBasedChannel | null {
  if (!(interaction.member instanceof GuildMember)) {
    return null;
  }
  return interaction.member.voice.channel;
}

/** Surface transport: only members in the session voice channel may control playback. */
export function isMemberInSessionVoice(
  memberVoiceChannelId: string | null | undefined,
  sessionVoiceChannelId: string | null,
): boolean {
  return (
    sessionVoiceChannelId != null &&
    memberVoiceChannelId === sessionVoiceChannelId
  );
}
