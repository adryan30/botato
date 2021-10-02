import { Collection, Message, TextChannel } from "discord.js";
import { addMilliseconds, format } from "date-fns";

export async function cleanChannel(channel: TextChannel) {
  let messageQuantity = 0;
  let fetched: Collection<string, Message>;
  do {
    fetched = await channel.messages.fetch({ limit: 100 });
    fetched = fetched.filter((message) => !message.pinned);
    messageQuantity += fetched.size;
    await channel.bulkDelete(fetched);
  } while (fetched.size > 2);
  return messageQuantity;
}

export function msToHMS(miliseconds: number) {
  const hour = 60 * 60 * 1000;
  if (miliseconds > hour) {
    return "> 1h";
  }
  const duration = addMilliseconds(0, miliseconds);
  return format(duration, "mm:ss");
}
