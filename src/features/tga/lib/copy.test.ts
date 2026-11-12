import { describe, expect, it } from 'vitest';
import { formatStatus } from './copy.js';

const entry = {
  userId: '111',
  steamId64: '76561198000000001',
  wishlistUrl:
    'https://store.steampowered.com/wishlist/profiles/76561198000000001',
  dmDelivered: true,
  giftBought: false,
};

describe('formatStatus', () => {
  it('links each person to a wishlist instead of printing a steam id', () => {
    const table = formatStatus({
      eventName: 'Natal',
      status: 'drawn',
      entries: [entry],
    });

    expect(table.title).toBe('Natal — sorteada');
    expect(table.columns.map((column) => column.name)).toEqual([
      'Pessoa',
      'Wishlist',
      'Situação',
    ]);
    expect(table.columns[0]?.value).toBe('<@111>');
    expect(table.columns[1]?.value).toBe(`[wishlist](${entry.wishlistUrl})`);
    expect(table.columns[2]?.value).toBe('DM enviada · não comprou');
    expect(table.columns.some((column) => column.value.includes('`'))).toBe(
      false,
    );
  });

  it('omits the draw column while signups are still open', () => {
    const table = formatStatus({
      eventName: 'Natal',
      status: 'open',
      entries: [entry],
    });

    expect(table.columns.map((column) => column.name)).toEqual([
      'Pessoa',
      'Wishlist',
    ]);
  });

  it('says when nobody has joined', () => {
    expect(
      formatStatus({ eventName: 'Natal', status: 'open', entries: [] }),
    ).toMatchObject({
      title: 'Natal — aberta',
      description: 'Ninguém entrou ainda.',
      columns: [],
    });
  });
});
