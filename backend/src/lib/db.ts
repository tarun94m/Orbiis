import { PrismaClient } from "@prisma/client";

// Single shared Prisma client instance.
export const db = new PrismaClient();
