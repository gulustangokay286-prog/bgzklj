const admin = require('firebase-admin');

// Initialize Firebase Admin (Assuming GOOGLE_APPLICATION_CREDENTIALS is set)
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

async function syncCustomClaims() {
    console.log('[SECURITY] Starting JWT Custom Claims Synchronization...');
    try {
        const usersSnapshot = await db.collection('users').get();
        let syncedCount = 0;

        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            const uid = doc.id;
            const role = (userData.role || 'student').toLowerCase();

            // Define the custom claims based on the database role
            const customClaims = {
                role: role,
                admin: role === 'admin' || role === 'superadmin' || role === 'patron',
                superadmin: role === 'superadmin',
                student: role === 'student',
                teacher: role === 'teacher' || role === 'öğretmen',
                parent: role === 'parent' || role === 'veli'
            };

            try {
                await auth.setCustomUserClaims(uid, customClaims);
                console.log(`[SYNC] Synced claims for user ${uid} (Role: ${role})`);
                syncedCount++;
            } catch (authErr) {
                console.error(`[ERROR] Failed to set claims for ${uid}:`, authErr.message);
            }
        }
        
        console.log(`[SECURITY] Successfully synchronized claims for ${syncedCount} users.`);
        console.log(`[SECURITY] The backend now exclusively trusts JWT tokens, fully decoupled from database reads.`);
        process.exit(0);
    } catch (error) {
        console.error('[FATAL] Failed to sync claims:', error);
        process.exit(1);
    }
}

syncCustomClaims();
