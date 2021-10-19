import { Discord, Guard, Slash, SlashOption } from "discordx";
import {
  CommandInteraction,
  GuildMember,
  MessageEmbed,
  Role,
  TextChannel,
} from "discord.js";
import { theme } from "../config";
import { AdminGuard } from "../guards";
import { PrismaClient } from "@prisma/client";
import { cleanChannel } from "../utils";
import { UserRepository } from "../repositories/user.repository";

@Discord()
export abstract class AdminService {
  private userRepository = UserRepository.getInstance();

  @Slash("clear", { description: "Limpa as mesagens presentes no canal" })
  @Guard(AdminGuard)
  async clear(interaction: CommandInteraction) {
    let messageQuantity: number;
    if (interaction.channel instanceof TextChannel) {
      messageQuantity = await cleanChannel(interaction.channel);
    }
    await interaction.reply({
      embeds: [
        new MessageEmbed()
          .setTitle("Limpeza concluída")
          .setDescription(`${messageQuantity} mensagens apagadas!`)
          .setColor(theme.default),
      ],
    });
    setTimeout(() => interaction.deleteReply(), 5000);
  }

  @Slash("makeadmin", { description: "Transforma usuários comuns em admins" })
  @Guard(AdminGuard)
  async makeAdmin(
    @SlashOption("usuário", {
      description: "Usuário a ser transformado",
      required: true,
      type: "USER",
    })
    user: GuildMember,
    interaction: CommandInteraction
  ) {
    const id = user.id;
    await this.userRepository.makeAdmin(id);
    await interaction.reply(
      `Usuário ${user.displayName} agora é um administrador!`
    );
  }

  @Slash("randomrole", {
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
    message.channel
      .send({
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
      })
      .finally(() => prisma.$disconnect());
  }
}
