const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
    projectId: "bgz-mobil",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    console.log("Adding fake attendance log for teacher...");
    const docRef = await addDoc(collection(db, 'attendance_logs'), {
        studentId: "3HrC3VbuaUNjY2DM2AtxGC4Z98G2",
        studentName: "Uğur İnaç",
        type: "institution_gate",
        action: "entry",
        status: "entry",
        sessionId: "test-session",
        timestamp: serverTimestamp()
    });
    console.log("Added:", docRef.id);
    process.exit(0);
}
check();
