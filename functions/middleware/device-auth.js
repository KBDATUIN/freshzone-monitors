// ============================================================
//  middleware/device-auth.js — HMAC device authentication
// ============================================================
const crypto = require('crypto');
const admin  = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function safeEqual(a, b) {
    const aBuf = Buffer.from(String(a || ''), 'utf8');
    const bBuf = Buffer.from(String(b || ''), 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
}

async function verifyNodeHmac(req, res, next) {
    const nodeCode  = req.headers['x-node-code'];
    const keyId     = req.headers['x-key-id'];
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];

    if (!nodeCode || !keyId || !signature || !timestamp) {
        if (process.env.ALLOW_LEGACY_ESP32_KEY === 'true') return next();
        return res.status(401).json({ success: false, message: 'Missing device auth headers.' });
    }

    const unixTime = Number(timestamp);
    if (!Number.isFinite(unixTime))
        return res.status(401).json({ success: false, message: 'Invalid device timestamp.' });

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - unixTime) > 120)
        return res.status(401).json({ success: false, message: 'Stale device request.' });

    try {
        // Find the node by node_code
        const nodeSnap = await db.collection('sensor_nodes')
            .where('node_code', '==', String(nodeCode).trim())
            .limit(1).get();

        if (nodeSnap.empty)
            return res.status(401).json({ success: false, message: 'Unknown device key.' });

        const nodeId = nodeSnap.docs[0].id;

        // Find the key in device_key_store
        const keySnap = await db.collection('device_key_store')
            .where('node_id', '==', nodeId)
            .where('key_id', '==', String(keyId).trim())
            .where('is_active', '==', true)
            .limit(1).get();

        if (keySnap.empty)
            return res.status(401).json({ success: false, message: 'Unknown device key.' });

        const secretKey = keySnap.docs[0].data().secret_key;
        const body      = req.rawBody || JSON.stringify(req.body || {});
        const canonical = `${timestamp}.${body}`;
        const expectedSig = crypto
            .createHmac('sha256', secretKey)
            .update(canonical)
            .digest('hex');

        if (!safeEqual(expectedSig, String(signature).toLowerCase()))
            return res.status(401).json({ success: false, message: 'Invalid device signature.' });

        req.deviceAuth = {
            nodeCode: String(nodeCode).trim(),
            keyId:    String(keyId).trim(),
        };

        return next();
    } catch (err) {
        console.error('[device-auth] Error:', err.message);
        return res.status(500).json({ success: false, message: 'Device auth validation failed.' });
    }
}

module.exports = { verifyNodeHmac };