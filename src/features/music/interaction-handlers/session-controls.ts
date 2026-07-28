import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';
import {
  nextRepeatMode,
  parseSessionControlCustomId,
  sessionReplyPayload,
  type SessionControlAction,
} from '../lib/control-surface/session-ui.js';
import {
  isMemberInSessionVoice,
  resolveRequesterVoiceChannel,
  SESSION_VOICE_CONTROL_DENIED,
} from '../lib/voice.js';

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
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const sessions = this.container.musicSessions;
    let sessionVoiceChannelId: string | null;
    try {
      sessionVoiceChannelId = sessions.snapshot(guildId).voiceChannelId;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update the music session.';
      await interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const memberVoiceChannelId =
      resolveRequesterVoiceChannel(interaction)?.id ?? null;
    if (!isMemberInSessionVoice(memberVoiceChannelId, sessionVoiceChannelId)) {
      await interaction.reply({
        content: SESSION_VOICE_CONTROL_DENIED,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Acknowledge before voice/node work — leave/skip can exceed Discord's
    // 3s interaction window and otherwise surface as Unknown interaction (10062).
    await interaction.deferUpdate();

    try {
      await this.#applyAction(guildId, action);
      if (action === 'leave') {
        // Session-end deletes the sticky surface; nothing left to edit.
        return;
      }
      const snapshot = sessions.snapshot(guildId);
      await interaction.editReply({
        content: null,
        ...sessionReplyPayload(snapshot),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update the music session.';
      try {
        await interaction.followUp({
          content: message,
          flags: MessageFlags.Ephemeral,
        });
      } catch {
        // Interaction token may already be dead (10062); nothing left to send.
      }
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
