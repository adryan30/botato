import {
  ArgsOf,
  Client,
  CommandMessage,
  CommandNotFound,
  Discord,
  On,
} from "@typeit/discord";
import * as Path from "path";
import * as cron from "node-cron";
import { cleanChannel } from "./utils";
import { MessageEmbed, TextChannel } from "discord.js";
import { theme } from "./config";
import { format } from "date-fns-tz";
import { PrismaClient } from "@prisma/client";

@Discord("=", {
  import: [Path.join(__dirname, "services", "*.service.js")],
})
export class AppDiscord {
  @CommandNotFound()
  notFound(command: CommandMessage) {
    return command.reply("Comando não encontrado :no_mouth:");
  }

  async clean(client: Client, channelId: string) {
    const channel = client.channels.cache.get(channelId);
    if (!((c): c is TextChannel => c.type === "text")(channel)) return;
    console.log(`Cleaning ${channel.name} channel...`);
    await cleanChannel(channel);
    return channel;
  }

  @On("ready")
  async ready([_]: ArgsOf<"message">, client: Client) {
    console.log("Bot iniciado com sucesso!");

    // Limpeza - magias-de-comando
    cron.schedule(
      "0 0 * * *",
      async () => {
        await this.clean(client, "862008453986648084");
      },
      { timezone: "America/Sao_Paulo" }
    );

    // Limpeza - categoria bordel
    cron.schedule(
      "0 4 * * *",
      async () => {
        await this.clean(client, "862539017839706132");
        await this.clean(client, "864571802763133008");
      },
      { timezone: "America/Sao_Paulo" }
    );

    // Sistema de pontuações - podium
    cron.schedule("0 * * * *", async () => {
      const podiumChannel = await this.clean(client, "863093014234267708");
      const prisma = new PrismaClient();
      const usersData = await prisma.user.findMany({
        orderBy: { balance: "desc" },
      });
      const { members } = await client.guilds.fetch("861118279019397130");
      const leaderboards = await Promise.all(
        usersData.map(async (user, i) => {
          const memberData = await members.fetch(user.id);
          const {
            user: { username },
          } = memberData;
          return { ...user, username };
        })
      );
      const updatedDate = format(new Date(), "dd/MM/yyyy HH:mm:ss", {
        timeZone: "-0300",
      });
      await podiumChannel.send({
        embed: new MessageEmbed()
          .setTitle("Ranque")
          .setColor(theme.default)
          .setFooter(`Pódio atualizado ás ${updatedDate}`)
          .setDescription(
            `${leaderboards
              .map((position, i) => {
                const { username, balance } = position;
                return `${i + 1} - ${username} - ${balance}`;
              })
              .join("\n")}`
          ),
      });
      await prisma.$disconnect();
    });
  }
}
