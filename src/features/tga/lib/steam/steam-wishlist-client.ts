import type { StorePrice, WishlistEntry } from './gift-ideas.js';
import type {
  PriceLookup,
  SteamLookup,
  SteamWishlistPort,
  WishlistCheck,
  WishlistRead,
} from './steam-wishlist-port.js';

const USER_AGENT = 'Botato TGA';
const STEAM_ID64 = /<steamID64>(7656\d{13})<\/steamID64>/;
const PRICE_BATCH = 40;

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
    const wishlist = await this.readWishlist(steamId64);
    if (!wishlist.ok) {
      return wishlist;
    }
    return { ok: true };
  }

  async readWishlist(steamId64: string): Promise<WishlistRead> {
    const url = `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${steamId64}`;
    const body = await this.#getJson(url);
    if (!body.ok) {
      return body;
    }

    const items = readWishlistItems(body.value);
    if (items === null) {
      return { ok: false, reason: 'unreachable' };
    }
    const parsed = parseWishlistEntries(items);
    if (parsed.length === 0) {
      return { ok: false, reason: 'hidden' };
    }
    return { ok: true, items: parsed };
  }

  async lookupPrices(appIds: readonly number[]): Promise<PriceLookup> {
    if (appIds.length === 0) {
      return { ok: true, prices: [] };
    }

    const prices: StorePrice[] = [];
    for (let index = 0; index < appIds.length; index += PRICE_BATCH) {
      const batch = appIds.slice(index, index + PRICE_BATCH);
      const payload = {
        ids: batch.map((appid) => ({ appid })),
        context: {
          language: 'brazilian',
          country_code: 'BR',
          steam_realm: 1,
        },
        data_request: {
          include_basic_info: true,
          include_all_purchase_options: true,
        },
      };
      const url = `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(payload))}`;
      const body = await this.#getJson(url);
      if (!body.ok) {
        return prices.length > 0 ? { ok: true, prices } : body;
      }
      prices.push(...parseStorePrices(body.value));
    }

    return { ok: true, prices };
  }

  async #getJson(
    url: string,
  ): Promise<{ ok: true; value: unknown } | { ok: false; reason: 'unreachable' }> {
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

    try {
      return { ok: true, value: await response.json() };
    } catch {
      return { ok: false, reason: 'unreachable' };
    }
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

function parseWishlistEntries(items: readonly unknown[]): WishlistEntry[] {
  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }
    const appId = numberField(item, 'appid');
    if (!appId) {
      return [];
    }
    return [
      {
        appId,
        priority: numberField(item, 'priority') ?? 0,
        dateAdded: numberField(item, 'date_added') ?? 0,
      },
    ];
  });
}

function parseStorePrices(body: unknown): StorePrice[] {
  if (!body || typeof body !== 'object' || !('response' in body)) {
    return [];
  }
  const response = body.response;
  if (!response || typeof response !== 'object' || !('store_items' in response)) {
    return [];
  }
  if (!Array.isArray(response.store_items)) {
    return [];
  }
  return response.store_items.flatMap((item) => {
    const price = parseStorePrice(item);
    return price ? [price] : [];
  });
}

function parseStorePrice(item: unknown): StorePrice | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const appId = numberField(item, 'appid');
  const name = stringField(item, 'name');
  if (!appId || !name) {
    return null;
  }
  if ('is_free' in item && item.is_free === true) {
    return {
      appId,
      name,
      priceCents: 0,
      formattedPrice: 'Grátis',
      discountPercent: 0,
    };
  }

  if (!('best_purchase_option' in item)) {
    return null;
  }
  const best = item.best_purchase_option;
  if (!best || typeof best !== 'object') {
    return null;
  }
  const priceCents = numberField(best, 'final_price_in_cents');
  const formattedPrice = stringField(best, 'formatted_final_price');
  if (priceCents === null || !formattedPrice) {
    return null;
  }
  return {
    appId,
    name,
    priceCents,
    formattedPrice,
    discountPercent:
      numberField(best, 'discount_pct') ??
      numberField(best, 'discount_percent') ??
      0,
  };
}

function numberField(value: object, key: string): number | null {
  const record = value as Record<string, unknown>;
  const raw = record[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
    return Number(raw);
  }
  return null;
}

function stringField(value: object, key: string): string | null {
  const record = value as Record<string, unknown>;
  const raw = record[key];
  return typeof raw === 'string' && raw.trim() !== '' ? raw : null;
}
