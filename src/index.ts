import * as dotenv from "dotenv";
dotenv.config();
import express = require("express");
import { Client } from "@typeit/discord";
import { AppDiscord } from "./bot";
import { Manager } from "@lavacord/discord.js";

let manager: Manager;

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
  manager = new Manager(
    client,
    [
      {
        id: "1",
        host: "localhost",
        port: process.env.LAVALINK_PORT,
        password: process.env.LAVALINK_PASSWORD,
      },
    ],
    {
      user: client.user.id,
    }
  );
  await manager.connect();

  manager
    .on("ready", (node) => console.log(`Node ${node.id} is ready!`))
    .on("disconnect", (ws, node) =>
      console.log(`Node ${node.id} disconnected.`)
    )
    .on("reconnecting", (node) =>
      console.log(`Node ${node.id} tries to reconnect.`)
    )
    .on("error", (error, node) =>
      console.log(`Node ${node.id} got an error: ${error}`)
    );
}

const app = express();
app.get("/", (_, res) => res.send("This is a Discord Bot!"));
app.listen(process.env.PORT || 3000);

start();

export { manager };
