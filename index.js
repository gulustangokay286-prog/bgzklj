require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const { initializeWhatsAppBot, sendWhatsAppMessage } = require('./whatsappService');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// NATIVE C++ SECURITY ADDON
const security = require('./build/Release/security_addon.node');
const { verifyAuth, verifyAdmin } = require('./authMiddleware');

const client = twilio(accountSid, authToken);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SMS Backend is running' });
});

// C++ NATIVE SECURITY MIDDLEWARE
const requireNativeSignature = (req, res, next) => {
    const signature = req.headers['x-security-signature'];
    const payload = req.headers['x-security-payload']; // e.g., timestamp or random nonce

    if (!signature || !payload) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing Native Security Headers' });
    }

    const isValid = security.verifySignature(payload, signature);
    if (!isValid) {
        console.warn(`[SECURITY] Invalid native signature attempt from IP: ${req.ip}`);
        return res.status(403).json({ success: false, error: 'Forbidden: Invalid Native Signature' });
    }
    
    // Check if payload (timestamp) is fresh (within 5 minutes) to prevent replay attacks
    const timestamp = parseInt(payload, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > 5 * 60 * 1000) {
        return res.status(403).json({ success: false, error: 'Forbidden: Payload expired or invalid' });
    }

    next();
};

// Protect the SMS endpoint for admins
const { encryptPayload, decryptPayload } = require('./cryptoUtil');

app.post('/api/send-sms', verifyAdmin, async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: "to" and "message"'
        });
    }

    try {
        const twilioResponse = await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: to
        });

        console.log(`SMS Sent Successfully! SID: ${twilioResponse.sid}`);

        return res.status(200).json({
            success: true,
            messageSid: twilioResponse.sid,
            status: twilioResponse.status
        });
    } catch (error) {
        console.error('Failed to send SMS:', error);

        return res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
});

app.post('/api/system/broadcast-whatsapp', verifyAdmin, async (req, res) => {

    let requestData = req.body;
    if (req.body && req.body.payload) {
        const decrypted = decryptPayload(req.body.payload);
        if (decrypted) requestData = decrypted;
    }

    const { phones, title, message } = requestData;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing or invalid phones array' });
    }

    if (!message) {
        return res.status(400).json({ success: false, error: 'Missing message' });
    }

    const fullMessage = title ? `*${title}*\n\n${message}` : message;

    console.log(`[BROADCAST] Starting broadcast to ${phones.length} users...`);

    // Encrypt the initial success response
    const initResponse = {
        success: true,
        message: `Broadcast accepted. Processing ${phones.length} users in background.`,
    };
    res.status(200).json({ payload: encryptPayload(initResponse) });

    // Arka planda asenkron olarak yavaş yavaş (Anti-Ban) gönderimi başlat
    (async () => {
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        console.log(`[BROADCAST] Anti-Ban WhatsApp yayını başlıyor... Toplam: ${phones.length} kişi.`);

        for (let i = 0; i < phones.length; i++) {
            const phone = phones[i];
            
            // Sahte (Dummy) numaraları atla
            if (phone.replace(/[\s\(\)-+]/g, '').startsWith('9050000') || phone.replace(/[\s\(\)-+]/g, '').startsWith('50000')) {
                console.log(`[TEST/DUMMY NUMBER BYPASS] Broadcast skipped for ${phone}`);
                continue;
            }

            try {
                await sendWhatsAppMessage(phone, fullMessage);
                successCount++;
            } catch (err) {
                failCount++;
                errors.push({ phone, error: err.message });
                console.error(`[BROADCAST] Failed for ${phone}:`, err.message);
            }

            // ANTI-BAN KORUMASI: Her mesaj arasında 3 ile 7 saniye arası rastgele bekle
            // Bu sayede WhatsApp sistemi bunu bir "Spam Botu" değil, tek tek kopyala-yapıştır yapan bir "İnsan" zanneder.
            if (i < phones.length - 1) {
                const randomDelay = Math.floor(Math.random() * (7000 - 3000 + 1) + 3000);
                console.log(`⏳ Anti-Ban: Bir sonraki mesaj için ${randomDelay/1000} saniye bekleniyor...`);
                await new Promise(resolve => setTimeout(resolve, randomDelay));
            }
        }

        console.log(`[BROADCAST] Bitti! Başarılı: ${successCount}, Hatalı: ${failCount}`);
    })();
});

