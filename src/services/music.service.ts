import { CommandInteraction, GuildMember, EmbedBuilder } from "discord.js";
import { Discord, Guard, Slash, SlashOption } from "discordx";
import { SpotifyItemType } from "@lavaclient/spotify";
import { Pagination, PaginationType } from "@discordx/pagination";
import { Bot } from "../";
import { theme } from "../config";
import { msToHMS, spliceIntoChunks } from "../utils";
import { MusicGuard, QueueGuard } from "../guards";
import { Node, Player } from "lavaclient";

const urlRegex =
  /^https?:\/\/((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i;

@Discord()
@Guard(MusicGuard)
export abstract class MusicService {
  @Slash("play", {
    description: "Toca a música que for enviada.",
  })
  async play(
    @SlashOption("song", { required: true, description: "Música a ser tocada" })
    query: string,
    @SlashOption("next", {
      description: "Adicionar no início da fila?",
    })
    next: boolean = false,
    interaction: CommandInteraction
  ) {
    const { music } = Bot;
    const player = music.createPlayer(interaction.guildId);
    let tracks;
    if (music.spotify.isSpotifyUrl(query)) {
      const item = await music.spotify.load(query);
      switch (item?.type) {
        case SpotifyItemType.Track:
          tracks = [await item.resolveYoutubeTrack()];
          break;
        case SpotifyItemType.Artist:
          tracks = await item.resolveYoutubeTracks();
          break;
        case SpotifyItemType.Album:
        case SpotifyItemType.Playlist:
          tracks = await item.resolveYoutubeTracks();
          break;
        default:
          return interaction.reply({
            content: "Sorry, couldn't find anything :/",
          });
      }
    } else {
      const searchTerm = urlRegex.test(query) ? query : `ytsearch:${query}`;
      const search = await music.rest.loadTracks(searchTerm);
      switch (search.loadType) {
        case "PLAYLIST_LOADED":
          tracks = search.tracks;
          break;
        case "TRACK_LOADED":
        case "SEARCH_RESULT":
          tracks = [search.tracks[0]];
          break;
      }
    }

    player.queue.add(tracks, { requester: interaction.user.id, next });

    if (tracks.length) {
      const track = tracks[0];
      const songName = `[${track.info.title}](${track.info.uri})`;
      const songAuthor = track.info.author;
      const songDuration = msToHMS(track.info.length);
      await interaction.reply({
        embeds: [
          new EmbedBuilder({
            title: `🎵 ${
              !player.playing ? "Tocando agora" : "Adicionado a fila"
            }:`,
            fields: [
              { inline: true, name: "Música", value: songName },
              { inline: true, name: "Autor", value: songAuthor },
              { inline: true, name: "Duração", value: songDuration },
            ],
            color: theme.default,
          }),
        ],
      });
    }

    if (!player.connected && interaction.member instanceof GuildMember) {
      player.connect(interaction.member.voice.channelId, { deafened: true });
    }
    if (!player.playing) {
      await player.queue.start();
    }
  }

  @Slash("queue", { description: "Mostra a fila de músicas atual" })
  @Guard(QueueGuard)
  async queue(interaction: CommandInteraction, _client, datas) {
    const player = datas.player as Player<Node>;

    if (player.queue.tracks.length) {
      const tracks = Array.from(player.queue.tracks);
      const pages = spliceIntoChunks(tracks, 10).map((chunk, page) => {
        return new EmbedBuilder({
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

      new Pagination(interaction.channel, pages, {
        type: PaginationType.Button,
        start: { label: "Início" },
        next: { label: "Próximo" },
        previous: { label: "Anterior" },
        end: { label: "Fim" },
      }).send();
      return interaction.reply({ content: "Fila a seguir:" });
    }
  }

  @Slash("skip", { description: "Pula a música atual" })
  @Guard(QueueGuard)
  async skip(interaction: CommandInteraction, _client, datas) {
    const player = datas.player as Player<Node>;
    player.queue.next().then((skipped) => {
      if (skipped) {
        return interaction.reply("Pulei 👍");
      }
      player.disconnect();
      player.destroy();
      return interaction.reply("A fila acabou... 😩");
    });
  }

  @Slash("leave", { description: "Para a música e desconecta o bot" })
  @Guard(QueueGuard)
  async leave(interaction: CommandInteraction, _client, datas) {
    const player = datas.player as Player<Node>;
    player.disconnect();
    player.node.destroyPlayer(interaction.guildId);
    await interaction.reply("✅");
  }

  @Slash("pause", { description: "Pausa a música atual" })
  @Guard(QueueGuard)
  async pause(interaction: CommandInteraction, _client, datas) {
    const player = datas.player as Player<Node>;
    const isPlaying = player.playing;
    await player.pause(isPlaying);
    await interaction.reply(isPlaying ? "Pausei ⏸" : "Despausei ▶️");
  }

  @Slash("shuffle", { description: "Aleatoria a fila de música" })
  @Guard(QueueGuard)
  async shuffle(interaction: CommandInteraction, _client, datas) {
    const player = datas.player as Player<Node>;
    player.queue.shuffle();
    await interaction.reply("Aleatorizado 👍");
  }
}
