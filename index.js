require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Twilio Client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SMS Backend is running' });
});

// Send SMS Endpoint
app.post('/api/send-sms', async (req, res) => {
    const { to, message } = req.body;

    // Basic validation
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
            code: error.code // Twilio specific error code
        });
    }
});

// OTP In-Memory Storage (Phone -> { otp: '123456', expires: timestamp })
// In production, use Redis or a Database.
const otpStore = new Map();

// Generate a random 6 digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. Send 2FA OTP Endpoint
app.post('/api/auth/send-2fa', async (req, res) => {
    let { to } = req.body;
    if (!to) return res.status(400).json({ success: false, error: 'Missing phone number' });

    // Format phone number to E.164 (+90)
    to = to.replace(/[\s\(\)-]/g, '');
    if (to.startsWith('05')) to = '+90' + to.substring(1);
    else if (to.startsWith('5')) to = '+90' + to;

    const otp = generateOTP();
    // Expiry in 5 minutes
    otpStore.set(to, { otp, expires: Date.now() + 5 * 60 * 1000 });

    const message = `IAL Mobil Giriş Kodunuz: ${otp}. Bu kodu kimseyle paylaşmayınız.`;

    if (to.startsWith('+9050000')) {
        otpStore.set(to, { otp: '123456', expires: Date.now() + 5 * 60 * 1000 });
        console.log(`[TEST/DUMMY NUMBER BYPASS] 2FA WhatsApp "Sent" to ${to}. OTP: 123456`);
        return res.status(200).json({ success: true, message: 'OTP sent (Dummy Bypass)' });
    }

    try {
        await client.messages.create({ 
            body: message, 
            from: 'whatsapp:+14155238886', // Twilio WhatsApp Sandbox Number
            to: `whatsapp:${to}` 
        });
        console.log(`2FA WhatsApp Sent to ${to}. OTP: ${otp}`);
        return res.status(200).json({ success: true, message: 'OTP sent' });
    } catch (error) {
        console.error('Failed to send 2FA SMS:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Verify 2FA OTP Endpoint
app.post('/api/auth/verify-2fa', (req, res) => {
    let { to, otp } = req.body;
    if (!to || !otp) return res.status(400).json({ success: false, error: 'Missing to or otp' });

    // Format phone number to E.164 (+90)
    to = to.replace(/[\s\(\)-]/g, '');
    if (to.startsWith('05')) to = '+90' + to.substring(1);
    else if (to.startsWith('5')) to = '+90' + to;

    const record = otpStore.get(to);
    if (!record) return res.status(400).json({ success: false, error: 'No OTP requested for this number' });

    if (Date.now() > record.expires) {
        otpStore.delete(to);
        return res.status(400).json({ success: false, error: 'OTP expired' });
    }

    if (record.otp === otp) {
        otpStore.delete(to);
        return res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } else {
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }
});

// 3. Notify Parent Endpoint (Turnstile/QR Entry)
app.post('/api/system/notify-parent', async (req, res) => {
    const { parentPhone, studentName, status } = req.body;
    // status can be 'entry' or 'exit'
    if (!parentPhone || !studentName) return res.status(400).json({ success: false, error: 'Missing fields' });

    const timeString = new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });
    const actionText = status === 'entry' ? 'kuruma giriş' : 'kurumdan çıkış';
    const message = `Sayın Velimiz, öğrenciniz ${studentName} saat ${timeString}'de ${actionText} yapmıştır. - IAL Sistem`;

    if (parentPhone.startsWith('+9050000')) {
        console.log(`[TEST/DUMMY NUMBER BYPASS] Parent notified via WhatsApp for ${studentName} (${status}) at ${parentPhone}`);
        return res.status(200).json({ success: true, message: 'Parent notified (Dummy Bypass)' });
    }

    try {
        await client.messages.create({ 
            body: message, 
            from: 'whatsapp:+14155238886', 
            to: `whatsapp:${parentPhone}` 
        });
        console.log(`Parent notified via WhatsApp for ${studentName} (${status}) at ${parentPhone}`);
        return res.status(200).json({ success: true, message: 'Parent notified' });
    } catch (error) {
        console.error('Failed to notify parent:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`=========================================`);
    console.log(`🚀 IALMobil SMS Backend is running on port ${port}`);
    console.log(`📞 Twilio Number: ${twilioPhoneNumber}`);
    console.log(`=========================================`);
});

module.exports = app;
