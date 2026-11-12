export type SteamLookup =
  | { ok: true; steamId64: string }
  | { ok: false; reason: 'not-found' | 'unreachable' };

export type WishlistCheck =
  | { ok: true }
  | { ok: false; reason: 'hidden' | 'unreachable' };

export type SteamWishlistPort = {
  resolveVanity(vanity: string): Promise<SteamLookup>;
  readVisibility(steamId64: string): Promise<WishlistCheck>;
};
