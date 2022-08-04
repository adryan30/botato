import { Discord, Slash } from "discordx";
import { CommandInteraction } from "discord.js";

@Discord()
export abstract class PingService {
  @Slash("ping", {
    description: "Retorna o ping do bot",
  })
  showPing(interaction: CommandInteraction) {
    return interaction.reply(`🏓 ${Math.round(interaction.client.ws.ping)}ms`);
  }
}
