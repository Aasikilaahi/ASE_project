const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');
const fs = require('fs');

// Simple env parser
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
  console.log('Fetching ticket reports from SQLite...');
  const reports = await prisma.ticketReport.findMany();
  
  if (reports.length === 0) {
    console.log('No reports found.');
    return;
  }
  
  console.log(`Found ${reports.length} reports. Uploading to Firebase...`);
  
  const collectionRef = db.collection('ticketReports');
  let batch = db.batch();
  
  for (const item of reports) {
    const docRef = collectionRef.doc(item.id);
    const safeItem = JSON.parse(JSON.stringify(item, (key, value) => value === null ? undefined : value));
    for (const [key, value] of Object.entries(safeItem)) {
      // Date conversion if needed, but JSON.stringify already handles dates to ISO strings.
      // So this loop is mostly redundant now, but kept safe.
    }
    batch.set(docRef, safeItem);
  }
  
  await batch.commit();
  console.log('✅ Successfully synced ticketReports to Firebase!');
}

sync().catch(console.error).finally(() => prisma.$disconnect());
