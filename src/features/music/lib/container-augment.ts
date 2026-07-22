import type { MusicSessionService } from './music-session-service.js';

declare module '@sapphire/pieces' {
  interface Container {
    musicSessions: MusicSessionService;
  }
}

export {};
