const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

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

async function check() {
    console.log("Checking gate_logs...");
    const gateQ = query(collection(db, 'gate_logs'), orderBy('timestamp', 'desc'), limit(5));
    const gateSnap = await getDocs(gateQ);
    gateSnap.forEach(doc => {
        const data = doc.data();
        let ts = data.timestamp;
        if (ts && ts.seconds) {
            console.log(`Gate Log: ${doc.id} - ${new Date(ts.seconds * 1000).toLocaleString()}`);
        } else {
            console.log(`Gate Log: ${doc.id} - String/Other: ${ts}`);
        }
    });

    console.log("Checking attendance_logs...");
    const attQ = query(collection(db, 'attendance_logs'), orderBy('timestamp', 'desc'), limit(5));
    const attSnap = await getDocs(attQ);
    attSnap.forEach(doc => {
        const data = doc.data();
        let ts = data.timestamp;
        if (ts && ts.seconds) {
            console.log(`Att Log: ${doc.id} - ${new Date(ts.seconds * 1000).toLocaleString()}`);
        } else {
            console.log(`Att Log: ${doc.id} - String/Other: ${ts}`);
        }
    });
}

check().then(() => process.exit(0)).catch(console.error);
