import { HexColorString } from "discord.js";

interface Theme {
  success: HexColorString;
  error: HexColorString;
  default: HexColorString;
  drolhosEmoji: string;
}

export const theme: Theme = {
  success: "#2ca05a",
  error: "#a02c2c",
  default: "#030f17",
  drolhosEmoji: "863141840403169291",
};
