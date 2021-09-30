import { CommandInteraction, GuildMember } from "discord.js";

export function getUser(
  interaction: CommandInteraction,
  userId: string
): GuildMember {
  return interaction.guild.members.cache.get(userId);
}
