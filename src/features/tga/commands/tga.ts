import { Subcommand } from '@sapphire/plugin-subcommands';
import { MessageFlags, type Client } from 'discord.js';
import {
  formatCancelled,
  formatClosedPost,
  formatEnded,
  formatCreatePost,
  formatDrawAnnouncement,
  formatJoined,
  formatLeft,
  formatRemoved,
  formatShow,
  formatStatus,
} from '../lib/copy.js';
import { replyTga, tgaFailureContent } from '../lib/reply.js';
import { joinButtonRow } from '../lib/signup-post.js';

export class TgaCommand extends Subcommand {
  public constructor(
    context: Subcommand.LoaderContext,
    options: Subcommand.Options,
  ) {
    super(context, {
      ...options,
      description: 'Troca Generosa de Ativos',
      subcommands: [
        { name: 'create', chatInputRun: 'chatInputCreate' },
        { name: 'join', chatInputRun: 'chatInputJoin' },
        { name: 'leave', chatInputRun: 'chatInputLeave' },
        { name: 'draw', chatInputRun: 'chatInputDraw' },
        { name: 'show', chatInputRun: 'chatInputShow' },
        { name: 'status', chatInputRun: 'chatInputStatus' },
        { name: 'remove', chatInputRun: 'chatInputRemove' },
        { name: 'cancel', chatInputRun: 'chatInputCancel' },
        { name: 'end', chatInputRun: 'chatInputEnd' },
      ],
    });
  }

  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('tga')
        .setDescription('Troca Generosa de Ativos')
        .addSubcommand((sub) =>
          sub
            .setName('create')
            .setDescription('Abrir uma troca neste servidor')
            .addStringOption((option) =>
              option
                .setName('nome')
                .setDescription('Nome da troca')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(80),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('join')
            .setDescription('Entrar com seu perfil ou wishlist da Steam')
            .addStringOption((option) =>
              option
                .setName('steam')
                .setDescription('Link do perfil, link da wishlist ou SteamID64')
                .setRequired(true)
                .setMaxLength(300),
            ),
        )
        .addSubcommand((sub) =>
          sub.setName('leave').setDescription('Sair da troca antes do sorteio'),
        )
        .addSubcommand((sub) =>
          sub
            .setName('draw')
            .setDescription('Sortear e mandar cada match no privado'),
        )
        .addSubcommand((sub) =>
          sub
            .setName('show')
            .setDescription('Ver o seu match e a wishlist, só para você'),
        )
        .addSubcommand((sub) =>
          sub
            .setName('status')
            .setDescription('Ver quem entrou e se a DM chegou'),
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Tirar alguém da troca antes do sorteio')
            .addUserOption((option) =>
              option
                .setName('pessoa')
                .setDescription('Quem sai da troca')
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('cancel')
            .setDescription('Cancelar a troca antes do sorteio'),
        )
        .addSubcommand((sub) =>
          sub
            .setName('end')
            .setDescription('Encerrar a troca depois do sorteio'),
        ),
    );
  }

