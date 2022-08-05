import { injectable } from "tsyringe";
import * as winston from "winston";

@injectable()
export class WinstonLogger {
  private _logger: winston.Logger;

  get log() {
    return this._logger;
  }

  constructor() {
    this._logger = winston.createLogger({
      level: "info",
      format: winston.format.json(),
      defaultMeta: { service: "bot" },
      transports: [
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
        new winston.transports.File({
          filename: "logs/combined.log",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
      ],
    });
    if (process.env.NODE_ENV !== "production") {
      this._logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.prettyPrint()
          ),
        })
      );
    }
  }
}
