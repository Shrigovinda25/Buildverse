const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function updateLED() {
    console.log('Searching for LED Pack (Assorted)...');
    const componentsRef = db.collection('components');
    const q = await componentsRef.where('name', '==', 'LED Pack (Assorted)').get();
    
    if (q.empty) {
        console.log('No component found with name "LED Pack (Assorted)".');
        
        // Also check by ID/Slug
        const doc = await componentsRef.doc('led_pack__assorted_').get();
        if (doc.exists) {
            console.log('Found LED Pack (Assorted) by slug.');
            const data = doc.data();
            // Delete old, create new
            await componentsRef.doc('led').set({
                ...data,
                name: 'LED'
            });
            await componentsRef.doc('led_pack__assorted_').delete();
            console.log('Migrated led_pack__assorted_ to led.');
        } else {
            // Check for a simpler slug if the above failed
             const doc2 = await componentsRef.doc('led_pack_assorted').get();
             if (doc2.exists) {
                const data = doc2.data();
                await componentsRef.doc('led').set({ ...data, name: 'LED' });
                await componentsRef.doc('led_pack_assorted').delete();
                console.log('Migrated led_pack_assorted to led.');
             } else {
                console.log('No LED Pack (Assorted) slug found.');
             }
        }
    } else {
        for (const doc of q.docs) {
            console.log(`Found component: ${doc.id}`);
            const data = doc.data();
            
            await componentsRef.doc('led').set({
                ...data,
                name: 'LED'
            });
            if (doc.id !== 'led') {
                await doc.ref.delete();
                console.log('Renamed slug and name.');
            } else {
                console.log('Name updated.');
            }
        }
    }
    process.exit();
}

updateLED().catch(err => {
    console.error(err);
    process.exit(1);
});
