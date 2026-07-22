import { randomUUID } from 'node:crypto';
import type { Track } from './music-node-port.js';

const TTL_MS = 5 * 60 * 1000;
export const SEARCH_SELECT_CUSTOM_ID_PREFIX = 'music:search:';

type CacheEntry = {
  userId: string;
  tracks: Track[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export function putSearchResults(userId: string, tracks: Track[]): string {
  pruneExpired();
  const id = randomUUID();
  cache.set(id, {
    userId,
    tracks,
    expiresAt: Date.now() + TTL_MS,
  });
  return id;
}

export function peekSearchResults(
  id: string,
): { userId: string; tracks: Track[] } | null {
  const entry = readEntry(id);
  if (!entry) {
    return null;
  }
  return { userId: entry.userId, tracks: entry.tracks };
}

export function takeSearchResults(
  id: string,
  userId: string,
): Track[] | null {
  const entry = readEntry(id);
  if (!entry || entry.userId !== userId) {
    return null;
  }
  cache.delete(id);
  return entry.tracks;
}

function readEntry(id: string): CacheEntry | null {
  const entry = cache.get(id);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    cache.delete(id);
    return null;
  }
  return entry;
}

export function searchSelectCustomId(cacheId: string): string {
  return `${SEARCH_SELECT_CUSTOM_ID_PREFIX}${cacheId}`;
}

export function parseSearchSelectCustomId(customId: string): string | null {
  if (!customId.startsWith(SEARCH_SELECT_CUSTOM_ID_PREFIX)) {
    return null;
  }
  return customId.slice(SEARCH_SELECT_CUSTOM_ID_PREFIX.length) || null;
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, entry] of cache) {
    if (entry.expiresAt < now) {
      cache.delete(id);
    }
  }
}
