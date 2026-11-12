import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const tgaEvents = pgTable(
  'tga_events',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').notNull(),
    name: text('name').notNull(),
    organizerId: text('organizer_id').notNull(),
    status: text('status').notNull(),
    channelId: text('channel_id').notNull(),
    messageId: text('message_id'),
    budgetCents: integer('budget_cents'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('tga_events_one_open_per_guild')
      .on(table.guildId)
      .where(sql`${table.status} = 'open'`),
  ],
);

export const tgaParticipants = pgTable(
  'tga_participants',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => tgaEvents.id),
    userId: text('user_id').notNull(),
    steamId64: text('steam_id64').notNull(),
    wishlistUrl: text('wishlist_url').notNull(),
    targetUserId: text('target_user_id'),
    dmDelivered: boolean('dm_delivered').notNull().default(false),
    giftBought: boolean('gift_bought').notNull().default(false),
    giftIdeas: text('gift_ideas'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.userId] })],
);
