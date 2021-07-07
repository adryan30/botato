import { CommandMessage, Command, Description } from "@typeit/discord";

export abstract class PingService {
  @Command("ping")
  @Description("Checa o ping do bot")
  showPing(message: CommandMessage) {
    return message.channel.send(`🏓 ${Math.round(message.client.ws.ping)}ms`);
  }
}
