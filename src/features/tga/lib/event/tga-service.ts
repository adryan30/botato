import { randomUUID } from 'node:crypto';
import type { DirectMessagePort } from '../delivery/direct-message-port.js';
import { formatDrawDm } from '../copy.js';
import {
  parseSteamInput,
  wishlistUrlFor,
} from '../steam/parse-steam-input.js';
import type { SteamWishlistPort } from '../steam/steam-wishlist-port.js';
import { assignCycle } from './assign-cycle.js';
import {
  TgaConflictError,
  type TgaEventRecord,
  type TgaStore,
} from './tga-store.js';

export type TgaErrorCode =
  | 'name-required'
  | 'event-already-open'
  | 'no-open-event'
  | 'no-current-event'
  | 'signup-closed'
  | 'not-organizer'
  | 'not-participant'
  | 'participant-missing'
  | 'roster-locked'
  | 'too-few-participants'
  | 'steam-unrecognized'
  | 'steam-not-found'
  | 'steam-taken'
  | 'wishlist-not-public'
  | 'wishlist-unreachable'
  | 'match-missing'
  | 'no-drawn-event';

export class TgaError extends Error {
  readonly code: TgaErrorCode;

  constructor(code: TgaErrorCode) {
    super(code);
    this.name = 'TgaError';
    this.code = code;
  }
}

export type TgaEventSummary = {
  id: string;
  name: string;
  channelId: string;
  messageId: string | null;
};

export type TgaJoinResult = {
  eventName: string;
  steamId64: string;
  wishlistUrl: string;
  updated: boolean;
};

export type TgaShow =
  | {
      kind: 'waiting';
      eventName: string;
      steamId64: string;
      wishlistUrl: string;
    }
  | {
      kind: 'drawn';
      eventName: string;
      targetUserId: string;
      wishlistUrl: string;
    };

export type TgaStatusEntry = {
  userId: string;
  steamId64: string;
  wishlistUrl: string;
  dmDelivered: boolean;
};

export type TgaStatus = {
  eventName: string;
  status: 'open' | 'drawn';
  entries: TgaStatusEntry[];
};

export type TgaDrawResult = {
  eventName: string;
  channelId: string;
  messageId: string | null;
  delivered: number;
  failed: number;
};

const MINIMUM_SIGNUPS = 3;

export class TgaService {
  readonly #store: TgaStore;
  readonly #steam: SteamWishlistPort;
  readonly #dms: DirectMessagePort;
  readonly #random: () => number;

  constructor(
    store: TgaStore,
    steam: SteamWishlistPort,
    dms: DirectMessagePort,
    random: () => number = Math.random,
  ) {
    this.#store = store;
    this.#steam = steam;
    this.#dms = dms;
    this.#random = random;
  }

  async createEvent(input: {
    guildId: string;
    organizerId: string;
    name: string;
    channelId: string;
  }): Promise<TgaEventSummary> {
    const name = input.name.trim();
    if (!name) {
      throw new TgaError('name-required');
    }

    const open = await this.#store.getOpenEvent(input.guildId);
    if (open) {
      throw new TgaError('event-already-open');
    }

    const event: TgaEventRecord = {
      id: randomUUID(),
      guildId: input.guildId,
      name,
      organizerId: input.organizerId,
      status: 'open',
      channelId: input.channelId,
      messageId: null,
      createdAt: new Date(),
    };

    try {
      await this.#store.insertEvent(event);
    } catch (error) {
      if (error instanceof TgaConflictError) {
        throw new TgaError('event-already-open');
      }
      throw error;
    }

    return summarize(event);
  }

  async attachSignupMessage(eventId: string, messageId: string): Promise<void> {
    await this.#store.setMessageId(eventId, messageId);
  }

