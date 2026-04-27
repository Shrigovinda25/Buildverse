const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seed() {
  const username = 'Buildverse';
  const password = 'shri25'; // CHANGE THIS
  const hashedPassword = await bcrypt.hash(password, 10);

  await db.collection('users').doc(username).set({
    username: username,
    password: hashedPassword,
    role: 'admin',
    points: 0,
    orderingEnabled: true
  });

  console.log('Admin user created successfully');
  process.exit();
}

seed().catch(console.error);
