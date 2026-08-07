const crypto = require('crypto');

const ENCRYPTION_KEY = Buffer.from('BoGaziCi_Koleji_AES_256_Key_2026', 'utf8'); // Must be 32 bytes
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Prepend IV to ciphertext and base64 encode
    return Buffer.concat([iv, encrypted]).toString('base64');
}

function decrypt(base64String) {
    try {
        const data = Buffer.from(base64String, 'base64');
        const iv = data.slice(0, 16);
        const encryptedText = data.slice(16);
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    } catch (e) {
        return null; // Decryption failed
    }
}

const original = "eyJhbGciOiJSUzI1NiJ9.test_token";
console.log("Original:", original);

const enc = encrypt(original);
console.log("Encrypted:", enc);

const dec = decrypt(enc);
console.log("Decrypted:", dec);
console.log("Success?", original === dec);
