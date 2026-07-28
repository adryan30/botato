import type { Track } from './music-node/music-node-port.js';

/**
 * Ephemeral /play confirmation from tracks actually added this request.
 * Do not infer from a post-play session snapshot — empty resolve leaves
 * nowPlaying/queue unchanged and produces stale "Playing/Queued" text.
 */
export function playConfirmation(
  wasPlaying: boolean,
  added: readonly Track[],
): string {
  const first = added[0];
  if (!first) {
    return 'No tracks found for that query.';
  }
  if (!wasPlaying) {
    return `Playing **${first.title}**`;
  }
  return `Queued **${first.title}**`;
}
