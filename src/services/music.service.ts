import { Command, Infos, CommandMessage, Guard } from "@typeit/discord";
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
import { BotSongInfo, Queue } from "../interfaces/music.interface";
import { addSeconds, format } from "date-fns";

const category = ":musical_note: Música";
export abstract class MusicService {
  queue = new Map<String, Queue>();
  searchOpts = { maxResults: 1, key: process.env.YOUTUBE_TOKEN };

  @Command("play")
  @Guard(MusicGuard, MusicPermissionGuard)
  @Infos({
    category,
    description: "Toca músicas no canal que você estiver.",
    syntax: "=play <youtube>",
  })
  async music(
    message: CommandMessage,
    _client: Client,
    guardDatas: { voiceChannel: VoiceChannel }
  ) {
    const voiceChannel = guardDatas.voiceChannel;
    const [, ...args] = message.commandContent.split(" ");
    const [song] = await this.searchSong(message, args.join(" "));
    const { videoDetails } = await ytdl.getInfo(song.link);
    const duration = format(
      addSeconds(new Date(0), Number(videoDetails.lengthSeconds)),
      "mm:ss"
    );
    const requested_by = message.author.username;
    const songPayload = { ...song, duration, requested_by };

    const serverQueue = this.queue.get(message.guild.id);
    if (!serverQueue) {
      const queueContract = this.createContract(message, voiceChannel);
      queueContract.songs.push(songPayload);

      try {
        const connection = await queueContract.voiceChannel.join();
        queueContract.connection = connection;
        this.play(message.guild, queueContract.songs[0]);
      } catch (err) {
        console.log(err);
        this.queue.delete(message.guild.id);
        return message.channel.send({
          embed: new MessageEmbed({
            title: "Erro!",
            description:
              "Ocorreu um erro ao tentar tocar a música, tente novamente.",
            color: theme.error,
          }),
        });
      }
    } else {
      serverQueue.songs.push(songPayload);

      return message.channel.send({
        embed: new MessageEmbed({
          author: {
            name: "Adicionou a fila",
            iconURL: message.author.avatarURL(),
          },
          color: theme.default,
          description: `[${song.title}](${song.link})`,
          thumbnail: { url: song.thumbnails.high.url },
          fields: [
            { name: "Canal", value: `\`${videoDetails.author.name}\`` },
            { name: "Duração", value: `\`${duration}\`` },
            {
              name: "Posição na fila",
              value: `\`${serverQueue.songs.length}\``,
            },
          ],
        }),
      });
    }
  }

  async play(guild: Guild, song: BotSongInfo) {
    const serverQueue = this.queue.get(guild.id);
    if (!song) {
      setTimeout(() => {
        serverQueue.voiceChannel.leave();
        this.queue.delete(guild.id);
        return;
      }, 600);
    }

    const dispatcher = serverQueue.connection
      .play(await ytdl(song.link), { type: "opus" })
      .on("finish", () => {
        serverQueue.songs.shift();
        this.play(guild, serverQueue.songs[0]);
      })
      .on("error", (error) => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send({
      embed: new MessageEmbed({
        title: "Tocando agora :musical_note:",
        description: `[${song.title}](${song.link})`,
        thumbnail: { url: song.thumbnails.high.url },
        color: theme.default,
        fields: [
          { name: "Duração", value: `\`${song.duration}\`` },
          { name: "Pedido por", value: `\`${song.requested_by}\`` },
        ],
      }),
    });
  }

  @Command("leave")
  @Guard(MusicGuard)
  @Infos({
    category,
    description: "Faz o bot sair do canal que estiver.",
    syntax: "=leave",
  })
  async leave(message: CommandMessage) {
    const serverQueue = this.queue.get(message.guild.id);

    if (!serverQueue) {
      return message.channel.send({
        embed: new MessageEmbed({
          title: "Erro!",
          description: "Não há nenhuma fila para parar!",
          color: theme.error,
        }),
      });
    }

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
  }

  @Command("skip")
  @Guard(MusicGuard)
  @Infos({
    category,
    description: "Pula a música atual do bot.",
    syntax: "=skip",
  })
  async skip(message: CommandMessage) {
    const serverQueue = this.queue.get(message.guild.id);
    if (!serverQueue) {
      return message.channel.send({
        embed: new MessageEmbed({
          title: "Erro!",
          description: "Não há músicas para pular.",
          color: theme.error,
        }),
      });
    }
    serverQueue.connection.dispatcher.end();
    message.channel.send(":fast_forward: **_Pulei_** :thumbsup:");
  }

  async searchSong(
    message: CommandMessage,
    query: string
  ): Promise<ytsearch.YouTubeSearchResults[]> {
    await message.channel.send(`**Procurando** :mag_right: \`${query}\``);
    return new Promise((res, rej) => {
      ytsearch(`${query} audio`, this.searchOpts, (err, results) => {
        if (err) return rej(err);
        res(results);
      });
    });
  }

  createContract(message: CommandMessage, voiceChannel: VoiceChannel) {
    const textChannel = message.channel;
    if (!((c): c is TextChannel => c.type === "text")(textChannel)) return;
    const queueContract: Queue = {
      textChannel,
      voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };
    this.queue.set(message.guild.id, queueContract);
    return queueContract;
  }
}
