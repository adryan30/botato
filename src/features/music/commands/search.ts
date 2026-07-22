import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import {
  putSearchResults,
  searchSelectCustomId,
} from '../lib/search-results-cache.js';
import type { Track } from '../lib/music-node-port.js';

const MAX_SEARCH_RESULTS = 10;

export class SearchCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Search YouTube and pick a track to play',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('search')
        .setDescription('Search YouTube and pick a track to play')
        .addStringOption((option) =>
          option
            .setName('query')
            .setDescription('YouTube search query')
            .setRequired(true),
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

    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    try {
      const results = await this.container.musicSessions.search(query);
      const tracks = results.slice(0, MAX_SEARCH_RESULTS);
      if (tracks.length === 0) {
        await interaction.editReply('No tracks found for that query.');
        return;
      }

      const cacheId = putSearchResults(interaction.user.id, tracks);
      const menu = new StringSelectMenuBuilder()
        .setCustomId(searchSelectCustomId(cacheId))
        .setPlaceholder('Select a track to play')
        .addOptions(tracks.map((track, index) => toSelectOption(track, index)));

      await interaction.editReply({
        content: `Select a track for **${query}**:`,
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to search.';
      await interaction.editReply(message);
    }
  }
}

function toSelectOption(track: Track, index: number) {
  const label = truncate(track.title || `Result ${index + 1}`, 100);
  const option = new StringSelectMenuOptionBuilder()
    .setLabel(label)
    .setValue(String(index));

  if (track.uri) {
    option.setDescription(truncate(track.uri, 100));
  }

  return option;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}
