export const MUSIC_UNAVAILABLE = 'Music is temporarily unavailable.';

export function requireMusicAvailable(available: boolean): void {
  if (!available) {
    throw new Error(MUSIC_UNAVAILABLE);
  }
}
