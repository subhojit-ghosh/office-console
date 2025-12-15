import { PrismaClient } from "@prisma/generated/server";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Use raw SQL to update CLIENT users to CLIENT_USER
  // This bypasses Prisma's type checking since CLIENT is no longer in the enum
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "User" 
    SET role = 'CLIENT_USER'::"UserRole"
    WHERE role = 'CLIENT'::"UserRole"
  `);
  
   
  console.log(`Updated ${result} users from CLIENT to CLIENT_USER.`);
}

main()
  .catch((e) => {
     
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


