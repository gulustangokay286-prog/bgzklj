const { runStudentDailyAttendance } = require('./student_attendance_processor');

console.log("🚀 Gerçek veritabanı üzerinden manuel Cron simülasyonu başlatılıyor...");

runStudentDailyAttendance().then(() => {
    console.log("✅ Simülasyon tamamlandı. Çıkış yapılıyor.");
    setTimeout(() => process.exit(0), 2000);
}).catch(err => {
    console.error("❌ Hata:", err);
    process.exit(1);
});
