import { TextChannel, VoiceChannel, VoiceConnection } from "discord.js";
import { YouTubeSearchResults } from "youtube-search";

export interface BotSongInfo extends YouTubeSearchResults {
  requested_by?: string;
  duration?: string;
}

export interface Queue {
  textChannel: TextChannel;
  voiceChannel: VoiceChannel;
  connection: VoiceConnection;
  songs: BotSongInfo[];
  volume: number;
  playing: boolean;
}
