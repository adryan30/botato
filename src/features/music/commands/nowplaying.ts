import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { resummonEphemeralContent } from '../lib/control-surface/session-ui.js';

export class NowPlayingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Re-summon or point to the control surface',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('nowplaying')
          .setDescription('Re-summon or point to the control surface'),
      {
        idHints: ['1529466509636669551'],
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

    try {
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
          : 'Failed to re-summon the control surface.';
      await interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
