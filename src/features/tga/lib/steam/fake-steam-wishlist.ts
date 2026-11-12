import type {
  SteamLookup,
  SteamWishlistPort,
  WishlistCheck,
} from './steam-wishlist-port.js';

export class FakeSteamWishlist implements SteamWishlistPort {
  readonly vanities = new Map<string, SteamLookup>();
  readonly visibility = new Map<string, WishlistCheck>();
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
}
