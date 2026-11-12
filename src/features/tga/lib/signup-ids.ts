const JOIN_BUTTON_PREFIX = 'tga:join:';
const JOIN_MODAL_PREFIX = 'tga:join-modal:';

export function joinButtonCustomId(eventId: string): string {
  return `${JOIN_BUTTON_PREFIX}${eventId}`;
}

export function joinModalCustomId(eventId: string): string {
  return `${JOIN_MODAL_PREFIX}${eventId}`;
}

export function parseJoinButtonCustomId(customId: string): string | null {
  return suffix(customId, JOIN_BUTTON_PREFIX);
}

export function parseJoinModalCustomId(customId: string): string | null {
  return suffix(customId, JOIN_MODAL_PREFIX);
}

function suffix(customId: string, prefix: string): string | null {
  if (!customId.startsWith(prefix)) {
    return null;
  }
  const eventId = customId.slice(prefix.length);
  return eventId.length > 0 ? eventId : null;
}
