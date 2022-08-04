import "dotenv/config";
import "reflect-metadata";
import { container } from "tsyringe";
import { Bot } from "./services/bot.service";
import { Music } from "./services/music.service";

async function run() {
  const bot = container.resolve(Bot);
  const music = container.resolve(Music);
  await bot.start();
  music.start();
}

run();
