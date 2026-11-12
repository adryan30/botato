import { describe, expect, it, vi } from 'vitest';
import { SteamWishlistClient } from './steam-wishlist-client.js';

const steamId = '76561198000000001';

describe('SteamWishlistClient', () => {
  it('reads a SteamID64 from the community profile XML', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          `<?xml version="1.0"?><profile><steamID64>${steamId}</steamID64></profile>`,
        ),
    );
    const client = new SteamWishlistClient(fetchImpl as typeof fetch);

    await expect(client.resolveVanity('ada')).resolves.toEqual({
      ok: true,
      steamId64: steamId,
    });
  });

  it('treats a profile without a SteamID64 as missing', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>missing</html>'));
    const client = new SteamWishlistClient(fetchImpl as typeof fetch);

    await expect(client.resolveVanity('missing')).resolves.toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('treats a wishlist with games as public', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        response: { items: [{ appid: 620 }] },
      }),
    );
    const client = new SteamWishlistClient(fetchImpl as typeof fetch);

    await expect(client.readVisibility(steamId)).resolves.toEqual({ ok: true });
  });

  it('treats an empty wishlist payload as not public', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ response: {} }));
    const client = new SteamWishlistClient(fetchImpl as typeof fetch);

    await expect(client.readVisibility(steamId)).resolves.toEqual({
      ok: false,
      reason: 'hidden',
    });
  });

  it('reports Steam outages as unreachable', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    const client = new SteamWishlistClient(fetchImpl as typeof fetch);

    await expect(client.resolveVanity('ada')).resolves.toEqual({
      ok: false,
      reason: 'unreachable',
    });
    await expect(client.readVisibility(steamId)).resolves.toEqual({
      ok: false,
      reason: 'unreachable',
    });
  });
});
