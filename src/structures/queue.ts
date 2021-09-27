import axios from "axios";
import { MessageEmbed, TextChannel } from "discord.js";
import { Player } from "lavacord";
import { UnresolvedTrack } from "lavasfy";
import { manager, lavasfy } from "..";
import { theme } from "../config";
import { SearchInfo, Track } from "../interfaces/music.interface";
import { msToHMS } from "../utils";

const urlRegex = new RegExp(
  /^https?:\/\/((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i
);

export default class Queue {
  guildId: string;
  channelId: string;
  textChannel: TextChannel;

  queue: Array<Track>;
  player: Player;
  currentlyPlaying: any;

  constructor(guildId, channelId, textChannel) {
    this.guildId = guildId;
    this.channelId = channelId;
    this.textChannel = textChannel;

    this.queue = [];
    this.player = null;
    this.currentlyPlaying = null;
  }

  async search(searchTerm: string): Promise<SearchInfo> {
    const node = manager.idealNodes[0];
    const isUrl = urlRegex.test(searchTerm);
    const isSpotify = lavasfy.spotifyPattern.test(searchTerm);

    if (!isSpotify) {
      const params = new URLSearchParams();
      params.append(
        "identifier",
        isUrl ? searchTerm : `ytsearch:${searchTerm}`
      );

      const data = await axios(
        `http://${node.host}:${node.port}/loadtracks?${params}`,
        {
          headers: { Authorization: node.password },
        }
      );

      return data.data ?? [];
    } else {
      await lavasfy.requestToken();
      const node = lavasfy.getNode("1");
      const data = await node.load(searchTerm);
      return { ...data, tracks: data.tracks as Track[] };
    }
  }

  async play(searchInfo: SearchInfo, index?: number) {
    switch (searchInfo.loadType) {
      case "PLAYLIST_LOADED":
        this.queue.push(...searchInfo.tracks);
        break;
      case "SEARCH_RESULT":
        if (index) {
          this.queue.push(searchInfo.tracks[index]);
          break;
        }
        this.queue.push(searchInfo.tracks[0]);
        break;
      default:
        this.queue.push(searchInfo.tracks[0]);
        break;
    }

    if (!this.currentlyPlaying) {
      this._playNext();
      return [false, searchInfo.loadType];
    } else {
      return [true, searchInfo.loadType];
    }
  }

  async _playNext() {
    const nextSong = this.queue.shift();
    this.currentlyPlaying = nextSong;
    if (!nextSong) {
      this.player = null;
      this.currentlyPlaying = null;
      await manager.leave(this.guildId);
      this.textChannel.send({
        embed: new MessageEmbed({
          title: "Fim da fila",
          description: "A fila acabou... :/",
          color: theme.default,
        }),
      });
      return;
    }

    this.textChannel.send({
      embed: new MessageEmbed({
        title: `🎵 Tocando Agora: ${nextSong.info.title}`,
        fields: [
          { inline: true, name: "Autor", value: nextSong.info.author },
          {
            inline: true,
            name: "Duração",
            value: msToHMS(nextSong.info.length),
          },
        ],
        color: theme.default,
      }),
    });

    if (!this.player) {
      this.player = await manager.join(
        {
          guild: this.guildId,
          channel: this.channelId,
          node: manager.idealNodes[0].id,
        },
        { selfdeaf: true }
      );
      this.player.on("end", (data) => {
        if (data.reason === "REPLACED" || data.reason === "STOPPED") return;
        this._playNext();
      });
    }

    await this.player.play(nextSong.track);
  }

  async leave() {
    manager.leave(this.guildId);
    this.player.destroy();
  }

  async pause() {
    this.player.pause(!this.player.paused);
  }
}
