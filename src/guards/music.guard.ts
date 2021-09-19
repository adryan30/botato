import { GuardFunction } from "@typeit/discord";
import { MessageEmbed } from "discord.js";
import { theme } from "../config";

export const MusicGuard: GuardFunction<"message"> = async (
  [message],
  client,
  next,
  guardDatas
) => {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.channel.send({
      embed: new MessageEmbed({
        title: "Erro!",
        description:
          "Você precisa estar em um canal de voz para utilizar esse comando!",
        color: theme.error,
      }),
    });
  }
  guardDatas.voiceChannel = voiceChannel;
  await next();
};

export const MusicPermissionGuard: GuardFunction<"message"> = async (
  [message],
  client,
  next,
  guardDatas
) => {
  const voiceChannel = message.member.voice.channel;
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send({
      embed: new MessageEmbed({
        title: "Erro!",
        description: "Não tenho permissões para entrar no canal que você está!",
        color: theme.error,
      }),
    });
  }
  guardDatas.voiceChannel = voiceChannel;
  await next();
};
