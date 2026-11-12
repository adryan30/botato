import type { TgaService } from './event/tga-service.js';

declare module '@sapphire/pieces' {
  interface Container {
    tga: TgaService;
  }
}

export {};
