const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, query, where } = require('firebase/firestore');
const { getDatabase, ref, update, set, push } = require('firebase/database');

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

async function syncToday() {
    console.log("Bugünün verileri Firestore'dan Realtime DB'ye aktarılıyor...");
    
    // 1. Get all attendance logs for today
    // Unfortunately, attendance logs might not have a simple date field, they have timestamp
    // Let's just fetch all gate_status from Firestore and sync them.
    const gateSnap = await getDocs(collection(db, 'gate_status'));
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    let count = 0;
    
    for (const gateDoc of gateSnap.docs) {
        const data = gateDoc.data();
        if (data.date === todayStr) {
            const userId = gateDoc.id;
            
            // Get user info
            const userSnap = await getDoc(doc(db, 'users', userId));
            let userName = "Bilinmeyen Öğrenci";
            let profileImageUrl = "";
            let userRole = "student";
            
            if (userSnap.exists()) {
                const u = userSnap.data();
                userName = u.full_name || u.name || userName;
                profileImageUrl = u.profile_image || u.profileImageUrl || "";
                userRole = u.role || "student";
            }
            
            const lastScan = data.timestamp && data.timestamp.toMillis ? data.timestamp.toMillis() : Date.now();
            
            const gateData = {
                status: data.status === "entry" ? "inside" : "outside",
                lastAction: data.status,
                lastScan: lastScan,
                scanCount: 1,
                date: todayStr,
                userName: userName,
                userRole: userRole,
                profileImageUrl: profileImageUrl
            };
            
            await update(ref(rtdb, `qr_system/gate_status/${userId}`), gateData);
            count++;
        }
    }
    
    console.log(`Tamamlandı. ${count} öğrencinin bugünkü durumu Realtime DB'ye kopyalandı.`);
    process.exit(0);
}

syncToday();
