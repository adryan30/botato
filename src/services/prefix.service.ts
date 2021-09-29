import { Discord, Slash, SlashOption } from "discordx";
import { CommandInteraction } from "discord.js";
import { getUser } from "../utils";

const category = ":writing_hand: Prefix";
@Discord()
export abstract class PrefixService {
  @Slash("prefix", {
    description: "Adiciona um prefixo ao nome",
  })
  async changePrefix(
    @SlashOption("prefixo", {
      description: "Prefixo a ser adicionado",
      required: true,
    })
    prefix: string,
    interaction: CommandInteraction
  ) {
    const member = getUser(interaction, interaction.user.id);
    const oldNickname = member.displayName;

    await member
      .setNickname(`[${prefix}] ${oldNickname}`)
      .catch((err) => console.error(err));
  }

  @Slash("rp", {
    description: "Remove o prefixo do nome",
  })
  async removePrefix(interaction: CommandInteraction) {
    const member = getUser(interaction, interaction.user.id);
    const oldNickname = member.displayName;
    await member.setNickname(oldNickname.replace(/\[.*\]\s/, ""));
  }
}
