const { getFirestore, collection, onSnapshot, doc, getDoc } = require('firebase/firestore');
const { getDatabase, ref, update, set, push } = require('firebase/database');

function startSyncService(app) {
    const db = getFirestore(app);
    const rtdb = getDatabase(app);

    console.log("[SYNC] Firestore -> RTDB Senkronizasyon Servisi Başlatıldı.");

    let isInitialLoad = true;
    
    // Listen to attendance_logs in Firestore
    onSnapshot(collection(db, 'attendance_logs'), (snapshot) => {
        if (isInitialLoad) {
            isInitialLoad = false;
            return; // Ignore existing docs on boot
        }
        
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                
                try {
                    const userId = data.studentId;
                    if (!userId) return;

                    const dateString = new Date().toLocaleDateString('en-CA');
                    const currentMillis = data.timestamp && data.timestamp.toMillis ? data.timestamp.toMillis() : Date.now();
                    const action = (data.status === 'entry' || data.status === 'present') ? 'entry' : 'exit';
                    
                    // Fetch user info for UI
                    const userSnap = await getDoc(doc(db, 'users', userId));
                    let userName = data.studentName || "Bilinmeyen";
                    let profileImageUrl = "";
                    let userRole = "student";
                    
                    if (userSnap.exists()) {
                        const u = userSnap.data();
                        userName = u.full_name || u.name || userName;
                        profileImageUrl = u.profile_image || u.profileImageUrl || "";
                        userRole = u.role || "student";
                    }

                    // 1. Update gate_status in RTDB
                    const gateData = {
                        status: action === "entry" ? "inside" : "outside",
                        lastAction: action,
                        lastScan: currentMillis,
                        scanCount: 1,
                        date: dateString,
                        userName: userName,
                        userRole: userRole,
                        profileImageUrl: profileImageUrl
                    };

                    await update(ref(rtdb, `qr_system/gate_status/${userId}`), gateData);
                    
                    // 2. Add to live_scans
                    const liveScanData = {
                        userId: userId,
                        userName: userName,
                        userRole: userRole,
                        profileImageUrl: profileImageUrl,
                        action: action,
                        timestamp: currentMillis,
                        date: dateString,
                        location: "Web QR",
                        type: data.type || "institution"
                    };
                    
                    const newLogRef = push(ref(rtdb, `qr_system/attendance_logs/${dateString}`));
                    await set(newLogRef, liveScanData);
                    await set(ref(rtdb, `qr_system/live_scans/${newLogRef.key}`), liveScanData);

                    console.log(`[SYNC] Başarıyla senkronize edildi: ${userName} (${action})`);
                } catch (e) {
                    console.error("[SYNC ERROR]:", e);
                }
            }
        });
    });
}

module.exports = { startSyncService };
