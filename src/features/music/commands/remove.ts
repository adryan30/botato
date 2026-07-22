import { Command } from '@sapphire/framework';

export class RemoveCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Remove a track from the queue by position',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('remove')
        .setDescription('Remove a track from the queue by position')
        .addIntegerOption((option) =>
          option
            .setName('position')
            .setDescription('1-based queue position to remove')
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
      const before = this.container.musicSessions.queue(guildId);
      const removed = before[position - 1];
      await this.container.musicSessions.remove(guildId, position);
      await interaction.reply(
        removed
          ? `Removed **${removed.title}** from the queue.`
          : `Removed queue position ${position}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to remove that queue position.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
