import { PrismaClient } from "@prisma/generated/server";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { env } from "~/env";

const createPrismaClient = () => {
  const connectionString = env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
