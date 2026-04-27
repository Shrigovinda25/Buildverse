const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listAndCleanup() {
  const snap = await db.collection('components').get();
  snap.forEach(doc => {
    console.log(`Slug: ${doc.id}, Name: ${doc.data().name}`);
  });
  process.exit();
}

listAndCleanup().catch(console.error);
