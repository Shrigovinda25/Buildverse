const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteDuplicate() {
  const slugToDelete = 'esp32_controller___usb_cable';
  console.log(`Attempting to delete component: ${slugToDelete}`);
  
  const ref = db.collection('components').doc(slugToDelete);
  const doc = await ref.get();
  
  if (doc.exists) {
    await ref.delete();
    console.log('SUCCESS: Duplicate component deleted.');
  } else {
    console.log('NOTICE: Component not found or already deleted.');
  }
  process.exit();
}

deleteDuplicate().catch(console.error);
