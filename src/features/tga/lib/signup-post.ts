import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { joinButtonCustomId, joinModalCustomId } from './signup-ids.js';

export function joinButtonRow(
  eventId: string,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(joinButtonCustomId(eventId))
      .setLabel('Entrar')
      .setStyle(ButtonStyle.Primary),
  );
}

export function joinModal(eventId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(joinModalCustomId(eventId))
    .setTitle('Entrar na troca')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('steam')
          .setLabel('Perfil ou wishlist da Steam')
          .setPlaceholder('https://steamcommunity.com/id/seu-nome')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(300),
      ),
    );
}
