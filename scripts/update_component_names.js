const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

const NAME_MAPPING = {
    "DHT11 Temp/Humid Sensor": "DHT11 Temp/Humidity Sensor",
    "ULN 2003 Driver": "ULN2003 Driver",
    "1in L Clamp": "1 Clamp",
    "3/4in L Clamp": "3/4 Clamp",
    "Breadboard (800 pts)": "Breadboard",
    "Female to Female Jumper wire": "Female to Female Jumper Wire",
    "Male to Female Jumper wire": "Male to Female Jumper Wire",
    "Male to Male Jumper wire": "Male to Male Jumper Wire",
    "5mm Foam Board (2ft x 1ft)": "5MM Foam Board"
};

async function updateNames() {
    console.log('Renaming components in Firestore to match Excel...');
    const snapshot = await db.collection('components').get();
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (NAME_MAPPING[data.name]) {
            const oldName = data.name;
            const newName = NAME_MAPPING[oldName];
            console.log(`Renaming: "${oldName}" -> "${newName}"`);
            await db.collection('components').doc(doc.id).update({
                name: newName
            });
        }
    }
    console.log('Rename complete.');
}

updateNames().catch(console.error);
