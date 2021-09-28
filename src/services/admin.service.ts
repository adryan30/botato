import { Slash, Guard, SlashOption, Discord } from "discordx";
import {
  Collection,
  Message,
  MessageEmbed,
  CommandInteraction,
  User,
  Role,
} from "discord.js";
import { differenceInCalendarDays } from "date-fns";
import { theme } from "../config";
import { AdminGuard } from "../guards";
import { PrismaClient } from "@prisma/client";

const category = ":police_officer: Admin";
@Discord()
export abstract class AdminService {
  @Slash("clear", { description: "Limpa as mesagens presentes no canal" })
  @Guard(AdminGuard)
  async clear(interaction: CommandInteraction) {
    let messageQuantity = 0;
    let fetched: Collection<string, Message>;
    do {
      fetched = await interaction.channel.messages.fetch({ limit: 100 });
      fetched = fetched.filter(
        (message) =>
          !message.pinned &&
          differenceInCalendarDays(message.createdAt, new Date()) < 13
      );
      messageQuantity += fetched.size;
      if (interaction.channel.type === "GUILD_TEXT") {
        await interaction.channel.bulkDelete(fetched);
      }
    } while (fetched.size > 2);
    const embedMessage = await interaction.channel.send({
      embeds: [
        new MessageEmbed()
          .setTitle("Limpeza concluída")
          .setDescription(`${messageQuantity} mensagens apagadas!`)
          .setColor(theme.default),
      ],
    });
    setTimeout(() => embedMessage.delete(), 5000);
  }

  @Slash("makeAdmin", { description: "Transforma usuários comuns em admins" })
  @Guard(AdminGuard)
  async makeAdmin(
    @SlashOption("usuário", {
      description: "Usuário a ser transformado",
      required: true,
      type: "USER",
    })
    user: User,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const id = user.id;
    await prisma.user.update({ where: { id }, data: { isAdmin: true } });
    await prisma.$disconnect();
    interaction.reply(`Usuário ${user.username} agora é um administrador!`);
  }

  @Slash("randomRole", {
    description: "Seleciona um usuário aleatório do role mencionado",
  })
  async randomRole(
    @SlashOption("role", {
      description: "Role a ser buscado",
      required: true,
      type: "ROLE",
    })
    role: Role,
    interaction: CommandInteraction
  ) {
    const users = interaction.guild.members.cache;
    const validUsers = users
      .filter((u) => !u.user.bot)
      .filter((u) => {
        const roles = u.roles.cache.map((r) => r.id);
        return roles.includes(role.id);
      })
      .map((u) => u.user.id);

    const randomUser =
      validUsers[Math.floor(Math.random() * validUsers.length)];
    const randomUserData = users.get(randomUser);
    if (randomUserData) {
      interaction.channel.send({
        embeds: [
          new MessageEmbed()
            .setTitle("Usuário escolhido:")
            .setColor(theme.default)
            .setImage(
              randomUserData.user.avatarURL() ||
                "https://i.imgur.com/ZyTkCb1.png"
            )
            .setFooter(randomUserData.user.username),
        ],
      });
    } else {
      interaction.channel.send({
        embeds: [
          new MessageEmbed()
            .setTitle("Argumentos inválidos...")
            .setDescription("Nenhum usuário válido nos cargos mencionados.")
            .setColor(theme.error),
        ],
      });
    }
  }

  @Slash("random", {
    description: "Seleciona um usuário aleatório com carteira",
  })
  async random(message: CommandInteraction) {
    const prisma = new PrismaClient();
    const users = await (
      await prisma.user.findMany({ select: { id: true } })
    ).map((u) => u.id);
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomUserData = (await message.guild.members.fetch()).get(
      randomUser
    );
    message.channel.send({
      embeds: [
        new MessageEmbed()
          .setTitle("Usuário escolhido:")
          .setColor(theme.default)
          .setImage(
            randomUserData.user.avatarURL() || "https://i.imgur.com/ZyTkCb1.png"
          )
          .setFooter(randomUserData.user.username),
      ],
    });
  }
}
