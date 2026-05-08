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
    console.log('--- STARTING RANKING SYNC ---');
    
    // 2. Read Excel
    const workbook = XLSX.readFile(path.join(__dirname, '..', 'Ranking.xlsx'));
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    
    // Row 0 is the price list (no "Team Name" field), skip it.
    // Actual teams start from Row 1 onwards and have a "Team Name" field.
    const teams = data.filter(item => item["Team Name"]);
    console.log(`Found ${teams.length} teams to sync.`);

    // 3. Update Teams — write ranking data to a SEPARATE field (rankingScore)
    //    so we do NOT overwrite the live procurement budget (points).
    for (const team of teams) {
        const username = team["Team Name"];
        const totalDeducted = team["Total Deducted"] || 0;
        const remainingPoints = team["Remaining Points (/1000)"] || 0;
        
        // rankingScore = total points spent on components (higher = more active/invested)
        console.log(`Syncing Team: ${username} | Deducted: ${totalDeducted} | Remaining: ${remainingPoints}`);
        
        await db.collection('users').doc(username).set({
            points: remainingPoints, // Also update the live procurement budget
            rankingScore: totalDeducted,
            rankingRemaining: remainingPoints
        }, { merge: true });
    }

    // 4. Update Components (Available Quantities)
    // We need to sum up usage for every component column
    const componentNames = Object.keys(data[0]).filter(key => 
        !["Team No.", "Team Name", "Total Deducted", "Remaining Points (/1000)"].includes(key)
    );

    console.log(`Analyzing ${componentNames.length} components for stock reconciliation...`);

    const componentsSnapshot = await db.collection('components').get();
    const dbComponents = componentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    for (const name of componentNames) {
        let totalUsed = 0;
        teams.forEach(team => {
            totalUsed += (team[name] || 0);
        });

        const dbComp = dbComponents.find(c => c.name === name);
        if (dbComp) {
            const newAvailable = Math.max(0, (dbComp.totalQuantity || 0) - totalUsed);
            console.log(`Updating ${name}: Total=${dbComp.totalQuantity}, Used=${totalUsed}, Available=${newAvailable}`);
            await db.collection('components').doc(dbComp.id).update({
                availableQuantity: newAvailable
            });
        } else {
            console.warn(`Warning: Component "${name}" not found in Firestore.`);
        }
    }

    console.log('--- SYNC COMPLETE ---');
}

syncRanking().catch(err => {
    console.error('SYNC FAILED:', err);
    process.exit(1);
});
