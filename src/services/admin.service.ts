import { CommandMessage, Command, Description } from "@typeit/discord";
import { Collection, Message, MessageResolvable } from "discord.js";

export abstract class AdminService {
  @Command("clear")
  @Description("Limpa as mesagens presentes no canal")
  async clear(message: CommandMessage) {
    let fetched: Collection<string, Message>;
    do {
      fetched = await message.channel.messages.fetch();
      message.channel.messages.channel.bulkDelete(fetched);
    } while (fetched.size > 2);
  }
}
