const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vehicles = await prisma.vehicle.findMany();
  const routes = await prisma.route.findMany();
  const depots = await prisma.depot.findMany();
  console.log("Vehicles:", vehicles.map(v => v.registrationNo));
  console.log("Routes:", routes.map(r => r.name));
  console.log("Depots:", depots.map(d => d.name));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
