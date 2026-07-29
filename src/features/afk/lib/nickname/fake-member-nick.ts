import type { MemberNickPort, MemberNickSnapshot } from './member-nick-port.js';

export class FakeMemberNick implements MemberNickPort {
  nickname: string | null;
  username: string;
  failSet: boolean;

  constructor(options: {
    nickname: string | null;
    username: string;
    failSet?: boolean;
  }) {
    this.nickname = options.nickname;
    this.username = options.username;
    this.failSet = options.failSet ?? false;
  }

  async get(_guildId: string, _userId: string): Promise<MemberNickSnapshot> {
    return { nickname: this.nickname, username: this.username };
  }

  async set(
    _guildId: string,
    _userId: string,
    nickname: string | null,
  ): Promise<void> {
    if (this.failSet) {
      throw new Error('Missing Permissions');
    }
    this.nickname = nickname;
  }
}
