import {
  type ControlSurfacePayload,
  type DiscordMessagePort,
  MissingDiscordMessageError,
  type PostedDiscordMessage,
} from './discord-message-port.js';

export type FakeDiscordMessageCall =
  | {
      op: 'post';
      channelId: string;
      payload: ControlSurfacePayload;
      messageId: string;
    }
  | {
      op: 'edit';
      channelId: string;
      messageId: string;
      payload: ControlSurfacePayload;
    }
  | {
      op: 'delete';
      channelId: string;
      messageId: string;
    };

export type FakeDiscordMessages = DiscordMessagePort & {
  calls: FakeDiscordMessageCall[];
  messages: Map<string, { channelId: string; payload: ControlSurfacePayload }>;
  /** Simulate Discord API failures for specific ops. */
  failNext: Partial<Record<'post' | 'edit' | 'delete', Error>>;
  /** Remove a live message as if a user deleted it in Discord. */
  dropMessage(messageId: string): void;
};

export function createFakeDiscordMessages(): FakeDiscordMessages {
  const calls: FakeDiscordMessageCall[] = [];
  const messages = new Map<
    string,
    { channelId: string; payload: ControlSurfacePayload }
  >();
  let nextId = 1;
  const failNext: FakeDiscordMessages['failNext'] = {};

  const fake: FakeDiscordMessages = {
    calls,
    messages,
    failNext,
    dropMessage(messageId) {
      messages.delete(messageId);
    },
    async post(channelId, payload) {
      const failure = failNext.post;
      if (failure) {
        delete failNext.post;
        throw failure;
      }
      const messageId = `msg-${nextId}`;
      nextId += 1;
      messages.set(messageId, { channelId, payload });
      const posted: PostedDiscordMessage = { channelId, messageId };
      calls.push({ op: 'post', channelId, payload, messageId });
      return posted;
    },
    async edit(channelId, messageId, payload) {
      const failure = failNext.edit;
      if (failure) {
        delete failNext.edit;
        throw failure;
      }
      const existing = messages.get(messageId);
      if (!existing || existing.channelId !== channelId) {
        throw new MissingDiscordMessageError(channelId, messageId);
      }
      existing.payload = payload;
      calls.push({ op: 'edit', channelId, messageId, payload });
    },
    async delete(channelId, messageId) {
      const failure = failNext.delete;
      if (failure) {
        delete failNext.delete;
        throw failure;
      }
      const existing = messages.get(messageId);
      if (!existing || existing.channelId !== channelId) {
        throw new MissingDiscordMessageError(channelId, messageId);
      }
      messages.delete(messageId);
      calls.push({ op: 'delete', channelId, messageId });
    },
  };

  return fake;
}
