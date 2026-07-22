import { Command } from '@sapphire/framework';

export class ShuffleCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Shuffle upcoming tracks in the queue',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('shuffle')
        .setDescription('Shuffle upcoming tracks in the queue'),
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
      await this.container.musicSessions.shuffle(guildId);
      const count = this.container.musicSessions.queue(guildId).length;
      await interaction.reply(
        count === 0
          ? 'Shuffled the queue. Nothing left to play next.'
          : `Shuffled ${count} upcoming track${count === 1 ? '' : 's'}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to shuffle the queue.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
