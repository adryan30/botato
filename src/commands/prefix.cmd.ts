import { Discord, Slash, SlashGroup, SlashOption } from "discordx";
import { CommandInteraction } from "discord.js";
import { injectable } from "tsyringe";
import { Utils } from "../services/utils.service";
import { WinstonLogger } from "../services/logger.service";

@Discord()
@SlashGroup({
  name: "prefix",
  nameLocalizations: { "pt-BR": "prefixo" },
  description: "Commands related to prefix",
  descriptionLocalizations: { "pt-BR": "Comandos relacionados a prefixo" },
})
@injectable()
export class PrefixCommand {
  constructor(
    private readonly _utils: Utils,
    private readonly _logger: WinstonLogger
  ) {}

  @Slash("add", {
    description: "Adds a prefix to your username",
    descriptionLocalizations: { "pt-BR": "Adiciona um prefixo ao nome" },
    nameLocalizations: { "pt-BR": "adicionar" },
  })
  @SlashGroup("prefix")
  async changePrefix(
    @SlashOption("prefix", {
      description: "Prefix to be added",
      descriptionLocalizations: { "pt-BR": "Prefixo a ser adicionado" },
      nameLocalizations: { "pt-BR": "prefixo" },
      required: true,
    })
    prefix: string,
    interaction: CommandInteraction
  ) {
    const member = this._utils.findUser(interaction);
    const oldNickname = member.displayName;

    await member
      .setNickname(`[${prefix}] ${oldNickname}`)
      .catch((err) => this._logger.log.error(err));
  }

  @Slash("remove", {
    description: "Remove the prefix from your name",
    descriptionLocalizations: { "pt-BR": "Remove o prefixo do nome" },
    nameLocalizations: { "pt-BR": "remover" },
  })
  @SlashGroup("prefix")
  async removePrefix(interaction: CommandInteraction) {
    const member = this._utils.findUser(interaction);
    const oldNickname = member.displayName;
    await member.setNickname(oldNickname.replace(/\[.*]\s/, ""));
  }
}
