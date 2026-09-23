import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const eventTypes = await prisma.eventType.findMany();
  console.log('EventTypes:', eventTypes);
  
  const txs = await prisma.pointTransaction.findMany();
  console.log('Txs:', txs);
  
  const users = await prisma.user.findMany({ select: { id: true, username: true, points: true } });
  console.log('Users:', users);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
