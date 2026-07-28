import {
  type ControlSurfacePayload,
  type DiscordMessagePort,
  isMissingDiscordMessageError,
} from './discord-message-port.js';

export type MusicControlSurfaceOptions = {
  logError?: (message: string, error: unknown) => void;
};

type SurfaceState = {
  stickyChannelId: string;
  liveMessageId: string | null;
};

export class MusicControlSurface {
  readonly #messages: DiscordMessagePort;
  readonly #logError: (message: string, error: unknown) => void;
  readonly #states = new Map<string, SurfaceState>();

  constructor(
    messages: DiscordMessagePort,
    options: MusicControlSurfaceOptions = {},
  ) {
    this.#messages = messages;
    this.#logError = options.logError ?? (() => undefined);
  }

  stickyChannelId(guildId: string): string | null {
    return this.#states.get(guildId)?.stickyChannelId ?? null;
  }

  liveMessageId(guildId: string): string | null {
    return this.#states.get(guildId)?.liveMessageId ?? null;
  }

  async bump(
    guildId: string,
    channelId: string,
    payload: ControlSurfacePayload,
  ): Promise<void> {
    const existing = this.#states.get(guildId);
    const stickyChannelId = existing?.stickyChannelId ?? channelId;
    const previousMessageId = existing?.liveMessageId ?? null;

    let posted;
    try {
      posted = await this.#messages.post(stickyChannelId, payload);
    } catch (error) {
      this.#logError(
        `Failed to post music control surface for guild ${guildId}`,
        error,
      );
      return;
    }

    const state = existing ?? {
      stickyChannelId,
      liveMessageId: null as string | null,
    };
    if (!existing) {
      this.#states.set(guildId, state);
    }
    state.liveMessageId = posted.messageId;

    if (previousMessageId) {
      try {
        await this.#messages.delete(stickyChannelId, previousMessageId);
      } catch (error) {
        this.#logError(
          `Failed to delete previous music control surface for guild ${guildId}`,
          error,
        );
      }
    }
  }

  async edit(guildId: string, payload: ControlSurfacePayload): Promise<void> {
    const state = this.#states.get(guildId);
    if (!state) {
      return;
    }

    if (!state.liveMessageId) {
      await this.#repost(guildId, state, payload);
      return;
    }

    try {
      await this.#messages.edit(
        state.stickyChannelId,
        state.liveMessageId,
        payload,
      );
    } catch (error) {
      if (isMissingDiscordMessageError(error)) {
        await this.#repost(guildId, state, payload);
        return;
      }
      this.#logError(
        `Failed to edit music control surface for guild ${guildId}`,
        error,
      );
    }
  }

  async delete(guildId: string): Promise<void> {
    const state = this.#states.get(guildId);
    if (!state) {
      return;
    }

    const messageId = state.liveMessageId;
    this.#states.delete(guildId);

    if (!messageId) {
      return;
    }

    try {
      await this.#messages.delete(state.stickyChannelId, messageId);
    } catch (error) {
      this.#logError(
        `Failed to delete music control surface for guild ${guildId}`,
        error,
      );
    }
  }

  async #repost(
    guildId: string,
    state: SurfaceState,
    payload: ControlSurfacePayload,
  ): Promise<void> {
    try {
      const posted = await this.#messages.post(state.stickyChannelId, payload);
      state.liveMessageId = posted.messageId;
    } catch (error) {
      this.#logError(
        `Failed to recover music control surface for guild ${guildId}`,
        error,
      );
    }
  }
}
