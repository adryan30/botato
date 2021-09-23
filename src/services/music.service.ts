import {
  Command,
  Infos,
  CommandMessage,
  Guard,
  Rules,
  Rule,
} from "@typeit/discord";
import {
  Client,
  Guild,
  MessageEmbed,
  TextChannel,
  VoiceChannel,
} from "discord.js";
import ytdl from "ytdl-core-discord";
import ytsearch = require("youtube-search");
import { theme } from "../config";
import { MusicGuard, MusicPermissionGuard } from "../guards/music.guard";
import { BotSongInfo, Queue, YtSearch } from "../interfaces/music.interface";
import { addSeconds, format } from "date-fns";
import { manager } from "../index";
import { URLSearchParams } from "url";
import axios from "axios";

const category = ":musical_note: Música";
export abstract class MusicService {
  queue = new Map();

  async getSong(search): Promise<YtSearch[]> {
    const node = manager.idealNodes[0];

    const params = new URLSearchParams();
    params.append("identifier", search);

    const data = await axios(
      `http://${node.host}:${node.port}/loadtracks?${params}`,
      {
        headers: { Authorization: node.password },
      }
    );
    return data.data.tracks || [];
  }

  @Command("play")
  @Guard(MusicGuard)
  async play(message: CommandMessage) {
    const [, ...args] = message.commandContent.split(" ");
    const player = await manager.join(
      {
        guild: message.guild.id,
        channel: message.member.voice.id,
        node: "1",
      },
      { selfdeaf: true }
    );
    const song = await this.getSong(`ytsearch:${args.join(" ")}`);
    await player.play(song[0].track);

    player.once("error", (error) => console.error(error));
    player.once("end", async (data) => {
      if (data.reason === "REPLACED") return;
      await manager.leave(message.guild.id);
    });
  }
}
