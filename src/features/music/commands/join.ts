import { Command } from '@sapphire/framework';
import { resolveRequesterVoiceChannel } from '../lib/voice.js';

export class JoinCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Join your voice channel',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder.setName('join').setDescription('Join your voice channel'),
      {
        idHints: ['1529465461253734440', '1529466508424642702'],
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

    const voiceChannel = resolveRequesterVoiceChannel(interaction);
    if (!voiceChannel) {
      await interaction.reply({
        content: 'Join a voice channel first.',
        ephemeral: true,
      });
      return;
    }

    try {
      await this.container.musicSessions.join(guildId, voiceChannel.id);
      await interaction.reply(`Joined **${voiceChannel.name}**.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to join voice.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}
