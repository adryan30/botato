import { Command } from '@sapphire/framework';
import type { RepeatMode } from '../lib/music-session-service.js';

const REPEAT_MODES = ['off', 'track', 'queue'] as const satisfies readonly RepeatMode[];

export class RepeatCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Set the music session repeat mode',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('repeat')
        .setDescription('Set the music session repeat mode')
        .addStringOption((option) =>
          option
            .setName('mode')
            .setDescription('Repeat mode for this guild music session')
            .setRequired(true)
            .addChoices(
              { name: 'Off', value: 'off' },
              { name: 'Track', value: 'track' },
              { name: 'Queue', value: 'queue' },
            ),
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

    const mode = interaction.options.getString('mode', true);
    if (!isRepeatMode(mode)) {
      await interaction.reply({
        content: 'Repeat mode must be off, track, or queue.',
        ephemeral: true,
      });
      return;
    }

    try {
      await this.container.musicSessions.setRepeat(guildId, mode);
      await interaction.reply(`Repeat mode set to **${mode}**.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to set the repeat mode.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}

function isRepeatMode(value: string): value is RepeatMode {
  return (REPEAT_MODES as readonly string[]).includes(value);
}
