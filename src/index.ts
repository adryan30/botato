import "dotenv/config";
import "reflect-metadata";
import { Client } from "discordx";
import { Intents, MessageEmbed, TextChannel } from "discord.js";
import * as queue from "@lavaclient/queue";
import { Node } from "lavaclient";
import { load } from "@lavaclient/spotify";
import { theme } from "./config";
import { msToHMS } from "./utils";
import * as path from "path";
import express = require("express");

queue.load();

class Bot {
  client: Client;
  music: Node;

  constructor() {
    this.start();
  }

  start() {
    this.client = new Client({
      classes: [
        path.join(__dirname, "services", "*.{js,ts}"),
        path.join(__dirname, "bot.{js,ts}"),
      ],
      silent: false,
      commandUnauthorizedHandler: "Não Autorizado",
      botGuilds: [process.env.GUILD_ID],
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
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

    this.music.on("trackStart", (queue, song) => {
      const {
        player: { guildId },
      } = queue;
      const textChannel = this.client.guilds.cache
        .get(guildId)
        .channels.cache.find((ch) => ch.name === "magias-de-comando");
      if (textChannel instanceof TextChannel) {
        textChannel.send({
          embeds: [
            new MessageEmbed({
              title: "🎵 Tocando Agora:",
              fields: [
                {
                  inline: true,
                  name: "Música",
                  value: `[${song.title}](${song.uri})`,
                },
                { inline: true, name: "Autor", value: song.author },
                {
                  inline: true,
                  name: "Duração",
                  value: msToHMS(song.length),
                },
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

    this.client.ws.on("VOICE_SERVER_UPDATE", (data) =>
      this.music.handleVoiceUpdate(data)
    );
    this.client.ws.on("VOICE_STATE_UPDATE", (data) =>
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

const bot = new Bot();

export { bot };
