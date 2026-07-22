import { Command } from '@sapphire/framework';

export class ClearCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Clear upcoming tracks from the queue',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('clear')
          .setDescription('Clear upcoming tracks from the queue'),
      {
        idHints: ['1529493021530525898'],
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
      await this.container.musicSessions.clear(guildId);
      await interaction.reply('Cleared the queue.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to clear the queue.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
