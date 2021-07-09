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

  @On("ready")
  async ready([_]: ArgsOf<"message">, client: Client) {
    console.log("Bot iniciado com sucesso!");

    // Limpeza - magias-de-comando
    cron.schedule("0 * * * *", async () => {
      console.log("Cleaning command channel...");
      const commandChannel = client.channels.cache.get("862008453986648084");
      if (!((c): c is TextChannel => c.type === "text")(commandChannel)) return;
      await cleanChannel(commandChannel);
    });

    // Sistema de pontuações - podium de
    cron.schedule("0 * * * *", async () => {
      console.log("Refreshing Podium ...");
      const podiumChannel = client.channels.cache.get("863093014234267708");
      if (!((c): c is TextChannel => c.type === "text")(podiumChannel)) return;
      await cleanChannel(podiumChannel);

      const leaderboards = (
        await db.collection("users").orderBy("balance", "desc").get()
      ).docs.map((doc) => {
        const userData = client.users.cache.find((user) => user.id === doc.id);
        const docData = doc.data() as { isAdmin: boolean; balance: number };
        return {
          balance: docData.balance,
          isAdmin: docData.isAdmin,
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
