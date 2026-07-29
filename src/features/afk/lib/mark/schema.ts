import { pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

export const afkMarks = pgTable(
  'afk_marks',
  {
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    prefix: text('prefix').notNull(),
    previousNickname: text('previous_nickname'),
  },
  (table) => [primaryKey({ columns: [table.guildId, table.userId] })],
);
