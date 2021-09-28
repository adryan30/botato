// import { Command, CommandMessage, Guard } from "discordx";
// import { MessageEmbed, TextChannel } from "discord.js";
// import { theme } from "../config";
// import { MusicGuard } from "../guards";
// import { queues } from "../index";
// import { Track } from "../interfaces/music.interface";
// import Queue from "../structures/queue";
// import { DiscordEmbedPages, msToHMS, spliceIntoChunks } from "../utils";

// const category = ":musical_note: Música";
// export abstract class MusicService {
//   @Command("play")
//   @Guard(MusicGuard)
//   async play(message: CommandMessage) {
//     const [, ...args] = message.commandContent.split(" ");
//     if (!args.length) {
//       return message.channel.send({
//         embed: new MessageEmbed({
//           title: "Uso do comando Play",
//           description: "=play <ULR/Nome da música>",
//           color: theme.default,
//         }),
//       });
//     }
//     const queue = queues[message.guild.id];
//     if (queue && queue.channelId !== message.member.voice.channel.id) {
//       queue.leave();
//     }
//     if (!queue) {
//       queues[message.guild.id] = new Queue(
//         message.guild.id,
//         message.member.voice.channel.id,
//         message.channel
//       );
//     }

//     const searchInfo = await queues[message.guild.id].search(args.join(" "));
//     if (!searchInfo.tracks.length) {
//       return message.channel.send({
//         embed: new MessageEmbed({
//           title: "Erro!",
//           description: "Não consegui encontrar essa música :/",
//           color: theme.error,
//         }),
//       });
//     }

//     const [isAdded, type] = await queues[message.guild.id].play(searchInfo);
//     if (type === "PLAYLIST_LOADED") {
//       await message.channel.send({
//         embed: new MessageEmbed({
//           title: `:musical_note: Playlist adicionada:  ${searchInfo.playlistInfo.name}.`,
//           fields: [
//             {
//               inline: true,
//               name: "Duração",
//               value: msToHMS(
//                 searchInfo.tracks
//                   .map((track) => track.info.length)
//                   .reduce((acc, curr) => acc + curr)
//               ),
//             },
//           ],
//           color: theme.default,
//         }),
//       });
//     }
//     if (isAdded) {
//       const song = searchInfo.tracks[0];
//       return message.channel.send({
//         embed: new MessageEmbed({
//           title: `🎵 Adicionado a fila:`,
//           fields: [
//             {
//               inline: true,
//               name: "Música",
//               value: `[${song.info.title}](${song.info.uri})`,
//             },
//             { inline: true, name: "Autor", value: song.info.author },
//             {
//               inline: true,
//               name: "Duração",
//               value: msToHMS(song.info.length),
//             },
//           ],
//           color: theme.default,
//         }),
//       });
//     }
//   }

//   @Command("queue")
//   @Guard(MusicGuard)
//   async queue(message: CommandMessage) {
//     const channel = message.channel;
//     if (!queues[message.guild.id]) {
//       return message.channel.send({
//         embed: new MessageEmbed({
//           title: "Erro!",
//           description: "Não existe uma fila para esse servidor...",
//           color: theme.error,
//         }),
//       });
//     }

//     const next = queues[message.guild.id].queue;

//     if (next.length) {
//       const chunks: Track[][] = spliceIntoChunks(next, 10);
//       const pages = chunks.map((chunk, page) => {
//         return new MessageEmbed({
//           title: "📜 Fila",
//           color: theme.default,
//           fields: chunk.map(({ info: { title, author, length } }, index) => {
//             return {
//               name: `${++index + page * 10}) ${title} - ${author}`,
//               value: `Duração: \`${msToHMS(length)}\``,
//             };
//           }),
//         });
//       });

//       if (!((c): c is TextChannel => c.type === "text")(channel)) return;
//       const embedPages = new DiscordEmbedPages(pages, channel, {
//         isHelp: false,
//       });
//       embedPages.createPages();
//     } else {
//       return message.channel.send({
//         embed: new MessageEmbed({
//           title: "📜 Fila",
//           description: "Nada na fila...\n",
//         }),
//       });
//     }
//   }

//   @Command("np")
//   @Guard(MusicGuard)
//   async np(message: CommandMessage) {
//     if (!queues[message.guild.id]) {
//       return message.channel.send({
//         embed: new MessageEmbed({
//           title: "Erro!",
//           description: "Não existe uma fila para esse servidor...",
//           color: theme.error,
//         }),
//       });
//     }

