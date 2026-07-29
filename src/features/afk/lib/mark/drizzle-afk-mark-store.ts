import { and, eq } from 'drizzle-orm';
import type { BotatoDb } from '../../../../lib/db/index.js';
import type { AfkMark, AfkMarkStore } from './afk-mark-store.js';
import { afkMarks } from './schema.js';

export class DrizzleAfkMarkStore implements AfkMarkStore {
  readonly #db: BotatoDb;

  constructor(db: BotatoDb) {
    this.#db = db;
  }

  async get(guildId: string, userId: string): Promise<AfkMark | null> {
    const rows = await this.#db
      .select()
      .from(afkMarks)
      .where(
        and(eq(afkMarks.guildId, guildId), eq(afkMarks.userId, userId)),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      guildId: row.guildId,
      userId: row.userId,
      prefix: row.prefix,
      previousNickname: row.previousNickname,
    };
  }

  async upsert(mark: AfkMark): Promise<void> {
    await this.#db
      .insert(afkMarks)
      .values({
        guildId: mark.guildId,
        userId: mark.userId,
        prefix: mark.prefix,
        previousNickname: mark.previousNickname,
      })
      .onConflictDoUpdate({
        target: [afkMarks.guildId, afkMarks.userId],
        set: {
          prefix: mark.prefix,
          previousNickname: mark.previousNickname,
        },
      });
  }

  async delete(guildId: string, userId: string): Promise<void> {
    await this.#db
      .delete(afkMarks)
      .where(
        and(eq(afkMarks.guildId, guildId), eq(afkMarks.userId, userId)),
      );
  }
}
