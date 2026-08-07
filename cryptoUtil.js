const crypto = require('crypto');

const ENCRYPTION_KEY = Buffer.from('BoGaziCi_Koleji_AES_256_Key_2026', 'utf8');
const ALGORITHM = 'aes-256-cbc';

function decryptPayload(base64String) {
    try {
        const data = Buffer.from(base64String, 'base64');
        const iv = data.slice(0, 16);
        const encryptedText = data.slice(16);
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return JSON.parse(decrypted.toString('utf8'));
    } catch (e) {
        console.error('Payload decryption failed:', e);
        return null;
    }
}

function encryptPayload(data) {
    try {
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return Buffer.concat([iv, encrypted]).toString('base64');
    } catch (e) {
        console.error('Payload encryption failed:', e);
        return null;
    }
}

module.exports = { decryptPayload, encryptPayload };
