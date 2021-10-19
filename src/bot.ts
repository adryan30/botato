import { ArgsOf, Client, Discord, On } from "discordx";
import * as cron from "node-cron";
import { cleanChannel, findChannel } from "./utils";
import { MessageEmbed, TextChannel } from "discord.js";
import { theme } from "./config";
import { format, subHours } from "date-fns";
import { PrismaClient } from "@prisma/client";

@Discord()
export class AppDiscord {
  async clean(client: Client, channelName: string) {
    const channel = await findChannel(channelName, client);
    console.log(`Cleaning ${channelName} channel...`);
    if (channel instanceof TextChannel) {
      await cleanChannel(channel);
      return channel;
    }
  }

  @On("ready")
  async ready([_]: ArgsOf<"ready">, client: Client) {
    // Limpeza - magias-de-comando
    cron.schedule(
      "0 0 * * *",
      async () => {
        await this.clean(client, "magias-de-comando");
      },
      { timezone: "America/Sao_Paulo" }
    );

    // Limpeza - categoria bordel
    cron.schedule(
      "0 4 * * *",
      async () => {
        await this.clean(client, "roletagens");
        await this.clean(client, "outros");
      },
      { timezone: "America/Sao_Paulo" }
    );

    // Sistema de pontuações - podium
    cron.schedule("*/5 * * * *", async () => {
      const podiumChannel = await this.clean(client, "podium");
      const prisma = new PrismaClient();
      const usersData = await prisma.user.findMany({
        orderBy: { balance: "desc" },
        select: { balance: true, id: true },
      });
      const { members } = await client.guilds.fetch(process.env.GUILD_ID);
      const leaderboards = await Promise.all(
        usersData.map(async (user) => {
          const memberData = await members.fetch(user.id);
          const {
            user: { username },
          } = memberData;
          return { ...user, username };
        })
      );
      const updatedDate = format(
        subHours(new Date(), 3),
        "dd/MM/yyyy HH:mm:ss"
      );
      await podiumChannel.send({
        embeds: [
          new MessageEmbed({
            title: "🏆 Ranque",
            color: theme.default,
            footer: { text: `Pódio atualizado às ${updatedDate}` },
            description: `${leaderboards
              .map((p, i) => `${i + 1} - ${p.username} - ${p.balance}`)
              .join("\n")}`,
          }),
        ],
      });
      await prisma.$disconnect();
    });
    console.log("Bot iniciado com sucesso!");
  }
}
