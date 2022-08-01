import "dotenv/config";
import "reflect-metadata";
import { Client } from "discordx";
import { importx } from "@discordx/importer";
import {
  EmbedBuilder,
  TextChannel,
  IntentsBitField,
  GatewayDispatchEvents,
} from "discord.js";
import * as queue from "@lavaclient/queue";
import { Node } from "lavaclient";
import { load } from "@lavaclient/spotify";
import { theme } from "./config";
import { msToHMS } from "./utils";
import express = require("express");

queue.load();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

class Bot {
  static client: Client;
  static music: Node;

  static async start() {
    this.client = new Client({
      silent: false,
      botGuilds: [process.env.GUILD_ID],
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildEmojisAndStickers,
      ],
    });

    this.music = new Node({
      sendGatewayPayload: (id, payload) =>
        this.client.guilds.cache.get(id)?.shard?.send(payload),
      connection: {
        host: process.env.LAVALINK_HOST!,
        password: process.env.LAVALINK_PASSWORD!,
        port: Number(process.env.LAVALINK_PORT),
      },
    });

    this.music.on("connect", () => {
      console.log(`[music] now connected to lavalink`);
    });

    this.music.on("trackEnd", async (queue) => {
      const {
        player: { guildId },
        tracks,
      } = queue;
      const nextSong = tracks[0];
      const textChannel = this.client.guilds.cache
        .get(guildId)
        .channels.cache.find((ch) => ch.name === "magias-de-comando");
      if (textChannel instanceof TextChannel && nextSong) {
        const songName = `[${nextSong.title}](${nextSong.uri})`;
        const songAuthor = nextSong.author;
        const songDuration = msToHMS(nextSong.length);
        await textChannel.send({
          embeds: [
            new EmbedBuilder({
              title: "🎵 Tocando Agora:",
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
    });

    this.music.on("queueFinish", async (queue) => {
      const player = queue.player;
      await player.disconnect();
      player.node.destroyPlayer(player.guildId);
    });

    this.client.ws.on(GatewayDispatchEvents.VoiceServerUpdate, (data) =>
      this.music.handleVoiceUpdate(data)
    );
    this.client.ws.on(GatewayDispatchEvents.VoiceStateUpdate, (data) =>
      this.music.handleVoiceUpdate(data)
    );

    this.client.once("ready", async () => {
      await this.client.initApplicationCommands();
      this.music.connect(this.client.user!.id);
    });

    this.client.on("interactionCreate", (interaction) => {
      this.client.executeInteraction(interaction);
    });
    this.client.on("error", (err) => {
      console.error(err);
    });

    await importx(
      __dirname + "/services/*.service.{ts,js}",
      __dirname + "bot.{js,ts}"
    );

    this.client.login(process.env.DISCORD_TOKEN);
  }
}

const app = express();
app.get("/", (_, res) => res.send("This is a Discord Bot!"));
app.listen(process.env.PORT || 3000);

load({
  client: {
    id: process.env.SPOTIFY_CLIENT_ID!,
    secret: process.env.SPOTIFY_CLIENT_SECRET!,
  },
  autoResolveYoutubeTracks: false,
});

Bot.start();

export { Bot };