  public async chatInputCreate(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    if (!guildId || !channelId) {
      await replyTga(
        interaction,
        'Use este comando num canal do servidor.',
        true,
      );
      return;
    }

    try {
      const event = await this.container.tga.createEvent({
        guildId,
        organizerId: interaction.user.id,
        name: interaction.options.getString('nome', true),
        channelId,
      });
      await interaction.reply({
        content: formatCreatePost(event.name),
        components: [joinButtonRow(event.id)],
      });
      try {
        const message = await interaction.fetchReply();
        await this.container.tga.attachSignupMessage(event.id, message.id);
      } catch (error) {
        this.#log(error);
      }
    } catch (error) {
      await replyTga(
        interaction,
        tgaFailureContent(error, (cause) => this.#log(cause)),
        true,
      );
    }
  }

  public async chatInputJoin(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const guildId = await this.#guildId(interaction);
    if (!guildId) {
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await this.container.tga.join({
        guildId,
        userId: interaction.user.id,
        steamInput: interaction.options.getString('steam', true),
      });
      await replyTga(interaction, formatJoined(result), true);
    } catch (error) {
      await replyTga(
        interaction,
        tgaFailureContent(error, (cause) => this.#log(cause)),
        true,
      );
    }
  }

  public async chatInputLeave(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const guildId = await this.#guildId(interaction);
    if (!guildId) {
      return;
    }

    try {
      const eventName = await this.container.tga.leave({
        guildId,
        userId: interaction.user.id,
      });
      await replyTga(interaction, formatLeft(eventName), true);
    } catch (error) {
      await replyTga(
        interaction,
        tgaFailureContent(error, (cause) => this.#log(cause)),
        true,
      );
    }
  }

  public async chatInputDraw(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const guildId = await this.#guildId(interaction);
    if (!guildId) {
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await this.container.tga.draw({
        guildId,
        organizerId: interaction.user.id,
      });
      await closeSignupPost(
        interaction.client,
        result,
        formatClosedPost(result.eventName, 'drawn'),
      );
      const announcement = formatDrawAnnouncement(result);
      const channel = interaction.channel;
      if (channel?.isTextBased() && !channel.isDMBased()) {
        try {
          await channel.send(announcement);
          await replyTga(interaction, 'Sorteio feito.', true);
          return;
        } catch (error) {
          this.#log(error);
        }
      }
      await replyTga(interaction, announcement, true);
    } catch (error) {
      await replyTga(
        interaction,
        tgaFailureContent(error, (cause) => this.#log(cause)),
        true,
      );
    }
  }

  public async chatInputShow(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const guildId = await this.#guildId(interaction);
    if (!guildId) {
      return;
    }

    try {
      const show = await this.container.tga.show({
        guildId,
        userId: interaction.user.id,
      });
      await replyTga(interaction, formatShow(show), true);
    } catch (error) {
      await replyTga(
        interaction,
        tgaFailureContent(error, (cause) => this.#log(cause)),
        true,
      );
    }
  }

  public async chatInputStatus(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const guildId = await this.#guildId(interaction);
    if (!guildId) {
      return;
    }

    try {
      const status = await this.container.tga.status({
        guildId,
        organizerId: interaction.user.id,
      });
      await replyTga(interaction, formatStatus(status), true);
    } catch (error) {
      await replyTga(
        interaction,
        tgaFailureContent(error, (cause) => this.#log(cause)),
        true,
      );
    }
  }

  public async chatInputRemove(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const guildId = await this.#guildId(interaction);
    if (!guildId) {
      return;
    }

    try {
      const eventName = await this.container.tga.remove({
        guildId,
        organizerId: interaction.user.id,
        userId: interaction.options.getUser('pessoa', true).id,
      });
      await replyTga(interaction, formatRemoved(eventName), true);
    } catch (error) {
      await replyTga(
        interaction,
        tgaFailureContent(error, (cause) => this.#log(cause)),
        true,
      );
    }
  }

  public async chatInputCancel(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const guildId = await this.#guildId(interaction);
    if (!guildId) {
      return;
    }

    try {
      const event = await this.container.tga.cancel({
        guildId,
        organizerId: interaction.user.id,
      });
      await closeSignupPost(
        interaction.client,
        event,
        formatClosedPost(event.name, 'cancelled'),
      );
      await replyTga(interaction, formatCancelled(event.name), true);
    } catch (error) {
      await replyTga(
        interaction,
        tgaFailureContent(error, (cause) => this.#log(cause)),
        true,
      );
    }
  }

  public async chatInputEnd(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const guildId = await this.#guildId(interaction);
    if (!guildId) {
      return;
    }

    try {
      const event = await this.container.tga.end({
        guildId,
        organizerId: interaction.user.id,
      });
      await closeSignupPost(
        interaction.client,
        event,
        formatClosedPost(event.name, 'ended'),
      );
      await replyTga(interaction, formatEnded(event.name), true);
    } catch (error) {
      await replyTga(
        interaction,
        tgaFailureContent(error, (cause) => this.#log(cause)),
        true,
      );
    }
  }

  async #guildId(
    interaction: Subcommand.ChatInputCommandInteraction,
  ): Promise<string | null> {
    if (!interaction.guildId) {
      await replyTga(interaction, 'Use este comando no servidor.', true);
      return null;
    }
    return interaction.guildId;
  }

  #log(error: unknown): void {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    this.container.logger.error(message);
  }
}

async function closeSignupPost(
  client: Client,
  post: { channelId: string; messageId: string | null },
  content: string,
): Promise<void> {
  if (!post.messageId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(post.channelId);
    if (!channel?.isTextBased() || channel.isDMBased()) {
      return;
    }
    await channel.messages.edit(post.messageId, { content, components: [] });
  } catch {
    return;
  }
}
