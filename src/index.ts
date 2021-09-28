require("dotenv").config();
import express = require("express");
import "reflect-metadata";
import { Client } from "discordx";
import { Intents } from "discord.js";
class Bot {
  client: Client;
  nodes: any[];

  constructor() {
    this.nodes = [
      {
        id: "1",
        host: process.env.LAVALINK_HOST,
        port: process.env.LAVALINK_PORT,
        password: process.env.LAVALINK_PASSWORD,
      },
    ];
  }

  start() {
    this.client = new Client({
      classes: [`${__dirname}/services/*.{js,ts}`, `${__dirname}/bot.{js,ts}`],
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

    this.client.once("ready", async () => {
      await this.client.initApplicationCommands();
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

const bot = new Bot();
bot.start();

export { bot };
