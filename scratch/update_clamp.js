
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateClampName() {
    console.log('Searching for "½in L Clamp" in Firestore...');
    const colRef = db.collection('components');
    const snapshot = await colRef.where('name', '==', '½in L Clamp').get();
    
    if (snapshot.empty) {
        console.log('No documents found with name "½in L Clamp". Checking for "Half in L Clamp"...');
        const snap2 = await colRef.where('name', '==', 'Half in L Clamp').get();
        if (snap2.empty) {
            console.log('No documents found.');
            return;
        }
        await processSnapshot(snap2);
    } else {
        await processSnapshot(snapshot);
    }
}

async function processSnapshot(snapshot) {
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        console.log(`Updating document: ${doc.id}`);
        batch.update(doc.ref, { 
            name: '3/4in L Clamp'
        });
    });

    await batch.commit();
    console.log('Successfully updated Firestore component names.');
}

updateClampName().catch(console.error);
