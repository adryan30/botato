import {
  GuildMember,
  type BaseInteraction,
  type VoiceBasedChannel,
} from 'discord.js';

export function resolveRequesterVoiceChannel(
  interaction: BaseInteraction,
): VoiceBasedChannel | null {
  if (!(interaction.member instanceof GuildMember)) {
    return null;
  }
  return interaction.member.voice.channel;
}
