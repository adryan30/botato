import { Command, Infos, CommandMessage } from "@typeit/discord";
import ytdl from "ytdl-core";
import { theme } from "../config";

const requestOptions = {
  headers: {
    cookie: process.env.YT_COOKIE,
    'x-youtube-identity-token': process.env.YT_ID,
  },
}
const category = ":musical_note: Música";
export abstract class MusicService {
  @Command("play")
  @Infos({
    category,
    description: "Toca músicas no canal que você estiver.",
    syntax: "=play <youtube>",
  })
  async play(message: CommandMessage) {
    const [, ...args] = message.commandContent.split(" ");
    const songUrl = args[0];
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send(
        "You need to be in a voice channel to play music!"
      );
    }
    // const songInfo = await ytdl.getInfo(songUrl);
    // const song = {
    //   title: songInfo.videoDetails.title,
    //   url: songInfo.videoDetails.video_url,
    // };
    const connection = await voiceChannel.join();
    const dispatcher = connection
      .play(ytdl(songUrl, { requestOptions }))
      .on("finish", () => {
        console.log("Song Finished");
        voiceChannel.leave();
      })
      .on("error", (error) => console.error(error));
    dispatcher.setVolumeLogarithmic(5 / 5);
  }
}
