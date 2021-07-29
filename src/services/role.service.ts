import { ArgsOf, Infos, On } from "@typeit/discord";
import {
  Client,
  MessageEmbed,
  MessageReaction,
  TextChannel,
  User,
} from "discord.js";
import { cleanChannel } from "../utils";
import { theme } from "../config";

interface EmbedSettings {
  client: Client;
  roleId: string;
  roleChannel: string;
  emoji: string;
  embedColor: string;
  embedTitle: string;
  embedDescription: string;
  embedImage: string;
  footer?: string;
}
export abstract class RoleService {
  guildId = "861118279019397130";

  async findRole(id: string, client: Client) {
    return client.guilds.cache.get(this.guildId).roles.cache.get(id);
  }
  async findChannel(id: string, client: Client) {
    return client.channels.cache.get(id);
  }

  async setupEmbeb({
    client,
    roleId,
    roleChannel,
    emoji,
    embedColor,
    embedTitle,
    embedDescription,
    embedImage,
    footer,
  }: EmbedSettings) {
    const channel = await this.findChannel(roleChannel, client);
    const role = await this.findRole(roleId, client);
    if (!((c): c is TextChannel => c.type === "text")(channel)) return;
    await cleanChannel(channel);

    const messageEmbed = await channel.send({
      embed: new MessageEmbed()
        .setColor(embedColor)
        .setTitle(embedTitle)
        .setDescription(embedDescription)
        .setImage(embedImage)
        .setFooter(footer || ""),
    });
    messageEmbed.react(emoji);

    client.on(
      "messageReactionAdd",
      async (reaction: MessageReaction, user: User) => {
        if (reaction.message.partial) await reaction.message.fetch();
        if (reaction.partial) await reaction.fetch();
        if (user.bot) return;
        if (!reaction.message.guild) return;
        if (reaction.message.channel.id === roleChannel) {
          if (reaction.emoji.name === emoji) {
            await reaction.message.guild.members.cache
              .get(user.id)
              .roles.add(role);
          }
        }
        return;
      }
    );
    client.on(
      "messageReactionRemove",
      async (reaction: MessageReaction, user: User) => {
        if (reaction.message.partial) await reaction.message.fetch();
        if (reaction.partial) await reaction.fetch();
        if (user.bot) return;
        if (!reaction.message.guild) return;
        if (reaction.message.channel.id === roleChannel) {
          if (reaction.emoji.name === emoji) {
            await reaction.message.guild.members.cache
              .get(user.id)
              .roles.remove(role);
          }
        }
        return;
      }
    );
  }

  @Infos({ hide: true })
  @On("ready")
  async setupAdventurer([_]: ArgsOf<"message">, client: Client) {
    this.setupEmbeb({
      client,
      roleId: "862010637399752704",
      roleChannel: "862015536766648342",
      emoji: "🎲",
      embedColor: theme.default,
      embedTitle: "Escolha seu role!",
      embedDescription: `Ocasionalmente, organizamos campanhas de RPG narradas e jogadas aqui pelo Discord, caso você tenha interesse em participar ou organizar uma campanha, reaja a essa mensagem com um "🎲" e assim saberemos do seu interesse.`,
      embedImage: "https://i.imgur.com/HzQGust.png",
    });
  }
  @Infos({ hide: true })
  @On("ready")
  async setupAcademic([_]: ArgsOf<"message">, client: Client) {
    this.setupEmbeb({
      client,
      roleId: "862116339471745024",
      roleChannel: "862387241257926677",
      emoji: "📕",
      embedColor: theme.default,
      embedTitle: "Escolha seu role!",
      embedDescription: `Se você é aluno do curso de Ciência da Computação da UFAL e/ou deseja ser avisado de "Coisas da UFAL" (aulas, trabalhos, arquivos), reaja com "📕".`,
      embedImage: "https://i.imgur.com/mfNsMid.png",
    });
  }
  @Infos({ hide: true })
  @On("ready")
  async setupBorthel([_]: ArgsOf<"message">, client: Client) {
    this.setupEmbeb({
      client,
      roleId: "870320546540290068",
      roleChannel: "870315829525360650",
      emoji: "🎰",
      embedColor: "#151429",
      embedTitle: "Bordel",
      embedDescription: `Para poder roletar suas waifus, husbandos e pokémons, reaja ao emoji de 🎰 abaixo para receber um cargo e ser notificado ou notificar seus paceiros quando for rolar personagens, ser avisado quando algum leilão oficial estiver acontecendo e participar de sorteios e eventos relacionados às rolegens.`,
      embedImage: "https://i.imgur.com/SbR74KF.png",
      footer: "Caso precise de ajuda com o bot use $help.",
    });
  }
}
