import type {
  MusicSessionLifecycleEvent,
  MusicSessionService,
} from '../session/music-session-service.js';
import type { ControlSurfacePayload } from './discord-message-port.js';
import type { MusicControlSurface } from './music-control-surface.js';
import { sessionReplyPayload } from './session-ui.js';

export type ResummonResult = {
  stickyChannelId: string;
};

export type BoundControlSurface = {
  /** Prefer this text channel when the sticky home is not yet set. */
  noteTextChannel(guildId: string, channelId: string): void;
  /**
   * Re-summon the live surface via bump in the sticky channel.
   * Does not re-home when invoked from another channel.
   */
  resummon(
    guildId: string,
    invokingChannelId: string,
  ): Promise<ResummonResult>;
  /** Drain queued surface ops (tests / graceful shutdown). */
  whenIdle(): Promise<void>;
};

/**
 * Drive the sticky control surface from music session lifecycle events.
 * Bump on session birth and track start; edit on other visible state changes;
 * delete on session end (leave / music-node loss).
 */
export function bindControlSurface(
  sessions: MusicSessionService,
  surface: MusicControlSurface,
): BoundControlSurface {
  const preferredChannels = new Map<string, string>();
  /** Per-guild serial promise chain so bump/edit/delete ops do not race. */
  const pendingOps = new Map<string, Promise<void>>();

  const enqueue = (guildId: string, task: () => Promise<void>): void => {
    const previous = pendingOps.get(guildId) ?? Promise.resolve();
    const next = previous.then(task, task);
    pendingOps.set(guildId, next);
    void next.finally(() => {
      if (pendingOps.get(guildId) === next) {
        pendingOps.delete(guildId);
      }
    });
  };

  const payloadFor = (guildId: string): ControlSurfacePayload | null => {
    try {
      return sessionReplyPayload(sessions.snapshot(guildId));
    } catch {
      return null;
    }
  };

  const resolveChannelId = (guildId: string): string | null =>
    surface.stickyChannelId(guildId) ?? preferredChannels.get(guildId) ?? null;

  const handle = async (event: MusicSessionLifecycleEvent): Promise<void> => {
    if (event.kind === 'session-end') {
      preferredChannels.delete(event.guildId);
      await surface.delete(event.guildId);
      return;
    }

    const payload = payloadFor(event.guildId);
    if (!payload) {
      return;
    }

    if (event.kind === 'session-birth' || event.kind === 'track-start') {
      const channelId = resolveChannelId(event.guildId);
      if (!channelId) {
        return;
      }
      await surface.bump(event.guildId, channelId, payload);
      return;
    }

    if (surface.stickyChannelId(event.guildId)) {
      await surface.edit(event.guildId, payload);
    }
  };

  sessions.onLifecycle((event) => {
    enqueue(event.guildId, () => handle(event));
  });

  return {
    noteTextChannel(guildId, channelId) {
      preferredChannels.set(guildId, channelId);
    },
    resummon(guildId, invokingChannelId) {
      return new Promise((resolve, reject) => {
        enqueue(guildId, async () => {
          try {
            const payload = sessionReplyPayload(sessions.snapshot(guildId));
            const channelId =
              resolveChannelId(guildId) ?? invokingChannelId;
            const previousLiveMessageId = surface.liveMessageId(guildId);
            await surface.bump(guildId, channelId, payload);
            const stickyChannelId = surface.stickyChannelId(guildId);
            const liveMessageId = surface.liveMessageId(guildId);
            if (
              !stickyChannelId ||
              !liveMessageId ||
              liveMessageId === previousLiveMessageId
            ) {
              throw new Error('Failed to re-summon the control surface.');
            }
            resolve({ stickyChannelId });
          } catch (error) {
            reject(error);
          }
        });
      });
    },
    async whenIdle() {
      await Promise.all([...pendingOps.values()]);
    },
  };
}
