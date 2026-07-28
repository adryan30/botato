import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type StringSelectMenuInteraction } from 'discord.js';
import {
  parseSearchSelectCustomId,
  peekSearchResults,
  takeSearchResults,
} from '../lib/search-results-cache.js';
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
        flags: MessageFlags.Ephemeral,
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

      this.container.musicControlSurface.noteTextChannel(
        guildId,
        interaction.channelId,
      );

      await this.container.musicSessions.playTrack(
        guildId,
        selected,
        voiceChannel.id,
      );
      const snapshot = this.container.musicSessions.snapshot(guildId);
      const queued = snapshot.queue.at(-1);

      const confirm =
        !wasPlaying || !queued
          ? `Playing **${selected.title}**`
          : `Queued **${queued.title}**`;

      // Select message stays disposable — never the sticky control surface.
      await interaction.editReply({
        content: 'Track selected.',
        embeds: [],
        components: [],
      });
      await interaction.followUp({
        content: confirm,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to play that track.';
      await interaction.editReply({ content: message, components: [] });
    }
  }
}
