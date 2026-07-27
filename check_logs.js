const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDhzx2r1Kn0oOm824_61Wag5u1bRYfIjkk",
    authDomain: "ial-mobil.firebaseapp.com",
    databaseURL: "https://ial-mobil-default-rtdb.firebaseio.com",
    projectId: "ial-mobil",
    storageBucket: "ial-mobil.firebasestorage.app",
    messagingSenderId: "1083444143779",
    appId: "1:1083444143779:web:c0fe00628210fa0a1c4116"
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
