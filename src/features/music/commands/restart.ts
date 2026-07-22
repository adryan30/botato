import { Command } from '@sapphire/framework';

export class RestartCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Restart the current track from the beginning',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('restart')
        .setDescription('Restart the current track from the beginning'),
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
      await this.container.musicSessions.restart(guildId);
      await interaction.reply('Restarted the current track.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to restart.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
