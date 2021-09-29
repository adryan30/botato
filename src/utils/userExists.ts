import { PrismaClient } from "@prisma/client";

export function userExists(userId: string) {
  const prisma = new PrismaClient();
  const userExists = prisma.user.count({ where: { id: userId } });
  prisma.$disconnect();
  return userExists;
}
