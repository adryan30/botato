import { Command } from '@sapphire/framework';

export class PauseCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Pause the current track',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder.setName('pause').setDescription('Pause the current track'),
      {
        idHints: ['1529489027160342569'],
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
      await this.container.musicSessions.pause(guildId);
      await interaction.reply('Paused.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to pause.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
