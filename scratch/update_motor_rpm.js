const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function updateMotor() {
    console.log('Searching for 45 RPM Motor...');
    const componentsRef = db.collection('components');
    const q = await componentsRef.where('name', '==', '45 RPM Motor').get();
    
    if (q.empty) {
        console.log('No component found with name "45 RPM Motor".');
        
        // Also check by ID/Slug
        const doc = await componentsRef.doc('45_rpm_motor').get();
        if (doc.exists) {
            console.log('Found 45 RPM Motor by slug.');
            const data = doc.data();
            // Delete old, create new
            await componentsRef.doc('100_rpm_motor').set({
                ...data,
                name: '100 RPM Motor'
            });
            await componentsRef.doc('45_rpm_motor').delete();
            console.log('Migrated 45_rpm_motor to 100_rpm_motor.');
        } else {
            console.log('No 45_rpm_motor slug found.');
        }
    } else {
        for (const doc of q.docs) {
            console.log(`Found component: ${doc.id}`);
            const data = doc.data();
            
            // If the ID is the old slug, we should probably change the ID too
            if (doc.id === '45_rpm_motor') {
                 await componentsRef.doc('100_rpm_motor').set({
                    ...data,
                    name: '100 RPM Motor'
                });
                await doc.ref.delete();
                console.log('Renamed slug and name.');
            } else {
                await doc.ref.update({ name: '100 RPM Motor' });
                console.log('Updated name only.');
            }
        }
    }
    process.exit();
}

updateMotor().catch(err => {
    console.error(err);
    process.exit(1);
});