  async join(input: {
    guildId: string;
    userId: string;
    steamInput: string;
    eventId?: string;
  }): Promise<TgaJoinResult> {
    const open = await this.#requireOpen(input.guildId);
    if (input.eventId && input.eventId !== open.id) {
      throw new TgaError('signup-closed');
    }

    const steamId64 = await this.#resolvePublicSteam(input.steamInput);
    const signups = await this.#store.listParticipants(open.id);
    const taken = signups.find(
      (signup) =>
        signup.steamId64 === steamId64 && signup.userId !== input.userId,
    );
    if (taken) {
      throw new TgaError('steam-taken');
    }

    const wishlistUrl = wishlistUrlFor(steamId64);
    const outcome = await this.#store.upsertParticipant({
      eventId: open.id,
      userId: input.userId,
      steamId64,
      wishlistUrl,
    });

    return {
      eventName: open.name,
      steamId64,
      wishlistUrl,
      updated: outcome === 'updated',
    };
  }

  async leave(input: { guildId: string; userId: string }): Promise<string> {
    const open = await this.#requireOpen(input.guildId);
    const removed = await this.#store.deleteParticipant(open.id, input.userId);
    if (!removed) {
      throw new TgaError('not-participant');
    }
    return open.name;
  }

  async remove(input: {
    guildId: string;
    organizerId: string;
    userId: string;
  }): Promise<string> {
    const open = await this.#requireOpen(input.guildId);
    this.#requireOrganizer(open, input.organizerId);
    const removed = await this.#store.deleteParticipant(open.id, input.userId);
    if (!removed) {
      throw new TgaError('participant-missing');
    }
    return open.name;
  }

  async cancel(input: {
    guildId: string;
    organizerId: string;
  }): Promise<TgaEventSummary> {
    const open = await this.#requireOpen(input.guildId);
    this.#requireOrganizer(open, input.organizerId);
    const cancelled = await this.#store.setStatus(open.id, 'open', 'cancelled');
    if (!cancelled) {
      throw new TgaError('no-open-event');
    }
    return summarize({ ...open, status: 'cancelled' });
  }

  async end(input: {
    guildId: string;
    organizerId: string;
  }): Promise<TgaEventSummary> {
    const drawn = await this.#store.getLatestDrawnEvent(input.guildId);
    if (!drawn) {
      throw new TgaError('no-drawn-event');
    }
    this.#requireOrganizer(drawn, input.organizerId);
    const ended = await this.#store.setStatus(drawn.id, 'drawn', 'ended');
    if (!ended) {
      throw new TgaError('no-drawn-event');
    }
    return summarize({ ...drawn, status: 'ended' });
  }

  async draw(input: {
    guildId: string;
    organizerId: string;
  }): Promise<TgaDrawResult> {
    const open = await this.#requireOpen(input.guildId);
    this.#requireOrganizer(open, input.organizerId);

    const signups = await this.#store.listParticipants(open.id);
    if (signups.length < MINIMUM_SIGNUPS) {
      throw new TgaError('too-few-participants');
    }

    const pairs = assignCycle(signups, this.#random).map((pair) => ({
      userId: pair.giver.userId,
      targetUserId: pair.receiver.userId,
      wishlistUrl: pair.receiver.wishlistUrl,
    }));

    const committed = await this.#store.commitDraw(
      open.id,
      pairs.map((pair) => ({
        userId: pair.userId,
        targetUserId: pair.targetUserId,
      })),
    );
    if (!committed) {
      throw new TgaError('no-open-event');
    }

    let delivered = 0;
    let failed = 0;
    for (const pair of pairs) {
      const sent = await this.#dms.send(
        pair.userId,
        formatDrawDm(open.name, pair.targetUserId, pair.wishlistUrl),
      );
      if (!sent) {
        failed += 1;
        continue;
      }
      delivered += 1;
      await this.#store.markDmDelivered(open.id, pair.userId);
    }

    return {
      eventName: open.name,
      channelId: open.channelId,
      messageId: open.messageId,
      delivered,
      failed,
    };
  }

  async show(input: { guildId: string; userId: string }): Promise<TgaShow> {
    const event = await this.#requireCurrent(input.guildId);
    const signup = await this.#store.getParticipant(event.id, input.userId);
    if (!signup) {
      throw new TgaError('not-participant');
    }

    if (event.status === 'open') {
      return {
        kind: 'waiting',
        eventName: event.name,
        steamId64: signup.steamId64,
        wishlistUrl: signup.wishlistUrl,
      };
    }

    if (!signup.targetUserId) {
      throw new TgaError('match-missing');
    }

    const target = await this.#store.getParticipant(
      event.id,
      signup.targetUserId,
    );
    if (!target) {
      throw new TgaError('match-missing');
    }

    return {
      kind: 'drawn',
      eventName: event.name,
      targetUserId: target.userId,
      wishlistUrl: target.wishlistUrl,
    };
  }

  async status(input: {
    guildId: string;
    organizerId: string;
  }): Promise<TgaStatus> {
    const event = await this.#requireCurrent(input.guildId);
    this.#requireOrganizer(event, input.organizerId);
    const signups = await this.#store.listParticipants(event.id);
    return {
      eventName: event.name,
      status: event.status === 'drawn' ? 'drawn' : 'open',
      entries: signups.map((signup) => ({
        userId: signup.userId,
        steamId64: signup.steamId64,
        wishlistUrl: signup.wishlistUrl,
        dmDelivered: signup.dmDelivered,
      })),
    };
  }

  async #requireOpen(guildId: string): Promise<TgaEventRecord> {
    const open = await this.#store.getOpenEvent(guildId);
    if (open) {
      return open;
    }
    const drawn = await this.#store.getLatestDrawnEvent(guildId);
    if (drawn) {
      throw new TgaError('roster-locked');
    }
    throw new TgaError('no-open-event');
  }

  async #requireCurrent(guildId: string): Promise<TgaEventRecord> {
    const open = await this.#store.getOpenEvent(guildId);
    if (open) {
      return open;
    }
    const drawn = await this.#store.getLatestDrawnEvent(guildId);
    if (!drawn) {
      throw new TgaError('no-current-event');
    }
    return drawn;
  }

  #requireOrganizer(event: TgaEventRecord, organizerId: string): void {
    if (event.organizerId !== organizerId) {
      throw new TgaError('not-organizer');
    }
  }

  async #resolvePublicSteam(steamInput: string): Promise<string> {
    const parsed = parseSteamInput(steamInput);
    if (!parsed) {
      throw new TgaError('steam-unrecognized');
    }

    let steamId64: string;
    if (parsed.kind === 'steamid64') {
      steamId64 = parsed.steamId64;
    } else {
      const lookup = await this.#steam.resolveVanity(parsed.vanity);
      if (!lookup.ok) {
        throw new TgaError(
          lookup.reason === 'not-found'
            ? 'steam-not-found'
            : 'wishlist-unreachable',
        );
      }
      steamId64 = lookup.steamId64;
    }

    const visibility = await this.#steam.readVisibility(steamId64);
    if (!visibility.ok) {
      throw new TgaError(
        visibility.reason === 'hidden'
          ? 'wishlist-not-public'
          : 'wishlist-unreachable',
      );
    }

    return steamId64;
  }
}

function summarize(event: TgaEventRecord): TgaEventSummary {
  return {
    id: event.id,
    name: event.name,
    channelId: event.channelId,
    messageId: event.messageId,
  };
}
