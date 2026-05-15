import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    console.log("Ya existe al menos un administrador. Seed omitido.");
    return;
  }

  const user = process.env.BOOTSTRAP_ADMIN_USER?.trim();
  const pass = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!user || !pass) {
    console.log(
      "Define BOOTSTRAP_ADMIN_USER y BOOTSTRAP_ADMIN_PASSWORD en .env y ejecuta de nuevo: npm run db:seed",
    );
    return;
  }

  await prisma.user.create({
    data: {
      username: user,
      passwordHash: await bcrypt.hash(pass, 10),
      role: "ADMIN",
      active: true,
    },
  });

  console.log(`Usuario administrador "${user}" creado.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
