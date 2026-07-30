const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, addDoc, setDoc, doc } = require('firebase/firestore');

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

async function run() {
    console.log("Fetching students...");
    const snap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['student', 'öğrenci'])));
    const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (students.length < 3) {
        console.log("Not enough students to simulate all 3 scenarios.");
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Scenarios
    // 1. Öğleden sonra gelen (Geç kalan)
    // 2. Tam gün gelen (Zamanında gelip, zamanında çıkan)
    // 3. Hiç gelmeyen (Hiç log oluşturmayacağız, kendisi gelmedi görünecek)

    // Clear existing today's gate_status just to be clean
    console.log("Clearing gate_status for fresh simulation...");
    const gateSnap = await getDocs(collection(db, 'gate_status'));
    for (let d of gateSnap.docs) {
        // await deleteDoc(doc(db, 'gate_status', d.id));
    }

    if (students[0]) {
        console.log(`Simulating FULL DAY for: ${students[0].full_name || students[0].name}`);
        // Entry at 08:30
        let entryTime = new Date();
        entryTime.setHours(8, 30, 0, 0);
        
        await addDoc(collection(db, "attendance_logs"), {
            studentId: students[0].id,
            studentName: students[0].full_name || students[0].name || "Student",
            type: 'institution_gate',
            action: 'entry',
            status: 'entry',
            sessionId: 'sim_' + Date.now(),
            timestamp: entryTime
        });

        await setDoc(doc(db, "gate_status", students[0].id), {
            status: 'entry',
            date: todayStr,
            timestamp: entryTime
        });
    }

    if (students[1]) {
        console.log(`Simulating LATE (Afternoon) for: ${students[1].full_name || students[1].name}`);
        // Entry at 13:30
        let entryTime = new Date();
        entryTime.setHours(13, 30, 0, 0);
        
        await addDoc(collection(db, "attendance_logs"), {
            studentId: students[1].id,
            studentName: students[1].full_name || students[1].name || "Student",
            type: 'institution_gate',
            action: 'entry',
            status: 'entry',
            sessionId: 'sim_' + Date.now(),
            timestamp: entryTime
        });

        await setDoc(doc(db, "gate_status", students[1].id), {
            status: 'entry',
            date: todayStr,
            timestamp: entryTime
        });
    }

    if (students[2]) {
        console.log(`Simulating NO SHOW for: ${students[2].full_name || students[2].name}`);
        // Do nothing! Let them be missing.
    }

    console.log("Simulation complete!");
    process.exit(0);
}

run();
