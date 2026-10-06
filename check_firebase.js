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

async function check() {
  const snapshot = await db.collection('ticketReports').get();
  console.log('Documents in ticketReports collection in Firebase:', snapshot.size);
  if (!snapshot.empty) {
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
    });
  }
}

check().catch(console.error);
