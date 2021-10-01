import { ArgsOf, Discord, On } from "discordx";
import {
  Client,
  ColorResolvable,
  MessageEmbed,
  MessageReaction,
  TextChannel,
  User,
} from "discord.js";
import { cleanChannel, findChannel, findRole } from "../utils";
import { theme } from "../config";

interface EmbedSettings {
  client: Client;
  roleName: string;
  roleChannel: string;
  emoji: string;
  embedColor: ColorResolvable;
  embedTitle: string;
  embedDescription: string;
  embedImage: string;
  footer?: string;
}

@Discord()
export abstract class RoleService {
  async setupEmbed({
    client,
    roleName,
    roleChannel,
    emoji,
    embedColor,
    embedTitle,
    embedDescription,
    embedImage,
    footer,
  }: EmbedSettings) {
    const channel = await findChannel(roleChannel, client);
    const role = await findRole(roleName, client);
    if (channel instanceof TextChannel) {
      await cleanChannel(channel);
      const messageEmbed = await channel.send({
        embeds: [
          new MessageEmbed()
            .setColor(embedColor)
            .setTitle(embedTitle)
            .setDescription(embedDescription)
            .setImage(embedImage)
            .setFooter(footer || ""),
        ],
      });
      await messageEmbed.react(emoji);

      client.on(
        "messageReactionAdd",
        async (reaction: MessageReaction, user: User) => {
          if (reaction.message.partial) await reaction.message.fetch();
          if (reaction.partial) await reaction.fetch();
          if (user.bot) return;
          if (!reaction.message.guild) return;
          if (reaction.message.channel.id === channel.id) {
            if (reaction.emoji.name === emoji) {
              await reaction.message.guild.members.cache
                .get(user.id)
                .roles.add(role);
            }
          }
        }
      );
      client.on(
        "messageReactionRemove",
        async (reaction: MessageReaction, user: User) => {
          if (reaction.message.partial) await reaction.message.fetch();
          if (reaction.partial) await reaction.fetch();
          if (user.bot) return;
          if (!reaction.message.guild) return;
          if (reaction.message.channel.id === channel.id) {
            if (reaction.emoji.name === emoji) {
              await reaction.message.guild.members.cache
                .get(user.id)
                .roles.remove(role);
            }
          }
        }
      );
    }
  }

  @On("ready")
  async setupAdventurer([_]: ArgsOf<"message">, client: Client) {
    await this.setupEmbed({
      client,
      roleName: "Aventureiro",
      roleChannel: "entrada-laboratório",
      emoji: "🎲",
      embedColor: theme.default,
      embedTitle: "Escolha seu role!",
      embedDescription: `Ocasionalmente, organizamos campanhas de RPG narradas e jogadas aqui pelo Discord, caso você tenha interesse em participar ou organizar uma campanha, reaja a essa mensagem com um "🎲" e assim saberemos do seu interesse.`,
      embedImage: "https://i.imgur.com/HzQGust.png",
    });
  }

  @On("ready")
  async setupAcademic([_]: ArgsOf<"message">, client: Client) {
    await this.setupEmbed({
      client,
      roleName: "Acadêmico",
      roleChannel: "entrada-academia",
      emoji: "📕",
      embedColor: theme.default,
      embedTitle: "Escolha seu role!",
      embedDescription: `Se você é aluno do curso de Ciência da Computação da UFAL e/ou deseja ser avisado de "Coisas da UFAL" (aulas, trabalhos, arquivos), reaja com "📕".`,
      embedImage: "https://i.imgur.com/mfNsMid.png",
    });
  }

  @On("ready")
  async setupBrothel([_]: ArgsOf<"message">, client: Client) {
    await this.setupEmbed({
      client,
      roleName: "Cafetão",
      roleChannel: "entrada-bordel",
      emoji: "🎰",
      embedColor: "#151429",
      embedTitle: "Bordel",
      embedDescription: `Para poder roletar suas waifus, husbandos e pokémons, reaja ao emoji de 🎰 abaixo para receber um cargo e ser notificado ou notificar seus paceiros quando for rolar personagens, ser avisado quando algum leilão oficial estiver acontecendo e participar de sorteios e eventos relacionados às rolagens.`,
      embedImage: "https://i.imgur.com/SbR74KF.png",
      footer: "Caso precise de ajuda com o bot use $help.",
    });
  }
}
