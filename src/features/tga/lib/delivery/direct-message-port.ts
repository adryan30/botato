export type DirectMessagePort = {
  send(userId: string, content: string): Promise<boolean>;
};
