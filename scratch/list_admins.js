const admin = require('firebase-admin');
const path = require('path');

// Initialize with service account
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listAdmins() {
    console.log('--- Listing All Admins in Firestore ---');
    try {
        const snapshot = await db.collection('users').where('role', '==', 'admin').get();
        if (snapshot.empty) {
            console.log('No admin users found.');
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Username: ${data.username}`);
            // Note: Password is hashed, so we can't see 'admin123' directly
            console.log(`Role: ${data.role}`);
            console.log('---');
        });
    } catch (error) {
        console.error('Error fetching admins:', error.message);
    }
}

listAdmins().then(() => process.exit());
