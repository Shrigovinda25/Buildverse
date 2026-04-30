const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  const foam = await db.collection('components').where('name', '==', '5mm Foam Board (2ft x 1ft)').get();
  foam.forEach(doc => {
    console.log(JSON.stringify(doc.data(), null, 2));
  });
  process.exit();
}

check();
