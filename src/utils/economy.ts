import { CommandInteraction } from "discord.js";

export function findDrolhosEmoji(interaction: CommandInteraction) {
  return interaction.client.emojis.cache.find((e) => e.name == "drolhoscoin");
}
