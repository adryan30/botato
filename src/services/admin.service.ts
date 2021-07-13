import { CommandMessage, Command, Infos, Client } from "@typeit/discord";
import { Collection, Message, MessageEmbed } from "discord.js";
import { db, theme } from "../config";
import { AdminGuard } from "../guards";
import { format } from "date-fns";

const category = ":police_officer: Admin";
export abstract class AdminService {
  @Command("clear")
  @Guard(AdminGuard)
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
        .setDescription(`${messageQuantity} mensagens apagadas!`)
        .setColor(theme.default),
    });
    setTimeout(() => embedMessage.delete(), 5000);
  }

  @Command("rank")
  async podium(message: CommandMessage, client: Client) {
    const leaderboards = (
      await db.collection("users").orderBy("balance", "desc").get()
    ).docs.map((doc) => {
      const userData = client.users.cache.find((user) => user.id === doc.id);
      const docData = doc.data() as { isAdmin: boolean; balance: number };
      return {
        balance: docData.balance,
        isAdmin: docData.isAdmin,
        id: doc.id,
        username: userData.username,
      };
    });
    message.channel.send({
      embed: new MessageEmbed()
        .setTitle("Ranque")
        .setColor(theme.default)
        .setFooter(
          `Pódio atualizado ás ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`
        )
        .setDescription(
          `${leaderboards
            .map((position, index) => {
              return `${index + 1} - ${position.username} - ${
                position.balance
              }`;
            })
            .join("\n")}`
        ),
    });
  }
}
