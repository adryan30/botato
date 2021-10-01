export function spliceIntoChunks<T>(arr: T[], chunkSize: number): T[][] {
  const res = [];
  while (arr.length > 0) {
    const chunk = arr.splice(0, chunkSize);
    res.push(chunk);
  }
  return res;
}
