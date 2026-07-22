import { Command } from '@sapphire/framework';

export class MoveCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Move a queued track to another position',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('move')
          .setDescription('Move a queued track to another position')
          .addIntegerOption((option) =>
            option
              .setName('from')
              .setDescription('1-based queue position to move from')
              .setRequired(true)
              .setMinValue(1),
          )
          .addIntegerOption((option) =>
            option
              .setName('to')
              .setDescription('1-based queue position to move to')
              .setRequired(true)
              .setMinValue(1),
          ),
      {
        idHints: ['1529493016245571714'],
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

    const from = interaction.options.getInteger('from', true);
    const to = interaction.options.getInteger('to', true);

    try {
      const before = this.container.musicSessions.queue(guildId);
      const moved = before[from - 1];
      await this.container.musicSessions.move(guildId, from, to);
      await interaction.reply(
        moved
          ? `Moved **${moved.title}** from ${from} to ${to}.`
          : `Moved queue position ${from} to ${to}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to move that queue entry.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
