import { ArgsOf, GuardFunction } from "discordx";
import { MessageEmbed } from "discord.js";
import { theme } from "../config";
import { PrismaClient } from "@prisma/client";

export const AdminGuard: GuardFunction<ArgsOf<"messageCreate">> = async (
  [message],
  _client,
  next
) => {
  const prisma = new PrismaClient();
  const {
    author: { id },
  } = message;
  const authorData = await prisma.user.findUnique({ where: { id } });
  if (!authorData?.isAdmin) {
    return message.reply({
      embeds: [
        new MessageEmbed()
          .setTitle("Permissão Negada")
          .setDescription("Você não possui autorização para usar esse comando.")
          .setColor(theme.error),
      ],
    });
  }
  await next().finally(() => prisma.$disconnect());
};
