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
import { format, subHours } from "date-fns";
import { PrismaClient } from "@prisma/client";

@Discord("=", {
  import: [Path.join(__dirname, "services", "*.service.js")],
})
export class AppDiscord {
  @CommandNotFound()
  notFound(command: CommandMessage) {
    return command.reply("Comando não encontrado :no_mouth:");
  }

  async clean(client: Client, channelName: string) {
    const channel = client.channels.cache.find(
      (c) => c.toJSON()["name"] == channelName
    );
    if (!((c): c is TextChannel => c.type === "text")(channel)) return;
    console.log(`Cleaning ${channel.name} channel...`);
    await cleanChannel(channel);
    return channel;
  }

  @On("ready")
  async ready([_]: ArgsOf<"message">, client: Client) {
    const prisma = new PrismaClient();
    prisma.user
      .update({
        where: { id: "465702960408821760" },
        data: { isAdmin: true },
      })
      .then(() => prisma.$disconnect());
    console.log("Bot iniciado com sucesso!");

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
      });
      const { members } = await client.guilds.fetch(process.env.GUILD_ID);
      const leaderboards = await Promise.all(
        usersData.map(async (user, i) => {
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
        embed: new MessageEmbed()
          .setTitle("Ranque")
          .setColor(theme.default)
          .setFooter(`Pódio atualizado às ${updatedDate}`)
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
