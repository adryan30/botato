import "dotenv/config";
import "reflect-metadata";
import { container } from "tsyringe";
import { Bot } from "./services/bot.service";
import { WinstonLogger } from "./services/logger.service";
import { Music } from "./services/music.service";

async function run() {
  const logger = container.resolve(WinstonLogger);
  const bot = container.resolve(Bot);
  const music = container.resolve(Music);
  await bot.start().catch((err) => logger.log.error(err));
  music.start();
}

run();
