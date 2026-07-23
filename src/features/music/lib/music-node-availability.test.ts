import { describe, expect, it, vi } from 'vitest';
import { MusicNodeAvailability } from './music-node-availability.js';

describe('MusicNodeAvailability', () => {
  it('starts unavailable until the music node is reachable', () => {
    const availability = new MusicNodeAvailability();

    expect(availability.isAvailable()).toBe(false);
  });

  it('becomes available when the music node is marked reachable', () => {
    const availability = new MusicNodeAvailability();

    availability.markAvailable();

    expect(availability.isAvailable()).toBe(true);
  });

  it('becomes unavailable when the music node is marked unreachable', () => {
    const availability = new MusicNodeAvailability();
    availability.markAvailable();

    availability.markUnavailable();

    expect(availability.isAvailable()).toBe(false);
  });

  it('notifies listeners only when availability changes', () => {
    const availability = new MusicNodeAvailability();
    const listener = vi.fn();
    availability.onChange(listener);

    availability.markUnavailable();
    availability.markAvailable();
    availability.markAvailable();
    availability.markUnavailable();

    expect(listener.mock.calls).toEqual([[true], [false]]);
  });
});
