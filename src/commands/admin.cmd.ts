import { Discord, Guard, Slash, SlashOption } from "discordx";
import {
  CommandInteraction,
  GuildMember,
  EmbedBuilder,
  TextChannel,
  ApplicationCommandOptionType,
} from "discord.js";
import { injectable } from "tsyringe";
import { AdminGuard } from "../guards";
import { UserRepository } from "../repositories/user.repository";
import { Utils } from "../services/utils.service";
import { Theme } from "../services/theme.service";

// TODO Reimpletment admin guard
@Discord()
@injectable()
export class AdminService {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _utils: Utils,
    private readonly _theme: Theme
  ) {}

  @Slash("clear", {
    nameLocalizations: { "pt-BR": "limpar" },
    description: "Clears all channel messages",
    descriptionLocalizations: {
      "pt-BR": "Limpa as mensagens presentes no canal",
    },
    defaultMemberPermissions: "ManageMessages",
  })
  async clear(interaction: CommandInteraction) {
    if (!(interaction.channel instanceof TextChannel)) return;
    await interaction.deferReply();
    const messagesDeleted = await this._utils.cleanChannel(interaction.channel);
    const embed = new EmbedBuilder({
      title: "Limpeza concluída",
      description: `${messagesDeleted} mensagens apagadas!`,
      color: this._theme.colors.default,
    });

    await interaction.reply({ embeds: [embed] });
    setTimeout(() => interaction.deleteReply(), 5000);
  }

  @Slash("make-admin", {
    nameLocalizations: { "pt-BR": "tornar-admin" },
    description: "Turn normal users into admins",
    descriptionLocalizations: {
      "pt-BR": "Transforma usuários comuns em admins",
    },
  })
  async makeAdmin(
    @SlashOption("usuário", {
      description: "Usuário a ser transformado",
      required: true,
      type: ApplicationCommandOptionType.User,
    })
    user: GuildMember,
    interaction: CommandInteraction
  ) {
    const id = user.id;
    await this._userRepository.makeAdmin(id);
    await interaction.reply(
      `Usuário ${user.displayName} agora é um administrador!`
    );
  }
}
