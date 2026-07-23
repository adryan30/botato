export type MusicNodeAvailabilityListener = (available: boolean) => void;

export class MusicNodeAvailability {
  #available = false;
  readonly #listeners = new Set<MusicNodeAvailabilityListener>();

  isAvailable(): boolean {
    return this.#available;
  }

  onChange(listener: MusicNodeAvailabilityListener): void {
    this.#listeners.add(listener);
  }

  markAvailable(): void {
    this.#setAvailable(true);
  }

  markUnavailable(): void {
    this.#setAvailable(false);
  }

  #setAvailable(available: boolean): void {
    if (this.#available === available) {
      return;
    }
    this.#available = available;
    for (const listener of this.#listeners) {
      listener(available);
    }
  }
}
