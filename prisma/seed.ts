import { PrismaClient, StaffPosition, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";

  // Check if already exists
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log("Admin already exists:", existing.email);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      name: "System Admin",
      email: adminEmail,
      role: UserRole.ADMIN,
      password: await bcrypt.hash("Admin@123", 10),
      isActive: true,
    },
  });

  console.log("✅ Admin user created:", admin.email);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
