/** Normalize for suggestion / title dedupe keys. */
export function normalizeDjText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function suggestionKey(artist: string, title: string): string {
  return `${normalizeDjText(artist)}|${normalizeDjText(title)}`;
}
