import { Collection, Message, TextChannel } from "discord.js";
import { intervalToDuration } from "date-fns";

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
  if (miliseconds > 10800000) {
    return "Livestream";
  }
  const { hours, minutes, seconds } = intervalToDuration({
    start: 0,
    end: miliseconds,
  });
  const hoursFmt = `${hours < 10 && "0"}${hours}`;
  const minutesFmt = `${minutes < 10 && "0"}${minutes}`;
  const secondsFmt = `${seconds < 10 && "0"}${seconds}`;
  return `${hours ? `${hoursFmt}:` : ""}${minutesFmt}:${secondsFmt}`;
}
