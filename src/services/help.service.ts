import { CommandMessage, Client, Command, Description } from "@typeit/discord";

export abstract class HelpService {
  @Command("help")
  @Description("Lista os comandos do bot")
  showHelp(message: CommandMessage) {
    const commands = Client.getCommands();
    const helpMessage = commands
      .map(({ prefix: p, commandName: n, description: d }) => `${p}${n} - ${d}`)
      .join("\n");
    return message.channel.send(helpMessage, { code: true });
  }
}
