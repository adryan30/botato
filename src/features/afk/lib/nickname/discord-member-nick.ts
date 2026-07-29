import type { Client } from 'discord.js';
import type { MemberNickPort, MemberNickSnapshot } from './member-nick-port.js';

export class DiscordMemberNick implements MemberNickPort {
  readonly #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async get(guildId: string, userId: string): Promise<MemberNickSnapshot> {
    const member = await this.#fetchMember(guildId, userId);
    return {
      nickname: member.nickname,
      username: member.user.username,
    };
  }

  async set(
    guildId: string,
    userId: string,
    nickname: string | null,
  ): Promise<void> {
    const member = await this.#fetchMember(guildId, userId);
    await member.setNickname(nickname);
  }

  async #fetchMember(guildId: string, userId: string) {
    const guild = await this.#client.guilds.fetch(guildId);
    return guild.members.fetch(userId);
  }
}
