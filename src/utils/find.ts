import { Client, CommandInteraction, TextChannel } from "discord.js";
import { bot } from "../index";

const guildId = process.env.GUILD_ID;

export async function findRole(roleName: string, client: Client) {
  const guildRoles = client.guilds.cache.get(guildId).roles.cache;
  return guildRoles.find((c) => c.name === roleName);
}

export async function findChannel(channelName: string, client: Client) {
  return client.channels.cache.find((c) => {
    if (c instanceof TextChannel) return c.name === channelName;
    return false;
  });
}

export function findDrolhosEmoji() {
  return bot.client.emojis.cache.find((e) => e.name === "drolhoscoin");
}

export function findUser(interaction: CommandInteraction, userId: string) {
  return interaction.guild.members.cache.get(userId);
}
