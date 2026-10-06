const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { revenue: { gt: 0 } },
        { ticketsSold: { gt: 0 } }
      ]
    }
  });

  console.log(`Found ${trips.length} trips with revenue/tickets.`);
  let count = 0;

  for (const trip of trips) {
    // check if it already exists
    const existing = await prisma.ticketReport.findFirst({
      where: { tripId: trip.id }
    });

    if (!existing) {
      await prisma.ticketReport.create({
        data: {
          tripId: trip.id,
          date: trip.date,
          ticketsSold: trip.ticketsSold,
          revenue: trip.revenue,
          ticketLocations: trip.ticketLocations,
          depotId: trip.depotId
        }
      });
      count++;
    }
  }

  console.log(`Successfully migrated ${count} records into TicketReport table.`);
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
