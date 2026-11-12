import type { DirectMessagePort } from './direct-message-port.js';

export class FakeDirectMessage implements DirectMessagePort {
  readonly sent: Array<{ userId: string; content: string }> = [];
  readonly fail = new Set<string>();

  async send(userId: string, content: string): Promise<boolean> {
    if (this.fail.has(userId)) {
      return false;
    }
    this.sent.push({ userId, content });
    return true;
  }
}
