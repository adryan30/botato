import { Command } from '@sapphire/framework';

export class ResumeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Resume the paused track',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder.setName('resume').setDescription('Resume the paused track'),
      {
        idHints: ['1529489114238550046'],
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
      await this.container.musicSessions.resume(guildId);
      await interaction.reply('Resumed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to resume.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
