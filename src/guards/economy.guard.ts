import { ArgsOf, GuardFunction } from "discordx";
import { MessageEmbed } from "discord.js";
import { theme } from "../config";
import { PrismaClient } from "@prisma/client";

export const EconomyGuard: GuardFunction<ArgsOf<"message">> = async (
  [message],
  _client,
  next,
  _guardDatas
) => {
  const prisma = new PrismaClient();
  const {
    author: { id },
    mentions: { users: mentionedUsers },
  } = message;
  const userData = await prisma.user.findUnique({ where: { id } });

  if (!userData) {
    return message.reply({
      embeds: [
        new MessageEmbed()
          .setTitle("Carteira não cadastrada!")
          .setDescription(
            `Você ainda não possui uma carteira de pontos, com ela você estará apto a participar de eventos, ganhar pontos e usar seus pontos para comprar recompensas exclusivas no #mercado-negro.\n\nPara cadastrar sua carteira digite '=register'.`
          )
          .setColor(theme.error),
      ],
    });
  }

  if (mentionedUsers.size) {
    const { id: mentionId } = mentionedUsers.first();
    const mentionUserData = await prisma.user.findUnique({
      where: { id: mentionId },
    });
    if (!mentionUserData) {
      return message.reply({
        embeds: [
          new MessageEmbed()
            .setTitle("Erro!")
            .setDescription(
              `O usuário mencionado não possui carteira cadastrada. Tentem usar '=balance', e sigam as instruções.`
            )
            .setColor(theme.error),
        ],
      });
    }
  }
  await next().finally(() => prisma.$disconnect());
};
