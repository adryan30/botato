import * as dotenv from "dotenv";
dotenv.config();
import express = require("express");
import { Client } from "@typeit/discord";
import { AppDiscord } from "./bot";
import { Manager } from "@lavacord/discord.js";
import Queue from "./structures/queue";
import { LavasfyClient } from "lavasfy";

const client = new Client({
  classes: [AppDiscord, `${__dirname}/*Discord.ts`, `${__dirname}/*Discord.js`],
  silent: false,
  variablesChar: "=",
  fetchAllMembers: true,
});
const nodes = [
  {
    id: "1",
    host: process.env.LAVALINK_HOST,
    port: process.env.LAVALINK_PORT,
    password: process.env.LAVALINK_PASSWORD,
  },
];
let manager: Manager;
let lavasfy: LavasfyClient;
const queues: { [id: string]: Queue } = {};

async function start() {
  await client.login(process.env.DISCORD_TOKEN);
  manager = new Manager(client, nodes, { user: client.user.id });
  lavasfy = new LavasfyClient(
    {
      clientID: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      autoResolve: true,
      audioOnlyResults: true,
    },
    nodes
  );
}

const app = express();
app.get("/", (_, res) => res.send("This is a Discord Bot!"));
app.listen(process.env.PORT || 3000);

start();

export { manager, lavasfy, queues };
