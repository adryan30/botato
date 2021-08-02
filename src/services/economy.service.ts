import { CommandMessage, Command, Infos, Guard, Client } from "@typeit/discord";
import { MessageEmbed } from "discord.js";
import { theme } from "../config";
import { AdminGuard, EconomyGuard } from "../guards";
import { PrismaClient } from "@prisma/client";
import { findDrolhosEmoji } from "../utils";

const category = ":bank: Economia";
export abstract class EconomyService {
  @Command("register")
  @Infos({
    category,
    description: "Registra o usuário no sistema de economia",
    syntax: "=register",
  })
  async register(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(message);
    const {
      author: { id },
    } = message;
    const userExists = await prisma.user.count({ where: { id } });
    if (userExists) {
      return message.reply({
        embed: new MessageEmbed()
          .setTitle("Carteira já cadastrada!")
          .setDescription(
            `Você já possui uma carteira cadastrada! Use '=balance' para vê-la.`
          )
          .setColor(theme.error),
      });
    }
    await prisma.user.create({ data: { id } });
    return message
      .reply({
        embed: new MessageEmbed()
          .setTitle("Carteira cadastrada com sucesso!")
          .setDescription(
            `Você cadastrou sua carteira, a partir de agora use '=balance' para checar o seu saldo de ${drolhosEmoji}.`
          )
          .setColor(theme.success),
      })
      .finally(() => prisma.$disconnect());
  }

  @Command("balance")
  @Infos({
    category,
    description: "Mostra seu saldo no servidor",
    syntax: "=balance <membro?>",
  })
  @Guard(EconomyGuard)
  async balance(message: CommandMessage, client: Client, guardDatas: any) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(message);
    let searchUser;
    const {
      author,
      mentions: { users },
    } = message;
    if (users.size) {
      searchUser = users.array()[0];
    } else {
      searchUser = author;
    }

    const userData = await prisma.user.findUnique({
      where: { id: searchUser.id },
    });

