import * as cron from "node-cron";
import { injectable } from "tsyringe";
import { format, subHours } from "date-fns";
import { EmbedBuilder } from "discord.js";

import { Bot } from "./bot.service";
import { Database } from "./database.service";
import { Utils } from "./utils.service";
import { Theme } from "./theme.service";

@injectable()
class Scheduler {
  constructor(
    private readonly _bot: Bot,
    private readonly _db: Database,
    private readonly _utils: Utils,
    private readonly _theme: Theme
  ) {}

  start() {
    this.podiumScheduler();
  }

  podiumScheduler() {
    cron.schedule("*/5 * * * *", async () => {
      const podiumChannel = this._utils.findChannel("podium");
      await this._utils.cleanChannel(podiumChannel);

      const usersData = await this._db.client.user.findMany({
        orderBy: { balance: "desc" },
        select: { balance: true, id: true },
      });
      const { members } = await this._bot.client.guilds.fetch(
        process.env.GUILD_ID
      );
      const leaderboards = await Promise.all(
        usersData.map(async (user) => {
          const memberData = await members.fetch(user.id);
          const {
            user: { username },
          } = memberData;
          return { ...user, username };
        })
      );
      const updatedDate = format(
        subHours(new Date(), 3),
        "dd/MM/yyyy HH:mm:ss"
      );
      await podiumChannel.send({
        embeds: [
          new EmbedBuilder({
            title: "🏆 Ranque",
            color: this._theme.colors.default,
            footer: { text: `Pódio atualizado às ${updatedDate}` },
            description: `${leaderboards
              .map((p, i) => `${i + 1} - ${p.username} - ${p.balance}`)
              .join("\n")}`,
          }),
        ],
      });
    });
  }
}
