import { Command } from '@sapphire/framework';
import { sessionReplyPayload } from '../lib/session-ui.js';

export class QueueCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Show the music session (now playing, queue, and controls)',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('queue')
        .setDescription(
          'Show the music session (now playing, queue, and controls)',
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

    try {
      const snapshot = this.container.musicSessions.snapshot(guildId);
      await interaction.reply(sessionReplyPayload(snapshot));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to read the music session.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
