import { Channel, Collection, Message, TextChannel } from "discord.js";

export async function cleanChannel(channel: Channel & TextChannel) {
  let messageQuantity = 0;
  let fetched: Collection<string, Message>;
  do {
    fetched = await channel.messages.fetch({ limit: 100 });
    fetched = fetched.filter((message) => !message.pinned);
    messageQuantity += fetched.size;
    await channel.bulkDelete(fetched);
  } while (fetched.size > 2);
}
