import { ArgsOf, GuardFunction, SimpleCommandMessage } from "discordx";
import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuInteraction,
  MessageEmbed,
  SelectMenuInteraction,
} from "discord.js";
import { theme } from "../config";
import { PrismaClient } from "@prisma/client";

export const AdminUnathorizedEmbed = new MessageEmbed({
  title: "Permissão Negada",
  description: "Você não possui autorização para usar esse comando.",
  color: theme.error,
});

export const AdminGuard: GuardFunction<
  | ArgsOf<"messageCreate" | "messageReactionAdd" | "voiceStateUpdate">
  | CommandInteraction
  | ContextMenuInteraction
  | SelectMenuInteraction
  | ButtonInteraction
  | SimpleCommandMessage
> = async (arg, _client, next) => {
  const prisma = new PrismaClient();
  const interaction = arg instanceof Array ? arg[0] : arg;
  if (interaction instanceof CommandInteraction) {
    const { id } = interaction.user;
    const authorData = await prisma.user.findUnique({ where: { id } });
    if (!authorData?.isAdmin) {
      return interaction
        .reply({ embeds: [AdminUnathorizedEmbed] })
        .finally(() => prisma.$disconnect());
    }
  }

  await next().finally(() => prisma.$disconnect());
};
