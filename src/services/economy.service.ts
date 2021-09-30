import {
  Slash,
  Guard,
  Client,
  SlashOption,
  Discord,
  ContextMenu,
} from "discordx";
import {
  MessageEmbed,
  User,
  CommandInteraction,
  ContextMenuInteraction,
} from "discord.js";
import { theme } from "../config";
import { AdminGuard, AuthorHasNoWalletEmbed, EconomyGuard } from "../guards";
import { PrismaClient } from "@prisma/client";
import { findDrolhosEmoji, getUser, userExists } from "../utils";

const category = ":bank: Economia";
@Discord()
export abstract class EconomyService {
  @Slash("register", {
    description: "Registra o usuário no sistema de economia",
  })
  async register(interaction: CommandInteraction, client: Client) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const id = interaction.user.id;
    const userExists = await prisma.user.count({ where: { id } });
    if (userExists) {
      return interaction.reply({
        embeds: [
          new MessageEmbed()
            .setTitle("Carteira já cadastrada!")
            .setDescription(
              `Você já possui uma carteira cadastrada! Use '=balance' para vê-la.`
            )
            .setColor(theme.error),
        ],
      });
    }
    await prisma.user.create({ data: { id } });
    return interaction
      .reply({
        embeds: [
          new MessageEmbed()
            .setTitle("Carteira cadastrada com sucesso!")
            .setDescription(
              `Você cadastrou sua carteira, a partir de agora use '=balance' para checar o seu saldo de ${drolhosEmoji}.`
            )
            .setColor(theme.success),
        ],
      })
      .finally(() => prisma.$disconnect());
  }

  @Slash("balance", {
    description: "Mostra seu saldo no servidor",
  })
  @Guard(EconomyGuard)
  async balance(
    @SlashOption("user", {
      description: "Usuário a ser buscado",
      required: false,
      type: "USER",
    })
    user: User,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const userToSearch: User = user ?? interaction.user;
    const searchUser = getUser(interaction, userToSearch.id);
    const userData = await prisma.user.findUnique({
      where: { id: userToSearch.id },
    });

    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: `Carteira de ${searchUser.displayName}`,
            color: theme.default,
            fields: [
              {
                name: `Saldo`,
                value: `Seu saldo: ${userData.balance} ${drolhosEmoji}`,
              },
              {
                name: `Bilhetes`,
                value: `Seus bilhetes: ${userData.tickets} 🎟️`,
              },
            ],
          }),
        ],
      })
      .finally(() => prisma.$disconnect());
  }

  @ContextMenu("USER", "Saldo")
  async balanceMenu(interaction: ContextMenuInteraction) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);

    const searchUser = interaction.guild.members.cache.get(
      interaction.targetId
    );
    const userData = await prisma.user.findUnique({
      where: { id: searchUser.id },
    });
    if (!userData) {
      return interaction.reply({
        embeds: [
          AuthorHasNoWalletEmbed.setDescription(
            "O usuário clicado não tem uma carteira... Tente usar /register."
          ),
        ],
      });
    }

    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: `Carteira de ${searchUser.displayName}`,
            color: theme.default,
            fields: [
              {
                name: `Saldo`,
                value: `Seu saldo: ${userData.balance} ${drolhosEmoji}`,
              },
              {
                name: `Bilhetes`,
                value: `Seus bilhetes: ${userData.tickets} 🎟️`,
              },
            ],
          }),
        ],
      })
      .finally(() => prisma.$disconnect());
  }

  @Slash("award", {
    description: "Recompensa o usuário mencionado com drolhoscoins",
  })
  @Guard(AdminGuard, EconomyGuard)
  async award(
    @SlashOption("user", {
      description: "Usuário a ser recompensado",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashOption("value", {
      description: "Valor da recompensa",
      required: true,
      type: "INTEGER",
    })
    awardValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const { id } = user;
    const { displayName } = getUser(interaction, id);

    await prisma.user.update({
      data: { balance: { increment: awardValue } },
      where: { id },
    });
    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: "🎉 Parabéns!",
            description: `${displayName} ganhou ${awardValue} ${drolhosEmoji}!`,
            color: theme.success,
          }),
        ],
      })
      .finally(() => {
        prisma.$disconnect();
      });
  }

  @Slash("awardt", {
    description: "Recompensa o usuário mencionado com bilhetes",
  })
  @Guard(AdminGuard, EconomyGuard)
  async awardt(
    @SlashOption("user", {
      description: "Usuário a ser recompensado",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashOption("value", {
      description: "Valor da recompensa",
      required: true,
      type: "INTEGER",
    })
    awardValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const { id } = user;
    const { displayName } = getUser(interaction, id);

    await prisma.user.update({
      data: { tickets: { increment: awardValue } },
      where: { id },
    });

    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: "🎉 Parabéns!",
            description: `${displayName} ganhou ${awardValue} 🎟️!`,
            color: theme.success,
          }),
        ],
      })
      .finally(() => {
        prisma.$disconnect();
      });
  }

  @Slash("remove", {
    description: "Retira drolhoscoins do usuário mencionado",
  })
  @Guard(AdminGuard, EconomyGuard)
  async remove(
    @SlashOption("user", {
      description: "Usuário a ser recompensado",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashOption("value", {
      description: "Valor da recompensa",
      required: true,
      type: "INTEGER",
    })
    removeValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const { id } = user;
    const removedName = getUser(interaction, id);

    await prisma.user.update({
      data: { balance: { decrement: removeValue } },
      where: { id },
    });
    return interaction
      .reply({
        embeds: [
          new MessageEmbed()
            .setTitle("Sucesso!")
            .setDescription(
              `${removedName} perdeu ${removeValue} ${drolhosEmoji}!`
            )
            .setColor(theme.success),
        ],
      })
      .finally(() => {
        prisma.$disconnect();
      });
  }

  @Slash("removet", {
    description: "Retira tickets do usuário mencionado",
  })
  @Guard(AdminGuard, EconomyGuard)
  async removet(
    @SlashOption("user", {
      description: "Usuário a ser recompensado",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashOption("value", {
      description: "Valor da recompensa",
      required: true,
      type: "INTEGER",
    })
    removeValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const { id } = user;
    const removedName = getUser(interaction, id);

    await prisma.user.update({
      data: { tickets: { decrement: removeValue } },
      where: { id },
    });
    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: "Sucesso!",
            description: `${removedName} perdeu ${removeValue} 🎟️!`,
            color: theme.success,
          }),
        ],
      })
      .finally(() => {
        prisma.$disconnect();
      });
  }

  @Slash("give", {
    description: "Transfere drolhoscoins entre usuários",
  })
  @Guard(EconomyGuard)
  async give(
    @SlashOption("destinatário", {
      description: "Usuário a ser transferido",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashOption("value", {
      description: "Valor da transferência",
      required: true,
      type: "INTEGER",
    })
    tradeValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const { id: authorId } = interaction.user;
    const authorUser = getUser(interaction, authorId);
    const { id: receiverId } = user;
    const receiverUser = getUser(interaction, receiverId);

    await prisma.user.update({
      data: { balance: { decrement: tradeValue } },
      where: { id: authorId },
    });

    await prisma.user.update({
      data: { balance: { increment: tradeValue } },
      where: { id: receiverId },
    });
    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: "Transferência bem sucedida.",
            description: `${authorUser.displayName} transferiu ${tradeValue} ${drolhosEmoji} para ${receiverUser.displayName}.`,
            color: theme.success,
          }),
        ],
      })
      .finally(() => prisma.$disconnect());
  }

  @Slash("givet", {
    description: "Transfere tickets entre usuários",
  })
  @Guard(EconomyGuard)
  async givet(
    @SlashOption("destinatário", {
      description: "Usuário a ser transferido",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashOption("value", {
      description: "Valor da transferência",
      required: true,
      type: "INTEGER",
    })
    tradeValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const { id: authorId } = interaction.user;
    const authorUser = getUser(interaction, authorId);
    const { id: receiverId } = user;
    const receiverUser = getUser(interaction, receiverId);

    await prisma.user.update({
      data: { tickets: { decrement: tradeValue } },
      where: { id: authorId },
    });

    await prisma.user.update({
      data: { tickets: { increment: tradeValue } },
      where: { id: receiverId },
    });

    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: "Transferência bem sucedida.",
            description: `${authorUser.displayName} transferiu ${tradeValue} 🎟️ para ${receiverUser.displayName}.`,
            color: theme.success,
          }),
        ],
      })
      .finally(() => prisma.$disconnect());
  }

  @Slash("totaldrolhos", {
    description: "Lista a quantia total de drolhos no servidor",
  })
  async totalDrolhos(interaction: CommandInteraction) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const allUsers = await prisma.user.findMany({ select: { balance: true } });
    const allDrolhos = allUsers.reduce((prev, curr) => {
      return prev + curr.balance;
    }, 0);
    return interaction
      .reply({
        embeds: [
          {
            title: "Saldo do servidor",
            description: `Atualmente, todas as carteiras no servidor possuem ${allDrolhos} ${drolhosEmoji} no total.`,
            color: theme.default,
          },
        ],
      })
      .finally(() => prisma.$disconnect());
  }
  @Slash("totalcareca", {
    description: "Lista a quantia total de drolhos para o Bruno Careca",
  })
  async totalCareca(interaction: CommandInteraction) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const allUsers = await prisma.user.findMany({
      select: { balance: true },
      where: { id: { not: "259449047373447169" } },
    });
    const allDrolhos = allUsers.reduce((prev, curr) => {
      return prev + curr.balance;
    }, 0);
    return interaction
      .reply({
        embeds: [
          {
            title: "Saldo do servidor",
            description: `Atualmente, todas as carteiras no servidor possuem ${allDrolhos} ${drolhosEmoji}, faltam ${
              150 - allDrolhos
            } ${drolhosEmoji} para o Bruno Careca.`,
            color: theme.default,
          },
        ],
      })
      .finally(() => prisma.$disconnect());
  }
}
