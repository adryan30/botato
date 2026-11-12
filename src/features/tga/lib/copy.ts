import type {
  TgaDrawResult,
  TgaErrorCode,
  TgaShow,
  TgaStatus,
} from './event/tga-service.js';

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
    case 'no-drawn-event':
      return 'Não há uma troca sorteada para encerrar.';
  }
}

export function formatCreatePost(eventName: string): string {
  return [
    `✨ **${eventName}**`,
    '',
    'Troca Generosa de Ativos. Entre com o link do seu perfil Steam ou da sua wishlist.',
    'A wishlist precisa estar pública e ter pelo menos um jogo.',
    '',
    'No sorteio, o Botato manda no privado quem você tirou e o link da wishlist.',
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

export function formatLeft(eventName: string): string {
  return `Você saiu de **${eventName}**.`;
}

export function formatRemoved(eventName: string): string {
  return `Pessoa removida de **${eventName}**.`;
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

export function formatDrawDm(
  eventName: string,
  targetUserId: string,
  wishlistUrl: string,
): string {
  return [
    `🎁 **${eventName}**`,
    '',
    `Você tirou <@${targetUserId}>.`,
    `Wishlist: ${wishlistUrl}`,
    '',
    'Se perder esta mensagem, use `/tga show`.',
  ].join('\n');
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
  ].join('\n');
}

export function formatStatus(status: TgaStatus): string {
  const phase = status.status === 'open' ? 'aberta' : 'sorteada';
  const header = `**${status.eventName}** — ${phase}`;
  if (status.entries.length === 0) {
    return `${header}\nNinguém entrou ainda.`;
  }

  const lines = status.entries.map((entry) => {
    const delivery =
      status.status === 'drawn'
        ? entry.dmDelivered
          ? 'DM enviada'
          : 'DM não chegou'
        : 'na lista';
    return `• <@${entry.userId}> — \`${entry.steamId64}\` — ${delivery}`;
  });
  const text = [header, ...lines].join('\n');
  if (text.length <= 1900) {
    return text;
  }
  return `${text.slice(0, 1900)}\n…`;
}
