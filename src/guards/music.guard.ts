import { GuardFunction } from "discordx";
import { CommandInteraction, GuildMember, EmbedBuilder } from "discord.js";
import { theme } from "../config";
import { Bot } from "../index.old";
import { Node, Player } from "lavaclient";

export const NoQueueEmbed = new EmbedBuilder({
  title: "Erro!",
  description: "Não existe uma fila para esse servidor...",
  color: theme.error,
});
export const NotInVoiceChannelEmbed = new EmbedBuilder({
  title: "Erro!",
  description:
    "Você precisa estar em um canal de voz para utilizar esse comando!",
  color: theme.error,
});
export const NoPermissionEmbed = new EmbedBuilder({
  title: "Erro!",
  description: "Não tenho permissões para entrar no canal que você está!",
  color: theme.error,
});

export const QueueGuard: GuardFunction<CommandInteraction> = async (
  arg,
  _client,
  next,
  datas: { player: Player<Node> }
) => {
  const interaction = arg instanceof Array ? arg[0] : arg;
  const music = Bot.music;
  const player = music.players.get(interaction.guildId);
  if (!player) return interaction.reply({ embeds: [NoQueueEmbed] });
  datas.player = player;
  await next();
};

export const MusicGuard: GuardFunction<CommandInteraction> = async (
  arg,
  _client,
  next,
  datas
) => {
  const interaction = arg instanceof Array ? arg[0] : arg;
  if (interaction.member instanceof GuildMember) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ embeds: [NotInVoiceChannelEmbed] });
    }
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return interaction.reply({ embeds: [NoPermissionEmbed] });
    }
    datas.voiceChannel = voiceChannel;
  }
  await next();
};
