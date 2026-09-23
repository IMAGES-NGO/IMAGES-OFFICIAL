import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() { 
  const events = await prisma.event.findMany({ where: { attendanceMarked: true } }); 
  for (const event of events) { 
    const eventType = await prisma.eventType.findFirst({ where: { name: { equals: event.eventType, mode: 'insensitive' } } }); 
    const points = eventType ? eventType.points : 0; 
    if (points > 0 && event.participantIds.length > 0) { 
      for (const userId of event.participantIds) { 
        const existingTx = await prisma.pointTransaction.findFirst({ where: { userId, eventId: event.id } }); 
        if (!existingTx) { 
          await prisma.pointTransaction.create({ data: { userId, amount: points, reason: 'Attended Event: ' + event.title, eventId: event.id } }); 
          await prisma.user.update({ where: { id: userId }, data: { points: { increment: points } } }); 
          console.log('Added ' + points + ' points to ' + userId); 
        } 
      } 
    } 
  } 
} 
main().finally(() => prisma.$disconnect());
