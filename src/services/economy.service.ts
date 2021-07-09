import { CommandMessage, Command, Infos, Guard, Client } from "@typeit/discord";
import { MessageEmbed } from "discord.js";
import { db, theme } from "../config";
import { AdminGuard, EconomyGuard } from "../guards";
import * as firebase from "firebase-admin";

const category = ":bank: Economia";
export abstract class EconomyService {
  @Command("register")
  @Infos({
    category,
    description: "Registra o usuário no sistema de economia",
  })
  async register(message: CommandMessage, client: Client) {
    const drolhosEmoji = client.emojis.cache.get(theme.emoji);
    const {
      author: { id },
    } = message;
    const userExists = await db.collection("users").doc(id).get();
    if (userExists.data()) {
      return message.reply({
        embed: new MessageEmbed()
          .setTitle("Carteira já cadastrada!")
          .setDescription(
            `Você já possui uma carteira cadastrada! Use '=balance' para vê-la.`
          )
          .setColor(theme.error),
      });
    }
    await db.collection("users").doc(id).set({ balance: 0.0, isAdmin: false });
    return message.reply({
      embed: new MessageEmbed()
        .setTitle("Carteira cadastrada com sucesso!")
        .setDescription(
          `Você cadastrou sua carteira, a partir de agora use '=balance' para checar o seu saldo de ${drolhosEmoji}.`
        )
        .setColor(theme.success),
    });
  }

  @Command("balance")
  @Infos({
    category,
    description: "Mostra seu saldo no servidor",
  })
  @Guard(EconomyGuard)
  async balance(message: CommandMessage, client: Client, guardDatas: any) {
    const drolhosEmoji = client.emojis.cache.get(theme.emoji);
    const { userData } = guardDatas;
    return message.reply({
      embed: new MessageEmbed()
        .setTitle("Carteira")
        .setDescription(`Seu saldo: ${userData.balance} ${drolhosEmoji}`)
        .setColor(theme.default),
    });
  }

  @Command("award")
  @Infos({
    category,
    description: "Recompensa o usuário mencionado com drolhoscoins",
  })
  @Guard(AdminGuard, EconomyGuard)
  async award(message: CommandMessage, client: Client) {
    const drolhosEmoji = client.emojis.cache.get(theme.emoji);
    const [, ...args] = message.commandContent.split(" ");
    const { mentions } = message;
    const { id, username: awardedName } = mentions.users.array()[0];
    const awardValue = Number(args[0]);
    await db
      .collection("users")
      .doc(id)
      .update({ balance: firebase.firestore.FieldValue.increment(awardValue) });
    return message.channel.send({
      embed: new MessageEmbed()
        .setTitle("Parabéns!")
        .setDescription(
          `${awardedName} ${
            awardValue < 0 ? "perdeu" : "ganhou"
          } ${awardValue} ${drolhosEmoji}! Parabéns!`
        )
        .setColor(theme.success),
    });
  }

  @Command("give")
  @Infos({
    category,
    description: "Transfere drolhoscoins entre usuários",
  })
  @Guard(AdminGuard, EconomyGuard)
  async give(message: CommandMessage, client: Client) {
    const {
      author: { id: authorId, username },
    } = message;
    const drolhosEmoji = client.emojis.cache.get(theme.emoji);
    const [, ...args] = message.commandContent.split(" ");
    const { mentions } = message;
    const { id, username: awardedName } = mentions.users.array()[0];
    const awardValue = Number(args[0]);
    await db
      .collection("users")
      .doc(authorId)
      .update({
        balance: firebase.firestore.FieldValue.increment(awardValue * -1),
      });
    await db
      .collection("users")
      .doc(id)
      .update({
        balance: firebase.firestore.FieldValue.increment(awardValue),
      });
    return message.reply({
      embed: new MessageEmbed()
        .setTitle("Transferência bem sucedida.")
        .setDescription(
          `${username} transferiu ${awardValue} ${drolhosEmoji} para ${awardedName}.`
        )
        .setColor(theme.success),
    });
  }
}
