import { Discord, Slash } from "discordx";
import { CommandInteraction } from "discord.js";

const category = ":globe_with_meridians: Geral";
@Discord()
export abstract class PingService {
  @Slash("ping", {
    description: "Retorna o ping do bot",
  })
  showPing(interaction: CommandInteraction) {
    return interaction.reply(`🏓 ${Math.round(interaction.client.ws.ping)}ms`);
  }
}
