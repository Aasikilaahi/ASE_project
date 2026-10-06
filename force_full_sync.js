const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2];
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1]] = val;
  }
});

const prisma = new PrismaClient();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function sync() {
  console.log('Fetching fully populated data from SQLite...');
  const tables = [
    { name: 'users', data: await prisma.user.findMany({ include: { depot: true } }) },
    { name: 'depots', data: await prisma.depot.findMany() },
    { name: 'drivers', data: await prisma.driver.findMany({ include: { depot: true } }) },
    { name: 'conductors', data: await prisma.conductor.findMany({ include: { depot: true } }) },
    { name: 'vehicles', data: await prisma.vehicle.findMany({ include: { depot: true } }) },
    { name: 'routes', data: await prisma.route.findMany({ include: { depot: true } }) },
    { 
      name: 'schedules', 
      data: await prisma.schedule.findMany({ 
        include: { depot: true, route: true, vehicle: true, driver: true, conductor: true } 
      }) 
    },
    { 
      name: 'trips', 
      data: await prisma.trip.findMany({ 
        include: { 
          depot: true, 
          schedule: { include: { route: true, vehicle: true, driver: true, conductor: true } } 
        } 
      }) 
    },
    { name: 'maintenanceLogs', data: await prisma.maintenanceLog.findMany({ include: { vehicle: true, depot: true } }) },
    { name: 'fuelLogs', data: await prisma.fuelLog.findMany({ include: { vehicle: true, depot: true } }) },
    { name: 'staffMembers', data: await prisma.staffMember.findMany({ include: { depot: true } }) },
    { 
      name: 'ticketReports', 
      data: await prisma.ticketReport.findMany({ 
        include: { 
          depot: true, 
          trip: { include: { schedule: { include: { route: true, vehicle: true } } } } 
        } 
      }) 
    },
    { name: 'settings', data: await prisma.setting.findMany() }
  ];

  for (const table of tables) {
    const collectionRef = db.collection(table.name);
    let batch = db.batch();
    
    for (const item of table.data) {
      const docRef = collectionRef.doc(item.id);
      // We stringify and parse to easily drop any undefined values and keep standard objects
      // We pass a replacer function to strip out null values entirely so they don't appear in Firebase
      const safeItem = JSON.parse(JSON.stringify(item, (key, value) => value === null ? undefined : value)); 
      batch.set(docRef, safeItem);
    }
    await batch.commit();
    console.log(`✅ Synced ${table.name}`);
  }
}

sync().then(() => {
    console.log('✅ All done!');
}).catch(console.error).finally(() => prisma.$disconnect());
