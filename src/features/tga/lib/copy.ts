import type {
  TgaDrawResult,
  TgaErrorCode,
  TgaRosterChange,
  TgaShow,
  TgaStatus,
} from './event/tga-service.js';
import type { GiftIdeaList } from './steam/gift-ideas.js';

export function formatTgaError(code: TgaErrorCode): string {
  switch (code) {
    case 'name-required':
      return 'Dá um nome para a troca.';
    case 'event-already-open':
      return 'Já existe uma troca aberta neste servidor. Cancele ou sorteie antes de criar outra.';
    case 'no-open-event':
      return 'Não há uma troca aberta.';
    case 'no-current-event':
      return 'Não há uma troca para mostrar.';
    case 'signup-closed':
      return 'Essa troca não está mais aceitando entradas.';
    case 'not-organizer':
      return 'Só quem criou a troca pode fazer isso.';
    case 'not-participant':
      return 'Você não está nesta troca.';
    case 'participant-missing':
      return 'Essa pessoa não está na troca.';
    case 'roster-locked':
      return 'O sorteio já foi feito. A lista está fechada.';
    case 'too-few-participants':
      return 'Precisa de pelo menos 3 participantes para sortear.';
    case 'too-few-after-drop':
      return 'Com menos de 2 pessoas não dá para refazer o sorteio.';
    case 'draw-not-done':
      return 'O sorteio ainda não foi feito.';
    case 'no-drawn-event':
      return 'Não há uma troca sorteada para encerrar.';
    case 'budget-invalid':
      return 'O teto precisa ser um valor em reais, de 1 a 10000.';
    case 'steam-unrecognized':
      return 'Não reconheci esse Steam. Manda o link do perfil, o link da wishlist ou o SteamID64.';
    case 'steam-not-found':
      return 'Não encontrei esse perfil da Steam.';
    case 'steam-taken':
      return 'Essa Steam já está nesta troca.';
    case 'wishlist-not-public':
      return 'Não consegui ler essa wishlist. Ela precisa estar pública e ter pelo menos um jogo.';
    case 'wishlist-unreachable':
      return 'A Steam não respondeu agora. Tente de novo em instantes.';
    case 'match-missing':
      return 'Não achei o seu sorteio. Avisa quem organizou.';
  }
}

export function formatCreatePost(
  eventName: string,
  budgetCents: number | null,
): string {
  const budget =
    budgetCents === null ? [] : [`Teto de ${formatReais(budgetCents)}.`];
  return [
    `✨ **${eventName}**`,
    '',
    'Troca Generosa de Ativos. Entre com o link do seu perfil Steam ou da sua wishlist.',
    'A wishlist precisa estar pública e ter pelo menos um jogo.',
    ...budget,
    '',
    'No sorteio, o Botato manda no privado quem você tirou, o link da wishlist e alguns preços.',
  ].join('\n');
}

export function formatClosedPost(
  eventName: string,
  reason: 'drawn' | 'cancelled' | 'ended',
): string {
  if (reason === 'cancelled') {
    return `✨ **${eventName}**\nEsta troca foi cancelada.`;
  }
  if (reason === 'ended') {
    return `✨ **${eventName}**\nEsta troca foi encerrada.`;
  }
  return `✨ **${eventName}**\nSorteio feito. Olhem o privado — ou usem \`/tga show\`.`;
}

export function formatJoined(result: {
  eventName: string;
  wishlistUrl: string;
  updated: boolean;
}): string {
  const lead = result.updated
    ? `Steam atualizada em **${result.eventName}**.`
    : `Você entrou em **${result.eventName}**.`;
  return `${lead}\nWishlist: ${result.wishlistUrl}`;
}

export function formatLeft(result: TgaRosterChange): string {
  if (!result.repaired) {
    return `Você saiu de **${result.eventName}**.`;
  }
  const followup = result.dmDelivered
    ? 'Quem tinha você recebeu outro match.'
    : 'Quem tinha você recebeu outro match, mas a DM não chegou.';
  return `Você saiu de **${result.eventName}**. ${followup}`;
}

export function formatRemoved(result: TgaRosterChange): string {
  if (!result.repaired) {
    return `Pessoa removida de **${result.eventName}**.`;
  }
  const followup = result.dmDelivered
    ? 'Quem tinha essa pessoa recebeu outro match.'
    : 'Quem tinha essa pessoa recebeu outro match, mas a DM não chegou.';
  return `Pessoa removida de **${result.eventName}**. ${followup}`;
}

export function formatBought(bought: boolean): string {
  return bought
    ? 'Marcado: você já comprou o presente.'
    : 'Desmarcado. O presente ainda não foi comprado.';
}

export function formatCancelled(eventName: string): string {
  return `**${eventName}** foi cancelada.`;
}

export function formatEnded(eventName: string): string {
  return `**${eventName}** foi encerrada.`;
}

export function formatDrawAnnouncement(result: TgaDrawResult): string {
  if (result.failed === 0) {
    return `Sorteio de **${result.eventName}** feito. Olhem o privado.`;
  }
  const people =
    result.failed === 1
      ? '1 pessoa não recebeu a DM'
      : `${result.failed} pessoas não receberam a DM`;
  return `Sorteio de **${result.eventName}** feito. Olhem o privado. ${people} — usem \`/tga show\`.`;
}

