import {
  InteractionHandler,
  InteractionHandlerTypes,
} from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { joinModal } from '../lib/signup-post.js';
import { parseJoinButtonCustomId } from '../lib/signup-ids.js';
import { replyTga } from '../lib/reply.js';

export class TgaJoinButtonHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    const eventId = parseJoinButtonCustomId(interaction.customId);
    if (!eventId) {
      return this.none();
    }
    return this.some(eventId);
  }

  public override async run(interaction: ButtonInteraction, eventId: string) {
    if (!interaction.guildId) {
      await replyTga(interaction, 'Use este botão no servidor.', true);
      return;
    }

    await interaction.showModal(joinModal(eventId));
  }
}
