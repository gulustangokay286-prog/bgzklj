const admin = require('firebase-admin');
const crypto = require('crypto');

const ENCRYPTION_KEY = Buffer.from('BoGaziCi_Koleji_AES_256_Key_2026', 'utf8');
const ALGORITHM = 'aes-256-cbc';

function decryptToken(base64String) {
    try {
        const data = Buffer.from(base64String, 'base64');
        const iv = data.slice(0, 16);
        const encryptedText = data.slice(16);
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    } catch (e) {
        return null;
    }
}

const verifyAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
    }

    let idToken = authHeader.split('Bearer ')[1];
    
    // Attempt to decrypt the token (Phase 10 Envelope)
    const decrypted = decryptToken(idToken);
    if (decrypted) {
        idToken = decrypted; // Use the inner Firebase JWT
    }
    // If decryption fails, it might be an unencrypted legacy token from an older app version. We still attempt to verify it.

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Auth verification failed:', error);
        return res.status(403).json({ success: false, error: 'Forbidden: Invalid token' });
    }
};

const verifyAdmin = async (req, res, next) => {
    // First run verifyAuth to get req.user
    verifyAuth(req, res, async () => {
        // Enforce Authorization purely via JWT Custom Claims (Zero-Trust Architecture)
        // Never query the database to determine roles, as compromised DB rules could lead to privilege escalation.
        
        if (req.user.admin === true || req.user.superadmin === true || req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'patron') {
            return next();
        }

        console.warn(`[SECURITY] Unauthorized Admin attempt by UID: ${req.user.uid}`);
        return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges (Custom Claims required)' });
    });
};

module.exports = { verifyAuth, verifyAdmin };
