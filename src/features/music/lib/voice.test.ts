import { describe, expect, it } from 'vitest';
import { isMemberInSessionVoice } from './voice.js';

describe('isMemberInSessionVoice', () => {
  it('allows a member in the music session voice channel', () => {
    expect(isMemberInSessionVoice('voice-1', 'voice-1')).toBe(true);
  });

  it('denies a member in a different voice channel', () => {
    expect(isMemberInSessionVoice('voice-2', 'voice-1')).toBe(false);
  });

  it('denies a member not in any voice channel', () => {
    expect(isMemberInSessionVoice(null, 'voice-1')).toBe(false);
    expect(isMemberInSessionVoice(undefined, 'voice-1')).toBe(false);
  });

  it('denies when the music session has no voice channel', () => {
    expect(isMemberInSessionVoice('voice-1', null)).toBe(false);
  });
});
