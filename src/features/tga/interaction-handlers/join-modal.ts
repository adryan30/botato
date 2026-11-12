import {
  InteractionHandler,
  InteractionHandlerTypes,
} from '@sapphire/framework';
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';
import { formatJoined } from '../lib/copy.js';
import { replyTga, tgaFailureContent } from '../lib/reply.js';
import { parseJoinModalCustomId } from '../lib/signup-ids.js';

export class TgaJoinModalHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    const eventId = parseJoinModalCustomId(interaction.customId);
    if (!eventId) {
      return this.none();
    }
    return this.some(eventId);
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    eventId: string,
  ) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await replyTga(interaction, 'Use este botão no servidor.', true);
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await this.container.tga.join({
        guildId,
        userId: interaction.user.id,
        steamInput: interaction.fields.getTextInputValue('steam'),
        eventId,
      });
      await replyTga(interaction, formatJoined(result), true);
    } catch (error) {
      await replyTga(
        interaction,
        tgaFailureContent(error, (cause) => {
          const message =
            cause instanceof Error
              ? (cause.stack ?? cause.message)
              : String(cause);
          this.container.logger.error(message);
        }),
        true,
      );
    }
  }
}
