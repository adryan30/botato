import type {
  SteamLookup,
  SteamWishlistPort,
  WishlistCheck,
} from './steam-wishlist-port.js';

const USER_AGENT = 'Botato TGA';
const STEAM_ID64 = /<steamID64>(7656\d{13})<\/steamID64>/;

export class SteamWishlistClient implements SteamWishlistPort {
  readonly #fetchImpl: typeof fetch;

  constructor(fetchImpl: typeof fetch = fetch) {
    this.#fetchImpl = fetchImpl;
  }

  async resolveVanity(vanity: string): Promise<SteamLookup> {
    const url = `https://steamcommunity.com/id/${encodeURIComponent(vanity)}?xml=1`;
    let response: Response;
    try {
      response = await this.#fetchImpl(url, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return { ok: false, reason: 'unreachable' };
    }

    if (!response.ok) {
      return { ok: false, reason: 'unreachable' };
    }

    const match = STEAM_ID64.exec(await response.text());
    const steamId64 = match?.[1];
    if (!steamId64) {
      return { ok: false, reason: 'not-found' };
    }
    return { ok: true, steamId64 };
  }

  async readVisibility(steamId64: string): Promise<WishlistCheck> {
    const url = `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${steamId64}`;
    let response: Response;
    try {
      response = await this.#fetchImpl(url, {
        headers: {
          accept: 'application/json',
          'user-agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return { ok: false, reason: 'unreachable' };
    }

    if (!response.ok) {
      return { ok: false, reason: 'unreachable' };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, reason: 'unreachable' };
    }

    const items = readWishlistItems(body);
    if (items === null) {
      return { ok: false, reason: 'unreachable' };
    }
    if (items.length === 0) {
      return { ok: false, reason: 'hidden' };
    }
    return { ok: true };
  }
}

function readWishlistItems(body: unknown): unknown[] | null {
  if (!body || typeof body !== 'object' || !('response' in body)) {
    return null;
  }

  const response = body.response;
  if (!response || typeof response !== 'object') {
    return null;
  }

  if (!('items' in response)) {
    return [];
  }

  return Array.isArray(response.items) ? response.items : null;
}
