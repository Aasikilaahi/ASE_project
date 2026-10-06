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
  // Sync Settings
  console.log('Fetching settings from SQLite...');
  let settings = await prisma.setting.findMany();
  
  if (settings.length === 0) {
    // Create default if not exists
    await prisma.setting.create({ data: { id: 'global' } });
    settings = await prisma.setting.findMany();
  }
  
  console.log(`Uploading settings to Firebase...`);
  const collectionRef = db.collection('settings');
  let batch = db.batch();
  for (const item of settings) {
    const docRef = collectionRef.doc(item.id);
    const safeItem = { ...item };
    for (const [key, value] of Object.entries(safeItem)) {
      if (value instanceof Date) {
        safeItem[key] = value.toISOString();
      }
    }
    batch.set(docRef, safeItem);
  }
  await batch.commit();
  console.log('✅ Successfully synced settings to Firebase!');
}

sync().catch(console.error).finally(() => prisma.$disconnect());
