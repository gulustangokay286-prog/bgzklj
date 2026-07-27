const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDhzx2r1Kn0oOm824_61Wag5u1bRYfIjkk",
    authDomain: "ial-mobil.firebaseapp.com",
    databaseURL: "https://ial-mobil-default-rtdb.firebaseio.com",
    projectId: "ial-mobil"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const snap = await getDocs(collection(db, 'attendance_logs'));
    console.log("Logs count:", snap.size);
    snap.forEach(doc => {
        console.log(doc.id, doc.data());
    });
    process.exit(0);
}
run();
