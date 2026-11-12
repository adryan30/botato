import { describe, expect, it } from 'vitest';
import { selectGiftIdeas, wishlistRank, type StorePrice, type WishlistEntry } from './gift-ideas.js';

const caro: StorePrice = {
  appId: 1,
  name: 'Caro',
  priceCents: 8000,
  formattedPrice: 'R$ 80,00',
  discountPercent: 0,
};
const barato: StorePrice = {
  appId: 2,
  name: 'Barato',
  priceCents: 2000,
  formattedPrice: 'R$ 20,00',
  discountPercent: 40,
};
const gratis: StorePrice = {
  appId: 3,
  name: 'Grátis',
  priceCents: 0,
  formattedPrice: 'Grátis',
  discountPercent: 0,
};

function entry(appId: number, priority: number, dateAdded = 1): WishlistEntry {
  return { appId, priority, dateAdded };
}

describe('wishlistRank', () => {
  it('puts a lower priority number first and leaves unranked items last', () => {
    expect(
      wishlistRank([
        entry(3, 0, 50),
        entry(1, 2, 1),
        entry(2, 1, 1),
        entry(4, 1, 9),
      ]).map((item) => item.appId),
    ).toEqual([4, 2, 1, 3]);
  });
});

describe('selectGiftIdeas', () => {
  it('keeps the highest ranked games when there is no budget', () => {
    const selected = selectGiftIdeas(
      [entry(1, 1), entry(2, 2)],
      [caro, barato],
      null,
    );

    expect(selected).toEqual({
      budgetMiss: false,
      ideas: [
        { name: 'Caro', formattedPrice: 'R$ 80,00', discountPercent: 0 },
        { name: 'Barato', formattedPrice: 'R$ 20,00', discountPercent: 40 },
      ],
    });
  });

  it('prefers games that fit the budget, including free ones', () => {
    const selected = selectGiftIdeas(
      [entry(1, 1), entry(2, 2), entry(3, 3)],
      [caro, barato, gratis],
      5000,
    );

    expect(selected.budgetMiss).toBe(false);
    expect(selected.ideas.map((idea) => idea.name)).toEqual(['Barato', 'Grátis']);
  });

  it('falls back to the top of the wishlist when nothing fits the budget', () => {
    const selected = selectGiftIdeas([entry(1, 1), entry(2, 2)], [caro, barato], 100);

    expect(selected.budgetMiss).toBe(true);
    expect(selected.ideas.map((idea) => idea.name)).toEqual(['Caro', 'Barato']);
  });
});
