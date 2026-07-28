import {
  type BaseMessageOptions,
  type Client,
  RESTJSONErrorCodes,
} from 'discord.js';
import {
  type ControlSurfacePayload,
  type DiscordMessagePort,
  MissingDiscordMessageError,
  type PostedDiscordMessage,
} from './discord-message-port.js';

function isUnknownMessageError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === RESTJSONErrorCodes.UnknownMessage
  );
}

async function requireSendableChannel(client: Client, channelId: string) {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    throw new Error(`Channel ${channelId} is not a guild text channel`);
  }
  if (!channel.isSendable()) {
    throw new Error(`Channel ${channelId} is not sendable`);
  }
  return channel;
}

function toMessagePayload(payload: ControlSurfacePayload): BaseMessageOptions {
  return {
    embeds: payload.embeds as BaseMessageOptions['embeds'],
    components: payload.components as BaseMessageOptions['components'],
  };
}

/**
 * Discord.js adapter for {@link DiscordMessagePort}.
 */
export function createDiscordMessagePort(client: Client): DiscordMessagePort {
  return {
    async post(channelId, payload): Promise<PostedDiscordMessage> {
      const channel = await requireSendableChannel(client, channelId);
      const message = await channel.send(toMessagePayload(payload));
      return { channelId, messageId: message.id };
    },

    async edit(channelId, messageId, payload): Promise<void> {
      const channel = await requireSendableChannel(client, channelId);
      try {
        await channel.messages.edit(messageId, toMessagePayload(payload));
      } catch (error) {
        if (isUnknownMessageError(error)) {
          throw new MissingDiscordMessageError(channelId, messageId);
        }
        throw error;
      }
    },

    async delete(channelId, messageId): Promise<void> {
      const channel = await requireSendableChannel(client, channelId);
      try {
        await channel.messages.delete(messageId);
      } catch (error) {
        if (isUnknownMessageError(error)) {
          throw new MissingDiscordMessageError(channelId, messageId);
        }
        throw error;
      }
    },
  };
}
