const cron = require('node-cron');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, addDoc } = require('firebase/firestore');

// Firebase Configuration
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "bgz-mobil.firebaseapp.com",
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://bgz-mobil-default-rtdb.firebaseio.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "bgz-mobil",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "bgz-mobil.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1083444143779",
    appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Personel Mesai Saatleri: 08:30 - 17:00
const shiftStartMin = 8 * 60 + 30; // 510 (08:30)
const shiftEndMin = 17 * 60;       // 1020 (17:00)
const graceMinutes = 15;

function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

// Günlük zaman damgalarını oluştur (Bugünün başı ve sonu)
function getTodayBounds() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
}

async function processPersonnelDailyLog(personnel, todayLogs, todayAttendance) {
    // Manuel bir devamsızlık/rapor girilmiş mi kontrol et
    const existingRecord = todayAttendance.find(att => att.studentId === personnel.id);
    if (existingRecord) {
        console.log(`[CRON] Personel ${personnel.full_name} için manuel kayıt bulundu (${existingRecord.status || 'Raporlu/Özürlü'}), otomatik işlem atlanıyor.`);
        return;
    }

    // Personelin bugünkü loglarını bul
    const userLogs = todayLogs
        .filter(log => log.userId === personnel.id)
        .sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
        
    let status = "";
    let issues = [];
    let entryTime = null;
    let exitTime = null;

    if (userLogs.length === 0) {
        status = "Tam Gün Yok";
    } else {
        // En erken log giriş, en geç log çıkış (eğer 1'den fazla varsa)
        const firstLog = userLogs[0];
        const lastLog = userLogs.length > 1 ? userLogs[userLogs.length - 1] : null;

        // Date format: HH:mm
        const formatTime = (sec) => {
            const d = new Date(sec * 1000);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        entryTime = formatTime(firstLog.timestamp.seconds);
        const entryMin = timeToMinutes(entryTime);

        if (lastLog) {
            exitTime = formatTime(lastLog.timestamp.seconds);
            const exitMin = timeToMinutes(exitTime);

            // Erken çıkma kontrolü
            if (exitMin < shiftEndMin) {
                let earlyMin = shiftEndMin - exitMin;
                status = "Erken Çıktı";
            }
        } else {
            status = "Uyarı: Çıkış Okutulmadı";
        }

        // Geç kalma kontrolü
        if (entryMin > shiftStartMin + graceMinutes) {
            if (status === "" || status === "Uyarı: Çıkış Okutulmadı") status = "Geç Kaldı";
            else status = "Geç Kaldı + Erken Çıktı";
        }

        // Mükemmel mesai
        if (status === "") {
            status = "Tam Gün Var";
        }
    }

    // Veritabanına yazılacak veri
    const attendanceRecord = {
        studentId: personnel.id, // Frontend'de studentId olarak kullanılıyor
        studentName: personnel.full_name || "Bilinmeyen Personel",
        date: new Date().toISOString().split('T')[0],
        status: status,
        type: "personnel_daily",
        entryTime: entryTime || "YOK",
        exitTime: exitTime || "YOK",
        timestamp: new Date()
    };

    try {
        await addDoc(collection(db, 'attendance'), attendanceRecord);
        console.log(`[CRON] Personel Yoklama Eklendi: ${personnel.full_name} -> ${status}`);
    } catch (err) {
        console.error(`[CRON] Personel Yoklama Eklenemedi (${personnel.id}):`, err);
    }
}

async function runDailyAttendanceJob() {
    console.log(`[CRON] Personel Yoklama İşlemi Başladı... (${new Date().toLocaleString()})`);
    
    try {
        const { start, end } = getTodayBounds();

        // 1. Personelleri ve Öğretmenleri Çek
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['personel', 'teacher', 'öğretmen'])));
        const personnelList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        console.log(`[CRON] Toplam İşlenecek Personel/Öğretmen Sayısı: ${personnelList.length}`);

        // 2. Bugünkü Gate Log'ları Çek
        // Firebase Timestamp nesnelerine çevirelim
        const startTimestamp = { seconds: Math.floor(start.getTime() / 1000), nanoseconds: 0 };
        const endTimestamp = { seconds: Math.floor(end.getTime() / 1000), nanoseconds: 0 };
        
        // Frontend logları okurken 'timestamp' alanını kullanıyor
        // Zaman filtresini SDK'nın Date objesi desteği üzerinden de yapabiliriz ama REST'ten tümünü çekip kodda filtrelemek de mümkündür.
        // Daha güvenli olması için tüm logları çekip (veya bugün için limitli) kodda filtreleyelim.
        // (Çok büyük log varsa sorgu gerekebilir ama şu an basitleştirelim)
        
        const gateLogsSnap = await getDocs(collection(db, 'gate_logs'));
        const allLogs = gateLogsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const todayLogs = allLogs.filter(log => {
            if (!log.timestamp || !log.timestamp.seconds) return false;
            const logDate = new Date(log.timestamp.seconds * 1000);
            return logDate >= start && logDate <= end;
        });

        console.log(`[CRON] Bugünkü toplam Gate Log sayısı: ${todayLogs.length}`);

        // 3. Bugünkü Devamsızlık (Manuel girilenleri kontrol için) Çek
        const attendanceSnap = await getDocs(collection(db, 'attendance'));
        const allAttendance = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAttendance = allAttendance.filter(att => {
            // Eğer timestamp varsa ona bak, yoksa date stringine bak
            if (att.timestamp && att.timestamp.seconds) {
                const attDate = new Date(att.timestamp.seconds * 1000);
                return attDate >= start && attDate <= end;
            } else if (att.date) {
                return String(att.date).startsWith(todayStr);
            }
            return false;
        });

        console.log(`[CRON] Bugünkü toplam manuel/önceden girilmiş devamsızlık kaydı sayısı: ${todayAttendance.length}`);

        // 4. Her Personel İçin İşlem Yap
        for (let personnel of personnelList) {
            await processPersonnelDailyLog(personnel, todayLogs, todayAttendance);
        }

        console.log(`[CRON] Personel Yoklama İşlemi Tamamlandı!`);

    } catch (error) {
        console.error("[CRON ERROR]:", error);
    }
}

// Her gece 23:59'da çalıştır
const scheduleDailyJob = () => {
    cron.schedule('59 23 * * *', () => {
        runDailyAttendanceJob();
    });
    console.log("[CRON] Personel Yoklama Zamanlayıcısı Kuruldu (23:59)");
};

// Modül olarak dışa aktar
module.exports = { scheduleDailyJob, runDailyAttendanceJob };