//     const song = queues[message.guild.id].currentlyPlaying;

//     return message.channel.send({
//       embed: new MessageEmbed({
//         title: `:musical_note: Tocando Agora: [${song.info.title}](${song.info.uri}).`,
//         fields: [
//           { inline: true, name: "Autor", value: song.info.author },
//           {
//             inline: true,
//             name: "Duração",
//             value: msToHMS(song.info.length),
//           },
//         ],
//         color: theme.default,
//       }),
//     });
//   }

//   @Command("search")
//   @Guard(MusicGuard)
//   async search(message: CommandMessage) {
//     const [, ...args] = message.commandContent.split(" ");
//     if (!args.length) {
//       return message.channel.send({
//         embed: new MessageEmbed({
//           title: "Uso do comando Search",
//           description: "=search <termo de busca>",
//           color: theme.default,
//         }),
//       });
//     }
//     if (!queues[message.guild.id]) {
//       queues[message.guild.id] = new Queue(
//         message.guild.id,
//         message.member.voice.channel.id,
//         message.channel
//       );
//     }

//     const allSongs = await queues[message.guild.id].search(args.join(" "));
//     const songs = allSongs.tracks.slice(0, 5);

//     const options = songs.map(
//       (song, index) =>
//         `${++index}) [${song.info.title}](${song.info.uri}) - ${
//           song.info.author
//         } - ${msToHMS(song.info.length)}`
//     );

//     const msg = await message.channel.send({
//       embed: new MessageEmbed({
//         title: "🔎 Resultados de Busca",
//         description: `${options.join("\n")}`,
//         color: theme.default,
//       }),
//     });

//     const chosenSong = (
//       await msg.channel.awaitMessages(
//         (msg) => {
//           return (
//             msg.author === message.author &&
//             ["1", "2", "3", "4", "5", "cancelar"].includes(msg.content)
//           );
//         },
//         { max: 1 }
//       )
//     ).first().content;
//     if (chosenSong == "cancel") {
//       return message.channel.send("Busca cancelada...");
//     }
//     const song = songs[parseInt(chosenSong) - 1];

//     const isAdded = await queues[message.guild.id].play(
//       allSongs,
//       parseInt(chosenSong) - 1
//     );
//     if (isAdded) {
//       message.channel.send({
//         embed: new MessageEmbed({
//           title: `🎵 Adicionado a fila:`,
//           fields: [
//             {
//               inline: true,
//               name: "Música",
//               value: `[${song.info.title}](${song.info.uri})`,
//             },
//             { inline: true, name: "Autor", value: song.info.author },
//             {
//               inline: true,
//               name: "Duração",
//               value: msToHMS(song.info.length),
//             },
//           ],
//           color: theme.default,
//         }),
//       });
//     }
//   }

//   @Command("skip")
//   @Guard(MusicGuard)
//   async skip(message: CommandMessage) {
//     if (!queues[message.guild.id]) {
//       queues[message.guild.id] = new Queue(
//         message.guild.id,
//         message.member.voice.channel.id,
//         message.channel
//       );
//     }

//     queues[message.guild.id]._playNext();
//   }

//   @Command("leave")
//   @Guard(MusicGuard)
//   async leave(message: CommandMessage) {
//     if (!queues[message.guild.id]) {
//       return message.channel.send({
//         embed: new MessageEmbed({
//           title: "Erro!",
//           description: "Não existe uma fila para esse servidor...",
//           color: theme.error,
//         }),
//       });
//     }
//     await queues[message.guild.id].leave();
//     queues[message.guild.id] = undefined;
//     message.react("✅");
//   }

//   @Command("pause")
//   @Guard(MusicGuard)
//   async pause(message: CommandMessage) {
//     const queue = queues[message.guild.id];
//     if (!queue) {
//       return message.channel.send({
//         embed: new MessageEmbed({
//           title: "Erro!",
//           description: "Não existe uma fila para esse servidor...",
//           color: theme.error,
//         }),
//       });
//     }
//     await queue.pause();
//     return message.channel.send(
//       `${!queue.player.paused ? "Pausado ⏸" : "Despausado ▶️"}`
//     );
//   }
// }
