// ============================================================
//  middleware/device-auth.js — HMAC device authentication
// ============================================================
// FIX: This middleware previously imported firebase-admin and queried
// Firestore, but server.js never initializes Firebase Admin — causing
// a crash on every ESP32 request. Rewritten to use MySQL via db.js,
// consistent with the rest of the backend.
const crypto = require('crypto');
const db     = require('../db');
const logger = require('../logger');

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
    if (!Number.isFinite(unixTime)) {
        return res.status(401).json({ success: false, message: 'Invalid device timestamp.' });
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - unixTime) > 120) {
        return res.status(401).json({ success: false, message: 'Stale device request.' });
    }

    try {
        // Look up the sensor node in MySQL
        const [nodes] = await db.query(
            'SELECT id FROM sensor_nodes WHERE node_code = ? AND is_active = 1 LIMIT 1',
            [String(nodeCode).trim()]
        );

        if (!nodes.length) {
            return res.status(401).json({ success: false, message: 'Unknown device.' });
        }

        const nodeId = nodes[0].id;

        // Look up the active device key in MySQL
        const [keys] = await db.query(
            'SELECT secret_key FROM device_key_store WHERE node_id = ? AND key_id = ? AND is_active = 1 LIMIT 1',
            [nodeId, String(keyId).trim()]
        );

        if (!keys.length) {
            return res.status(401).json({ success: false, message: 'Unknown device key.' });
        }

        const secretKey  = keys[0].secret_key;
        const body       = req.rawBody || JSON.stringify(req.body || {});
        const canonical  = `${timestamp}.${body}`;
        const expectedSig = crypto
            .createHmac('sha256', secretKey)
            .update(canonical)
            .digest('hex');

        if (!safeEqual(expectedSig, String(signature).toLowerCase())) {
            return res.status(401).json({ success: false, message: 'Invalid device signature.' });
        }

        req.deviceAuth = {
            nodeCode: String(nodeCode).trim(),
            keyId:    String(keyId).trim(),
        };

        return next();
    } catch (err) {
        logger.error({ err }, '[device-auth] Validation error');
        return res.status(500).json({ success: false, message: 'Device auth validation failed.' });
    }
}

module.exports = { verifyNodeHmac };
