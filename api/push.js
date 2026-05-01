// ============================================================
//  api/push.js — Web Push Notification endpoints
// ============================================================
const express  = require('express');
const router   = express.Router();
const webpush  = require('web-push');
const db       = require('../db');
const logger   = require('../logger');
const { authMiddleware } = require('../middleware/auth');

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:freshzone.alerts@gmail.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
    logger.info('[push] Web push notifications configured');
} else {
    logger.warn('[push] VAPID keys not set, push notifications disabled');
}

// ── GET /api/push/vapid-public-key ───────────────────────────
router.get('/vapid-public-key', (req, res) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(503).json({ success: false, message: 'Push service not configured.' });
    }
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ── POST /api/push/subscribe ──────────────────────────────────
router.post('/subscribe', authMiddleware, async (req, res) => {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ success: false, message: 'Invalid subscription.' });
    }

    try { new URL(subscription.endpoint); } catch {
        return res.status(400).json({ success: false, message: 'Invalid subscription endpoint.' });
    }

    try {
        const subStr = JSON.stringify(subscription);
        const [existing] = await db.query(
            'SELECT id FROM push_subscriptions WHERE account_id = ? AND endpoint = ?',
            [req.user.id, subscription.endpoint]
        );

        if (existing.length) {
            await db.query(
                'UPDATE push_subscriptions SET subscription_data=?, updated_at=NOW() WHERE account_id=? AND endpoint=?',
                [subStr, req.user.id, subscription.endpoint]
            );
        } else {
            await db.query(
                'INSERT INTO push_subscriptions (account_id, endpoint, subscription_data) VALUES (?, ?, ?)',
                [req.user.id, subscription.endpoint, subStr]
            );
        }

        res.json({ success: true, message: 'Subscribed to push notifications.' });
    } catch (err) {
        logger.error({ err }, '[push] Subscribe error');
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── DELETE /api/push/unsubscribe ──────────────────────────────
router.delete('/unsubscribe', authMiddleware, async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ success: false, message: 'Endpoint required.' });

    try {
        await db.query(
            'DELETE FROM push_subscriptions WHERE account_id = ? AND endpoint = ?',
            [req.user.id, endpoint]
        );
        res.json({ success: true, message: 'Unsubscribed.' });
    } catch (err) {
        logger.error({ err }, '[push] Unsubscribe error');
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── Helper: Send push to all subscribers ─────────────────────
async function sendPushToAll(title, body, url = '/dashboard.html') {
    try {
        const [subs] = await db.query('SELECT id, endpoint, subscription_data FROM push_subscriptions');
        if (!subs.length) return;

        const payload    = JSON.stringify({ title, body, url });
        const expiredIds = [];

        await Promise.allSettled(
            subs.map(async (row) => {
                try {
                    const sub = JSON.parse(row.subscription_data);
                    await webpush.sendNotification(sub, payload, { urgency: 'high', TTL: 60 });
                } catch (err) {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        expiredIds.push(row.id);
                    }
                }
            })
        );

        if (expiredIds.length) {
            await db.query(
                `DELETE FROM push_subscriptions WHERE id IN (${expiredIds.map(() => '?').join(',')})`,
                expiredIds
            );
            logger.info({ count: expiredIds.length }, '[push] Removed expired subscriptions');
        }

        logger.info({ sent: subs.length - expiredIds.length }, '[push] Push notifications sent');
    } catch (err) {
        logger.error({ err }, '[push] Send error');
    }
}

// ── POST /api/push/test ───────────────────────────────────────
router.post('/test', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ESP32_API_KEY) {
        return res.status(401).json({ success: false, message: 'Invalid API key.' });
    }

    try {
        const [subs] = await db.query('SELECT COUNT(*) as count FROM push_subscriptions');
        const count  = subs[0].count;

        if (count === 0) {
            return res.json({ success: false, message: 'No subscribers found. Enable notifications on the dashboard first.' });
        }

        await sendPushToAll(
            '🚨 TEST — Vape/Smoke Detected!',
            'This is a test alert from FreshZone. System is working correctly.',
            '/dashboard.html'
        );

        res.json({ success: true, message: `Test push sent to ${count} subscriber(s).` });
    } catch (err) {
        logger.error({ err }, '[push/test] Error');
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
module.exports.sendPushToAll = sendPushToAll;
