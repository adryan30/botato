import { CommandMessage, Client, Command, Description } from "@typeit/discord";

export abstract class HelpService {
  @Command("help")
  @Description("Lista os comandos do bot")
  showHelp(message: CommandMessage) {
    const commands = Client.getCommands();
    let helpMessage = "```";
    commands.forEach(({ prefix, commandName, description }) => {
      helpMessage += `${prefix}${commandName} - ${description}\n`;
    });
    helpMessage += "```";
    return message.channel.send(helpMessage);
  }
}
