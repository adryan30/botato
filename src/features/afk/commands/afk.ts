import { Command } from '@sapphire/framework';
import type { AfkToggleResult } from '../lib/mark/afk-service.js';

export class AfkCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Toggle an AFK prefix on your server nickname',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('afk')
        .setDescription('Toggle an AFK prefix on your server nickname')
        .addStringOption((option) =>
          option
            .setName('label')
            .setDescription(
              'Bare label for the prefix (default AFK → [AFK])',
            )
            .setRequired(false),
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

    const label = interaction.options.getString('label') ?? undefined;

    try {
      const result = await this.container.afk.toggle(
        guildId,
        interaction.user.id,
        label,
      );

      await interaction.reply({
        content: formatAfkReply(result),
        ephemeral: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to toggle AFK.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}

function formatAfkReply(result: AfkToggleResult): string {
  if (result.kind === 'marked') {
    const applied = result.nicknameApplied
      ? `Nickname set to \`${result.targetNickname}\`.`
      : `Could not change your nickname (owner or role hierarchy). Set it to \`${result.targetNickname}\` yourself.`;
    return `AFK mark set with prefix \`${result.prefix}\`. ${applied}`;
  }

  const restored =
    result.restoredNickname === null
      ? 'your username (no server nickname)'
      : `\`${result.restoredNickname}\``;
  const applied = result.nicknameApplied
    ? `Nickname restored to ${restored}.`
    : `Could not change your nickname (owner or role hierarchy). Set it to ${restored} yourself.`;
  return `AFK mark cleared. ${applied}`;
}
