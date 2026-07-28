import type { BoundControlSurface } from './control-surface/bind-control-surface.js';
import type { MusicSessionService } from './session/music-session-service.js';

declare module '@sapphire/pieces' {
  interface Container {
    musicSessions: MusicSessionService;
    /** Lifecycle binder: sticky channel, bump/edit/delete, and resummon. */
    musicControlSurface: BoundControlSurface;
  }
}

export {};
