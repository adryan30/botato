const VIDEO_ID = /^[\w-]{11}$/;

/**
 * Strip Discord link-suppress brackets and pull an 11-char YouTube video id
 * from common URL shapes. Returns null for search text / non-YouTube URLs.
 */
export function youtubeVideoIdFromQuery(query: string): string | null {
  const trimmed = unwrapDiscordUrl(query.trim());
  if (!trimmed) {
    return null;
  }

  if (VIDEO_ID.test(trimmed)) {
    return trimmed;
  }

  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withScheme);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
      return VIDEO_ID.test(id) ? id : null;
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com'
    ) {
      const segments = url.pathname.split('/').filter(Boolean);
      if (
        segments[0] === 'shorts' ||
        segments[0] === 'embed' ||
        segments[0] === 'live'
      ) {
        const id = segments[1] ?? '';
        return VIDEO_ID.test(id) ? id : null;
      }
      const v = url.searchParams.get('v') ?? '';
      return VIDEO_ID.test(v) ? v : null;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Queries to try with the music node, first match wins at the call site.
 * Direct URL/id loads can fail on datacenter IPs ("requires login") while
 * `ytsearch:<id>` still returns the same video — same path as a title search.
 */
export function youtubeResolveCandidates(query: string): string[] {
  const primary = unwrapDiscordUrl(query.trim());
  const candidates = [primary];
  const videoId = youtubeVideoIdFromQuery(primary);
  if (!videoId) {
    return candidates;
  }
  if (videoId !== primary) {
    candidates.push(videoId);
  }
  candidates.push(`ytsearch:${videoId}`);
  return candidates;
}

function unwrapDiscordUrl(query: string): string {
  if (query.startsWith('<') && query.endsWith('>')) {
    return query.slice(1, -1).trim();
  }
  return query;
}
