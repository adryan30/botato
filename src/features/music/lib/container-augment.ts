import type { MusicSessionService } from './session/music-session-service.js';

declare module '@sapphire/pieces' {
  interface Container {
    musicSessions: MusicSessionService;
  }
}

export {};
