import { describe, expect, it } from 'vitest';
import {
  youtubeResolveCandidates,
  youtubeVideoIdFromQuery,
} from './youtube-query.js';

describe('youtubeVideoIdFromQuery', () => {
  it('extracts ids from common YouTube URL shapes', () => {
    expect(youtubeVideoIdFromQuery('https://youtu.be/M7D2oz6Em48')).toBe(
      'M7D2oz6Em48',
    );
    expect(
      youtubeVideoIdFromQuery('https://www.youtube.com/watch?v=M7D2oz6Em48'),
    ).toBe('M7D2oz6Em48');
    expect(
      youtubeVideoIdFromQuery(
        'https://www.youtube.com/watch?v=M7D2oz6Em48&list=RDM7D2oz6Em48',
      ),
    ).toBe('M7D2oz6Em48');
    expect(
      youtubeVideoIdFromQuery('https://youtu.be/M7D2oz6Em48?si=abc'),
    ).toBe('M7D2oz6Em48');
    expect(
      youtubeVideoIdFromQuery('https://www.youtube.com/shorts/M7D2oz6Em48'),
    ).toBe('M7D2oz6Em48');
    expect(
      youtubeVideoIdFromQuery('<https://youtu.be/M7D2oz6Em48>'),
    ).toBe('M7D2oz6Em48');
  });

  it('returns null for search text and non-YouTube URLs', () => {
    expect(youtubeVideoIdFromQuery('lil vinicinho Te Amo')).toBeNull();
    expect(
      youtubeVideoIdFromQuery('https://open.spotify.com/track/abc'),
    ).toBeNull();
  });
});

describe('youtubeResolveCandidates', () => {
  it('tries the raw query then the bare video id', () => {
    expect(youtubeResolveCandidates('https://youtu.be/M7D2oz6Em48')).toEqual([
      'https://youtu.be/M7D2oz6Em48',
      'M7D2oz6Em48',
    ]);
  });

  it('unwraps Discord brackets on the primary candidate', () => {
    expect(youtubeResolveCandidates('<https://youtu.be/M7D2oz6Em48>')).toEqual([
      'https://youtu.be/M7D2oz6Em48',
      'M7D2oz6Em48',
    ]);
  });

  it('does not duplicate candidates for plain search text', () => {
    expect(youtubeResolveCandidates('never gonna give you up')).toEqual([
      'never gonna give you up',
    ]);
  });
});
