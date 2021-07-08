import { CommandMessage, Command, Description } from "@typeit/discord";
import {
  Collection,
  Message,
  MessageEmbed,
  MessageResolvable,
} from "discord.js";

export abstract class AdminService {
  @Command("clear")
  @Description("Limpa as mesagens presentes no canal")
  async clear(message: CommandMessage) {
    let messageQuantity = 0;
    let fetched: Collection<string, Message>;
    do {
      fetched = await message.channel.messages.fetch();
      fetched = fetched.filter((message) => !message.pinned);
      messageQuantity += fetched.size;
      await message.channel.messages.channel.bulkDelete(fetched);
    } while (fetched.size > 2);
    const embedMessage = await message.channel.send({
      embed: new MessageEmbed()
        .setTitle("Limpeza concluída")
        .setDescription(`${messageQuantity} mensagens apagadas!`),
    });
    setTimeout(() => embedMessage.delete(), 5000);
  }
}
