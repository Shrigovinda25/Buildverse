
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearTransactions() {
    const colRef = db.collection('transactions');
    const snapshot = await colRef.get();
    
    if (snapshot.empty) {
        console.log('No transactions found.');
        return;
    }

    console.log(`Found ${snapshot.size} transactions. Deleting...`);
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log('Successfully cleared all system logs.');
}

clearTransactions().catch(console.error);
