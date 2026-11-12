export type WishlistEntry = {
  appId: number;
  priority: number;
  dateAdded: number;
};

export type StorePrice = {
  appId: number;
  name: string;
  priceCents: number;
  formattedPrice: string;
  discountPercent: number;
};

export type GiftIdea = {
  name: string;
  formattedPrice: string;
  discountPercent: number;
};

export type GiftIdeaList = {
  budgetMiss: boolean;
  ideas: GiftIdea[];
};

export const GIFT_IDEA_LIMIT = 5;
const BUDGET_LOOKAHEAD = 100;
const UNBUDGETED_LOOKAHEAD = 8;

export function wishlistRank(
  items: readonly WishlistEntry[],
): WishlistEntry[] {
  return [...items].sort((left, right) => {
    const leftUnranked = left.priority === 0;
    const rightUnranked = right.priority === 0;
    if (leftUnranked !== rightUnranked) {
      return leftUnranked ? 1 : -1;
    }
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    return right.dateAdded - left.dateAdded;
  });
}

export function priceLookupLimit(budgetCents: number | null): number {
  return budgetCents === null ? UNBUDGETED_LOOKAHEAD : BUDGET_LOOKAHEAD;
}

export function selectGiftIdeas(
  items: readonly WishlistEntry[],
  prices: readonly StorePrice[],
  budgetCents: number | null,
): GiftIdeaList {
  const pricesById = new Map(prices.map((price) => [price.appId, price]));
  const ranked = wishlistRank(items).flatMap((entry) => {
    const price = pricesById.get(entry.appId);
    return price ? [{ price }] : [];
  });
  const withinBudget = ranked.filter(
    ({ price }) => budgetCents === null || price.priceCents <= budgetCents,
  );
  const budgetMiss =
    budgetCents !== null && withinBudget.length === 0 && ranked.length > 0;
  const chosen = (budgetMiss ? ranked : withinBudget).slice(0, GIFT_IDEA_LIMIT);

  return {
    budgetMiss,
    ideas: chosen.map(({ price }) => ({
      name: price.name,
      formattedPrice: price.formattedPrice,
      discountPercent: price.discountPercent,
    })),
  };
}

export function parseGiftIdeas(raw: string | null): GiftIdeaList {
  if (!raw) {
    return { budgetMiss: false, ideas: [] };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('ideas' in parsed)) {
      return { budgetMiss: false, ideas: [] };
    }
    const ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
    return {
      budgetMiss: 'budgetMiss' in parsed && parsed.budgetMiss === true,
      ideas: ideas.flatMap((idea) => {
        if (!idea || typeof idea !== 'object') {
          return [];
        }
        const name = 'name' in idea && typeof idea.name === 'string' ? idea.name : null;
        const formattedPrice =
          'formattedPrice' in idea && typeof idea.formattedPrice === 'string'
            ? idea.formattedPrice
            : null;
        const discountPercent =
          'discountPercent' in idea && typeof idea.discountPercent === 'number'
            ? idea.discountPercent
            : 0;
        if (!name || !formattedPrice) {
          return [];
        }
        return [{ name, formattedPrice, discountPercent }];
      }),
    };
  } catch {
    return { budgetMiss: false, ideas: [] };
  }
}
