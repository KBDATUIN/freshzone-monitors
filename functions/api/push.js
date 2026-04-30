// ============================================================
//  api/push.js — Web Push Notification endpoints
// ============================================================
const express  = require('express');
const router   = express.Router();
const webpush  = require('web-push');
const admin    = require('firebase-admin');
const { authMiddleware } = require('../middleware/auth');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:freshzone.alerts@gmail.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
    console.log('[push] Web push notifications configured');
} else {
    console.log('[push] VAPID keys not set, push notifications disabled');
}

// ── GET /api/push/vapid-public-key ───────────────────────────
router.get('/vapid-public-key', (req, res) => {
    if (!VAPID_PUBLIC_KEY)
        return res.status(503).json({ success: false, message: 'Push service not configured.' });
    res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ── POST /api/push/subscribe ─────────────────────────────────
router.post('/subscribe', authMiddleware, async (req, res) => {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint)
        return res.status(400).json({ success: false, message: 'Invalid subscription.' });

    try { new URL(subscription.endpoint); } catch {
        return res.status(400).json({ success: false, message: 'Invalid subscription endpoint.' });
    }

    try {
        const subStr = JSON.stringify(subscription);

        const existing = await db.collection('push_subscriptions')
            .where('account_id', '==', req.user.id)
            .where('endpoint', '==', subscription.endpoint)
            .limit(1).get();

        if (!existing.empty) {
            await existing.docs[0].ref.update({
                subscription_data: subStr,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await db.collection('push_subscriptions').add({
                account_id:        req.user.id,
                endpoint:          subscription.endpoint,
                subscription_data: subStr,
                created_at:        admin.firestore.FieldValue.serverTimestamp(),
                updated_at:        admin.firestore.FieldValue.serverTimestamp()
            });
        }

        res.json({ success: true, message: 'Subscribed to push notifications.' });
    } catch (err) {
        console.error('[push] Subscribe error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── DELETE /api/push/unsubscribe ─────────────────────────────
router.delete('/unsubscribe', authMiddleware, async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint)
        return res.status(400).json({ success: false, message: 'Endpoint required.' });

    try {
        const snap = await db.collection('push_subscriptions')
            .where('account_id', '==', req.user.id)
            .where('endpoint', '==', endpoint)
            .get();
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        res.json({ success: true, message: 'Unsubscribed.' });
    } catch (err) {
        console.error('[push] Unsubscribe error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── Helper: Send push to all subscribers ─────────────────────
async function sendPushToAll(title, body, url = '/dashboard.html') {
    try {
        const snap = await db.collection('push_subscriptions').get();
        if (snap.empty) return;

        const payload    = JSON.stringify({ title, body, url });
        const expiredIds = [];

        await Promise.allSettled(
            snap.docs.map(async (doc) => {
                try {
                    const sub = JSON.parse(doc.data().subscription_data);
                    await webpush.sendNotification(sub, payload, {
                        urgency: 'high',
                        TTL: 60,
                    });
                } catch (err) {
                    if (err.statusCode === 410 || err.statusCode === 404)
                        expiredIds.push(doc.ref);
                }
            })
        );

        if (expiredIds.length) {
            const batch = db.batch();
            expiredIds.forEach(ref => batch.delete(ref));
            await batch.commit();
            console.log(`[push] Removed ${expiredIds.length} expired subscriptions`);
        }

        console.log(`[push] Sent to ${snap.size - expiredIds.length} active subscribers`);
    } catch (err) {
        console.error('[push] Send error:', err.message);
    }
}

// ── POST /api/push/test ───────────────────────────────────────
router.post('/test', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ESP32_API_KEY)
        return res.status(401).json({ success: false, message: 'Invalid API key.' });

    try {
        const snap = await db.collection('push_subscriptions').get();
        if (snap.empty)
            return res.json({ success: false, message: 'No subscribers found. Enable notifications on the dashboard first.' });

        await sendPushToAll(
            'TEST — Vape/Smoke Detected!',
            'This is a test alert from FreshZone. System is working correctly.',
            '/dashboard.html'
        );

        res.json({ success: true, message: `Test push sent to ${snap.size} subscriber(s).` });
    } catch (err) {
        console.error('[push/test] Error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
module.exports.sendPushToAll = sendPushToAll;
