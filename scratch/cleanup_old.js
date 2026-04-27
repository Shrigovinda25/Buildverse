const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupOld() {
  const slugToDelete = 'esp32_controller_plus_usb_cable';
  console.log(`Cleaning up old component: ${slugToDelete}`);
  
  await db.collection('components').doc(slugToDelete).delete();
  console.log('SUCCESS: Old component removed.');
  process.exit();
}

cleanupOld().catch(console.error);
