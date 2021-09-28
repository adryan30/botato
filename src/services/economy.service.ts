import {
  Slash,
  Guard,
  Client,
  SlashOption,
  Discord,
  SlashGroup,
} from "discordx";
import { MessageEmbed, User, CommandInteraction } from "discord.js";
import { theme } from "../config";
import { AdminGuard, EconomyGuard } from "../guards";
import { PrismaClient } from "@prisma/client";
import { findDrolhosEmoji } from "../utils";

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
    @SlashOption("usuário", {
      description: "Usuário a ser buscado",
      required: false,
      type: "USER",
    })
    user: User,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const searchUser: User = user ?? interaction.user;

    const userData = await prisma.user.findUnique({
      where: { id: searchUser.id },
    });

    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: `Carteira de ${searchUser.username}`,
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
    @SlashOption("usuário", {
      description: "Usuário a ser recompensado",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashOption("valor", {
      description: "Valor da recompensa",
      required: true,
    })
    awardValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const { id, username: awardedName } = user;
    if (awardValue <= 0) {
      return interaction.reply({
        embeds: [
          new MessageEmbed({
            title: "Erro!",
            description: "Digite um valor acima de 0 para recompensar.",
            color: theme.error,
          }),
        ],
      });
    }

    await prisma.user.update({
      data: { balance: { increment: awardValue } },
      where: { id },
    });
    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: "🎉 Parabéns!",
            description: `${awardedName} ganhou ${awardValue} ${drolhosEmoji}!`,
            color: theme.success,
          }),
        ],
      })
      .finally(() => {
        prisma.$disconnect();
      });
  }

  @Slash("awardt", {
    description: "Recompensa o usuário mencionado com tickets",
  })
  @Guard(AdminGuard, EconomyGuard)
  async awardt(
    @SlashOption("usuário", {
      description: "Usuário a ser recompensado",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashOption("valor", {
      description: "Valor da recompensa",
      required: true,
    })
    awardValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const { id, username: awardedName } = user;
    if (awardValue <= 0) {
      return interaction.reply({
        embeds: [
          new MessageEmbed({
            title: "Erro!",
            description: "Digite um valor acima de 0 para recompensar.",
            color: theme.error,
          }),
        ],
      });
    }

    await prisma.user.update({
      data: { tickets: { increment: awardValue } },
      where: { id },
    });

    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: "🎉 Parabéns!",
            description: `${awardedName} ganhou ${awardValue} 🎟️!`,
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
    @SlashOption("usuário", {
      description: "Usuário a ser recompensado",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashOption("valor", {
      description: "Valor da recompensa",
      required: true,
    })
    removeValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const { id, username: removedName } = user;
    const userData = await prisma.user.findUnique({
      where: { id },
      select: { balance: true },
    });
    try {
      if (removeValue <= 0) {
        throw "Digite um valor acima de 0 para remover.";
      }
      if (removeValue > userData.balance) {
        throw `Esse usuário não possui ${drolhosEmoji} suficientes`;
      }
    } catch (err) {
      return interaction.reply({
        embeds: [
          new MessageEmbed({
            title: "Erro!",
            description: err,
            color: theme.error,
          }),
        ],
      });
    }

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
    @SlashOption("usuário", {
      description: "Usuário a ser recompensado",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashOption("valor", {
      description: "Valor da recompensa",
      required: true,
    })
    removeValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const { id, username: removedName } = user;
    const userData = await prisma.user.findUnique({
      where: { id },
      select: { tickets: true },
    });
    try {
      if (removeValue <= 0) {
        throw "Digite um valor acima de 0 para remover.";
      }
      if (removeValue > userData.tickets) {
        throw `Esse usuário não possui 🎟️ suficientes`;
      }
    } catch (err) {
      return interaction.reply({
        embeds: [
          new MessageEmbed({
            title: "Erro!",
            description: err,
            color: theme.error,
          }),
        ],
      });
    }

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
    @SlashOption("valor", {
      description: "Valor da transferência",
      required: true,
    })
    tradeValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const { id: authorId, username } = interaction.user;
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const { id, username: awardedName } = user;
    const sourceUser = await prisma.user.findUnique({
      where: { id: authorId },
    });
    if (sourceUser.balance < tradeValue) {
      return interaction.reply({
        embeds: [
          new MessageEmbed({
            title: "Erro!",
            description: `Você não tem ${drolhosEmoji} suficiente para essa transação.`,
            color: theme.error,
          }),
        ],
      });
    }

    await prisma.user.update({
      data: { balance: { decrement: tradeValue } },
      where: { id: authorId },
    });

    await prisma.user.update({
      data: { balance: { increment: tradeValue } },
      where: { id },
    });
    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: "Transferência bem sucedida.",
            description: `${username} transferiu ${tradeValue} ${drolhosEmoji} para ${awardedName}.`,
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
    @SlashOption("valor", {
      description: "Valor da transferência",
      required: true,
    })
    tradeValue: number,
    interaction: CommandInteraction
  ) {
    const prisma = new PrismaClient();
    const { id: authorId, username } = interaction.user;
    const drolhosEmoji = findDrolhosEmoji(interaction);
    const { id, username: awardedName } = user;
    const sourceUser = await prisma.user.findUnique({
      where: { id: authorId },
    });
    if (sourceUser.tickets < tradeValue) {
      return interaction.reply({
        embeds: [
          new MessageEmbed({
            title: "Erro!",
            description: `Você não tem 🎟️ suficiente para essa transação.`,
            color: theme.error,
          }),
        ],
      });
    }

    await prisma.user.update({
      data: { tickets: { decrement: tradeValue } },
      where: { id: authorId },
    });

    await prisma.user.update({
      data: { tickets: { increment: tradeValue } },
      where: { id },
    });
    return interaction
      .reply({
        embeds: [
          new MessageEmbed({
            title: "Transferência bem sucedida.",
            description: `${username} transferiu ${tradeValue} 🎟️ para ${awardedName}.`,
            color: theme.success,
          }),
        ],
      })
      .finally(() => prisma.$disconnect());
  }

  @Slash("totalDrolhos", {
    description: "Lista a quantia total de Drolhoscoins no servidor",
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
}
