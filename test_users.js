const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    projectId: "bgz-mobil",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    const q = query(collection(db, 'users'), where('role', 'in', ['teacher', 'öğretmen']));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        const d = doc.data();
        console.log(doc.id, d.name || d.full_name, 'TC:', d.tc_kimlik, d.tc, d.tcNo);
    });
    process.exit(0);
}
check();
