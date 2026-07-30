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

const client = twilio(accountSid, authToken);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SMS Backend is running' });
});

app.post('/api/send-sms', async (req, res) => {
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

app.post('/api/system/broadcast-whatsapp', async (req, res) => {
    const { phones, title, message } = req.body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing or invalid phones array' });
    }

    if (!message) {
        return res.status(400).json({ success: false, error: 'Missing message' });
    }

    const fullMessage = title ? `*${title}*\n\n${message}` : message;

    console.log(`[BROADCAST] Starting broadcast to ${phones.length} users...`);
    console.log(`[BROADCAST] Phones: ${JSON.stringify(phones)}`);

    // Hızlı yanıt dön (Fire and Forget)
    res.status(200).json({
        success: true,
        message: `Broadcast accepted. Processing ${phones.length} users in background.`,
    });

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
app.post('/api/send-whatsapp-otp', async (req, res) => {
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

app.listen(port, () => {
    console.log(`=========================================`);
    console.log(`IALMobil SMS Backend is running on port ${port}`);
    console.log(`Twilio Number: ${twilioPhoneNumber}`);
    console.log(`=========================================`);
    
    // Start Cron Jobs
    const { scheduleDailyJob } = require('./cron_attendance');
    const { scheduleStudentJob } = require('./student_attendance_processor');
    
    scheduleDailyJob();
    scheduleStudentJob();
    
    // YENİ WHATSAPP BOTUNU BAŞLAT! (Terminalde QR Kod çıkaracak)
    initializeWhatsAppBot();
});

module.exports = app;
