const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// WhatsApp Client'ını Persistent (Kalıcı) Oturum ile Başlat
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'ial-otp-bot', // Oturumu .wwebjs_auth klasöründe saklar
    }),
    puppeteer: {
        headless: true,
        protocolTimeout: 300000,
        timeout: 60000,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

let isReady = false;

client.on('qr', async (qr) => {
    // QR kodu terminalde göster
    console.log('\n======================================================');
    console.log('📱 WHATSAPP BUSINESS ILE ASAGIDAKI QR KODU OKUTUN:');
    console.log('======================================================\n');
    qrcode.generate(qr, { small: true });

    // Pairing Code removed due to timeout crashes
});

client.on('ready', () => {
    isReady = true;
    console.log('✅ WhatsApp Web Botu Basariyla Baglandi ve Hazir!');
});

client.on('authenticated', () => {
    console.log('🔐 WhatsApp Oturumu Dogrulandi.');
});

client.on('auth_failure', msg => {
    console.error('❌ WhatsApp Kimlik Dogrulama Hatasi:', msg);
    isReady = false;
});

client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp Baglantisi Koptu, Yeniden Baglaniliyor... Sebep:', reason);
    isReady = false;
    // Bağlantı koparsa otomatik tekrar başlat
    setTimeout(() => {
        client.initialize();
    }, 5000);
});

// Botu Başlat
const initializeWhatsAppBot = () => {
    console.log('🚀 WhatsApp Botu Baslatiliyor...');
    client.initialize();
};

/**
 * Belirtilen numaraya WhatsApp mesajı atar.
 * @param {string} phone Numarayı uluslararası formatta bekler (Örn: +905xx, +1509xx)
 * @param {string} message Gönderilecek mesaj metni
 */
const sendWhatsAppMessage = async (phone, message) => {
    if (!isReady) {
        throw new Error('WhatsApp Botu henüz hazır değil! QR kodu okutun veya bağlantıyı bekleyin.');
    }

    try {
        // Numarayı WhatsApp'ın istediği formata (numara@c.us) çevir
        let cleanPhone = phone.replace(/[\s\(\)-+]/g, '');
        
        // Başındaki sıfır(lar)ı atalım (Örn: 0530... -> 530...)
        cleanPhone = cleanPhone.replace(/^0+/, '');
        
        // Eğer 10 haneliyse (Türkiye varsayılanı) başına 90 ekle
        if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
            cleanPhone = '90' + cleanPhone;
        }

        const chatId = `${cleanPhone}@c.us`;
        
        // Mesajı gönder (Hata alırsak 1 kere tekrar dene)
        try {
            const response = await client.sendMessage(chatId, message);
            console.log(`✅ Mesaj başarıyla gönderildi: ${phone}`);
            return { success: true, messageId: response.id.id };
        } catch (firstErr) {
            console.warn(`⚠️ İlk gönderim hatası (${phone}), tekrar deneniyor:`, firstErr.message);
            // 2 saniye bekle ve tekrar dene (Detached frame hatasını aşmak için)
            await new Promise(resolve => setTimeout(resolve, 2000));
            const response = await client.sendMessage(chatId, message);
            console.log(`✅ Mesaj başarıyla gönderildi (Tekrar deneme ile): ${phone}`);
            return { success: true, messageId: response.id.id };
        }
    } catch (error) {
        console.error(`❌ Mesaj gönderilemedi (${phone}):`, error.message);
        throw error;
    }
};

module.exports = {
    initializeWhatsAppBot,
    sendWhatsAppMessage
};
