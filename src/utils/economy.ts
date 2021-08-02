import { Message } from "discord.js";

export function findDrolhosEmoji(message: Message) {
  return message.client.emojis.cache
    .array()
    .find((e) => e.name == "drolhoscoin");
}
