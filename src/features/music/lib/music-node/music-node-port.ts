export type Track = {
  id: string;
  title: string;
  uri: string;
  source: 'youtube' | 'other';
  /** Artwork URL from the music node when available. */
  artworkUrl?: string;
  /** Duration in milliseconds from the music node when available. */
  durationMs?: number;
};

export type ResolveResult =
  | { kind: 'track'; track: Track }
  | { kind: 'playlist'; tracks: Track[] };

export type MusicNodeAvailabilityListener = (
  available: boolean,
) => void | Promise<void>;

export type MusicNodeTrackFinishedListener = (
  guildId: string,
) => void | Promise<void>;

export type MusicNodePort = {
  connect(guildId: string, channelId: string): Promise<void>;
  disconnect(guildId: string): Promise<void>;
  resolve(query: string): Promise<ResolveResult>;
  search(query: string): Promise<Track[]>;
  play(guildId: string, track: Track): Promise<void>;
  pause(guildId: string): Promise<void>;
  resume(guildId: string): Promise<void>;
  seek(guildId: string, positionMs: number): Promise<void>;
  stop(guildId: string): Promise<void>;
  setVolume(guildId: string, volume: number): Promise<void>;
  /** Whether a music node is reachable for Botato to use. */
  isAvailable(): boolean;
  onAvailabilityChange(listener: MusicNodeAvailabilityListener): void;
  /**
   * The current track for this guild finished playing.
   * Session decides whether to advance; the music node does not own the queue.
   */
  onTrackFinished(listener: MusicNodeTrackFinishedListener): void;
};
