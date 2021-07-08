import { CommandMessage, Command, Infos } from "@typeit/discord";
import { Collection, Message, MessageEmbed } from "discord.js";

const category = ":police_officer: Admin";
export abstract class AdminService {
  @Command("clear")
  @Infos({
    category,
    description: "Limpa as mesagens presentes no canal",
  })
  async clear(message: CommandMessage) {
    let messageQuantity = 0;
    let fetched: Collection<string, Message>;
    do {
      fetched = await message.channel.messages.fetch({ limit: 100 });
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
