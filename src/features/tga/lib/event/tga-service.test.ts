import { describe, expect, it } from 'vitest';
import { FakeDirectMessage } from '../delivery/fake-direct-message.js';
import { FakeSteamWishlist } from '../steam/fake-steam-wishlist.js';
import { FakeTgaStore } from './fake-tga-store.js';
import { TgaError, TgaService } from './tga-service.js';

const guildId = 'guild-1';
const organizerId = 'organizer';
const steamA = '76561198000000001';
const steamB = '76561198000000002';
const steamC = '76561198000000003';
const wishlist = (steamId: string) =>
  `https://store.steampowered.com/wishlist/profiles/${steamId}`;

function setup(random: () => number = () => 0) {
  const store = new FakeTgaStore();
  const steam = new FakeSteamWishlist();
  const dms = new FakeDirectMessage();
  const service = new TgaService(store, steam, dms, random);
  return { store, steam, dms, service };
}

function allow(steam: FakeSteamWishlist, steamId: string) {
  steam.visibility.set(steamId, { ok: true });
}

describe('TgaService', () => {
  it('refuses a second open event in the same guild', async () => {
    const { service } = setup();
    await create(service);

    await expect(create(service)).rejects.toMatchObject({
      code: 'event-already-open',
    });
  });

  it('rejects a hidden wishlist and does not sign the member up', async () => {
    const { service, store } = setup();
    const event = await create(service);

    await expect(join(service, 'a', steamA)).rejects.toBeInstanceOf(TgaError);
    await expect(join(service, 'a', steamA)).rejects.toMatchObject({
      code: 'wishlist-not-public',
    });
    expect(await store.listParticipants(event.id)).toEqual([]);
  });

  it('resolves a vanity URL only when the wishlist is public', async () => {
    const { service, steam } = setup();
    await create(service);
    steam.vanities.set('ada', { ok: true, steamId64: steamA });

    await expect(join(service, 'a', 'ada')).rejects.toMatchObject({
      code: 'wishlist-not-public',
    });

    allow(steam, steamA);
    await expect(join(service, 'a', 'https://steamcommunity.com/id/ada')).resolves.toMatchObject({
      steamId64: steamA,
      wishlistUrl: wishlist(steamA),
      updated: false,
    });
  });

  it('replaces a signup steam id and rejects one already taken', async () => {
    const { service, steam } = setup();
    await create(service);
    allow(steam, steamA);
    allow(steam, steamB);
    await join(service, 'a', steamA);
    await join(service, 'b', steamB);

    await expect(join(service, 'a', steamB)).rejects.toMatchObject({
      code: 'steam-taken',
    });

    allow(steam, steamC);
    await expect(join(service, 'a', steamC)).resolves.toMatchObject({
      steamId64: steamC,
      updated: true,
    });
    await expect(join(service, 'b', steamC)).rejects.toMatchObject({
      code: 'steam-taken',
    });
  });

  it('draws a cycle, skips the organizer who did not join, and keeps a failed DM readable', async () => {
    const { service, steam, dms } = setup();
    await create(service);
    allow(steam, steamA);
    allow(steam, steamB);
    allow(steam, steamC);
    await join(service, 'a', steamA);
    await join(service, 'b', steamB);
    await join(service, 'c', steamC);
    dms.fail.add('a');

    await expect(
      service.draw({ guildId, organizerId: 'someone-else' }),
    ).rejects.toMatchObject({ code: 'not-organizer' });
    expect(dms.sent).toEqual([]);

    const drawn = await service.draw({ guildId, organizerId });
    expect(drawn).toMatchObject({ delivered: 2, failed: 1 });
    expect(dms.sent.map((message) => message.userId)).toEqual(['b', 'c']);
    expect(dms.sent[0]?.content).toBe(
      [
        '🎁 **Natal**',
        '',
        'Você tirou <@c>.',
        `Wishlist: ${wishlist(steamC)}`,
        '',
        'Se perder esta mensagem, use `/tga show`.',
      ].join('\n'),
    );

    await expect(service.show({ guildId, userId: 'b' })).resolves.toEqual({
      kind: 'drawn',
      eventName: 'Natal',
      targetUserId: 'c',
      wishlistUrl: wishlist(steamC),
    });
    await expect(service.show({ guildId, userId: 'a' })).resolves.toMatchObject({
      kind: 'drawn',
      targetUserId: 'b',
    });

    const status = await service.status({ guildId, organizerId });
    expect(status.entries.map((entry) => Object.keys(entry).sort())).toEqual([
      ['dmDelivered', 'steamId64', 'userId', 'wishlistUrl'],
      ['dmDelivered', 'steamId64', 'userId', 'wishlistUrl'],
      ['dmDelivered', 'steamId64', 'userId', 'wishlistUrl'],
    ]);
    expect(status.entries.map((entry) => [entry.userId, entry.dmDelivered])).toEqual([
      ['a', false],
      ['b', true],
      ['c', true],
    ]);
    expect(JSON.stringify(status).includes('targetUserId')).toBe(false);
  });

  it('locks the roster after the draw and lets show explain the wait before it', async () => {
    const { service, steam } = setup();
    await create(service);
    allow(steam, steamA);
    await join(service, 'a', steamA);

    await expect(service.show({ guildId, userId: 'a' })).resolves.toEqual({
      kind: 'waiting',
      eventName: 'Natal',
      steamId64: steamA,
      wishlistUrl: wishlist(steamA),
    });
    await expect(service.draw({ guildId, organizerId })).rejects.toMatchObject({
      code: 'too-few-participants',
    });

    allow(steam, steamB);
    allow(steam, steamC);
    await join(service, 'b', steamB);
    await join(service, 'c', steamC);
    await service.draw({ guildId, organizerId });

    await expect(service.leave({ guildId, userId: 'a' })).rejects.toMatchObject({
      code: 'roster-locked',
    });
    await expect(
      service.join({
        guildId,
        userId: 'd',
        steamInput: steamA,
        eventId: 'stale-event',
      }),
    ).rejects.toMatchObject({ code: 'roster-locked' });
  });

  it('cancels an open event and then allows another', async () => {
    const { service, steam } = setup();
    const first = await create(service);
    allow(steam, steamA);
    await join(service, 'a', steamA);

    await expect(
      service.cancel({ guildId, organizerId: 'someone-else' }),
    ).rejects.toMatchObject({ code: 'not-organizer' });

    await expect(
      service.cancel({ guildId, organizerId }),
    ).resolves.toMatchObject({ id: first.id, name: 'Natal' });
    await expect(service.join({
      guildId,
      userId: 'a',
      steamInput: steamA,
      eventId: first.id,
    })).rejects.toMatchObject({ code: 'no-open-event' });

    await expect(create(service, 'Natal 2')).resolves.toMatchObject({
      name: 'Natal 2',
    });
    await expect(
      service.join({
        guildId,
        userId: 'a',
        steamInput: steamA,
        eventId: first.id,
      }),
    ).rejects.toMatchObject({ code: 'signup-closed' });
  });

  it('ends a drawn event so show and status stop following it', async () => {
    const { service, steam } = setup();
    await create(service);
    allow(steam, steamA);
    allow(steam, steamB);
    allow(steam, steamC);
    await join(service, 'a', steamA);
    await join(service, 'b', steamB);
    await join(service, 'c', steamC);
    await service.draw({ guildId, organizerId });

    await expect(
      service.end({ guildId, organizerId: 'someone-else' }),
    ).rejects.toMatchObject({ code: 'not-organizer' });
    await expect(service.show({ guildId, userId: 'a' })).resolves.toMatchObject({
      kind: 'drawn',
      eventName: 'Natal',
    });

    await expect(service.end({ guildId, organizerId })).resolves.toMatchObject({
      name: 'Natal',
    });
    await expect(service.show({ guildId, userId: 'a' })).rejects.toMatchObject({
      code: 'no-current-event',
    });
    await expect(service.status({ guildId, organizerId })).rejects.toMatchObject({
      code: 'no-current-event',
    });
    await expect(service.end({ guildId, organizerId })).rejects.toMatchObject({
      code: 'no-drawn-event',
    });
    await expect(create(service, 'Natal 2')).resolves.toMatchObject({
      name: 'Natal 2',
    });
  });

  it('refuses to end an event that has not been drawn', async () => {
    const { service } = setup();
    await create(service);

    await expect(service.end({ guildId, organizerId })).rejects.toMatchObject({
      code: 'no-drawn-event',
    });
  });

  it('rejects steam input that is not a profile or wishlist', async () => {
    const { service, steam } = setup();
    await create(service);

    await expect(join(service, 'a', 'nope!')).rejects.toMatchObject({
      code: 'steam-unrecognized',
    });
    expect(steam.visibilityCalls).toBe(0);
    expect(steam.resolveCalls).toBe(0);
  });

  it('hides status from anyone who did not create the event', async () => {
    const { service } = setup();
    await create(service);

    await expect(
      service.status({ guildId, organizerId: 'someone-else' }),
    ).rejects.toMatchObject({ code: 'not-organizer' });
  });
});

function create(service: TgaService, name = 'Natal') {
  return service.createEvent({
    guildId,
    organizerId,
    name,
    channelId: 'channel-1',
  });
}

function join(service: TgaService, userId: string, steamInput: string) {
  return service.join({ guildId, userId, steamInput });
}
