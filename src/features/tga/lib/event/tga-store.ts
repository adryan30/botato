export type TgaEventStatus = 'open' | 'drawn' | 'cancelled' | 'ended';

export type TgaEventRecord = {
  id: string;
  guildId: string;
  name: string;
  organizerId: string;
  status: TgaEventStatus;
  channelId: string;
  messageId: string | null;
  budgetCents: number | null;
  createdAt: Date;
};

export type TgaParticipantRecord = {
  eventId: string;
  userId: string;
  steamId64: string;
  wishlistUrl: string;
  targetUserId: string | null;
  dmDelivered: boolean;
  giftBought: boolean;
  giftIdeas: string | null;
  joinedAt: Date;
};

export type TgaSignupWrite = {
  eventId: string;
  userId: string;
  steamId64: string;
  wishlistUrl: string;
};

export type TgaDrawPair = {
  userId: string;
  targetUserId: string;
};

export type TgaRepair = {
  removedUserId: string;
  giverUserId: string;
  newTargetUserId: string;
};

/** A second open TGA event in the same guild. */
export class TgaConflictError extends Error {
  constructor() {
    super('tga-conflict');
    this.name = 'TgaConflictError';
  }
}

export type TgaStore = {
  insertEvent(event: TgaEventRecord): Promise<void>;
  getOpenEvent(guildId: string): Promise<TgaEventRecord | null>;
  getLatestDrawnEvent(guildId: string): Promise<TgaEventRecord | null>;
  setStatus(
    eventId: string,
    from: TgaEventStatus,
    to: TgaEventStatus,
  ): Promise<boolean>;
  setMessageId(eventId: string, messageId: string): Promise<void>;
  upsertParticipant(signup: TgaSignupWrite): Promise<'inserted' | 'updated'>;
  deleteParticipant(eventId: string, userId: string): Promise<boolean>;
  listParticipants(eventId: string): Promise<TgaParticipantRecord[]>;
  getParticipant(
    eventId: string,
    userId: string,
  ): Promise<TgaParticipantRecord | null>;
  commitDraw(eventId: string, pairs: readonly TgaDrawPair[]): Promise<boolean>;
  applyRepair(eventId: string, repair: TgaRepair): Promise<boolean>;
  setGiftIdeas(
    eventId: string,
    userId: string,
    giftIdeas: string | null,
  ): Promise<void>;
  setGiftBought(eventId: string, userId: string, bought: boolean): Promise<boolean>;
  markDmDelivered(eventId: string, userId: string): Promise<void>;
};
