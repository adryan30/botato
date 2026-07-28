import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { playConfirmation } from '../lib/play-confirmation.js';
import { resolveRequesterVoiceChannel } from '../lib/voice.js';

export class PlayCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Play a YouTube URL or search query in your voice channel',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('play')
          .setDescription(
            'Play a YouTube URL or search query in your voice channel',
          )
          .addStringOption((option) =>
            option
              .setName('query')
              .setDescription('YouTube URL or search query')
              .setRequired(true),
          ),
      {
        idHints: ['1529466506562244618'],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const voiceChannel = resolveRequesterVoiceChannel(interaction);
    if (!voiceChannel) {
      await interaction.reply({
        content: 'Join a voice channel first.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.channelId) {
      await interaction.reply({
        content: 'This command can only be used in a text channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const query = interaction.options.getString('query', true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      let wasPlaying = false;
      try {
        wasPlaying = this.container.musicSessions.nowPlaying(guildId) !== null;
      } catch {
        wasPlaying = false;
      }

      this.container.musicControlSurface.noteTextChannel(
        guildId,
        interaction.channelId,
      );
      const added = await this.container.musicSessions.play(
        guildId,
        query,
        voiceChannel.id,
      );
      await interaction.editReply(playConfirmation(wasPlaying, added));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to play that query.';
      await interaction.editReply(message);
    }
  }
}
