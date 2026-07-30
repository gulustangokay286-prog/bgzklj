const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDhzx2r1Kn0oOm824_61Wag5u1bRYfIjkk",
    authDomain: "bgz-mobil.firebaseapp.com",
    databaseURL: "https://bgz-mobil-default-rtdb.firebaseio.com",
    projectId: "bgz-mobil",
    storageBucket: "bgz-mobil.firebasestorage.app",
    messagingSenderId: "1083444143779",
    appId: "1:1083444143779:web:c0fe00628210fa0a1c4116"
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
