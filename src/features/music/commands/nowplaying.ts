import { Command } from '@sapphire/framework';

export class NowPlayingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Show the currently playing track',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('nowplaying')
          .setDescription('Show the currently playing track'),
      {
        idHints: ['1529465462826467458', '1529466509636669551'],
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

    try {
      const track = this.container.musicSessions.nowPlaying(guildId);
      if (!track) {
        await interaction.reply('Nothing is playing right now.');
        return;
      }

      const line = track.uri
        ? `Now playing: **${track.title}**\n${track.uri}`
        : `Now playing: **${track.title}**`;
      await interaction.reply(line);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to read now playing.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
