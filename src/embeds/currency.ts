import { EmbedBuilder } from "discord.js";
import { findDrolhosEmoji } from "../utils";
import { theme } from "../config";

type Currency = "drolhos" | "tickets";

export const createAwardEmbed = (
  name: string,
  value: number,
  currency: Currency
) => {
  return new EmbedBuilder({
    title: "🎉 Parabéns!",
    description: `${name} ganhou ${value} ${
      currency === "drolhos" ? findDrolhosEmoji() : "🎟"
    }!`,
    color: theme.success,
  });
};

export const createRemoveEmbed = (
  name: string,
  value: number,
  currency: Currency
) => {
  return new EmbedBuilder({
    title: "Sucesso!",
    description: `${name} perdeu ${value} ${
      currency === "drolhos" ? findDrolhosEmoji() : "🎟"
    }!`,
    color: theme.success,
  });
};

export const createTransferEmbed = (
  name: string,
  receiverName: string,
  value: number,
  currency: Currency
) => {
  return new EmbedBuilder({
    title: "Transferência bem sucedida.",
    description: `${name} transferiu ${value} ${
      currency === "drolhos" ? findDrolhosEmoji() : "🎟"
    } para ${receiverName}.`,
    color: theme.success,
  });
};

export const createWalletEmbed = (name, balance, tickets) => {
  return new EmbedBuilder({
    title: `Carteira de ${name}`,
    color: theme.default,
    fields: [
      {
        name: `Saldo`,
        value: `Seu saldo: ${balance} ${findDrolhosEmoji()}`,
      },
      {
        name: `Bilhetes`,
        value: `Seus bilhetes: ${tickets} 🎟️`,
      },
    ],
  });
};

export const WalletAlreadyExistsEmbed = new EmbedBuilder({
  title: "Carteira já cadastrada!",
  description:
    "Você já possui uma carteira cadastrada! Use '/balance' para vê-la.",
  color: theme.error,
});

export const WalletCreatedEmbed = () =>
  new EmbedBuilder({
    title: "Carteira cadastrada com sucesso!",
    description: `Você cadastrou sua carteira, a partir de agora use '=balance' para checar o seu saldo de ${findDrolhosEmoji()}.`,
    color: theme.success,
  });
