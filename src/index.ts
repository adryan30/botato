import * as dotenv from "dotenv";
import { Client, Discord, Command, CommandMessage } from "@typeit/discord";
import axios from "axios";

dotenv.config();

@Discord("=")
abstract class AppDiscord {
  @Command("help")
  public help(message: CommandMessage) {
    message.channel.send(
      "```=convert (valor) (origem) (destino) - Converte entre moedas\n=roll (qtd)d(faces) - Roda um dado com os lados solicitados```"
    );
  }

  @Command("ping")
  public async ping(message: CommandMessage) {
    message.channel.send(`🏓 ${Math.round(message.client.ws.ping)}ms`);
  }

  @Command("convert")
  public async convert(message: CommandMessage) {
    const args = message.content.split(" ").slice(1);
    const convertResponse = await axios.get(
      `http://economia.awesomeapi.com.br/json/all/${args[1]}-${args[2]}`
    );
    const value = Number(args[0]) * Number(convertResponse.data[args[1]].ask);
    message.channel.send(
      `${args[0]}${args[1]} => ${value.toFixed(2)}${args[2]}`
    );
  }

  @Command("roll")
  public roll(message: CommandMessage) {
    const rolls = [];
    const args = message.content.split(" ")[1].split("d");
    const [qtd, faces] = args.map(Number);
    for (let index = 0; index < qtd; index++) {
      const roll = Math.floor(Math.random() * faces);
      rolls.push(faces == 2 ? (roll == 1 ? "Cara" : "Coroa") : roll);
    }
    const textMsg = faces > 2 ? "Dados rolados" : "Moedas flipadas";
    message.channel.send(`${textMsg}:\`\`\`${rolls.join(",")}\`\`\``);
  }
}

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

start().then(() => console.log("Bot iniciado"));
