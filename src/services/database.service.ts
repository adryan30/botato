import { PrismaClient } from "@prisma/client";
import { singleton } from "tsyringe";

@singleton()
export class Database {
  private _prisma: PrismaClient;

  get client() {
    return this._prisma;
  }

  constructor() {
    this._prisma = new PrismaClient();
  }
}
