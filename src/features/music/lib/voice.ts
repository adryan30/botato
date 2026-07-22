import {
  ChatInputCommandInteraction,
  GuildMember,
  type VoiceBasedChannel,
} from 'discord.js';

export function resolveRequesterVoiceChannel(
  interaction: ChatInputCommandInteraction,
): VoiceBasedChannel | null {
  if (!(interaction.member instanceof GuildMember)) {
    return null;
  }
  return interaction.member.voice.channel;
}
