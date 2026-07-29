import { describe, expect, it } from 'vitest';
import { FakeAfkMarkStore } from './fake-afk-mark-store.js';
import { AfkService } from './afk-service.js';
import { FakeMemberNick } from '../nickname/fake-member-nick.js';

const guildId = 'guild-1';
const userId = 'user-1';

function setup(opts?: {
  nickname?: string | null;
  username?: string;
  nickFails?: boolean;
}) {
  const store = new FakeAfkMarkStore();
  const nick = new FakeMemberNick({
    nickname: opts?.nickname === undefined ? 'Alice' : opts.nickname,
    username: opts?.username ?? 'alice',
    failSet: opts?.nickFails ?? false,
  });
  const service = new AfkService(store, nick);
  return { store, nick, service };
}

describe('AfkService', () => {
  it('marks the member AFK with the default prefix and updates the nickname', async () => {
    const { service, store, nick } = setup();

    const result = await service.toggle(guildId, userId, undefined);

    expect(result).toEqual({
      kind: 'marked',
      prefix: '[AFK]',
      nicknameApplied: true,
      targetNickname: '[AFK] Alice',
    });
    expect(await store.get(guildId, userId)).toEqual({
      guildId,
      userId,
      prefix: '[AFK]',
      previousNickname: 'Alice',
    });
    expect(nick.nickname).toBe('[AFK] Alice');
  });

  it('marks with a custom bare label', async () => {
    const { service, nick } = setup();

    const result = await service.toggle(guildId, userId, 'brb');

    expect(result).toMatchObject({
      kind: 'marked',
      prefix: '[brb]',
      targetNickname: '[brb] Alice',
    });
    expect(nick.nickname).toBe('[brb] Alice');
  });

  it('clears the AFK mark on re-invoke with no label and restores the nickname', async () => {
    const { service, store, nick } = setup();
    await service.toggle(guildId, userId, undefined);

    const result = await service.toggle(guildId, userId, undefined);

    expect(result).toEqual({
      kind: 'cleared',
      nicknameApplied: true,
      restoredNickname: 'Alice',
    });
    expect(await store.get(guildId, userId)).toBeNull();
    expect(nick.nickname).toBe('Alice');
  });

  it('clears back to no server nickname when none was set before', async () => {
    const { service, nick } = setup({ nickname: null, username: 'bob' });
    await service.toggle(guildId, userId, undefined);
    expect(nick.nickname).toBe('[AFK] bob');

    const result = await service.toggle(guildId, userId, undefined);

    expect(result).toEqual({
      kind: 'cleared',
      nicknameApplied: true,
      restoredNickname: null,
    });
    expect(nick.nickname).toBeNull();
  });

  it('replaces the prefix when already marked and a new label is given', async () => {
    const { service, store, nick } = setup();
    await service.toggle(guildId, userId, undefined);

    const result = await service.toggle(guildId, userId, 'food');

    expect(result).toEqual({
      kind: 'marked',
      prefix: '[food]',
      nicknameApplied: true,
      targetNickname: '[food] Alice',
    });
    expect(await store.get(guildId, userId)).toEqual({
      guildId,
      userId,
      prefix: '[food]',
      previousNickname: 'Alice',
    });
    expect(nick.nickname).toBe('[food] Alice');
  });

  it('uses username as base when no server nickname is set', async () => {
    const { service, nick, store } = setup({ nickname: null, username: 'bob' });

    await service.toggle(guildId, userId, undefined);

    expect(nick.nickname).toBe('[AFK] bob');
    expect(await store.get(guildId, userId)).toMatchObject({
      previousNickname: null,
    });
  });

  it('still records the mark when Discord rejects the nickname change', async () => {
    const { service, store, nick } = setup({ nickFails: true });

    const result = await service.toggle(guildId, userId, undefined);

    expect(result).toEqual({
      kind: 'marked',
      prefix: '[AFK]',
      nicknameApplied: false,
      targetNickname: '[AFK] Alice',
    });
    expect(await store.get(guildId, userId)).not.toBeNull();
    expect(nick.nickname).toBe('Alice');
  });

  it('clears the mark when Discord rejects restoring the nickname', async () => {
    const { service, store, nick } = setup();
    await service.toggle(guildId, userId, undefined);
    nick.failSet = true;

    const result = await service.toggle(guildId, userId, undefined);

    expect(result).toEqual({
      kind: 'cleared',
      nicknameApplied: false,
      restoredNickname: 'Alice',
    });
    expect(await store.get(guildId, userId)).toBeNull();
  });

  it('rejects an over-length composed nickname without writing a mark', async () => {
    const longNick = 'A'.repeat(28);
    const { service, store } = setup({ nickname: longNick });

    await expect(service.toggle(guildId, userId, undefined)).rejects.toThrow(
      /exceeds Discord's 32-character nickname limit/,
    );
    expect(await store.get(guildId, userId)).toBeNull();
  });

  it('deletes the AFK mark when the member leaves', async () => {
    const { service, store } = setup();
    await service.toggle(guildId, userId, undefined);

    await service.handleMemberLeave(guildId, userId);

    expect(await store.get(guildId, userId)).toBeNull();
  });
});
