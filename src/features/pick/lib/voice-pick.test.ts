import { describe, expect, it } from 'vitest';
import {
  chooseVoicePick,
  eligibleVoicePickMembers,
  formatVoicePickReply,
  parsePickStyle,
  resolvePickVoiceChannelId,
} from './voice-pick.js';

describe('resolvePickVoiceChannelId', () => {
  it('prefers the option channel over the requester voice channel', () => {
    expect(resolvePickVoiceChannelId('option-vc', 'self-vc')).toBe('option-vc');
  });

  it('falls back to the requester voice channel when no option is given', () => {
    expect(resolvePickVoiceChannelId(null, 'self-vc')).toBe('self-vc');
    expect(resolvePickVoiceChannelId(undefined, 'self-vc')).toBe('self-vc');
  });

  it('returns null when neither channel is available', () => {
    expect(resolvePickVoiceChannelId(null, null)).toBeNull();
    expect(resolvePickVoiceChannelId(undefined, undefined)).toBeNull();
  });
});

describe('eligibleVoicePickMembers', () => {
  const alice = { id: '1', displayName: 'Alice', bot: false };
  const bob = { id: '2', displayName: 'Bob', bot: false };
  const botato = { id: 'bot', displayName: 'Botato', bot: true };

  it('excludes the requester and bots', () => {
    expect(eligibleVoicePickMembers([alice, bob, botato], '1')).toEqual([bob]);
  });

  it('returns an empty list when only the requester and bots remain', () => {
    expect(eligibleVoicePickMembers([alice, botato], '1')).toEqual([]);
  });
});

describe('chooseVoicePick', () => {
  const alice = { id: '1', displayName: 'Alice', bot: false };
  const bob = { id: '2', displayName: 'Bob', bot: false };

  it('returns null for an empty pool', () => {
    expect(chooseVoicePick([])).toBeNull();
  });

  it('picks by index from the injected random source', () => {
    expect(chooseVoicePick([alice, bob], () => 0)).toEqual(alice);
    expect(chooseVoicePick([alice, bob], () => 0.99)).toEqual(bob);
  });
});

describe('formatVoicePickReply', () => {
  const alice = { id: '1', displayName: 'Alice', bot: false };

  it('mentions publicly for mention style', () => {
    expect(formatVoicePickReply(alice, 'mention')).toEqual({
      content: 'Picked <@1>!',
      ephemeral: false,
    });
  });

  it('uses the display name publicly for silent style', () => {
    expect(formatVoicePickReply(alice, 'silent')).toEqual({
      content: 'Picked Alice!',
      ephemeral: false,
    });
  });

  it('uses the display name ephemerally for private style', () => {
    expect(formatVoicePickReply(alice, 'private')).toEqual({
      content: 'Picked Alice!',
      ephemeral: true,
    });
  });
});

describe('parsePickStyle', () => {
  it('defaults to mention when omitted or unknown', () => {
    expect(parsePickStyle(null)).toBe('mention');
    expect(parsePickStyle('nope')).toBe('mention');
  });

  it('accepts silent and private', () => {
    expect(parsePickStyle('silent')).toBe('silent');
    expect(parsePickStyle('private')).toBe('private');
  });
});
