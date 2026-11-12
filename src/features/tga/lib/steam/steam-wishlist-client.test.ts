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

  it('reads wishlist priority and Brazilian store prices', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('GetWishlist')) {
        return Response.json({
          response: {
            items: [{ appid: 620, priority: 1, date_added: 20 }],
          },
        });
      }
      return Response.json({
        response: {
          store_items: [
            {
              appid: 620,
              name: 'Portal 2',
              best_purchase_option: {
                final_price_in_cents: '3399',
                formatted_final_price: 'R$ 33,99',
                discount_pct: 25,
              },
            },
            { appid: 570, name: 'Dota 2', is_free: true },
          ],
        },
      });
    });
    const client = new SteamWishlistClient(
      fetchImpl as unknown as typeof fetch,
    );

    await expect(client.readWishlist(steamId)).resolves.toEqual({
      ok: true,
      items: [{ appId: 620, priority: 1, dateAdded: 20 }],
    });
    await expect(client.lookupPrices([620, 570])).resolves.toEqual({
      ok: true,
      prices: [
        {
          appId: 620,
          name: 'Portal 2',
          priceCents: 3399,
          formattedPrice: 'R$ 33,99',
          discountPercent: 25,
        },
        {
          appId: 570,
          name: 'Dota 2',
          priceCents: 0,
          formattedPrice: 'Grátis',
          discountPercent: 0,
        },
      ],
    });
  });
});
