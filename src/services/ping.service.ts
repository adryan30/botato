import { CommandMessage, Command, Infos } from "@typeit/discord";

const category = ":globe_with_meridians: Geral";
export abstract class PingService {
  @Command("ping")
  @Infos({
    category,
    description: "Retorna o ping do bot",
    syntax: '=ping'
  })
  showPing(message: CommandMessage) {
    return message.channel.send(`🏓 ${Math.round(message.client.ws.ping)}ms`);
  }
}
