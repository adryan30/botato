import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('returns the Discord token from env', () => {
    expect(loadConfig({ DISCORD_TOKEN: 'test-token' })).toEqual({
      discordToken: 'test-token',
    });
  });

  it('rejects a missing Discord token', () => {
    expect(() => loadConfig({})).toThrow('DISCORD_TOKEN is required');
  });

  it('rejects a blank Discord token', () => {
    expect(() => loadConfig({ DISCORD_TOKEN: '   ' })).toThrow(
      'DISCORD_TOKEN is required',
    );
  });
});
