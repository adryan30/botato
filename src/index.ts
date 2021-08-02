import * as dotenv from "dotenv";
dotenv.config();
import express = require("express");
import { Client } from "@typeit/discord";
import { AppDiscord } from "./bot";

async function start() {
  const client = new Client({
    classes: [
      AppDiscord,
      `${__dirname}/*Discord.ts`,
      `${__dirname}/*Discord.js`,
    ],
    silent: false,
    variablesChar: ":",
    fetchAllMembers: true,
  });

  await client.login(process.env.DISCORD_TOKEN);
}

const app = express();
app.get("/", (_, res) => res.send("This is a Discord Bot!"));
app.listen(process.env.PORT || 3000);

start();
