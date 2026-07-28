import { describe, expect, it } from 'vitest';
import {
  MUSIC_UNAVAILABLE,
  requireMusicAvailable,
} from './require-music-available.js';

describe('requireMusicAvailable', () => {
  it('allows music commands when the music node is available', () => {
    expect(() => requireMusicAvailable(true)).not.toThrow();
  });

  it('rejects music commands with a clear message when unavailable', () => {
    expect(() => requireMusicAvailable(false)).toThrow(MUSIC_UNAVAILABLE);
  });
});
