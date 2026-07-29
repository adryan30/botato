import { Listener } from '@sapphire/framework';
import type { GuildMember, PartialGuildMember } from 'discord.js';

export class AfkGuildMemberRemoveListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: 'guildMemberRemove',
    });
  }

  public override async run(member: GuildMember | PartialGuildMember) {
    try {
      await this.container.afk.handleMemberLeave(member.guild.id, member.id);
    } catch (error) {
      this.container.logger.error(
        `Failed to clear AFK mark on leave: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
