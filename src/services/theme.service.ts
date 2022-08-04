import { injectable } from "tsyringe";

@injectable()
export class Theme {
  colors = {
    success: 0x2ca05a,
    error: 0xa02c2c,
    default: 0x030f17,
  };
  drolhosEmoji = "863141840403169291";
  constructor() {}
}
