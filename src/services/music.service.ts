import { singleton } from "tsyringe";
import {
  Node,
  VoiceServerUpdate,
  VoiceStateUpdate,
} from "@discordx/lava-player";
import { GatewayDispatchEvents } from "discord.js";
import { Bot } from "./bot.service";

@singleton()
export class Music {
  private _node: Node;

  get node() {
    return this._node;
  }

  constructor(private readonly _bot: Bot) {}

  start() {
    this._node = new Node({
      host: {
        address: process.env.LAVALINK_HOST ?? "",
        port: Number(process.env.LAVALINK_PORT) ?? 2333,
      },
      password: process.env.LAVALINK_PASSWORD ?? "",
      send: this.send,
      userId: this._bot.client.user?.id ?? "",
    });

    this._node.on("connect", () => {
      // TODO Log with winston
      console.log(`[music] now connected to lavalink`);
    });
    this.initVoiceListeners();
  }

  send(guildId: string, packet) {
    const guild = this._bot.client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(packet);
  }

  initVoiceListeners() {
    this._bot.client.ws.on(
      GatewayDispatchEvents.VoiceStateUpdate,
      (data: VoiceServerUpdate) => {
        this.node.voiceServerUpdate(data);
      }
    );
    this._bot.client.ws.on(
      GatewayDispatchEvents.VoiceStateUpdate,
      (data: VoiceStateUpdate) => {
        this.node.voiceStateUpdate(data);
      }
    );
  }
}
