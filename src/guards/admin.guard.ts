import { GuardFunction } from "@typeit/discord";
import { MessageEmbed } from "discord.js";
import { db, theme } from "../config";

export const AdminGuard: GuardFunction<"message"> = async (
  [message],
  client,
  next
) => {
  const {
    author: { id },
  } = message;
  const authorData = (await db.collection("users").doc(id).get()).data();
  if (!authorData?.isAdmin) {
    return message.reply({
      embed: new MessageEmbed()
        .setTitle("Permissão Negada")
        .setDescription("Você não possui autorização para usar esse comando.")
        .setColor(theme.error),
    });
  }
  await next();
};
