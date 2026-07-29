export type MemberNickSnapshot = {
  nickname: string | null;
  username: string;
};

export type MemberNickPort = {
  get(guildId: string, userId: string): Promise<MemberNickSnapshot>;
  set(
    guildId: string,
    userId: string,
    nickname: string | null,
  ): Promise<void>;
};
