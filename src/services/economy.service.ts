import {
  Client,
  ContextMenu,
  Discord,
  Guard,
  Slash,
  SlashChoice,
  SlashOption,
} from "discordx";
import { CommandInteraction, ContextMenuInteraction, User } from "discord.js";
import { theme } from "../config";
import { AdminGuard, AuthorHasNoWalletEmbed, EconomyGuard } from "../guards";
import { findDrolhosEmoji } from "../utils";
import { UserRepository } from "../repositories/user.repository";
import {
  createAwardEmbed,
  createRemoveEmbed,
  createTransferEmbed,
  createWalletEmbed,
  WalletAlreadyExistsEmbed,
  WalletCreatedEmbed,
} from "../embeds/currency";

type Currency = "drolhos" | "tickets";

const CurrencyChoices = {
  Drolhos: "drolhos",
  Bilhetes: "tickets",
};

@Discord()
export abstract class EconomyService {
  private userRepository = UserRepository.getInstance();

  @Slash("register", {
    description: "Registra o usuário no sistema de economia",
  })
  async register(interaction: CommandInteraction, _client: Client) {
    await this.userRepository
      .createUser(interaction.user.id)
      .then(() => interaction.reply({ embeds: [WalletCreatedEmbed()] }))
      .catch(() => interaction.reply({ embeds: [WalletAlreadyExistsEmbed] }));
  }

  @Slash("balance", {
    description: "Mostra seu saldo no servidor",
  })
  @Guard(EconomyGuard)
  @ContextMenu("USER", "Saldo")
  async balance(
    @SlashOption("user", {
      description: "Usuário a ser buscado",
      required: false,
      type: "USER",
    })
    user: User,
    interaction: CommandInteraction
  ) {
    const { guildId } = interaction;
    const userObj: User = user ?? interaction.user;
    const searchUser = this.userRepository.getGuildMember(userObj.id, guildId);
    const userData = await this.userRepository.getUser(userObj.id);

    return interaction.reply({
      embeds: [
        createWalletEmbed(
          searchUser.displayName,
          userData.balance,
          userData.tickets
        ),
      ],
    });
  }

  @ContextMenu("USER", "Saldo")
  async balanceMenu(interaction: ContextMenuInteraction) {
    const { targetId, guildId } = interaction;
    const searchUser = this.userRepository.getGuildMember(targetId, guildId);
    const userData = await this.userRepository.getUser(targetId);

    if (!userData) {
      return interaction.reply({
        embeds: [
          AuthorHasNoWalletEmbed.setDescription(
            "O usuário clicado não tem uma carteira... Tente usar /register."
          ),
        ],
      });
    }

    return interaction.reply({
      embeds: [
        createWalletEmbed(
          searchUser.displayName,
          userData.balance,
          userData.tickets
        ),
      ],
    });
  }

  @Slash("award", {
    description: "Recompensa o usuário mencionado com a moeda selecionada",
  })
  @Guard(AdminGuard, EconomyGuard)
  async award(
    @SlashOption("user", {
      description: "Usuário a ser recompensado",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashChoice(CurrencyChoices)
    @SlashOption("currency", {
      description: "Qual moeda deseja utilizar?",
      required: true,
    })
    currency: Currency,
    @SlashOption("value", {
      description: "Valor da recompensa",
      required: true,
      type: "INTEGER",
    })
    awardValue: number,
    interaction: CommandInteraction
  ) {
    const { id } = user;
    const { guildId } = interaction;
    const { displayName } = this.userRepository.getGuildMember(id, guildId);
    await this.userRepository.updateUser(
      id,
      awardValue,
      `increase|${currency}`
    );
    return interaction.reply({
      embeds: [createAwardEmbed(displayName, awardValue, currency)],
    });
  }

  @Slash("remove", {
    description: "Retira a moeada selecionada do usuário mencionado",
  })
  @Guard(AdminGuard, EconomyGuard)
  async remove(
    @SlashOption("user", {
      description: "Usuário a ser recompensado",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashChoice(CurrencyChoices)
    @SlashOption("currency", {
      description: "Qual moeda deseja utilizar?",
      required: true,
    })
    currency: Currency,
    @SlashOption("value", {
      description: "Valor da recompensa",
      required: true,
      type: "INTEGER",
    })
    removeValue: number,
    interaction: CommandInteraction
  ) {
    const { id } = user;
    const { guildId } = interaction;
    const { displayName } = this.userRepository.getGuildMember(id, guildId);
    await this.userRepository.updateUser(
      id,
      removeValue,
      `decrease|${currency}`
    );

    return interaction.reply({
      embeds: [createRemoveEmbed(displayName, removeValue, currency)],
    });
  }

  @Slash("give", {
    description: "Transfere drolhoscoins entre usuários",
  })
  @Guard(EconomyGuard)
  async give(
    @SlashOption("destinatário", {
      description: "Usuário a ser transferido",
      required: true,
      type: "USER",
    })
    user: User,
    @SlashChoice("Drolhos", "drolhos")
    @SlashChoice("Bilhetes", "tickets")
    @SlashOption("currency", {
      description: "Qual moeda deseja utilizar?",
      required: true,
    })
    currency: Currency,
    @SlashOption("value", {
      description: "Valor da transferência",
      required: true,
      type: "INTEGER",
    })
    tradeValue: number,
    interaction: CommandInteraction
  ) {
    const { id: receiverId } = user;
    const {
      user: { id: authorId },
      guildId,
    } = interaction;
    const author = this.userRepository.getGuildMember(authorId, guildId);
    const receiver = this.userRepository.getGuildMember(receiverId, guildId);

    await this.userRepository.updateUser(
      authorId,
      tradeValue,
      "transfer|drolhos",
      receiverId
    );
    return interaction.reply({
      embeds: [
        createTransferEmbed(
          author.displayName,
          receiver.displayName,
          tradeValue,
          currency
        ),
      ],
    });
  }

  @Slash("totaldrolhos", {
    description: "Lista a quantia total de drolhos no servidor",
  })
  async totalDrolhos(interaction: CommandInteraction) {
    const allUsers = await this.userRepository.getAllUsers();
    const allDrolhos = allUsers.reduce((p, c) => p + c.balance, 0);
    return interaction.reply({
      embeds: [
        {
          title: "Saldo do servidor",
          description: `Atualmente, todas as carteiras no servidor possuem ${allDrolhos} ${findDrolhosEmoji()} no total.`,
          color: theme.default,
        },
      ],
    });
  }

  @Slash("totalcareca", {
    description: "Lista a quantia total de drolhos para o Bruno Careca",
  })
  async totalCareca(interaction: CommandInteraction) {
    const allUsers = await this.userRepository.getAllUsers();
    const allDrolhos = allUsers.reduce((p, c) => p + c.balance, 0);
    const brunoData = await this.userRepository.getUser("259449047373447169");
    const remainingDrolhos = 150 - (allDrolhos - brunoData.balance);
    const drolhosEmoji = findDrolhosEmoji();

    return interaction.reply({
      embeds: [
        {
          title: "Saldo do servidor",
          description: `Atualmente, todas as carteiras no servidor possuem ${allDrolhos} ${drolhosEmoji}, faltam ${remainingDrolhos} ${drolhosEmoji} para o Bruno Careca.`,
          color: theme.default,
        },
      ],
    });
  }
}
