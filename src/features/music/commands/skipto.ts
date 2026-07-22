import { Command } from '@sapphire/framework';

export class SkipToCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Skip to a specific queue position',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('skipto')
        .setDescription('Skip to a specific queue position')
        .addIntegerOption((option) =>
          option
            .setName('position')
            .setDescription('1-based queue position to play next')
            .setRequired(true)
            .setMinValue(1),
        ),
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

    const position = interaction.options.getInteger('position', true);

    try {
      await this.container.musicSessions.skipTo(guildId, position);
      const track = this.container.musicSessions.nowPlaying(guildId);
      await interaction.reply(
        track
          ? `Skipped to **${track.title}**.`
          : `Skipped to position ${position}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to skip to that position.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
