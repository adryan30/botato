import { container, singleton } from "tsyringe";
import { Client, DIService, tsyringeDependencyRegistryEngine } from "discordx";
import { IntentsBitField, Interaction, Message } from "discord.js";
import { importx } from "@discordx/importer";

@singleton()
export class Bot {
  private _client: Client;

  get client() {
    return this._client;
  }

  constructor() {
    DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container);
    console.log("constructor");
  }

  async start() {
    this._client = new Client({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildEmojisAndStickers,
      ],
      silent: false,
      botGuilds:
        process.env.NODE_ENV === "development"
          ? [process.env.GUILD_ID]
          : undefined,
    });

    this._client.once("ready", async () => {
      await this._client.guilds.fetch();
      await this._client.initApplicationCommands({
        guild: { log: true },
        global: { log: true },
      });
      console.log("Bot started"); // TODO Replace with winston logger
    });

    this._client.on("interactionCreate", (interaction: Interaction) => {
      this._client.executeInteraction(interaction);
    });

    this._client.on("messageCreate", (message: Message) => {
      this._client.executeCommand(message);
    });

    // await importx(__dirname + "/commands/**/*.{ts,js}");
    await this._client.login(process.env.DISCORD_TOKEN);
  }
}
