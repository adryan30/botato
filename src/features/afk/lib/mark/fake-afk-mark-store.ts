import type { AfkMark, AfkMarkStore } from './afk-mark-store.js';

export class FakeAfkMarkStore implements AfkMarkStore {
  readonly #marks = new Map<string, AfkMark>();

  async get(guildId: string, userId: string): Promise<AfkMark | null> {
    return this.#marks.get(key(guildId, userId)) ?? null;
  }

  async upsert(mark: AfkMark): Promise<void> {
    this.#marks.set(key(mark.guildId, mark.userId), { ...mark });
  }

  async delete(guildId: string, userId: string): Promise<void> {
    this.#marks.delete(key(guildId, userId));
  }
}

function key(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}
