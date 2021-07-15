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
import { db, theme } from "./config";
import { format } from "date-fns";

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
    cron.schedule("0 0 * * *", async () => {
      await this.clean(client, "862008453986648084");
    });

    // Limpeza - categoria bordel
    cron.schedule("0 4 * * *", async () => {
      await this.clean(client, "862539017839706132");
      await this.clean(client, "864571802763133008");
    });

    // Sistema de pontuações - podium de
    cron.schedule("0 * * * *", async () => {
      const podiumChannel = await this.clean(client, "863093014234267708");
      const leaderboards = (
        await db.collection("users").orderBy("balance", "desc").get()
      ).docs.map((doc) => {
        const userData = client.users.cache.find((user) => user.id === doc.id);
        const { balance, isAdmin } = doc.data() as {
          isAdmin: boolean;
          balance: number;
        };
        return {
          balance,
          isAdmin,
          id: doc.id,
          username: userData.username,
        };
      });
      podiumChannel.send({
        embed: new MessageEmbed()
          .setTitle("Ranque")
          .setColor(theme.default)
          .setFooter(
            `Pódio atualizado ás ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`
          )
          .setDescription(
            `${leaderboards
              .map((position, index) => {
                return `${index + 1} - ${position.username} - ${
                  position.balance
                }`;
              })
              .join("\n")}`
          ),
      });
    });
  }
}
