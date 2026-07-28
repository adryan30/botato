export type ControlSurfacePayload = {
  embeds: unknown[];
  components: unknown[];
};

export type PostedDiscordMessage = {
  channelId: string;
  messageId: string;
};

export type DiscordMessagePort = {
  post(
    channelId: string,
    payload: ControlSurfacePayload,
  ): Promise<PostedDiscordMessage>;
  edit(
    channelId: string,
    messageId: string,
    payload: ControlSurfacePayload,
  ): Promise<void>;
  delete(channelId: string, messageId: string): Promise<void>;
};

export class MissingDiscordMessageError extends Error {
  readonly code = 'MISSING_DISCORD_MESSAGE' as const;

  constructor(
    readonly channelId: string,
    readonly messageId: string,
  ) {
    super(
      `Discord message ${messageId} is missing in channel ${channelId}`,
    );
    this.name = 'MissingDiscordMessageError';
  }
}

export function isMissingDiscordMessageError(
  error: unknown,
): error is MissingDiscordMessageError {
  return (
    error instanceof MissingDiscordMessageError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === 'MISSING_DISCORD_MESSAGE')
  );
}
