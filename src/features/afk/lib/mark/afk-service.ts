import type { AfkMarkStore } from './afk-mark-store.js';
import {
  composeAfkNickname,
  formatAfkPrefix,
  resolveBaseNickname,
} from '../nickname/afk-nick.js';
import type { MemberNickPort } from '../nickname/member-nick-port.js';

export type AfkToggleResult =
  | {
      kind: 'marked';
      prefix: string;
      nicknameApplied: boolean;
      targetNickname: string;
    }
  | {
      kind: 'cleared';
      nicknameApplied: boolean;
      restoredNickname: string | null;
    };

export class AfkService {
  readonly #store: AfkMarkStore;
  readonly #nick: MemberNickPort;

  constructor(store: AfkMarkStore, nick: MemberNickPort) {
    this.#store = store;
    this.#nick = nick;
  }

  async toggle(
    guildId: string,
    userId: string,
    label: string | undefined,
  ): Promise<AfkToggleResult> {
    const existing = await this.#store.get(guildId, userId);

    if (existing && label === undefined) {
      return this.#clear(guildId, userId, existing.previousNickname);
    }

    const prefix = formatAfkPrefix(label);
    const member = await this.#nick.get(guildId, userId);
    const previousNickname = existing
      ? existing.previousNickname
      : member.nickname;
    const base = resolveBaseNickname({
      nickname: previousNickname,
      username: member.username,
    });
    const targetNickname = composeAfkNickname(prefix, base);

    await this.#store.upsert({
      guildId,
      userId,
      prefix,
      previousNickname,
    });

    const nicknameApplied = await this.#trySetNick(
      guildId,
      userId,
      targetNickname,
    );

    return {
      kind: 'marked',
      prefix,
      nicknameApplied,
      targetNickname,
    };
  }

  async handleMemberLeave(guildId: string, userId: string): Promise<void> {
    await this.#store.delete(guildId, userId);
  }

  async #clear(
    guildId: string,
    userId: string,
    restoredNickname: string | null,
  ): Promise<AfkToggleResult> {
    await this.#store.delete(guildId, userId);
    const nicknameApplied = await this.#trySetNick(
      guildId,
      userId,
      restoredNickname,
    );
    return {
      kind: 'cleared',
      nicknameApplied,
      restoredNickname,
    };
  }

  async #trySetNick(
    guildId: string,
    userId: string,
    nickname: string | null,
  ): Promise<boolean> {
    try {
      await this.#nick.set(guildId, userId, nickname);
      return true;
    } catch {
      return false;
    }
  }
}
