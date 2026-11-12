import { and, asc, desc, eq } from 'drizzle-orm';
import type { BotatoDb } from '../../../../lib/db/index.js';
import { tgaEvents, tgaParticipants } from './schema.js';
import {
  TgaConflictError,
  type TgaDrawPair,
  type TgaEventRecord,
  type TgaEventStatus,
  type TgaParticipantRecord,
  type TgaRepair,
  type TgaSignupWrite,
  type TgaStore,
} from './tga-store.js';

export class DrizzleTgaStore implements TgaStore {
  readonly #db: BotatoDb;

  constructor(db: BotatoDb) {
    this.#db = db;
  }

  async insertEvent(event: TgaEventRecord): Promise<void> {
    try {
      await this.#db.insert(tgaEvents).values({
        id: event.id,
        guildId: event.guildId,
        name: event.name,
        organizerId: event.organizerId,
        status: event.status,
        channelId: event.channelId,
        messageId: event.messageId,
        budgetCents: event.budgetCents,
        createdAt: event.createdAt,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TgaConflictError();
      }
      throw error;
    }
  }

  async getOpenEvent(guildId: string): Promise<TgaEventRecord | null> {
    const rows = await this.#db
      .select()
      .from(tgaEvents)
      .where(and(eq(tgaEvents.guildId, guildId), eq(tgaEvents.status, 'open')))
      .limit(1);
    const row = rows[0];
    return row ? toEvent(row) : null;
  }

  async getLatestDrawnEvent(guildId: string): Promise<TgaEventRecord | null> {
    const rows = await this.#db
      .select()
      .from(tgaEvents)
      .where(
        and(eq(tgaEvents.guildId, guildId), eq(tgaEvents.status, 'drawn')),
      )
      .orderBy(desc(tgaEvents.createdAt))
      .limit(1);
    const row = rows[0];
    return row ? toEvent(row) : null;
  }

  async setStatus(
    eventId: string,
    from: TgaEventStatus,
    to: TgaEventStatus,
  ): Promise<boolean> {
    const rows = await this.#db
      .update(tgaEvents)
      .set({ status: to })
      .where(and(eq(tgaEvents.id, eventId), eq(tgaEvents.status, from)))
      .returning({ id: tgaEvents.id });
    return rows.length > 0;
  }

  async setMessageId(eventId: string, messageId: string): Promise<void> {
    await this.#db
      .update(tgaEvents)
      .set({ messageId })
      .where(eq(tgaEvents.id, eventId));
  }

  async upsertParticipant(
    signup: TgaSignupWrite,
  ): Promise<'inserted' | 'updated'> {
    const existing = await this.getParticipant(signup.eventId, signup.userId);
    await this.#db
      .insert(tgaParticipants)
      .values({
        eventId: signup.eventId,
        userId: signup.userId,
        steamId64: signup.steamId64,
        wishlistUrl: signup.wishlistUrl,
        dmDelivered: false,
        giftBought: false,
        giftIdeas: null,
        joinedAt: existing?.joinedAt ?? new Date(),
      })
      .onConflictDoUpdate({
        target: [tgaParticipants.eventId, tgaParticipants.userId],
        set: {
          steamId64: signup.steamId64,
          wishlistUrl: signup.wishlistUrl,
        },
      });
    return existing ? 'updated' : 'inserted';
  }

  async deleteParticipant(eventId: string, userId: string): Promise<boolean> {
    const rows = await this.#db
      .delete(tgaParticipants)
      .where(
        and(
          eq(tgaParticipants.eventId, eventId),
          eq(tgaParticipants.userId, userId),
        ),
      )
      .returning({ userId: tgaParticipants.userId });
    return rows.length > 0;
  }

  async listParticipants(eventId: string): Promise<TgaParticipantRecord[]> {
    const rows = await this.#db
      .select()
      .from(tgaParticipants)
      .where(eq(tgaParticipants.eventId, eventId))
      .orderBy(asc(tgaParticipants.joinedAt));
    return rows.map(toParticipant);
  }

  async getParticipant(
    eventId: string,
    userId: string,
  ): Promise<TgaParticipantRecord | null> {
    const rows = await this.#db
      .select()
      .from(tgaParticipants)
      .where(
        and(
          eq(tgaParticipants.eventId, eventId),
          eq(tgaParticipants.userId, userId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? toParticipant(row) : null;
  }

  async commitDraw(
    eventId: string,
    pairs: readonly TgaDrawPair[],
  ): Promise<boolean> {
    return this.#db.transaction(async (tx) => {
      const locked = await tx
        .select({ id: tgaEvents.id })
        .from(tgaEvents)
        .where(and(eq(tgaEvents.id, eventId), eq(tgaEvents.status, 'open')))
        .for('update');
      if (locked.length === 0) {
        return false;
      }

      const signups = await tx
        .select({ userId: tgaParticipants.userId })
        .from(tgaParticipants)
        .where(eq(tgaParticipants.eventId, eventId));
      const targets = new Map(
        pairs.map((pair) => [pair.userId, pair.targetUserId]),
      );
      if (
        signups.length !== pairs.length ||
        signups.some((signup) => !targets.has(signup.userId))
      ) {
        return false;
      }

      for (const signup of signups) {
        const targetUserId = targets.get(signup.userId);
        if (!targetUserId) {
          throw new Error('TGA draw pair missing after roster check');
        }
        await tx
          .update(tgaParticipants)
          .set({ targetUserId, dmDelivered: false, giftBought: false, giftIdeas: null })
          .where(
            and(
              eq(tgaParticipants.eventId, eventId),
              eq(tgaParticipants.userId, signup.userId),
            ),
          );
      }

      await tx
        .update(tgaEvents)
        .set({ status: 'drawn' })
        .where(eq(tgaEvents.id, eventId));
      return true;
    });
  }

  async applyRepair(eventId: string, repair: TgaRepair): Promise<boolean> {
    return this.#db.transaction(async (tx) => {
      const locked = await tx
        .select({ id: tgaEvents.id })
        .from(tgaEvents)
        .where(and(eq(tgaEvents.id, eventId), eq(tgaEvents.status, 'drawn')))
        .for('update');
      if (locked.length === 0) {
        return false;
      }

      const signups = await tx
        .select({
          userId: tgaParticipants.userId,
          targetUserId: tgaParticipants.targetUserId,
        })
        .from(tgaParticipants)
        .where(eq(tgaParticipants.eventId, eventId));
      const removed = signups.find(
        (signup) => signup.userId === repair.removedUserId,
      );
      const giver = signups.find(
        (signup) => signup.userId === repair.giverUserId,
      );
      if (!removed || !giver || signups.length - 1 < 2) {
        return false;
      }
      if (
        removed.targetUserId !== repair.newTargetUserId ||
        giver.targetUserId !== repair.removedUserId
      ) {
        return false;
      }

      await tx
        .update(tgaParticipants)
        .set({
          targetUserId: repair.newTargetUserId,
          giftBought: false,
          dmDelivered: false,
        })
        .where(
          and(
            eq(tgaParticipants.eventId, eventId),
            eq(tgaParticipants.userId, repair.giverUserId),
          ),
        );
      await tx
        .delete(tgaParticipants)
        .where(
          and(
            eq(tgaParticipants.eventId, eventId),
            eq(tgaParticipants.userId, repair.removedUserId),
          ),
        );
      return true;
    });
  }

  async setGiftIdeas(
    eventId: string,
    userId: string,
    giftIdeas: string | null,
  ): Promise<void> {
    await this.#db
      .update(tgaParticipants)
      .set({ giftIdeas })
      .where(
        and(
          eq(tgaParticipants.eventId, eventId),
          eq(tgaParticipants.userId, userId),
        ),
      );
  }

  async setGiftBought(
    eventId: string,
    userId: string,
    bought: boolean,
  ): Promise<boolean> {
    const rows = await this.#db
      .update(tgaParticipants)
      .set({ giftBought: bought })
      .where(
        and(
          eq(tgaParticipants.eventId, eventId),
          eq(tgaParticipants.userId, userId),
        ),
      )
      .returning({ userId: tgaParticipants.userId });
    return rows.length > 0;
  }

  async markDmDelivered(eventId: string, userId: string): Promise<void> {
    await this.#db
      .update(tgaParticipants)
      .set({ dmDelivered: true })
      .where(
        and(
          eq(tgaParticipants.eventId, eventId),
          eq(tgaParticipants.userId, userId),
        ),
      );
  }
}

function toEvent(row: typeof tgaEvents.$inferSelect): TgaEventRecord {
  return {
    id: row.id,
    guildId: row.guildId,
    name: row.name,
    organizerId: row.organizerId,
    status: asStatus(row.status),
    channelId: row.channelId,
    messageId: row.messageId,
    budgetCents: row.budgetCents,
    createdAt: row.createdAt,
  };
}

function toParticipant(
  row: typeof tgaParticipants.$inferSelect,
): TgaParticipantRecord {
  return {
    eventId: row.eventId,
    userId: row.userId,
    steamId64: row.steamId64,
    wishlistUrl: row.wishlistUrl,
    targetUserId: row.targetUserId,
    dmDelivered: row.dmDelivered,
    giftBought: row.giftBought,
    giftIdeas: row.giftIdeas,
    joinedAt: row.joinedAt,
  };
}

function asStatus(value: string): TgaEventStatus {
  if (
    value === 'open' ||
    value === 'drawn' ||
    value === 'cancelled' ||
    value === 'ended'
  ) {
    return value;
  }
  throw new Error(`Unknown TGA event status: ${value}`);
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    if ('code' in current && current.code === '23505') {
      return true;
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}
