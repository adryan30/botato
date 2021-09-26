import { manager } from "..";
import axios from "axios";
import { MessageEmbed, TextChannel } from "discord.js";
import msToHMS from "../utils/msToHMS";
import { theme } from "../config";
import { Player } from "lavacord";

const urlRegex = new RegExp(
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
);

export default class Queue {
  guildId: string;
  channelId: string;
  textChannel: TextChannel;

  queue: Array<any>;
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

  async search(searchTerm: string) {
    const node = manager.idealNodes[0];

    const params = new URLSearchParams();
    params.append(
      "identifier",
      urlRegex.test(searchTerm) ? searchTerm : `ytsearch:${searchTerm}`
    );

    const data = await axios(
      `http://${node.host}:${node.port}/loadtracks?${params}`,
      {
        headers: { Authorization: node.password },
      }
    );

    return data.data.tracks ?? [];
  }

  async play(track) {
    this.queue.push(track);

    if (!this.currentlyPlaying) {
      this._playNext();
      return false;
    } else {
      return true;
    }
  }

  async _playNext() {
    const nextSong = this.queue.shift();
    this.currentlyPlaying = true;
    if (!nextSong) {
      this.player = null;
      this.currentlyPlaying = null;
      await manager.leave(this.guildId);
      this.textChannel.send("Toquei tudo da fila...");
      return;
    }

    this.textChannel.send({
      embed: new MessageEmbed({
        title: `:musical_note: Tocando Agora: ${nextSong.info.title}`,
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
      this.player = await manager.join({
        guild: this.guildId,
        channel: this.channelId,
        node: manager.idealNodes[0].id,
      });
      this.player.on("end", (data) => {
        if (data.reason === "REPLACED" || data.reason === "STOPPED") return;
        this._playNext();
      });
    }

    await this.player.play(nextSong.track);
  }
}
