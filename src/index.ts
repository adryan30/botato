import * as dotenv from "dotenv";
import express = require("express");
import { Client } from "@typeit/discord";
import { AppDiscord } from "./bot";

dotenv.config();

async function start() {
  const client = new Client({
    classes: [
      AppDiscord,
      `${__dirname}/*Discord.ts`,
      `${__dirname}/*Discord.js`,
    ],
    silent: false,
    variablesChar: "=",
  });

  await client.login(process.env.DISCORD_TOKEN);
}

const app = express();
app.get("/", (_, res) => res.send("This is a Discord Bot!"));
app.listen(process.env.PORT || 3000);

start().then(() => console.log("Bot iniciado"));
