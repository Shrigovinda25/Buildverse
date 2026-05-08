const admin = require('firebase-admin');
const XLSX = require('xlsx');
const path = require('path');

// 1. Initialize Firebase
const serviceAccount = require('../serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function syncRanking() {
    console.log('--- STARTING COMPONENT & RANKING SYNC ---');
    
    // 2. Read Excel
    const workbook = XLSX.readFile(path.join(__dirname, '..', 'Rankings.xlsx'));
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    
    const teams = data.filter(item => item["Team Name"]);
    console.log(`Found ${teams.length} teams to process.`);

    // 3. Fetch Components for Mapping
    const componentsSnapshot = await db.collection('components').get();
    const dbComponents = componentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const componentColumns = Object.keys(data[0]).filter(key => 
        !["Team No.", "Team Name", "Total Deducted", "Remaining Points (/1000)"].includes(key)
    );

    // 4. Process Each Team
    for (const team of teams) {
        const username = team["Team Name"];
        const totalDeducted = team["Total Deducted"] || 0;
        const remainingPoints = team["Remaining Points (/1000)"] || 0;
        
        console.log(`\nProcessing Team: ${username}`);
        
        // A. Build Inventory Map & Create Order Records
        const newInventory = {};
        const teamOrders = [];

        for (const colName of componentColumns) {
            const qty = Number(team[colName] || 0);
            if (qty > 0) {
                const dbComp = dbComponents.find(c => c.name === colName);
                if (dbComp) {
                    newInventory[dbComp.id] = qty;
                    teamOrders.push({
                        username: username,
                        componentId: dbComp.id,
                        componentName: dbComp.name,
                        quantity: qty,
                        pricePerUnit: dbComp.price || 0,
                        totalCost: qty * (dbComp.price || 0),
                        status: 'Given', // Mark as already taken
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        syncedFromExcel: true // Marker for future syncs
                    });
                }
            }
        }

        // B. Clear existing synced orders for this team to avoid duplicates
        const existingSyncedOrders = await db.collection('orders')
            .where('username', '==', username)
            .where('syncedFromExcel', '==', true)
            .get();
        
        const batch = db.batch();
        existingSyncedOrders.forEach(doc => batch.delete(doc.ref));
        
        // C. Add new orders from Excel
        teamOrders.forEach(order => {
            const newOrderRef = db.collection('orders').doc();
            batch.set(newOrderRef, order);
        });

        // D. Update User Profile (Points + Inventory)
        const userRef = db.collection('users').doc(username);
        batch.set(userRef, {
            points: remainingPoints,
            inventory: newInventory,
            rankingScore: totalDeducted,
            rankingRemaining: remainingPoints
        }, { merge: true });

        await batch.commit();
        console.log(`- Updated budget to ${remainingPoints} pts`);
        console.log(`- Synced ${teamOrders.length} component types to inventory`);
    }

    // 5. Update Global Component Stock Levels
    console.log('\nReconciling global stock levels...');
    for (const dbComp of dbComponents) {
        let totalUsed = 0;
        teams.forEach(team => {
            totalUsed += Number(team[dbComp.name] || 0);
        });

        const newAvailable = Math.max(0, (dbComp.totalQuantity || 0) - totalUsed);
        if (dbComp.availableQuantity !== newAvailable) {
            console.log(`- ${dbComp.name}: Available ${dbComp.availableQuantity} -> ${newAvailable}`);
            await db.collection('components').doc(dbComp.id).update({
                availableQuantity: newAvailable
            });
        }
    }

    console.log('\n--- SYNC COMPLETE ---');
}

syncRanking().catch(err => {
    console.error('SYNC FAILED:', err);
    process.exit(1);
});
