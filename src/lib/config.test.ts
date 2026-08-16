import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const validEnv = {
  DISCORD_TOKEN: 'test-token',
  DATABASE_URL: 'postgresql://botato:botato@127.0.0.1:5432/botato',
  MUSIC_NODE_PASSWORD: 'node-password',
};

describe('loadConfig', () => {
  it('returns Discord token, database URL, and music-node connection from env', () => {
    expect(
      loadConfig({
        ...validEnv,
        MUSIC_NODE_HOST: 'music-node',
        MUSIC_NODE_PORT: '2334',
      }),
    ).toEqual({
      discordToken: 'test-token',
      discordGuildIds: [],
      databaseUrl: 'postgresql://botato:botato@127.0.0.1:5432/botato',
      musicNode: {
        host: 'music-node',
        port: 2334,
        password: 'node-password',
      },
      openRouter: {
        apiKey: null,
        model: 'nvidia/nemotron-nano-9b-v2:free',
      },
    });
  });

  it('defaults music-node host and port', () => {
    expect(loadConfig(validEnv)).toEqual({
      discordToken: 'test-token',
      discordGuildIds: [],
      databaseUrl: 'postgresql://botato:botato@127.0.0.1:5432/botato',
      musicNode: {
        host: '127.0.0.1',
        port: 2333,
        password: 'node-password',
      },
      openRouter: {
        apiKey: null,
        model: 'nvidia/nemotron-nano-9b-v2:free',
      },
    });
  });

  it('loads optional OpenRouter key and model override', () => {
    expect(
      loadConfig({
        ...validEnv,
        OPENROUTER_API_KEY: 'sk-or',
        OPENROUTER_DJ_MODEL: 'vendor/model:free',
      }).openRouter,
    ).toEqual({
      apiKey: 'sk-or',
      model: 'vendor/model:free',
    });
  });

  it('parses discord guild ids for instant slash registration', () => {
    expect(
      loadConfig({
        ...validEnv,
        DISCORD_GUILD_ID: '111',
        DISCORD_GUILD_IDS: '222, 111 ,333',
      }).discordGuildIds,
    ).toEqual(['222', '111', '333']);
  });

  it('rejects a missing Discord token', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: validEnv.DATABASE_URL,
        MUSIC_NODE_PASSWORD: 'node-password',
      }),
    ).toThrow('DISCORD_TOKEN is required');
  });

  it('rejects a blank Discord token', () => {
    expect(() =>
      loadConfig({
        DISCORD_TOKEN: '   ',
        DATABASE_URL: validEnv.DATABASE_URL,
        MUSIC_NODE_PASSWORD: 'node-password',
      }),
    ).toThrow('DISCORD_TOKEN is required');
  });

  it('rejects a missing database URL', () => {
    expect(() =>
      loadConfig({
        DISCORD_TOKEN: 'test-token',
        MUSIC_NODE_PASSWORD: 'node-password',
      }),
    ).toThrow('DATABASE_URL is required');
  });

  it('rejects a missing music-node password', () => {
    expect(() =>
      loadConfig({
        DISCORD_TOKEN: 'test-token',
        DATABASE_URL: validEnv.DATABASE_URL,
      }),
    ).toThrow('MUSIC_NODE_PASSWORD is required');
  });

  it('rejects an invalid music-node port', () => {
    expect(() =>
      loadConfig({ ...validEnv, MUSIC_NODE_PORT: 'nope' }),
    ).toThrow('MUSIC_NODE_PORT must be an integer between 1 and 65535');
  });
});