// YENİ %100 BEDAVA VE SINIRSIZ WHATSAPP OTP API'Sİ
// PROTECTED BY C++ NATIVE SIGNATURE (To prevent automated spam while allowing anonymous clients)
app.post('/api/send-whatsapp-otp', requireNativeSignature, async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({
            success: false,
            error: 'Gerekli alanlar eksik: "to" ve "message"'
        });
    }

    try {
        const result = await sendWhatsAppMessage(to, message);
        return res.status(200).json({
            success: true,
            messageId: result.messageId,
            info: "WhatsApp üzerinden BEDAVA gönderildi!"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// SECURE AI PROXY ENDPOINT
// This prevents mobile apps from holding the sensitive Gemini API key.
const axios = require('axios');
app.post('/api/ai/generate', verifyAuth, async (req, res) => {
    let requestData = req.body;
    if (req.body && req.body.payload) {
        const decrypted = decryptPayload(req.body.payload);
        if (decrypted) requestData = decrypted;
    }

    const { prompt, systemInstruction } = requestData;

    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Missing prompt' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
        return res.status(500).json({ success: false, error: 'Server AI Key not configured' });
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        if (systemInstruction) {
            payload.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        // Parse response to make it easy for frontend
        const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt alınamadı.";

        const responseData = {
            success: true,
            text: textResponse,
            data: response.data
        };

        return res.status(200).json({ payload: encryptPayload(responseData) });
    } catch (error) {
        console.error('[AI PROXY ERROR]:', error.response?.data || error.message);
        return res.status(500).json({ success: false, error: 'AI processing failed' });
    }
// SECURE CLOUDINARY SIGNATURE ENDPOINT
const crypto = require('crypto');
app.get('/api/cloudinary/sign', verifyAuth, (req, res) => {
    // Requires CLOUDINARY_API_SECRET in .env
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
        return res.status(500).json({ success: false, error: 'Server Cloudinary Secret not configured' });
    }

    // Generate a timestamp
    const timestamp = Math.round((new Date).getTime() / 1000);
    
    // Create signature string (e.g., folder=...&timestamp=...)
    // Cloudinary expects parameters to be alphabetically sorted before signing
    const folder = req.query.folder || 'secure_uploads';
    const signatureStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    
    // Hash using SHA-1
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

    return res.status(200).json({
        success: true,
        signature: signature,
        timestamp: timestamp,
        folder: folder,
        apiKey: process.env.CLOUDINARY_API_KEY
    });
});

app.listen(port, () => {
    console.log(`=========================================`);
    console.log(`IALMobil SMS Backend is running on port ${port}`);
    console.log(`Twilio Number: ${twilioPhoneNumber}`);
    console.log(`=========================================`);
    
    // Start Cron Jobs
    const { scheduleDailyJob } = require('./cron_attendance');
    const { scheduleStudentJob } = require('./student_attendance_processor');
    const { startSyncService } = require('./sync_service');
    const { initializeApp } = require('firebase/app');
    const fbApp = initializeApp(require('./student_attendance_processor').firebaseConfig || {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "bgz-mobil.firebaseapp.com",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://bgz-mobil-default-rtdb.firebaseio.com",
        projectId: process.env.FIREBASE_PROJECT_ID || "bgz-mobil",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "bgz-mobil.firebasestorage.app",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1083444143779",
        appId: process.env.FIREBASE_APP_ID
    }, 'sync-app');
    startSyncService(fbApp);
    
    scheduleDailyJob();
    scheduleStudentJob();
    
    // YENİ WHATSAPP BOTUNU BAŞLAT! (Terminalde QR Kod çıkaracak)
    initializeWhatsAppBot();
});

module.exports = app;
