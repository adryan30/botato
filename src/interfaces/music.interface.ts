export interface SearchInfo {
  playlistInfo: {
    selectedTrack: number;
    name: string;
  };
  loadType: "PLAYLIST_LOADED" | "TRACK_LOADED" | "SEARCH_RESULT";
  tracks: Track[];
}
export interface Track {
  track: string;
  info: TrackInfo;
}
export interface TrackInfo {
  identifier: string;
  isSeekable: boolean;
  author: string;
  length: number;
  isStream: boolean;
  position: number;
  title: string;
  uri: string;
}
