import { CommandMessage, Command, Infos, Client, Guard } from "@typeit/discord";
import { Collection, Message, MessageEmbed } from "discord.js";
import { theme } from "../config";
import { AdminGuard } from "../guards";

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

  @Command("random")
  @Infos({
    category,
    description: "Seleciona um usuário aleatório dos roles mencionados",
  })
  async random(message: CommandMessage) {
    const {
      mentions: { roles },
    } = message;
    const mentionedRoles = roles.map((r) => r.id);
    const users = await message.guild.members.fetch();
    const mentioned = users
      .array()
      .filter((u) => !u.user.bot)
      .filter((u) => {
        const roles = u.roles.cache.array().map((r) => r.id);
        return roles.some((r) => mentionedRoles.includes(r));
      })
      .map((u) => u.user.id);
    const randomUser = mentioned[Math.floor(Math.random() * mentioned.length)];
    const randomUserData = users.get(randomUser);
    if (randomUserData) {
      message.channel.send({
        embed: new MessageEmbed()
          .setTitle("Usuário escolhido:")
          .setColor(theme.default)
          .setImage(
            randomUserData.user.avatarURL() || "https://i.imgur.com/ZyTkCb1.png"
          )
          .setFooter(randomUserData.user.username),
      });
    } else {
      message.channel.send({
        embed: new MessageEmbed()
          .setTitle("Argumentos inválidos...")
          .setDescription("Nenhum usuário válido nos cargos mencionados.")
          .setColor(theme.error),
      });
    }
  }
}
