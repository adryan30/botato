import type { Client } from 'discord.js';
import type { DirectMessagePort } from './direct-message-port.js';

export class DiscordDirectMessage implements DirectMessagePort {
  readonly #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async send(userId: string, content: string): Promise<boolean> {
    try {
      await this.#client.users.send(userId, content);
      return true;
    } catch {
      return false;
    }
  }
}
