require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

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

    // Arka planda asenkron olarak chunk (parçalara bölerek) gönderimi başlat
    (async () => {
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        // Güvenlik ve performans için Twilio isteklerini 50'şerli gruplara bölelim
        const chunkSize = 50;
        for (let i = 0; i < phones.length; i += chunkSize) {
            const chunk = phones.slice(i, i + chunkSize);
            
            const sendPromises = chunk.map(async (phone) => {
                let cleanPhone = phone.replace(/[\s\(\)-]/g, '');
                if (cleanPhone.startsWith('05')) cleanPhone = '+90' + cleanPhone.substring(1);
                else if (cleanPhone.startsWith('5')) cleanPhone = '+90' + cleanPhone;
                else if (!cleanPhone.startsWith('+')) cleanPhone = '+90' + cleanPhone;

                if (cleanPhone.startsWith('+9050000')) {
                    console.log(`[TEST/DUMMY NUMBER BYPASS] Broadcast skipped for dummy number ${cleanPhone}`);
                    return Promise.resolve();
                }

                console.log(`[BROADCAST] Sending to: whatsapp:${cleanPhone}`);

                return client.messages.create({
                    body: fullMessage,
                    from: 'whatsapp:+14155238886',
                    to: `whatsapp:${cleanPhone}`
                });
            });

            const results = await Promise.allSettled(sendPromises);

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    successCount++;
                } else {
                    failCount++;
                    errors.push({ phone: chunk[index], error: result.reason?.message || 'Unknown error' });
                    console.error(`[BROADCAST] Failed for ${chunk[index]}:`, result.reason?.message);
                }
            });
            
            // Her bir chunk arasında 500ms bekleyerek Twilio Rate Limit (429) sorunlarını önleyelim
            if (i + chunkSize < phones.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`[BROADCAST] Finished background job. Success: ${successCount}, Failed: ${failCount}`);
    })();
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
});

module.exports = app;
