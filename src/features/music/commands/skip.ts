import { Command } from '@sapphire/framework';

export class SkipCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Skip the current track',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('skip').setDescription('Skip the current track'),
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
      await this.container.musicSessions.skip(guildId);
      const track = this.container.musicSessions.nowPlaying(guildId);
      if (!track) {
        await interaction.reply('Skipped. Nothing left in the queue.');
        return;
      }
      await interaction.reply(`Skipped. Now playing **${track.title}**.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to skip.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
