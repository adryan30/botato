import { Discord, Slash } from "discordx";
import { CommandInteraction } from "discord.js";

@Discord()
export abstract class PingService {
  @Slash("ping", {
    description: "Returns the bot ping",
    descriptionLocalizations: { "pt-BR": "Retorna o ping do bot" },
    nameLocalizations: { "pt-BR": "ping" },
  })
  showPing(interaction: CommandInteraction) {
    return interaction.reply(`🏓 ${Math.round(interaction.client.ws.ping)}ms`);
  }
}
