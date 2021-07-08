import { CommandMessage, CommandNotFound, Discord, On } from "@typeit/discord";
import * as Path from "path";

@Discord("=", {
  import: [Path.join(__dirname, "services", "*.service.js")],
})
export class AppDiscord {
  @CommandNotFound()
  notFound(command: CommandMessage) {
    return command.reply("Comando não encontrado :no_mouth:");
  }

  @On("ready")
  ready() {
    console.log("Bot iniciado com sucesso!");
  }
}
