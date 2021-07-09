import { GuardFunction } from "@typeit/discord";
import { MessageEmbed } from "discord.js";
import { db, theme } from "../config";

export const EconomyGuard: GuardFunction<"message"> = async (
  [message],
  client,
  next,
  guardDatas
) => {
  const {
    author: { id },
  } = message;
  const userData = (await db.collection("users").doc(id).get()).data();
  if (!userData) {
    return message.reply({
      embed: new MessageEmbed()
        .setTitle("Carteira não cadastrada!")
        .setDescription(
          `Você ainda não possui uma carteira de pontos, com ela você estará apto a participar de eventos, ganhar pontos e usar seus pontos para comprar recompensas exclusivas no #mercado-negro.\n\nPara cadastrar sua carteira digite '=register'.`
        )
        .setColor(theme.default),
    });
  }
  if (message.mentions.users.size) {
    const { id: mentionId } = message.mentions.users.array()[0];
    const mentionUserData = (
      await db.collection("users").doc(mentionId).get()
    ).data();
    if (!mentionUserData) {
      return message.reply({
        embed: new MessageEmbed()
          .setTitle("Erro!")
          .setDescription(
            `O usuário mencionado não possui carteira cadastrada. Tentem usar '=balance', e sigam as instruções.`
          )
          .setColor(theme.error),
      });
    }
  }
  guardDatas.userData = userData;
  await next();
};
