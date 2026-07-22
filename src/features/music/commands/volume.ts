import { Command } from '@sapphire/framework';

export class VolumeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Set the music session volume',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('volume')
          .setDescription('Set the music session volume')
          .addIntegerOption((option) =>
            option
              .setName('level')
              .setDescription('Volume from 0 to 100')
              .setRequired(true)
              .setMinValue(0)
              .setMaxValue(100),
          ),
      {
        idHints: ['1529489029400232057'],
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

    const level = interaction.options.getInteger('level', true);

    try {
      await this.container.musicSessions.setVolume(guildId, level);
      await interaction.reply(`Volume set to **${level}**.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to set volume.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
