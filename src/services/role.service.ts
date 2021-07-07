import { CommandMessage, Command, Description, Infos } from "@typeit/discord";
import { MessageEmbed, MessageReaction, Role, User } from "discord.js";

interface EmbedSettings {
  message: CommandMessage;
  role: Role;
  roleChannel: string;
  emoji: string;
  embedColor: string;
  embedTitle: string;
  embedDescription: string;
  embedImage: string;
}
export abstract class RoleService {
  findRole(roleName: string, message: CommandMessage) {
    return message.guild.roles.cache.find((r) => r.name === roleName);
  }
  async checkIsValid(reaction: MessageReaction, user: User) {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;
    if (!reaction.message.guild) return;
  }

  async setupEmbeb({
    message,
    role,
    roleChannel,
    emoji,
    embedColor,
    embedTitle,
    embedDescription,
    embedImage,
  }: EmbedSettings) {
    const messageEmbed = await message.channel.send({
      embed: new MessageEmbed()
        .setColor(embedColor)
        .setTitle(embedTitle)
        .setDescription(embedDescription)
        .setImage(embedImage),
    });
    messageEmbed.react(emoji);

    message.client.on(
      "messageReactionAdd",
      async (reaction: MessageReaction, user: User) => {
        await this.checkIsValid(reaction, user);
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
    message.client.on(
      "messageReactionRemove",
      async (reaction: MessageReaction, user: User) => {
        await this.checkIsValid(reaction, user);
        if (reaction.message.channel.id === roleChannel) {
          await this.checkIsValid(reaction, user);
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

  @Command("setupAdventurer")
  @Infos({ hide: true })
  async setupAdventurer(message: CommandMessage) {
    message.delete();
    this.setupEmbeb({
      message,
      role: this.findRole("Aventureiro", message),
      roleChannel: "862015536766648342",
      emoji: "🎲",
      embedColor: "#148F77",
      embedTitle: "Escolha seu role!",
      embedDescription: `Ocasionalmente, organizamos campanhas de RPG narradas e jogadas aqui pelo Discord, caso você tenha interesse em participar ou organizar uma campanha, reaja a essa mensagem com um "🎲" e assim saberemos do seu interesse.`,
      embedImage: "https://i.imgur.com/HzQGust.png",
    });
  }
  @Command("setupAcademic")
  @Infos({ hide: true })
  async setupAcademic(message: CommandMessage) {
    message.delete();
    this.setupEmbeb({
      message,
      role: this.findRole("Acadêmico", message),
      roleChannel: "862387241257926677",
      emoji: "📕",
      embedColor: "#6965cd",
      embedTitle: "Escolha seu role!",
      embedDescription: `Se você é aluno do curso de Ciência da Computação da UFAL e/ou deseja ser avisado de "Coisas da UFAL" (aulas, trabalhos, arquivos), reaja com "📕".`,
      embedImage: "https://i.imgur.com/mfNsMid.png",
    });
  }
}
