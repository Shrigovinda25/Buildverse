const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  console.log('Starting migration...');
  const componentsRef = db.collection('components');

  // 1. Delete 3mm Foam Board
  const foam3mm = await componentsRef.where('name', '==', '3mm Foam Board').get();
  if (!foam3mm.empty) {
    for (const doc of foam3mm.docs) {
      await doc.ref.delete();
      console.log('Deleted 3mm Foam Board');
    }
  } else {
    console.log('3mm Foam Board not found or already deleted.');
  }

  // 2. Update 5mm Foam Board
  const foam5mm = await componentsRef.where('name', '==', '5mm Foam Board').get();
  if (!foam5mm.empty) {
    for (const doc of foam5mm.docs) {
      await doc.ref.update({
        name: '5mm Foam Board (2ft x 1ft)',
        maxPerTeam: 1,
        imageUrl: 'assets/components/5mm%20Foam%20Board.jpg'
      });
      console.log('Updated 5mm Foam Board');
    }
  } else {
      // Check if already updated
      const foam5mmUpdated = await componentsRef.where('name', '==', '5mm Foam Board (2ft x 1ft)').get();
      if (!foam5mmUpdated.empty) {
          console.log('5mm Foam Board (2ft x 1ft) already exists.');
      } else {
          console.log('5mm Foam Board not found.');
      }
  }

  // 3. Rename M3 Nut & Bolts to M4 Nut & Bolts
  const m3nuts = await componentsRef.where('name', '==', 'M3 Nut & Bolts').get();
  if (!m3nuts.empty) {
    for (const doc of m3nuts.docs) {
      await doc.ref.update({
        name: 'M4 Nut & Bolts'
      });
      console.log('Renamed M3 Nut & Bolts to M4 Nut & Bolts');
    }
  } else {
      console.log('M3 Nut & Bolts not found or already renamed.');
  }

  console.log('Migration complete.');
  process.exit();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
