const cron = require('node-cron');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, addDoc } = require('firebase/firestore');
const { getDatabase, ref, get } = require('firebase/database');

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
const rtdb = getDatabase(app);

async function runStudentDailyAttendance() {
    console.log(`[CRON-STUDENT] Öğrenci Yoklama İşlemi Başladı... (${new Date().toLocaleString()})`);
    try {
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time
        
        // 1. Get all students
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['student', 'öğrenci'])));
        const students = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log(`[CRON-STUDENT] Toplam Öğrenci Sayısı: ${students.length}`);

        // 2. Get today's gate status from RTDB
        const gateStatusSnap = await get(ref(rtdb, 'qr_system/gate_status'));
        let gateStatusMap = {};
        if (gateStatusSnap.exists()) {
            gateStatusMap = gateStatusSnap.val();
        }

        let absentCount = 0;
        
        // 3. Check each student
        for (const student of students) {
            const studentGate = gateStatusMap[student.id];
            
            // Eğer öğrencinin kaydı yoksa veya bugünün tarihiyle eşleşmiyorsa => Tam Gün Yok
            if (!studentGate || studentGate.date !== todayStr) {
                // Check if they already have an absence record for today
                const q = query(
                    collection(db, 'attendance'),
                    where('studentId', '==', student.id),
                    where('status', 'in', ['absent', 'Tam Gün Yok']),
                    where('date', '==', todayStr)
                );
                const existing = await getDocs(q);
                
                if (existing.empty) {
                    await addDoc(collection(db, 'attendance'), {
                        studentId: student.id,
                        studentName: student.name || student.full_name || "Bilinmeyen",
                        className: student.grade || "Bilinmiyor",
                        courseName: "Tam Gün Yok",
                        periodIndex: -1,
                        status: "absent",
                        recordedBy: "Otomatik Sistem (Cron)",
                        date: todayStr,
                        timestamp: new Date()
                    });
                    absentCount++;
                }
            }
        }
        
        console.log(`[CRON-STUDENT] İşlem Tamamlandı. Okutmayan ${absentCount} öğrenci "Yok" yazıldı.`);
        
    } catch (err) {
        console.error("[CRON-STUDENT ERROR]:", err);
    }
}

// Her gece 23:55'te çalıştır
const scheduleStudentJob = () => {
    cron.schedule('55 23 * * *', () => {
        runStudentDailyAttendance();
    });
    console.log("[CRON-STUDENT] Öğrenci Yoklama Zamanlayıcısı Kuruldu (23:55)");
};

module.exports = { scheduleStudentJob, runStudentDailyAttendance };
