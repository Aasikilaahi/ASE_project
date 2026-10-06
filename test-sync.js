const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const getCollectionName = (modelName) => {
      return modelName.charAt(0).toLowerCase() + modelName.slice(1) + 's';
    };
    console.log("Collection name for FuelLog:", getCollectionName('FuelLog'));
    
    // Test if we can fetch fuel logs
    const logs = await prisma.fuelLog.findMany();
    console.log("Found fuel logs:", logs.length);
    
    if (logs.length > 0) {
      const result = logs[0];
      const safeItem = { ...result };
      for (const [key, value] of Object.entries(safeItem)) {
        if (value instanceof Date) {
          safeItem[key] = value.toISOString();
        }
      }
      console.log("Safe item to send to Firebase:", safeItem);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