export function formatDrawDm(input: {
  eventName: string;
  targetUserId: string;
  wishlistUrl: string;
  budgetCents: number | null;
  ideas: GiftIdeaList;
  repaired?: boolean;
}): string {
  const changed = input.repaired ? ['Seu sorteio mudou.', ''] : [];
  return [
    `🎁 **${input.eventName}**`,
    '',
    ...changed,
    `Você tirou <@${input.targetUserId}>.`,
    `Wishlist: ${input.wishlistUrl}`,
    '',
    formatGiftIdeas(input.budgetCents, input.ideas),
    '',
    'Se perder esta mensagem, use `/tga show`.',
  ].join('\n');
}

export function formatPingDm(input: {
  eventName: string;
  targetUserId: string;
  wishlistUrl: string;
  budgetCents: number | null;
  ideas: GiftIdeaList;
}): string {
  return [
    `🎁 **${input.eventName}**`,
    '',
    'Você ainda não comprou o presente.',
    '',
    `Você tirou <@${input.targetUserId}>.`,
    `Wishlist: ${input.wishlistUrl}`,
    '',
    formatGiftIdeas(input.budgetCents, input.ideas),
    '',
    'Quando comprar, use `/tga comprei`.',
  ].join('\n');
}

export function formatPingResult(result: {
  notified: readonly string[];
  failed: readonly string[];
}): string {
  if (result.notified.length === 0 && result.failed.length === 0) {
    return 'Todo mundo já marcou o presente como comprado.';
  }
  const lines: string[] = [];
  if (result.notified.length > 0) {
    lines.push(
      `Avisei ${mentions(result.notified)} para comprar o presente.`,
    );
  }
  if (result.failed.length > 0) {
    lines.push(`Não consegui avisar ${mentions(result.failed)}.`);
  }
  return lines.join('\n');
}

function mentions(userIds: readonly string[]): string {
  return userIds.map((userId) => `<@${userId}>`).join(', ');
}

export function formatGiftIdeas(
  budgetCents: number | null,
  list: GiftIdeaList,
): string {
  if (list.ideas.length === 0) {
    return 'Não consegui listar os preços agora.';
  }

  const lines = list.ideas.map((idea) => {
    const sale =
      idea.discountPercent > 0
        ? ` — em promoção (-${idea.discountPercent}%)`
        : '';
    return `• ${idea.name} — ${idea.formattedPrice}${sale}`;
  });
  if (list.budgetMiss && budgetCents !== null) {
    return [
      `Nada da wishlist cabe em ${formatReais(budgetCents)}. As mais desejadas:`,
      ...lines,
    ].join('\n');
  }
  const header =
    budgetCents === null ? 'Ideias:' : `Até ${formatReais(budgetCents)}:`;
  return [header, ...lines].join('\n');
}

export function formatReais(cents: number): string {
  const whole = Math.floor(cents / 100);
  const fraction = Math.abs(cents % 100);
  if (fraction === 0) {
    return `R$ ${whole}`;
  }
  return `R$ ${whole},${String(fraction).padStart(2, '0')}`;
}

export function formatShow(show: TgaShow): string {
  if (show.kind === 'waiting') {
    return [
      `Você está em **${show.eventName}**.`,
      `Steam: \`${show.steamId64}\``,
      `Wishlist: ${show.wishlistUrl}`,
      'O sorteio ainda não foi feito.',
    ].join('\n');
  }

  return [
    `**${show.eventName}**`,
    `Você tirou <@${show.targetUserId}>.`,
    `Wishlist: ${show.wishlistUrl}`,
    '',
    formatGiftIdeas(show.budgetCents, show.ideas),
  ].join('\n');
}

const STATUS_FIELD_LIMIT = 1024;

export type TgaStatusColumn = {
  name: string;
  value: string;
};

export type TgaStatusTable = {
  title: string;
  description: string | null;
  columns: TgaStatusColumn[];
};

export function formatStatus(status: TgaStatus): TgaStatusTable {
  const phase = status.status === 'open' ? 'aberta' : 'sorteada';
  const title = `${status.eventName} — ${phase}`;
  if (status.entries.length === 0) {
    return { title, description: 'Ninguém entrou ainda.', columns: [] };
  }

  const columns = [
    {
      name: 'Pessoa',
      lines: status.entries.map((entry) => `<@${entry.userId}>`),
    },
    {
      name: 'Wishlist',
      lines: status.entries.map((entry) => `[wishlist](${entry.wishlistUrl})`),
    },
  ];
  if (status.status === 'drawn') {
    columns.push({
      name: 'Situação',
      lines: status.entries.map((entry) => {
        const delivery = entry.dmDelivered ? 'DM enviada' : 'DM não chegou';
        const bought = entry.giftBought ? 'comprou' : 'não comprou';
        return `${delivery} · ${bought}`;
      }),
    });
  }

  return {
    title,
    description: null,
    columns: alignStatusColumns(columns),
  };
}

function alignStatusColumns(
  columns: { name: string; lines: string[] }[],
): TgaStatusColumn[] {
  const total = columns[0]?.lines.length ?? 0;
  let count = total;
  while (count > 0 && columnsOverflow(columns, count)) {
    count -= 1;
  }

  const truncated = count < total;
  return columns.map((column) => {
    const lines = column.lines.slice(0, count);
    if (truncated) {
      const withMark = [...lines, '…'];
      if (withMark.join('\n').length <= STATUS_FIELD_LIMIT) {
        lines.push('…');
      }
    }
    return { name: column.name, value: lines.join('\n') || '…' };
  });
}

function columnsOverflow(
  columns: { lines: string[] }[],
  count: number,
): boolean {
  return columns.some(
    (column) => column.lines.slice(0, count).join('\n').length > STATUS_FIELD_LIMIT,
  );
}
