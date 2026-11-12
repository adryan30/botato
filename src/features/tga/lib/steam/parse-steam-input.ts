const STEAM_ID64 = /^7656\d{13}$/;
const VANITY = /^[a-zA-Z0-9_-]{2,32}$/;

export type ParsedSteamInput =
  | { kind: 'steamid64'; steamId64: string }
  | { kind: 'vanity'; vanity: string };

export function wishlistUrlFor(steamId64: string): string {
  return `https://store.steampowered.com/wishlist/profiles/${steamId64}`;
}

export function parseSteamInput(raw: string): ParsedSteamInput | null {
  const trimmed = raw.trim();
  if (STEAM_ID64.test(trimmed)) {
    return { kind: 'steamid64', steamId64: trimmed };
  }

  const fromUrl = parseSteamUrl(trimmed);
  if (fromUrl) {
    return fromUrl;
  }

  if (VANITY.test(trimmed) && !/^\d+$/.test(trimmed)) {
    return { kind: 'vanity', vanity: trimmed };
  }

  return null;
}

function parseSteamUrl(raw: string): ParsedSteamInput | null {
  let url: URL;
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'steamcommunity.com') {
    return parseCommunityPath(parts);
  }

  if (host === 'store.steampowered.com' && parts[0] === 'wishlist') {
    return parseWishlistPath(parts.slice(1));
  }

  return null;
}

function parseCommunityPath(parts: string[]): ParsedSteamInput | null {
  const head = parts[0];
  const value = parts[1];
  if (!value) {
    return null;
  }
  if (head === 'profiles' && STEAM_ID64.test(value)) {
    return { kind: 'steamid64', steamId64: value };
  }
  if (head === 'id' && VANITY.test(value)) {
    return { kind: 'vanity', vanity: value };
  }
  return null;
}

function parseWishlistPath(parts: string[]): ParsedSteamInput | null {
  const head = parts[0];
  const value = parts[1];
  if (!value) {
    return null;
  }
  if (head === 'profiles' && STEAM_ID64.test(value)) {
    return { kind: 'steamid64', steamId64: value };
  }
  if (head === 'id' && VANITY.test(value)) {
    return { kind: 'vanity', vanity: value };
  }
  return null;
}
