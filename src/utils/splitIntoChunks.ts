import { Track } from "@lavaclient/types";
import { Song } from "@lavaclient/queue";

export function spliceIntoChunks(arr: Song[], chunkSize: number): Song[][];
export function spliceIntoChunks(arr: Track[], chunkSize: number): Track[][];
export function spliceIntoChunks(arr: any[], chunkSize: number) {
  const res = [];
  while (arr.length > 0) {
    const chunk = arr.splice(0, chunkSize);
    res.push(chunk);
  }
  return res;
}
