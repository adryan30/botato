import { container } from '@sapphire/framework';
import type { Client } from 'discord.js';
import type { BotatoDb } from '../../../lib/db/index.js';
import './container-augment.js';
import { AfkService } from './mark/afk-service.js';
import { DrizzleAfkMarkStore } from './mark/drizzle-afk-mark-store.js';
import { DiscordMemberNick } from './nickname/discord-member-nick.js';

export function attachAfkFeature(client: Client, db: BotatoDb): AfkService {
  const afk = new AfkService(
    new DrizzleAfkMarkStore(db),
    new DiscordMemberNick(client),
  );
  container.afk = afk;
  return afk;
}
