const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function strictAdminCleanup() {
    console.log('--- Strict Admin Cleanup ---');
    const allowedAdmins = ['Buildverse', 'shrigovinda', 'Akshay'];
    
    try {
        const snapshot = await db.collection('users').where('role', '==', 'admin').get();
        
        let deletedCount = 0;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const docId = doc.id;
            const username = data.username || docId;

            if (!allowedAdmins.includes(docId) && !allowedAdmins.includes(username)) {
                await db.collection('users').doc(docId).delete();
                console.log(`DELETED: ${docId} (Username: ${username})`);
                deletedCount++;
            } else {
                console.log(`KEPT: ${docId}`);
            }
        }
        
        console.log(`\nCleanup complete. Deleted ${deletedCount} extra admin(s).`);
    } catch (error) {
        console.error('ERROR during cleanup:', error.message);
    }
}

strictAdminCleanup().then(() => process.exit());
