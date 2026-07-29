export type AfkMark = {
  guildId: string;
  userId: string;
  prefix: string;
  /** Server nickname before the mark; `null` means the member had no nick. */
  previousNickname: string | null;
};

export type AfkMarkStore = {
  get(guildId: string, userId: string): Promise<AfkMark | null>;
  upsert(mark: AfkMark): Promise<void>;
  delete(guildId: string, userId: string): Promise<void>;
};
