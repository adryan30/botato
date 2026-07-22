import { Command } from '@sapphire/framework';
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
        idHints: ['1529465457986375680', '1529466506562244618'],
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
        ephemeral: true,
      });
      return;
    }

    const voiceChannel = resolveRequesterVoiceChannel(interaction);
    if (!voiceChannel) {
      await interaction.reply({
        content: 'Join a voice channel first.',
        ephemeral: true,
      });
      return;
    }

    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    try {
      let wasPlaying = false;
      try {
        wasPlaying = this.container.musicSessions.nowPlaying(guildId) !== null;
      } catch {
        wasPlaying = false;
      }

      await this.container.musicSessions.play(
        guildId,
        query,
        voiceChannel.id,
      );
      const snapshot = this.container.musicSessions.snapshot(guildId);
      if (!snapshot.nowPlaying) {
        await interaction.editReply('No tracks found for that query.');
        return;
      }

      if (!wasPlaying) {
        await interaction.editReply(
          `Playing **${snapshot.nowPlaying.title}**`,
        );
        return;
      }

      const queued = snapshot.queue.at(-1);
      if (queued) {
        await interaction.editReply(`Queued **${queued.title}**`);
        return;
      }

      await interaction.editReply(
        `Playing **${snapshot.nowPlaying.title}**`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to play that query.';
      await interaction.editReply(message);
    }
  }
}
