import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const validEnv = {
  DISCORD_TOKEN: 'test-token',
  MUSIC_NODE_PASSWORD: 'node-password',
};

describe('loadConfig', () => {
  it('returns Discord token and music-node connection from env', () => {
    expect(
      loadConfig({
        ...validEnv,
        MUSIC_NODE_HOST: 'music-node',
        MUSIC_NODE_PORT: '2334',
      }),
    ).toEqual({
      discordToken: 'test-token',
      musicNode: {
        host: 'music-node',
        port: 2334,
        password: 'node-password',
      },
    });
  });

  it('defaults music-node host and port', () => {
    expect(loadConfig(validEnv)).toEqual({
      discordToken: 'test-token',
      musicNode: {
        host: '127.0.0.1',
        port: 2333,
        password: 'node-password',
      },
    });
  });

  it('rejects a missing Discord token', () => {
    expect(() =>
      loadConfig({ MUSIC_NODE_PASSWORD: 'node-password' }),
    ).toThrow('DISCORD_TOKEN is required');
  });

  it('rejects a blank Discord token', () => {
    expect(() =>
      loadConfig({ DISCORD_TOKEN: '   ', MUSIC_NODE_PASSWORD: 'node-password' }),
    ).toThrow('DISCORD_TOKEN is required');
  });

  it('rejects a missing music-node password', () => {
    expect(() => loadConfig({ DISCORD_TOKEN: 'test-token' })).toThrow(
      'MUSIC_NODE_PASSWORD is required',
    );
  });

  it('rejects an invalid music-node port', () => {
    expect(() =>
      loadConfig({ ...validEnv, MUSIC_NODE_PORT: 'nope' }),
    ).toThrow('MUSIC_NODE_PORT must be an integer between 1 and 65535');
  });
});
