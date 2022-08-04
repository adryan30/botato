import { PrismaClient } from "@prisma/client";
import { Bot } from "../index.old";

type Verb = "increase" | "decrease" | "transfer";
type UserField = "drolhos" | "tickets";
type Operation = `${Verb}|${UserField}`;

export class UserRepository {
  private client: PrismaClient;
  private static instance: UserRepository;

  private constructor() {
    this.client = new PrismaClient();
  }

  static getInstance() {
    if (!UserRepository.instance) {
      this.instance = new UserRepository();
    }
    return this.instance;
  }

  public async createUser(id: string) {
    const userExists = await this.getUser(id);
    if (userExists) throw Error("User exists");
    return await this.client.user.create({ data: { id } });
  }

  public async getUser(id: string) {
    return await this.client.user.findUnique({ where: { id } });
  }

  public async getAllUsers() {
    return await this.client.user.findMany();
  }

  public getGuildMember(id: string, guildId: string) {
    return Bot.client.guilds.cache.get(guildId).members.cache.get(id);
  }

  public async updateUser(
    id: string,
    value: number,
    operation: Operation,
    transferId?: string
  ) {
    const where = { id };
    switch (operation) {
      case "increase|drolhos":
        await this.client.user.update({
          where,
          data: { balance: { increment: value } },
        });
        break;
      case "increase|tickets":
        await this.client.user.update({
          where,
          data: { tickets: { increment: value } },
        });
        break;
      case "decrease|drolhos":
        await this.client.user.update({
          where,
          data: { balance: { decrement: value } },
        });
        break;
      case "decrease|tickets":
        await this.client.user.update({
          where,
          data: { tickets: { decrement: value } },
        });
        break;
      case "transfer|drolhos":
        if (!transferId) throw new Error("No transfer ID specified");
        await this.client.$transaction([
          this.client.user.update({
            data: { balance: { decrement: value } },
            where: { id: id },
          }),
          this.client.user.update({
            data: { balance: { increment: value } },
            where: { id: transferId },
          }),
        ]);
        break;
      case "transfer|tickets":
        if (!transferId) throw new Error("No transfer ID specified");
        await this.client.$transaction([
          this.client.user.update({
            data: { tickets: { decrement: value } },
            where: { id: id },
          }),
          this.client.user.update({
            data: { tickets: { increment: value } },
            where: { id: transferId },
          }),
        ]);
        break;
    }
  }

  public async makeAdmin(id: string) {
    return await this.client.user.update({
      where: { id },
      data: {
        isAdmin: true,
      },
    });
  }
}
