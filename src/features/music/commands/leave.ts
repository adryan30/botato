import { Command } from '@sapphire/framework';

export class LeaveCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Leave the voice channel and end the music session',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('leave')
          .setDescription('Leave the voice channel and end the music session'),
      {
        idHints: ['1529465455105015840', '1529466505538965534'],
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
      await this.container.musicSessions.leave(guildId);
      await interaction.reply('Left the voice channel.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to leave voice.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
