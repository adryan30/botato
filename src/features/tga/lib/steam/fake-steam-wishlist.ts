import type { StorePrice, WishlistEntry } from './gift-ideas.js';
import type {
  PriceLookup,
  SteamLookup,
  SteamWishlistPort,
  WishlistCheck,
  WishlistRead,
} from './steam-wishlist-port.js';

export class FakeSteamWishlist implements SteamWishlistPort {
  readonly vanities = new Map<string, SteamLookup>();
  readonly visibility = new Map<string, WishlistCheck>();
  readonly lists = new Map<string, WishlistEntry[] | 'hidden' | 'unreachable'>();
  readonly prices = new Map<number, StorePrice>();
  pricesUnreachable = false;
  resolveCalls = 0;
  visibilityCalls = 0;

  async resolveVanity(vanity: string): Promise<SteamLookup> {
    this.resolveCalls += 1;
    return this.vanities.get(vanity) ?? { ok: false, reason: 'not-found' };
  }

  async readVisibility(steamId64: string): Promise<WishlistCheck> {
    this.visibilityCalls += 1;
    return this.visibility.get(steamId64) ?? { ok: false, reason: 'hidden' };
  }

  async readWishlist(steamId64: string): Promise<WishlistRead> {
    const listed = this.lists.get(steamId64);
    if (listed === 'hidden') {
      return { ok: false, reason: 'hidden' };
    }
    if (listed === 'unreachable') {
      return { ok: false, reason: 'unreachable' };
    }
    if (listed) {
      return { ok: true, items: listed };
    }

    const visibility = this.visibility.get(steamId64) ?? {
      ok: false as const,
      reason: 'hidden' as const,
    };
    if (!visibility.ok) {
      return visibility;
    }
    return { ok: true, items: [] };
  }

  async lookupPrices(appIds: readonly number[]): Promise<PriceLookup> {
    if (this.pricesUnreachable) {
      return { ok: false, reason: 'unreachable' };
    }
    return {
      ok: true,
      prices: appIds.flatMap((appId) => {
        const price = this.prices.get(appId);
        return price ? [price] : [];
      }),
    };
  }
}
