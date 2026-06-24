import { PrismaClient, Status } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@seafood.local" },
    update: {},
    create: {
      name: "Seafood Admin",
      email: "admin@seafood.local",
      passwordHash: hashPassword("admin123"),
      status: Status.ACTIVE
    }
  });

  for (const product of [
    { name: "Nethili", unit: "kg" },
    { name: "Vanjaram", unit: "kg" },
    { name: "Prawn", unit: "kg" },
    { name: "Crab", unit: "kg" }
  ]) {
    await prisma.product.upsert({
      where: { id: product.name.toLowerCase() },
      update: {},
      create: {
        id: product.name.toLowerCase(),
        name: product.name,
        unit: product.unit,
        status: Status.ACTIVE
      }
    });
  }

  await prisma.customer.upsert({
    where: { id: "walk-in-customer" },
    update: {},
    create: {
      id: "walk-in-customer",
      name: "Walk-in Customer",
      mobile: "",
      address: "",
      openingBalance: 0,
      outstandingBalance: 0,
      status: Status.ACTIVE
    }
  });

  await prisma.supplier.upsert({
    where: { id: "local-harbour" },
    update: {},
    create: {
      id: "local-harbour",
      name: "Local Harbour",
      mobile: "",
      address: "",
      status: Status.ACTIVE
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
