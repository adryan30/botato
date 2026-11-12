import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits, type Client } from 'discord.js';
import {
  clearBotMessages,
  DM_PAGE_SIZE,
  type DmTranscript,
} from '../lib/clear-bot-messages.js';

export class DmClearCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Apagar as mensagens do Botato num privado',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('dm-clear')
        .setDescription('Apagar as mensagens do Botato num privado')
        .setDMPermission(false)
        .addUserOption((option) =>
          option
            .setName('pessoa')
            .setDescription('De quem limpar o privado. Padrão: você.')
            .setRequired(false),
        ),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const target = interaction.options.getUser('pessoa') ?? interaction.user;
    if (target.bot) {
      await interaction.reply({
        content: 'Não limpo o privado de um bot.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (
      target.id !== interaction.user.id &&
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      await interaction.reply({
        content: 'Você só pode limpar o seu próprio privado.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const botUserId = interaction.client.user?.id;
    if (!botUserId) {
      await interaction.editReply('Ainda não estou pronto.');
      return;
    }

    try {
      const removed = await clearBotMessages(
        await transcriptFor(interaction.client, target.id),
        botUserId,
      );
      const count =
        removed === 1 ? '1 mensagem' : `${removed} mensagens`;
      await interaction.editReply(
        removed === 0
          ? 'Não achei mensagens minhas nesse privado.'
          : `Apaguei ${count} que eu tinha enviado. As mensagens dessa pessoa continuam lá — eu não consigo apagá-las.`,
      );
    } catch (error) {
      this.container.logger.error(error);
      await interaction.editReply('Não consegui limpar esse privado.');
    }
  }
}

async function transcriptFor(client: Client, userId: string): Promise<DmTranscript> {
  const user = await client.users.fetch(userId);
  const channel = await user.createDM();
  return {
    async read(before) {
      const page = await channel.messages.fetch({
        limit: DM_PAGE_SIZE,
        ...(before ? { before } : {}),
      });
      return [...page.values()]
        .map((message) => ({ id: message.id, authorId: message.author.id }))
        .sort((left, right) => compareSnowflakes(right.id, left.id));
    },
    async remove(messageId) {
      await channel.messages.delete(messageId);
    },
  };
}

function compareSnowflakes(left: string, right: string): number {
  const a = BigInt(left);
  const b = BigInt(right);
  if (a === b) {
    return 0;
  }
  return a > b ? 1 : -1;
}
