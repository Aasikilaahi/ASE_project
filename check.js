const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const depots = await prisma.depot.count();
  const routes = await prisma.route.count();
  const vehicles = await prisma.vehicle.count();
  console.log({depots, routes, vehicles});
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
