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

export class FakeTgaStore implements TgaStore {
  readonly events: TgaEventRecord[] = [];
  readonly participants: TgaParticipantRecord[] = [];
  #joinedAt = 0;

  async insertEvent(event: TgaEventRecord): Promise<void> {
    const openExists = this.events.some(
      (existing) =>
        existing.guildId === event.guildId && existing.status === 'open',
    );
    if (event.status === 'open' && openExists) {
      throw new TgaConflictError();
    }
    this.events.push({ ...event });
  }

  async getOpenEvent(guildId: string): Promise<TgaEventRecord | null> {
    const event = this.events.find(
      (candidate) =>
        candidate.guildId === guildId && candidate.status === 'open',
    );
    return event ? { ...event } : null;
  }

  async getLatestDrawnEvent(guildId: string): Promise<TgaEventRecord | null> {
    const drawn = this.events
      .filter((event) => event.guildId === guildId && event.status === 'drawn')
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return drawn[0] ? { ...drawn[0] } : null;
  }

  async setStatus(
    eventId: string,
    from: TgaEventStatus,
    to: TgaEventStatus,
  ): Promise<boolean> {
    const event = this.events.find(
      (candidate) => candidate.id === eventId && candidate.status === from,
    );
    if (!event) {
      return false;
    }
    event.status = to;
    return true;
  }

  async setMessageId(eventId: string, messageId: string): Promise<void> {
    const event = this.events.find((candidate) => candidate.id === eventId);
    if (event) {
      event.messageId = messageId;
    }
  }

  async upsertParticipant(
    signup: TgaSignupWrite,
  ): Promise<'inserted' | 'updated'> {
    const existing = this.participants.find(
      (participant) =>
        participant.eventId === signup.eventId &&
        participant.userId === signup.userId,
    );
    if (existing) {
      existing.steamId64 = signup.steamId64;
      existing.wishlistUrl = signup.wishlistUrl;
      return 'updated';
    }

    this.participants.push({
      eventId: signup.eventId,
      userId: signup.userId,
      steamId64: signup.steamId64,
      wishlistUrl: signup.wishlistUrl,
      targetUserId: null,
      dmDelivered: false,
      giftBought: false,
      giftIdeas: null,
      joinedAt: new Date((this.#joinedAt += 1)),
    });
    return 'inserted';
  }

  async deleteParticipant(eventId: string, userId: string): Promise<boolean> {
    const index = this.participants.findIndex(
      (participant) =>
        participant.eventId === eventId && participant.userId === userId,
    );
    if (index === -1) {
      return false;
    }
    this.participants.splice(index, 1);
    return true;
  }

  async listParticipants(eventId: string): Promise<TgaParticipantRecord[]> {
    return this.participants
      .filter((participant) => participant.eventId === eventId)
      .sort((left, right) => left.joinedAt.getTime() - right.joinedAt.getTime())
      .map((participant) => ({ ...participant }));
  }

  async getParticipant(
    eventId: string,
    userId: string,
  ): Promise<TgaParticipantRecord | null> {
    const participant = this.participants.find(
      (candidate) =>
        candidate.eventId === eventId && candidate.userId === userId,
    );
    return participant ? { ...participant } : null;
  }

  async commitDraw(
    eventId: string,
    pairs: readonly TgaDrawPair[],
  ): Promise<boolean> {
    const event = this.events.find(
      (candidate) => candidate.id === eventId && candidate.status === 'open',
    );
    if (!event) {
      return false;
    }

    const signups = this.participants.filter(
      (participant) => participant.eventId === eventId,
    );
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
      signup.targetUserId = targets.get(signup.userId) ?? null;
      signup.dmDelivered = false;
      signup.giftBought = false;
      signup.giftIdeas = null;
    }

    event.status = 'drawn';
    return true;
  }

  async applyRepair(eventId: string, repair: TgaRepair): Promise<boolean> {
    const event = this.events.find(
      (candidate) => candidate.id === eventId && candidate.status === 'drawn',
    );
    if (!event) {
      return false;
    }

    const signups = this.participants.filter(
      (participant) => participant.eventId === eventId,
    );
    const removed = signups.find(
      (participant) => participant.userId === repair.removedUserId,
    );
    const giver = signups.find(
      (participant) => participant.userId === repair.giverUserId,
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

    giver.targetUserId = repair.newTargetUserId;
    giver.giftBought = false;
    giver.dmDelivered = false;
    const index = this.participants.indexOf(removed);
    this.participants.splice(index, 1);
    return true;
  }

  async setGiftIdeas(
    eventId: string,
    userId: string,
    giftIdeas: string | null,
  ): Promise<void> {
    const signup = this.#find(eventId, userId);
    if (signup) {
      signup.giftIdeas = giftIdeas;
    }
  }

  async setGiftBought(
    eventId: string,
    userId: string,
    bought: boolean,
  ): Promise<boolean> {
    const signup = this.#find(eventId, userId);
    if (!signup) {
      return false;
    }
    signup.giftBought = bought;
    return true;
  }

  async markDmDelivered(eventId: string, userId: string): Promise<void> {
    const signup = this.#find(eventId, userId);
    if (signup) {
      signup.dmDelivered = true;
    }
  }

  #find(eventId: string, userId: string): TgaParticipantRecord | undefined {
    return this.participants.find(
      (participant) =>
        participant.eventId === eventId && participant.userId === userId,
    );
  }
}
