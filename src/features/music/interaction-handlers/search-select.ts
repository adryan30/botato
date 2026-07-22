import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { StringSelectMenuInteraction } from 'discord.js';
import {
  parseSearchSelectCustomId,
  peekSearchResults,
  takeSearchResults,
} from '../lib/search-results-cache.js';
import { sessionReplyPayload } from '../lib/session-ui.js';
import { resolveRequesterVoiceChannel } from '../lib/voice.js';

export class SearchSelectHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: StringSelectMenuInteraction) {
    const cacheId = parseSearchSelectCustomId(interaction.customId);
    if (!cacheId) {
      return this.none();
    }
    return this.some(cacheId);
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    cacheId: string,
  ) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const cached = peekSearchResults(cacheId);
    if (!cached) {
      await interaction.update({
        content: 'Those search results expired. Run `/search` again.',
        components: [],
      });
      return;
    }

    if (cached.userId !== interaction.user.id) {
      await interaction.reply({
        content: 'Only the member who ran `/search` can pick a result.',
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

    const index = Number(interaction.values[0]);
    const selected = cached.tracks[index];
    if (!selected) {
      await interaction.update({
        content: 'That search result is no longer available.',
        components: [],
      });
      return;
    }

    // Consume after validation so a missing-voice reply leaves the menu usable.
    takeSearchResults(cacheId, interaction.user.id);

    await interaction.deferUpdate();

    try {
      let wasPlaying = false;
      try {
        wasPlaying = this.container.musicSessions.nowPlaying(guildId) !== null;
      } catch {
        wasPlaying = false;
      }

      await this.container.musicSessions.playTrack(
        guildId,
        selected,
        voiceChannel.id,
      );
      const snapshot = this.container.musicSessions.snapshot(guildId);

      if (!wasPlaying) {
        await interaction.editReply(sessionReplyPayload(snapshot));
        return;
      }

      const queued = snapshot.queue.at(-1);
      const payload = sessionReplyPayload(snapshot);
      await interaction.editReply({
        content: queued
          ? `Queued **${queued.title}**\n\n${payload.content}`
          : payload.content,
        components: payload.components,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to play that track.';
      await interaction.editReply({ content: message, components: [] });
    }
  }
}
