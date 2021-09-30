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

export const AuthorHasNoWalletEmbed = new MessageEmbed({
  title: "Carteira não cadastrada!",
  description: `Você ainda não possui uma carteira de drolhos, com ela você estará apto a participar de eventos, ganhar drolhos e usar seus drolhos para comprar recompensas exclusivas no #mercado-negro.\n\nPara cadastrar sua carteira digite '/register'.`,
  color: theme.error,
});

export const ReceiverHasNoWalletEmbed = new MessageEmbed({
  title: "Carteira não cadastrada!",
  description: `O usuário mencionado não possui carteira cadastrada. Tentem usar '/register'.`,
  color: theme.error,
});

export const NotEnoughtCreditsEmbed = (type: "drolhos" | "bilhetes") =>
  new MessageEmbed({
    title: "Saldo insuficiente!",
    description: `Você não tem ${type} suficientes para essa transação.`,
    color: theme.error,
  });

export const ValueCantBeNegativeEmbed = new MessageEmbed({
  title: "Erro!",
  description: "Digite um valor acima de 0 para a transação.",
  color: theme.error,
});

export const EconomyGuard: GuardFunction<
  | ArgsOf<"messageCreate" | "messageReactionAdd" | "voiceStateUpdate">
  | CommandInteraction
  | ContextMenuInteraction
  | SelectMenuInteraction
  | ButtonInteraction
  | SimpleCommandMessage
> = async (arg, _client, next, datas) => {
  const prisma = new PrismaClient();
  const interaction = arg instanceof Array ? arg[0] : arg;
  if (interaction instanceof CommandInteraction) {
    const { commandName, user: author, options } = interaction;
    const userMentioned = options.getUser("user");
    const valueInformed = options.getInteger("value");
    const { id: authorId } = author;
    const authorData = await prisma.user.findUnique({
      where: { id: authorId },
    });
    if (!authorData) {
      return interaction.reply({ embeds: [AuthorHasNoWalletEmbed] });
    }

    if (
      ["remove", "removet", "award", "awardt"].includes(commandName) ||
      userMentioned
    ) {
      const userData = await prisma.user.count({
        where: { id: userMentioned.id },
      });
      if (!userData) {
        return interaction
          .reply({ embeds: [ReceiverHasNoWalletEmbed] })
          .finally(() => prisma.$disconnect());
      }
    }

    if (["give", "givet"].includes(commandName)) {
      const isDrolhosTrasaction = commandName === "give";
      if (
        valueInformed >
        (isDrolhosTrasaction ? authorData.balance : authorData.tickets)
      ) {
        return interaction
          .reply({
            embeds: [
              NotEnoughtCreditsEmbed(
                isDrolhosTrasaction ? "drolhos" : "bilhetes"
              ),
            ],
          })
          .finally(() => prisma.$disconnect());
      }
    }
    console.log(valueInformed);
    if (valueInformed && valueInformed <= 0) {
      return interaction
        .reply({
          embeds: [ValueCantBeNegativeEmbed],
        })
        .finally(() => prisma.$disconnect());
    }
    await next().finally(() => prisma.$disconnect());
  }
};
