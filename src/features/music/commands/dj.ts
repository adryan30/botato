import { Subcommand } from '@sapphire/plugin-subcommands';
import { MessageFlags } from 'discord.js';
import { resolveRequesterVoiceChannel } from '../lib/voice.js';

export class DjCommand extends Subcommand {
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      description: 'DJ mode: set a vibe or turn it off',
      subcommands: [
        { name: 'vibe', chatInputRun: 'chatInputVibe' },
        { name: 'off', chatInputRun: 'chatInputOff' },
      ],
    });
  }

  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('dj')
          .setDescription('DJ mode: set a vibe or turn it off')
          .addSubcommand((sub) =>
            sub
              .setName('vibe')
              .setDescription('Enable or refresh DJ mode with a vibe')
              .addStringOption((option) =>
                option
                  .setName('query')
                  .setDescription('Natural-language DJ vibe (max 200 chars)')
                  .setRequired(true)
                  .setMaxLength(200),
              ),
          )
          .addSubcommand((sub) =>
            sub
              .setName('off')
              .setDescription('Stop DJ refills (voice and queue stay)'),
          ),
      {
        idHints: [],
      },
    );
  }

  public async chatInputVibe(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const voiceChannel = resolveRequesterVoiceChannel(interaction);
    if (!voiceChannel) {
      await interaction.reply({
        content: 'Join a voice channel first.',
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

    const query = interaction.options.getString('query', true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      this.container.musicControlSurface.noteTextChannel(
        guildId,
        interaction.channelId,
      );
      const result = await this.container.djMode.vibe(
        guildId,
        query,
        voiceChannel.id,
      );
      await interaction.editReply(
        `DJ mode on · **${result.vibe}** · queued ${result.enqueued} track${result.enqueued === 1 ? '' : 's'}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to set DJ vibe.';
      await interaction.editReply(message);
    }
  }

  public async chatInputOff(
    interaction: Subcommand.ChatInputCommandInteraction,
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

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await this.container.djMode.off(guildId);
      await interaction.editReply(
        result.alreadyOff
          ? 'DJ mode is already off.'
          : 'DJ mode off. Voice and queue left as-is.',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to turn DJ off.';
      await interaction.editReply(message);
    }
  }
}
