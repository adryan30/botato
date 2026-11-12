import { container } from '@sapphire/framework';
import type { Client } from 'discord.js';
import type { BotatoDb } from '../../../lib/db/index.js';
import { DiscordDirectMessage } from './delivery/discord-direct-message.js';
import './container-augment.js';
import { DrizzleTgaStore } from './event/drizzle-tga-store.js';
import { TgaService } from './event/tga-service.js';
import { SteamWishlistClient } from './steam/steam-wishlist-client.js';

export function attachTgaFeature(client: Client, db: BotatoDb): TgaService {
  const tga = new TgaService(
    new DrizzleTgaStore(db),
    new SteamWishlistClient(),
    new DiscordDirectMessage(client),
  );
  container.tga = tga;
  return tga;
}
