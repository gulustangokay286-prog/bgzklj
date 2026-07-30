const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = {
    apiKey: "AIzaSyDhzx2r1Kn0oOm824_61Wag5u1bRYfIjkk",
    authDomain: "bgz-mobil.firebaseapp.com",
    projectId: "bgz-mobil"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
async function run() {
    const snap = await getDocs(collection(db, 'attendance'));
    snap.forEach(d => console.log(d.id, d.data().studentName, d.data().status));
    process.exit(0);
}
run();
