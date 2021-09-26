import { Command, CommandMessage, Guard } from "@typeit/discord";
import { MessageEmbed } from "discord.js";
import { theme } from "../config";
import { MusicGuard, MusicPermissionGuard } from "../guards/music.guard";
import { queues } from "../index";
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

    const searchInfo = await queues[message.guild.id].search(args.join(" "));
    if (!searchInfo.tracks.length) {
      return message.channel.send({
        embed: new MessageEmbed({
          title: "Erro!",
          description: "Não consegui encontrar essa música :/",
          color: theme.error,
        }),
      });
    }

    const [isAdded, type] = await queues[message.guild.id].play(searchInfo);
    if (type === "PLAYLIST_LOADED") {
      await message.channel.send({
        embed: new MessageEmbed({
          title: `:musical_note: Playlist adicionada:  ${searchInfo.playlistInfo.name}.`,
          fields: [
            {
              inline: true,
              name: "Duração",
              value: msToHMS(
                searchInfo.tracks
                  .map((track) => track.info.length)
                  .reduce((acc, curr) => acc + curr)
              ),
            },
          ],
          color: theme.default,
        }),
      });
    }
    if (isAdded) {
      const song = searchInfo.tracks[0];
      return message.channel.send({
        embed: new MessageEmbed({
          title: `:musical_note: Adicionado a fila: [${song.info.title}](${song.info.uri}).`,
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
        title: `:musical_note: Tocando Agora: [${song.info.title}](${song.info.uri}).`,
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
    const songs = allSongs.tracks.slice(0, 5);

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

    const isAdded = await queues[message.guild.id].play(
      allSongs,
      parseInt(chosenSong) - 1
    );
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
    if (!queues[message.guild.id]) {
      queues[message.guild.id] = new Queue(
        message.guild.id,
        message.member.voice.channel.id,
        message.channel
      );
    }

    queues[message.guild.id]._playNext();
  }

  @Command("leave")
  @Guard(MusicGuard)
  async leave(message: CommandMessage) {
    if (!queues[message.guild.id]) {
      queues[message.guild.id] = new Queue(
        message.guild.id,
        message.member.voice.channel.id,
        message.channel
      );
    }
    await queues[message.guild.id].leave();
  }
}
