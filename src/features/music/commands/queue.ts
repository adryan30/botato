import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import {
  formatFullQueueList,
  resummonEphemeralContent,
} from '../lib/control-surface/session-ui.js';

export class QueueCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description:
        'Re-summon the control surface, or peek the full queue',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('queue')
          .setDescription(
            'Re-summon the control surface, or peek the full queue',
          )
          .addBooleanOption((option) =>
            option
              .setName('full')
              .setDescription(
                'Show the full queue as an ephemeral list (does not bump)',
              )
              .setRequired(false),
          ),
      {
        idHints: ['1529493101410779310'],
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
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.channelId) {
      await interaction.reply({
        content: 'This command can only be used in a text channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const full = interaction.options.getBoolean('full') ?? false;

    try {
      if (full) {
        const snapshot = this.container.musicSessions.snapshot(guildId);
        await interaction.reply({
          content: formatFullQueueList(snapshot),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const { stickyChannelId } =
        await this.container.musicControlSurface.resummon(
          guildId,
          interaction.channelId,
        );

      await interaction.reply({
        content: resummonEphemeralContent(
          stickyChannelId,
          interaction.channelId,
        ),
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to read the music session.';
      await interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
