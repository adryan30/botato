import { HexColorString } from "discord.js";

interface Theme {
  success: HexColorString;
  error: HexColorString;
  default: HexColorString;
  drolhos_emoji: string;
}

export const theme: Theme = {
  success: "#2ca05a",
  error: "#a02c2c",
  default: "#030f17",
  drolhos_emoji: "863141840403169291",
};
