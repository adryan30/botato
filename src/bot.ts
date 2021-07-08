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
import { TextChannel } from "discord.js";

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
  }
}
