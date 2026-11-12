import type { StorePrice, WishlistEntry } from './gift-ideas.js';

export type SteamLookup =
  | { ok: true; steamId64: string }
  | { ok: false; reason: 'not-found' | 'unreachable' };

export type WishlistCheck =
  | { ok: true }
  | { ok: false; reason: 'hidden' | 'unreachable' };

export type WishlistRead =
  | { ok: true; items: WishlistEntry[] }
  | { ok: false; reason: 'hidden' | 'unreachable' };

export type PriceLookup =
  | { ok: true; prices: StorePrice[] }
  | { ok: false; reason: 'unreachable' };

export type SteamWishlistPort = {
  resolveVanity(vanity: string): Promise<SteamLookup>;
  readVisibility(steamId64: string): Promise<WishlistCheck>;
  readWishlist(steamId64: string): Promise<WishlistRead>;
  lookupPrices(appIds: readonly number[]): Promise<PriceLookup>;
};
