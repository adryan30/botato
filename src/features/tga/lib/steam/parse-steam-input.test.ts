import { describe, expect, it } from 'vitest';
import { parseSteamInput, wishlistUrlFor } from './parse-steam-input.js';

const steamId = '76561198000000001';

describe('parseSteamInput', () => {
  it('accepts a SteamID64', () => {
    expect(parseSteamInput(`  ${steamId}  `)).toEqual({
      kind: 'steamid64',
      steamId64: steamId,
    });
  });

  it('accepts profile, vanity, and wishlist URLs', () => {
    expect(
      parseSteamInput(
        `https://steamcommunity.com/profiles/${steamId}/`,
      ),
    ).toEqual({ kind: 'steamid64', steamId64: steamId });
    expect(
      parseSteamInput('https://steamcommunity.com/id/Ada_99/wishlist'),
    ).toEqual({ kind: 'vanity', vanity: 'Ada_99' });
    expect(
      parseSteamInput(
        `https://store.steampowered.com/wishlist/profiles/${steamId}`,
      ),
    ).toEqual({ kind: 'steamid64', steamId64: steamId });
    expect(
      parseSteamInput('store.steampowered.com/wishlist/id/ada'),
    ).toEqual({ kind: 'vanity', vanity: 'ada' });
  });

  it('accepts a bare vanity and rejects everything else', () => {
    expect(parseSteamInput('ada')).toEqual({ kind: 'vanity', vanity: 'ada' });
    expect(parseSteamInput('12345')).toBeNull();
    expect(parseSteamInput('nope!')).toBeNull();
    expect(parseSteamInput('https://example.com/id/ada')).toBeNull();
  });

  it('builds the store wishlist link from a SteamID64', () => {
    expect(wishlistUrlFor(steamId)).toBe(
      `https://store.steampowered.com/wishlist/profiles/${steamId}`,
    );
  });
});
