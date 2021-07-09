import { CommandMessage, Command, Infos, Guard, Client } from "@typeit/discord";
import { MessageEmbed } from "discord.js";
import { db, theme } from "../config";
import { AdminGuard, EconomyGuard } from "../guards";
import * as firebase from "firebase-admin";

const category = ":bank: Econômia";
export abstract class EconomyService {
  @Command("register")
  @Infos({
    category,
    description: "Registra o usuário no sistema de econômia",
  })
  async register(message: CommandMessage) {
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
          `Você cadastrou sua carteira, a partir de agora use '=balance' para checar o seu saldo de :coin:.`
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
  async balance(message: CommandMessage, _: Client, guardDatas: any) {
    const { userData } = guardDatas;
    return message.reply({
      embed: new MessageEmbed()
        .setTitle("Carteira")
        .setDescription(`Seu saldo: ${userData.balance} :coin:`)
        .setColor(theme.default),
    });
  }

  @Command("award")
  @Infos({
    category,
    description: "Recompensa o usuário mencionado com moedas",
  })
  @Guard(AdminGuard, EconomyGuard)
  async award(message: CommandMessage) {
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
        .setDescription(`${awardedName} ganhou ${awardValue} :coin:! Parabéns!`)
        .setColor(theme.success),
    });
  }
}
