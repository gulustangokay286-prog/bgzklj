const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

async function deleteCollection(collName) {
    console.log(`Fetching docs in ${collName}...`);
    const snap = await getDocs(collection(db, collName));
    let count = 0;
    for (let d of snap.docs) {
        await deleteDoc(doc(db, collName, d.id));
        count++;
    }
    console.log(`Deleted ${count} docs from ${collName}.`);
}

async function run() {
    await deleteCollection('gate_status');
    await deleteCollection('gate_logs');
    await deleteCollection('attendance');
    await deleteCollection('attendance_logs');
    await deleteCollection('security_logs');
    await deleteCollection('device_locks');
    await deleteCollection('used_qr_sessions');
    await deleteCollection('consumed_nonces');
    console.log("All attendance, gate, and security data has been reset!");
    process.exit(0);
}

run();
