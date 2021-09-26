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
import { theme } from "../config";
import { MusicGuard, MusicPermissionGuard } from "../guards/music.guard";
import { BotSongInfo, YtSearch } from "../interfaces/music.interface";
import { addSeconds, compareAsc, format } from "date-fns";
import { manager, queues } from "../index";
import { URLSearchParams } from "url";
import axios from "axios";
import Queue from "../structures/queue";
import msToHMS from "../utils/msToHMS";

const category = ":musical_note: Música";
export abstract class MusicService {
  @Command("play")
  @Guard(MusicGuard)
  async play(message: CommandMessage) {
    const [, ...args] = message.commandContent.split(" ");
    if (!args) {
      return message.channel.send({
        embed: new MessageEmbed({
          title: "Uso do comando Play",
          description: "=play <ULR/Nome da música>",
          color: theme.default,
        }),
      });
    }
    if (!queues[message.guild.id]) {
      queues[message.guild.id] = new Queue(
        message.guild.id,
        message.member.voice.channel.id,
        message.channel
      );
    }

    const [song] = await queues[message.guild.id].search(args.join(" "));
    if (!song) {
      return message.channel.send({
        embed: new MessageEmbed({
          title: "Erro!",
          description: "Não consegui encontrar essa música :/",
          color: theme.error,
        }),
      });
    }

    const isAdded = await queues[message.guild.id].play(song);
    if (isAdded) {
      message.channel.send({
        embed: new MessageEmbed({
          title: `:musical_note: Tocando Agora: [${song.info.title}](${song.info.url}).`,
          fields: [
            { inline: true, name: "Autor", value: song.info.author },
            {
              inline: true,
              name: "Duração",
              value: msToHMS(song.info.length),
            },
          ],
          color: theme.default,
        }),
      });
    }
  }

  @Command("queue")
  @Guard(MusicGuard)
  async queue(message: CommandMessage) {
    if (!queues[message.guild.id] || !queues[message.guild.id].queue.length) {
      return message.channel.send({
        embed: new MessageEmbed({
          title: "Erro!",
          description: "Não existe uma fila para esse servidor...",
          color: theme.error,
        }),
      });
    }

    const next = queues[message.guild.id].queue;

    const text = next.map(
      (song, index) =>
        `${++index}) ${song.info.title} - ${song.info.author} - ${msToHMS(
          song.info.length
        )}`
    );

    return message.channel.send({
      embed: new MessageEmbed({
        title: "📜 Lista",
        description: `\`\`\`\n${text.join("\n") ?? "Nada na fila...\n"}\`\`\``,
      }),
    });
  }

  @Command("np")
  @Guard(MusicGuard)
  async np(message: CommandMessage) {
    if (!queues[message.guild.id]) {
      return message.channel.send({
        embed: new MessageEmbed({
          title: "Erro!",
          description: "Não existe uma fila para esse servidor...",
          color: theme.error,
        }),
      });
    }

    const song = queues[message.guild.id].currentlyPlaying;

    return message.channel.send({
      embed: new MessageEmbed({
        title: `:musical_note: Tocando Agora: [${song.info.title}](${song.info.url}).`,
        fields: [
          { inline: true, name: "Autor", value: song.info.author },
          {
            inline: true,
            name: "Duração",
            value: msToHMS(song.info.length),
          },
        ],
        color: theme.default,
      }),
    });
  }

  @Command("search")
  @Guard(MusicGuard)
  async search(message: CommandMessage) {
    const [, ...args] = message.commandContent.split(" ");
    if (!args) {
      return message.channel.send({
        embed: new MessageEmbed({
          title: "Uso do comando Play",
          description: "=play <ULR/Nome da música>",
          color: theme.default,
        }),
      });
    }
    if (!queues[message.guild.id]) {
      queues[message.guild.id] = new Queue(
        message.guild.id,
        message.member.voice.channel.id,
        message.channel
      );
    }

    const allSongs = await queues[message.guild.id].search(args.join(" "));
    const songs = allSongs.slice(0, 5);

    const options = songs.map(
      (song, index) =>
        `${++index}) [${song.info.title}](${song.info.uri}) - ${
          song.info.author
        } - ${msToHMS(song.info.length)}`
    );

    const msg = await message.channel.send({
      embed: new MessageEmbed({
        title: "🔎 Resultados de Busca",
        description: `${options.join("\n")}`,
        color: theme.default,
      }),
    });

    const chosenSong = (
      await msg.channel.awaitMessages(
        (msg) => {
          return (
            msg.author === message.author &&
            ["1", "2", "3", "4", "5", "cancelar"].includes(msg.content)
          );
        },
        { max: 1 }
      )
    ).first().content;
    if (chosenSong == "cancel") {
      return message.channel.send("Busca cancelada...");
    }
    const song = songs[parseInt(chosenSong) - 1];

    const isAdded = await queues[message.guild.id].play(song);
    if (isAdded) {
      message.channel.send({
        embed: new MessageEmbed({
          title: `:musical_note: Adicionado a fila: ${song.info.title}.`,
          fields: [
            { inline: true, name: "Autor", value: song.info.author },
            {
              inline: true,
              name: "Duração",
              value: msToHMS(song.info.length),
            },
          ],
          color: theme.default,
        }),
      });
    }
  }

  @Command("skip")
  @Guard(MusicGuard)
  async skip(message: CommandMessage) {
    const [, ...args] = message.commandContent.split(" ");
    if (!queues[message.guild.id]) {
      queues[message.guild.id] = new Queue(
        message.guild.id,
        message.member.voice.channel.id,
        message.channel
      );
    }

    queues[message.guild.id]._playNext();
  }
}
