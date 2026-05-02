const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkAdminPassword() {
    console.log('--- Checking admin/admin123 in Firestore ---');
    try {
        const doc = await db.collection('users').doc('admin').get();
        if (!doc.exists) {
            console.log('User "admin" does not exist in Firestore.');
            return;
        }

        const userData = doc.data();
        console.log(`User found: ${userData.username}`);
        
        const isMatch = bcrypt.compareSync('admin123', userData.password);
        if (isMatch) {
            console.log('CONFIRMED: Password for "admin" is "admin123".');
        } else {
            console.log('FAILED: Password for "admin" is NOT "admin123".');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkAdminPassword().then(() => process.exit());
