export type Track = {
  id: string;
  title: string;
  uri: string;
  source: 'youtube' | 'other';
};

export type ResolveResult =
  | { kind: 'track'; track: Track }
  | { kind: 'playlist'; tracks: Track[] };

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
};
