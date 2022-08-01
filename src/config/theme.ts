import { HexColorString } from "discord.js";

interface Theme {
  success: number;
  error: number;
  default: number;
  drolhosEmoji: string;
}

export const theme: Theme = {
  success: 0x2ca05a,
  error: 0xa02c2c,
  default: 0x030f17,
  drolhosEmoji: "863141840403169291",
};
