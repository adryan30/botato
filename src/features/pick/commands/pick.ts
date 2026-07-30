import { Command } from '@sapphire/framework';
import {
  ChannelType,
  GuildMember,
  type VoiceBasedChannel,
} from 'discord.js';
import {
  chooseVoicePick,
  eligibleVoicePickMembers,
  EMPTY_VOICE_PICK_MESSAGE,
  formatVoicePickReply,
  MISSING_VOICE_CHANNEL_MESSAGE,
  parsePickStyle,
  resolvePickVoiceChannelId,
  type VoiceChannelMember,
} from '../lib/voice-pick.js';

export class PickCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Pick a random person from a voice channel',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('pick')
        .setDescription('Pick a random person from a voice channel')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Voice channel to pick from (default: yours)')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName('style')
            .setDescription('How to announce the pick (default: mention)')
            .setRequired(false)
            .addChoices(
              { name: 'mention', value: 'mention' },
              { name: 'silent', value: 'silent' },
              { name: 'private', value: 'private' },
            ),
        ),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const style = parsePickStyle(interaction.options.getString('style'));
    const optionChannel = interaction.options.getChannel('channel', false, [
      ChannelType.GuildVoice,
    ]);
    const requesterVoiceChannelId =
      interaction.member instanceof GuildMember
        ? (interaction.member.voice.channelId ?? null)
        : null;

    const voiceChannelId = resolvePickVoiceChannelId(
      optionChannel?.id,
      requesterVoiceChannelId,
    );
    if (!voiceChannelId) {
      await interaction.reply({
        content: MISSING_VOICE_CHANNEL_MESSAGE,
        ephemeral: true,
      });
      return;
    }

    const voiceChannel = await resolveGuildVoiceChannel(
      interaction,
      voiceChannelId,
    );
    if (!voiceChannel) {
      await interaction.reply({
        content: MISSING_VOICE_CHANNEL_MESSAGE,
        ephemeral: true,
      });
      return;
    }

    const members: VoiceChannelMember[] = [...voiceChannel.members.values()].map(
      (member) => ({
        id: member.id,
        displayName: member.displayName,
        bot: member.user.bot,
      }),
    );

    const pick = chooseVoicePick(
      eligibleVoicePickMembers(members, interaction.user.id),
    );
    if (!pick) {
      await interaction.reply({
        content: EMPTY_VOICE_PICK_MESSAGE,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(formatVoicePickReply(pick, style));
  }
}

async function resolveGuildVoiceChannel(
  interaction: Command.ChatInputCommandInteraction,
  voiceChannelId: string,
): Promise<VoiceBasedChannel | null> {
  const cached = interaction.guild?.channels.cache.get(voiceChannelId);
  if (cached?.isVoiceBased()) {
    return cached;
  }

  const fetched = await interaction.guild?.channels.fetch(voiceChannelId);
  if (fetched?.isVoiceBased()) {
    return fetched;
  }

  return null;
}
