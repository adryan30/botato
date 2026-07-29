export const DEFAULT_AFK_LABEL = 'AFK';
export const DISCORD_NICKNAME_MAX_LENGTH = 32;

export function formatAfkPrefix(label?: string): string {
  if (label === undefined) {
    return `[${DEFAULT_AFK_LABEL}]`;
  }

  const trimmed = label.trim();
  if (trimmed.length === 0) {
    throw new Error('AFK label cannot be empty');
  }
  if (trimmed.includes('[') || trimmed.includes(']')) {
    throw new Error('AFK label must be a bare label without brackets');
  }

  return `[${trimmed}]`;
}

export function composeAfkNickname(prefix: string, baseNickname: string): string {
  const composed = `${prefix} ${baseNickname}`;
  if (composed.length > DISCORD_NICKNAME_MAX_LENGTH) {
    throw new Error(
      `Nickname "${composed}" exceeds Discord's ${DISCORD_NICKNAME_MAX_LENGTH}-character nickname limit (${composed.length} characters)`,
    );
  }
  return composed;
}

export function resolveBaseNickname(member: {
  nickname: string | null;
  username: string;
}): string {
  return member.nickname ?? member.username;
}
