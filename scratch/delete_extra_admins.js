const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function cleanupAdmins() {
    console.log('--- Cleaning up Admin Accounts ---');
    const usersToDelete = ['admin', 'undefined'];
    
    for (const username of usersToDelete) {
        try {
            const docRef = db.collection('users').doc(username);
            const doc = await docRef.get();
            
            if (doc.exists) {
                await docRef.delete();
                console.log(`SUCCESS: Deleted user "${username}"`);
            } else {
                console.log(`SKIPPED: User "${username}" does not exist.`);
            }
        } catch (error) {
            console.error(`ERROR deleting user "${username}":`, error.message);
        }
    }

    console.log('\n--- Final Admin List ---');
    const snapshot = await db.collection('users').where('role', '==', 'admin').get();
    snapshot.forEach(doc => {
        console.log(`- ${doc.id}`);
    });
}

cleanupAdmins().then(() => process.exit());
