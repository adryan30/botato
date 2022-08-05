import {
  Collection,
  CommandInteraction,
  Message,
  TextChannel,
} from "discord.js";
import { injectable } from "tsyringe";
import { addMilliseconds, format } from "date-fns";
import { Bot } from "./bot.service";
import { WinstonLogger } from "./logger.service";

@injectable()
export class Utils {
  private guildId = process.env.GUILD_ID;

  constructor(
    private readonly _bot: Bot,
    private readonly _logger: WinstonLogger
  ) {}

  chunks<T>(arr: T[], chunkSize: number): T[][] {
    const matrix = [];
    while (arr.length > 0) {
      const chunk = arr.splice(0, chunkSize);
      matrix.push(chunk);
    }
    return matrix;
  }

  findRole(roleName: string) {
    const guildRoles = this._bot.client.guilds.cache.get(this.guildId).roles
      .cache;
    return guildRoles.find((c) => c.name === roleName);
  }

  findChannel(channelName: string) {
    const foundChannel = this._bot.client.channels.cache.find((c) => {
      if (c instanceof TextChannel) return c.name === channelName;
      return false;
    });
    if (foundChannel instanceof TextChannel) return foundChannel;
  }

  findDrolhosEmoji() {
    return this._bot.client.emojis.cache.find((e) => e.name === "drolhoscoin");
  }

  findUser(interaction: CommandInteraction) {
    const {
      user: { id },
    } = interaction;
    return interaction.guild.members.cache.get(id);
  }

  async cleanChannel(channel: TextChannel) {
    let messageQuantity = 0;
    let fetched: Collection<string, Message>;
    do {
      fetched = await channel.messages.fetch({ limit: 100 });
      fetched = fetched.filter((message) => !message.pinned);
      messageQuantity += fetched.size;
      await channel
        .bulkDelete(fetched)
        .catch((err) => this._logger.log.error(err));
    } while (fetched.size > 2);
    return messageQuantity;
  }

  msToHMS(miliseconds: number) {
    const hour = 60 * 60 * 1000;
    if (miliseconds > hour) return "> 1h";
    const duration = addMilliseconds(0, miliseconds);
    return format(duration, "mm:ss");
  }
}
