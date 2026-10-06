const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const reports = await prisma.ticketReport.findMany();
  console.log('Total ticket reports:', reports.length);
  if (reports.length > 0) {
    console.log(reports[0]);
  }
}
check().catch(console.error).finally(() => prisma.$disconnect());
