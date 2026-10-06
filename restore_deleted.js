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
const targetDepotId = 'cmq2nhwqd000g8pz53qgytbbr';

async function restore() {
  console.log('Restoring deleted Kandy depot data from Firebase...');

  // 1. Restore Depot
  const depotDoc = await db.collection('depots').doc(targetDepotId).get();
  if (depotDoc.exists) {
    const data = depotDoc.data();
    await prisma.depot.upsert({
      where: { id: data.id },
      update: {},
      create: {
        id: data.id,
        name: data.name,
        location: data.location,
        code: data.code,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      }
    });
    console.log('Restored Depot:', data.name);
  }

  const collections = [
    { name: 'users', model: prisma.user },
    { name: 'staffMembers', model: prisma.staffMember },
    { name: 'drivers', model: prisma.driver },
    { name: 'conductors', model: prisma.conductor },
    { name: 'vehicles', model: prisma.vehicle },
    { name: 'routes', model: prisma.route },
  ];

  // First level dependencies
  for (const coll of collections) {
    const snapshot = await db.collection(coll.name).where('depotId', '==', targetDepotId).get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      delete data.depot; // remove relational include
      // Convert date strings to Date objects
      if (data.createdAt) data.createdAt = new Date(data.createdAt);
      if (data.updatedAt) data.updatedAt = new Date(data.updatedAt);
      if (data.licenseExpiry) data.licenseExpiry = new Date(data.licenseExpiry);
      if (data.insuranceExpiry) data.insuranceExpiry = new Date(data.insuranceExpiry);
      if (data.lastMaintenance) data.lastMaintenance = new Date(data.lastMaintenance);

      try {
        await coll.model.upsert({
          where: { id: data.id },
          update: {},
          create: data
        });
        console.log(`Restored ${coll.name}: ${data.id}`);
      } catch (e) {
        console.error(`Error restoring ${coll.name} ${data.id}:`, e.message);
      }
    }
  }

  // Second level dependencies
  const level2 = [
    { name: 'schedules', model: prisma.schedule },
    { name: 'maintenanceLogs', model: prisma.maintenanceLog },
    { name: 'fuelLogs', model: prisma.fuelLog },
  ];
  for (const coll of level2) {
    const snapshot = await db.collection(coll.name).where('depotId', '==', targetDepotId).get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      delete data.depot; delete data.vehicle; delete data.route; delete data.driver; delete data.conductor;
      if (data.createdAt) data.createdAt = new Date(data.createdAt);
      if (data.updatedAt) data.updatedAt = new Date(data.updatedAt);
      if (data.date) data.date = new Date(data.date);
      try {
        await coll.model.upsert({ where: { id: data.id }, update: {}, create: data });
        console.log(`Restored ${coll.name}: ${data.id}`);
      } catch (e) {}
    }
  }

  // Third level
  const snapshotTrips = await db.collection('trips').where('depotId', '==', targetDepotId).get();
  for (const doc of snapshotTrips.docs) {
    const data = doc.data();
    delete data.depot; delete data.schedule;
    if (data.createdAt) data.createdAt = new Date(data.createdAt);
    if (data.updatedAt) data.updatedAt = new Date(data.updatedAt);
    if (data.date) data.date = new Date(data.date);
    if (data.actualDeparture) data.actualDeparture = new Date(data.actualDeparture);
    if (data.actualArrival) data.actualArrival = new Date(data.actualArrival);
    try {
      await prisma.trip.upsert({ where: { id: data.id }, update: {}, create: data });
      console.log(`Restored trips: ${data.id}`);
    } catch(e) {}
  }

  // Fourth level
  const snapshotTickets = await db.collection('ticketReports').where('depotId', '==', targetDepotId).get();
  for (const doc of snapshotTickets.docs) {
    const data = doc.data();
    delete data.depot; delete data.trip;
    if (data.createdAt) data.createdAt = new Date(data.createdAt);
    if (data.updatedAt) data.updatedAt = new Date(data.updatedAt);
    if (data.date) data.date = new Date(data.date);
    try {
      await prisma.ticketReport.upsert({ where: { id: data.id }, update: {}, create: data });
      console.log(`Restored ticketReports: ${data.id}`);
    } catch(e) {}
  }

  console.log('Restore complete!');
}

restore().catch(console.error).finally(() => prisma.$disconnect());
