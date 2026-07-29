import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AFK_LABEL,
  DISCORD_NICKNAME_MAX_LENGTH,
  formatAfkPrefix,
  composeAfkNickname,
  resolveBaseNickname,
} from './afk-nick.js';

describe('formatAfkPrefix', () => {
  it('defaults to [AFK] when no label is given', () => {
    expect(formatAfkPrefix()).toBe('[AFK]');
    expect(formatAfkPrefix(undefined)).toBe('[AFK]');
  });

  it('wraps a bare label in brackets', () => {
    expect(formatAfkPrefix('brb')).toBe('[brb]');
  });

  it('trims whitespace around the label', () => {
    expect(formatAfkPrefix('  food  ')).toBe('[food]');
  });

  it('rejects blank labels', () => {
    expect(() => formatAfkPrefix('')).toThrow('AFK label cannot be empty');
    expect(() => formatAfkPrefix('   ')).toThrow('AFK label cannot be empty');
  });

  it('rejects labels that already contain brackets', () => {
    expect(() => formatAfkPrefix('[brb]')).toThrow(
      'AFK label must be a bare label without brackets',
    );
    expect(() => formatAfkPrefix('brb]')).toThrow(
      'AFK label must be a bare label without brackets',
    );
  });
});

describe('composeAfkNickname', () => {
  it('prepends the AFK prefix to the base nickname with a space', () => {
    expect(composeAfkNickname('[AFK]', 'Alice')).toBe('[AFK] Alice');
  });

  it('rejects when the composed nickname exceeds Discord length', () => {
    const base = 'A'.repeat(DISCORD_NICKNAME_MAX_LENGTH - 4);
    expect(() => composeAfkNickname('[AFK]', base)).toThrow(
      /exceeds Discord's 32-character nickname limit/,
    );
  });

  it('accepts a nickname at exactly the Discord limit', () => {
    const prefix = '[AFK]';
    const base = 'A'.repeat(
      DISCORD_NICKNAME_MAX_LENGTH - prefix.length - 1,
    );
    const nick = composeAfkNickname(prefix, base);
    expect(nick.length).toBe(DISCORD_NICKNAME_MAX_LENGTH);
    expect(nick).toBe(`${prefix} ${base}`);
  });
});

describe('resolveBaseNickname', () => {
  it('prefers the server nickname when set', () => {
    expect(
      resolveBaseNickname({ nickname: 'GuildNick', username: 'user' }),
    ).toBe('GuildNick');
  });

  it('falls back to username when no server nickname is set', () => {
    expect(
      resolveBaseNickname({ nickname: null, username: 'alice' }),
    ).toBe('alice');
  });
});

describe('DEFAULT_AFK_LABEL', () => {
  it('is AFK', () => {
    expect(DEFAULT_AFK_LABEL).toBe('AFK');
  });
});