    return message
      .reply({
        embed: new MessageEmbed({
          title: `Carteira de ${searchUser.username}`,
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
        }).setColor(theme.default),
      })
      .finally(() => prisma.$disconnect());
  }

  @Command("award")
  @Infos({
    category,
    description: "Recompensa o usuário mencionado com drolhoscoins",
    syntax: "=award <membro>",
  })
  @Guard(AdminGuard, EconomyGuard)
  async award(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(message);
    const [, ...args] = message.commandContent.split(" ");
    const { mentions } = message;
    const { id, username: awardedName } = mentions.users.array()[0];
    const awardValue = Number(args[0]);
    try {
      if (awardValue <= 0) {
        throw "Digite um valor acima de 0 para recompensar.";
      }
    } catch (err) {
      return message.reply({
        embed: new MessageEmbed({
          title: "Erro!",
          description: err,
          color: theme.error,
        }),
      });
    }

    await prisma.user.update({
      data: { balance: { increment: awardValue } },
      where: { id },
    });
    return message.channel
      .send({
        embed: new MessageEmbed()
          .setTitle("Parabéns!")
          .setDescription(
            `${awardedName} ganhou ${awardValue} ${drolhosEmoji}!`
          )
          .setColor(theme.success),
      })
      .finally(() => prisma.$disconnect());
  }

  @Command("awardt")
  @Infos({
    category,
    description: "Recompensa o usuário mencionado com tickets",
    syntax: "=awardt <membro>",
  })
  @Guard(AdminGuard, EconomyGuard)
  async awardt(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const [, ...args] = message.commandContent.split(" ");
    const { mentions } = message;
    const { id, username: awardedName } = mentions.users.array()[0];
    const awardValue = Number(args[0]);
    try {
      if (awardValue <= 0) {
        throw "Digite um valor acima de 0 para recompensar.";
      }
    } catch (err) {
      return message.reply({
        embed: new MessageEmbed({
          title: "Erro!",
          description: err,
          color: theme.error,
        }),
      });
    }

    await prisma.user.update({
      data: { tickets: { increment: awardValue } },
      where: { id },
    });
    return message.channel
      .send({
        embed: new MessageEmbed({
          title: "Parabéns!",
          description: `${awardedName} ganhou ${awardValue} 🎟️!`,
          color: theme.success,
        }),
      })
      .finally(() => prisma.$disconnect());
  }

  @Command("remove")
  @Infos({
    category,
    description: "Retira drolhoscoins do usuário mencionado",
    syntax: "=remove <quantidade> <membro>",
  })
  @Guard(AdminGuard, EconomyGuard)
  async remove(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(message);
    const [, ...args] = message.commandContent.split(" ");
    const { mentions } = message;
    const { id, username: awardedName } = mentions.users.array()[0];
    const awardValue = Number(args[0]);
    const userData = await prisma.user.findUnique({
      where: { id },
      select: { balance: true },
    });
    try {
      if (awardValue <= 0) {
        throw "Digite um valor acima de 0 para remover.";
      }
      if (awardValue > userData.balance) {
        throw `Esse usuário não possui ${drolhosEmoji} suficientes`;
      }
    } catch (err) {
      return message.reply({
        embed: new MessageEmbed({
          title: "Erro!",
          description: err,
          color: theme.error,
        }),
      });
    }

    await prisma.user.update({
      data: { balance: { decrement: awardValue } },
      where: { id },
    });
    return message.channel
      .send({
        embed: new MessageEmbed()
          .setTitle("Sucesso!")
          .setDescription(
            `${awardedName} perdeu ${awardValue} ${drolhosEmoji}!`
          )
          .setColor(theme.success),
      })
      .finally(() => prisma.$disconnect());
  }

  @Command("removet")
  @Infos({
    category,
    description: "Retira tickets do usuário mencionado",
    syntax: "=removet <quantidade> <membro>",
  })
  @Guard(AdminGuard, EconomyGuard)
  async removet(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const drolhosEmoji = findDrolhosEmoji(message);
    const [, ...args] = message.commandContent.split(" ");
    const { mentions } = message;
    const { id, username: awardedName } = mentions.users.array()[0];
    const awardValue = Number(args[0]);
    const userData = await prisma.user.findUnique({
      where: { id },
      select: { tickets: true },
    });
    try {
      if (awardValue <= 0) {
        throw "Digite um valor acima de 0 para remover.";
      }
      if (awardValue > userData.tickets) {
        throw `Esse usuário não possui 🎟️suficientes`;
      }
    } catch (err) {
      return message.reply({
        embed: new MessageEmbed({
          title: "Erro!",
          description: err,
          color: theme.error,
        }),
      });
    }

    await prisma.user.update({
      data: { tickets: { decrement: awardValue } },
      where: { id },
    });
    return message.channel
      .send({
        embed: new MessageEmbed({
          title: "Sucesso!",
          description: `${awardedName} perdeu ${awardValue} 🎟️!`,
          color: theme.success,
        }),
      })
      .finally(() => prisma.$disconnect());
  }

  @Command("give")
  @Infos({
    category,
    description: "Transfere drolhoscoins entre usuários",
    syntax: "=give <quantidade> <membro>",
  })
  @Guard(EconomyGuard)
  async give(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const {
      author: { id: authorId, username },
      mentions: { users: mentionedUsers },
    } = message;
    const drolhosEmoji = findDrolhosEmoji(message);
    const [, ...args] = message.commandContent.split(" ");
    const { id, username: awardedName } = mentionedUsers.array()[0];
    const tradeValue = Number(args[0]);
    const sourceUser = await prisma.user.findUnique({
      where: { id: authorId },
    });
    try {
      if (sourceUser.balance < tradeValue) {
        throw `Você não tem ${drolhosEmoji} suficiente para essa transação.`;
      }
    } catch (err) {
      return message.reply({
        embed: new MessageEmbed({
          title: "Erro!",
          description: err,
          color: theme.error,
        }),
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
    return message
      .reply({
        embed: new MessageEmbed()
          .setTitle("Transferência bem sucedida.")
          .setDescription(
            `${username} transferiu ${tradeValue} ${drolhosEmoji} para ${awardedName}.`
          )
          .setColor(theme.success),
      })
      .finally(() => prisma.$disconnect());
  }

  @Command("givet")
  @Infos({
    category,
    description: "Transfere tickets entre usuários",
    syntax: "=givet <quantidade> <membro>",
  })
  @Guard(EconomyGuard)
  async givet(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const {
      author: { id: authorId, username },
      mentions: { users: mentionedUsers },
    } = message;
    const [, ...args] = message.commandContent.split(" ");
    const { id, username: awardedName } = mentionedUsers.array()[0];
    const tradeValue = Number(args[0]);
    const sourceUser = await prisma.user.findUnique({
      where: { id: authorId },
    });

    try {
      if (sourceUser.balance < tradeValue) {
        throw `Você não tem 🎟️ suficiente para essa transação.`;
      }
    } catch (err) {
      return message.reply({
        embed: new MessageEmbed({
          title: "Erro!",
          description: err,
          color: theme.error,
        }),
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
    return message
      .reply({
        embed: new MessageEmbed()
          .setTitle("Transferência bem sucedida.")
          .setDescription(
            `${username} transferiu ${tradeValue} 🎟️ para ${awardedName}.`
          )
          .setColor(theme.success),
      })
      .finally(() => prisma.$disconnect());
  }
}
