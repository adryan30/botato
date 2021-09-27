import { LavalinkTrack, LavalinkTrackResponse } from "lavasfy";

export interface Track extends LavalinkTrack {}
export interface SearchInfo extends LavalinkTrackResponse {
  tracks: Track[];
}
