const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
async function run() {
    const snap = await getDocs(collection(db, 'attendance'));
    snap.forEach(d => console.log(d.id, d.data().studentName, d.data().status));
    process.exit(0);
}
run();
