import type { AfkService } from './mark/afk-service.js';

declare module '@sapphire/pieces' {
  interface Container {
    afk: AfkService;
  }
}

export {};
