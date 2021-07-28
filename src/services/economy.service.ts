import { CommandMessage, Command, Infos, Guard, Client } from "@typeit/discord";
import { MessageEmbed } from "discord.js";
import { theme } from "../config";
import { AdminGuard, EconomyGuard } from "../guards";
import { PrismaClient } from "@prisma/client";
import * as firebase from "firebase-admin";

const category = ":bank: Economia";
export abstract class EconomyService {
  @Command("register")
  @Infos({
    category,
    description: "Registra o usuário no sistema de economia",
  })
  async register(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const drolhosEmoji = client.emojis.cache.get(theme.drolhos_emoji);
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
  })
  @Guard(EconomyGuard)
  async balance(message: CommandMessage, client: Client, guardDatas: any) {
    const prisma = new PrismaClient();
    const drolhosEmoji = client.emojis.cache.get(theme.drolhos_emoji);
    const {
      author: { id },
    } = message;
    const userData = await prisma.user.findUnique({ where: { id } });

    return message
      .reply({
        embed: new MessageEmbed()
          .setTitle(`Carteira de ${message.author.username}`)
          .setDescription(`Seu saldo: ${userData.balance} ${drolhosEmoji}`)
          .setColor(theme.default),
      })
      .finally(() => prisma.$disconnect());
  }

  @Command("award")
  @Infos({
    category,
    description: "Recompensa o usuário mencionado com drolhoscoins",
  })
  @Guard(AdminGuard, EconomyGuard)
  async award(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const drolhosEmoji = client.emojis.cache.get(theme.drolhos_emoji);
    const [, ...args] = message.commandContent.split(" ");
    const { mentions } = message;
    const { id, username: awardedName } = mentions.users.array()[0];
    const awardValue = Number(args[0]);
    if (awardValue <= 0) {
      return message.reply("Digite um valor acima de 0 para recompensar.");
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

  @Command("remove")
  @Infos({
    category,
    description: "Recompensa o usuário mencionado com drolhoscoins",
  })
  @Guard(AdminGuard, EconomyGuard)
  async remove(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const drolhosEmoji = client.emojis.cache.get(theme.drolhos_emoji);
    const [, ...args] = message.commandContent.split(" ");
    const { mentions } = message;
    const { id, username: awardedName } = mentions.users.array()[0];
    const awardValue = Number(args[0]);
    if (awardValue <= 0) {
      return message.reply("Digite um valor acima de 0 para remover.");
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

  @Command("give")
  @Infos({
    category,
    description: "Transfere drolhoscoins entre usuários",
  })
  @Guard(EconomyGuard)
  async give(message: CommandMessage, client: Client) {
    const prisma = new PrismaClient();
    const {
      author: { id: authorId, username },
      mentions: { users: mentionedUsers },
    } = message;
    const drolhosEmoji = client.emojis.cache.get(theme.drolhos_emoji);
    const [, ...args] = message.commandContent.split(" ");
    const { id, username: awardedName } = mentionedUsers.array()[0];
    const tradeValue = Number(args[0]);
    const sourceUser = await prisma.user.findUnique({
      where: { id: authorId },
    });
    if (sourceUser.balance < tradeValue) {
      return message.reply(
        `Você não tem ${drolhosEmoji} suficiente para essa transação.`
      );
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
}
