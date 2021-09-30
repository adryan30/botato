import { CommandInteraction, MessageEmbed } from "discord.js";
import { Discord, Slash, SlashChoice, SlashOption } from "discordx";
import { SpotifyItemType, SpotifyTrack } from "@lavaclient/spotify";
import { Track } from "@lavaclient/types";
import { sendPaginatedEmbeds } from "@discordx/utilities";
import { bot } from "../";
import { theme } from "../config";
import { msToHMS, spliceIntoChunks } from "../utils";

const urlRegex = new RegExp(
  /^https?:\/\/((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i
);

const category = ":musical_note: Música";
@Discord()
export abstract class MusicService {
  @Slash("play", {
    description: "Toca a música que for enviada.",
  })
  async play(
    @SlashOption("song", { required: true, description: "Música a ser tocada" })
    query: string,
    interaction: CommandInteraction
  ) {
    const { music } = bot;
    const player = music.createPlayer(interaction.guildId);
    let tracks: Track[];
    let msg: string;
    if (music.spotify.isSpotifyUrl(query)) {
      const item = await music.spotify.load(query);
      switch (item?.type) {
        case SpotifyItemType.Track:
          const track = await item.resolveYoutubeTrack();
          tracks = [track];
          msg = `Queued track [**${item.name}**](${query}).`;
          break;
        case SpotifyItemType.Artist:
          tracks = await item.resolveYoutubeTracks();
          msg = `Queued the **Top ${tracks.length} tracks** for [**${item.name}**](${query}).`;
          break;
        case SpotifyItemType.Album:
        case SpotifyItemType.Playlist:
          tracks = await item.resolveYoutubeTracks();
          msg = `Queued **${tracks.length} tracks** from ${SpotifyItemType[
            item.type
          ].toLowerCase()} [**${item.name}**](${query}).`;
          break;
        default:
          return interaction.reply({
            content: "Sorry, couldn't find anything :/",
            ephemeral: true,
          });
      }
    } else {
      const searchTerm = urlRegex.test(query) ? query : `ytsearch:${query}`;
      const search = await music.rest.loadTracks(searchTerm);
      switch (search.loadType) {
        case "PLAYLIST_LOADED":
          tracks = search.tracks;
          break;
        case "SEARCH_RESULT":
          tracks = [search.tracks[0]];
          break;
      }
    }
    player.queue.add(tracks);

    if (tracks.length) {
      const track = tracks[0];
      interaction.reply({
        embeds: [
          new MessageEmbed({
            title: `🎵 ${
              player.playing ? "Adicionado a fila" : "Tocando Agora"
            }:`,
            fields: [
              {
                inline: true,
                name: "Música",
                value: `[${track.info.title}](${track.info.uri})`,
              },
              { inline: true, name: "Autor", value: track.info.author },
              {
                inline: true,
                name: "Duração",
                value: msToHMS(track.info.length),
              },
            ],
            color: theme.default,
          }),
        ],
      });
    }

    if (!player.connected) {
      const member = interaction.guild.members.cache.get(
        interaction.member.user.id
      );
      const voiceChannel = member.voice.channel;
      player.connect(voiceChannel);
    }
    if (!player.playing) {
      player.queue.start();
    }
  }

  @Slash("queue", { description: "Mostra a fila de músicas atual" })
  async queue(interaction: CommandInteraction) {
    const music = bot.music;
    const player = music.players.get(interaction.guildId);
    if (!player) {
      return interaction.reply({
        embeds: [
          new MessageEmbed({
            title: "Erro!",
            description: "Não existe uma fila para esse servidor...",
            color: theme.error,
          }),
        ],
      });
    }
    if (player.queue.tracks.length) {
      const tracks = player.queue.tracks;
      const pages = spliceIntoChunks(tracks, 10).map((chunk, page) => {
        return new MessageEmbed({
          title: "📜 Fila",
          color: theme.default,
          fields: chunk.map(({ title, author, length }, index) => {
            return {
              name: `${++index + page * 10}) ${title} - ${author}`,
              value: `Duração: \`${msToHMS(length)}\``,
            };
          }),
        });
      });
      await sendPaginatedEmbeds(interaction.channel, pages, {
        type: "BUTTON",
        endLabel: "Fim",
        startLabel: "Início",
        nextLabel: "Próximo",
        previousLabel: "Anterior",
      });
      return interaction.reply({ content: "Fila a seguir:" });
    }
  }

  @Slash("skip", { description: "Pula a música atual" })
  async skip(interaction: CommandInteraction) {
    const music = bot.music;
    const player = music.players.get(interaction.guildId);
    if (!player) {
      return interaction.reply({
        embeds: [
          new MessageEmbed({
            title: "Erro!",
            description: "Não existe uma fila para esse servidor...",
            color: theme.error,
          }),
        ],
      });
    }
    player.queue.next().then(() => interaction.reply("Pulei 👍"));
  }
}
