const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = [
    { name: 'GBM', points: 2 },
    { name: 'NGO event', points: 5 },
    { name: 'Fundraising', points: 5 },
  ];

  for (const t of types) {
    await prisma.eventType.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  
  console.log('Seeded event types.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
