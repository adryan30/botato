import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import {
  nextRepeatMode,
  parseSessionControlCustomId,
  sessionReplyPayload,
  type SessionControlAction,
} from '../lib/session-ui.js';

export class SessionControlsHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    const action = parseSessionControlCustomId(interaction.customId);
    if (!action) {
      return this.none();
    }
    return this.some(action);
  }

  public override async run(
    interaction: ButtonInteraction,
    action: SessionControlAction,
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
      await this.#applyAction(guildId, action);
      if (action === 'leave') {
        // Full sticky-surface delete lands in a later ticket; clear controls so
        // Leave does not leave a dead interactive row after the session ends.
        await interaction.update({
          content: null,
          embeds: [],
          components: [],
        });
        return;
      }
      const snapshot = this.container.musicSessions.snapshot(guildId);
      await interaction.update({
        content: null,
        ...sessionReplyPayload(snapshot),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update the music session.';
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true });
        return;
      }
      await interaction.reply({ content: message, ephemeral: true });
    }
  }

  async #applyAction(guildId: string, action: SessionControlAction) {
    const sessions = this.container.musicSessions;
    switch (action) {
      case 'pause':
        await sessions.pause(guildId);
        return;
      case 'resume':
        await sessions.resume(guildId);
        return;
      case 'skip':
        await sessions.skip(guildId);
        return;
      case 'repeat': {
        const current = sessions.snapshot(guildId).repeat;
        await sessions.setRepeat(guildId, nextRepeatMode(current));
        return;
      }
      case 'shuffle':
        await sessions.shuffle(guildId);
        return;
      case 'leave':
        await sessions.leave(guildId);
        return;
    }
  }
}
