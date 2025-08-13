import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Map legacy CLIENT users to CLIENT_USER
  const updated = await prisma.user.updateMany({
    where: { role: "CLIENT" as unknown as UserRole },
    data: { role: UserRole.CLIENT_USER },
  });
  // eslint-disable-next-line no-console
  console.log(`Updated ${updated.count} users from CLIENT to CLIENT_USER.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


