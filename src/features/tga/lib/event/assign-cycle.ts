export type CyclePair<T> = {
  giver: T;
  receiver: T;
};

/**
 * Shuffle then pair each entry with the next, wrapping the last to the first.
 * For two or more entries this is a single cycle: everyone gives once and
 * nobody is paired with themselves.
 */
export function assignCycle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): CyclePair<T>[] {
  if (items.length < 2) {
    throw new Error('A cycle needs at least 2 entries');
  }

  const order = shuffle(items, random);
  return order.map((giver, index) => ({
    giver,
    receiver: order[(index + 1) % order.length] as T,
  }));
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const swapWith = j >= 0 && j <= i ? j : i;
    const current = copy[i] as T;
    copy[i] = copy[swapWith] as T;
    copy[swapWith] = current;
  }
  return copy;
}
