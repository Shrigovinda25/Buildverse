const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function hideLDR() {
    console.log('Searching for LDR Sensor...');
    const componentsRef = db.collection('components');
    const q = await componentsRef.where('name', '==', 'LDR Sensor').get();
    
    if (q.empty) {
        console.log('LDR Sensor not found.');
    } else {
        for (const doc of q.docs) {
            await doc.ref.update({ hidden: true });
            console.log(`Hidden component: ${doc.id} (${doc.data().name})`);
        }
    }
    process.exit();
}

hideLDR().catch(err => {
    console.error(err);
    process.exit(1);
});
