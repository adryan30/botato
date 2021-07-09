import {
  CommandMessage,
  Client,
  Command,
  Infos,
  CommandInfos,
} from "@typeit/discord";
import { MessageEmbed } from "discord.js";
import { theme } from "../config";

const category = ":globe_with_meridians: Geral";
export abstract class HelpService {
  @Command("help")
  @Infos({
    category,
    description: "Lista os comandos do bot",
  })
  showHelp(message: CommandMessage) {
    const commands = Client.getCommands().filter((c) => !c.infos["hide"]);
    const infos: { [index: string]: Array<CommandInfos> } = {};
    commands.forEach((command) => {
      const {
        infos: { category },
      } = command;
      if (!infos[category]) infos[category] = [command];
      else infos[category] = [...infos[category], command];
    });
    const infoMessage = Object.entries(infos)
      .map(([category, commands]) => {
        return `${category}
            ${commands
              .map(({ prefix: p, commandName: n, description: d }) => {
                return `${p}${n} - ${d}\n`;
              })
              .concat("\n")}`;
      })
      .join("\n");

    return message.channel.send({
      embed: new MessageEmbed()
        .setTitle("Comandos Botato")
        .setDescription(infoMessage.replace(/\,/g, ""))
        .setColor(theme.default),
    });
  }
}
