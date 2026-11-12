import { MessageFlags } from 'discord.js';
import { formatTgaError } from './copy.js';
import { TgaError } from './event/tga-service.js';

type TgaReply = {
  deferred: boolean;
  replied: boolean;
  reply(options: {
    content: string;
    flags?: typeof MessageFlags.Ephemeral;
  }): Promise<unknown>;
  editReply(options: { content: string }): Promise<unknown>;
};

export async function replyTga(
  interaction: TgaReply,
  content: string,
  ephemeral: boolean,
): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content });
    return;
  }

  await interaction.reply(
    ephemeral
      ? { content, flags: MessageFlags.Ephemeral }
      : { content },
  );
}

export function tgaFailureContent(
  error: unknown,
  log: (error: unknown) => void,
): string {
  if (error instanceof TgaError) {
    return formatTgaError(error.code);
  }
  log(error);
  return 'Não consegui concluir isso.';
}
