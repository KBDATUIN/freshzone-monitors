// ============================================================
//  api/readings.js — Sensor data from ESP32 + live dashboard
// ============================================================
const express  = require('express');
const router   = express.Router();
const admin    = require('firebase-admin');
const { authMiddleware } = require('../middleware/auth');
const { sendAlertEmail } = require('../mailer');
const { sendPushToAll }  = require('./push');
const { verifyNodeHmac } = require('../middleware/device-auth');

const db = admin.firestore();

// ── SSE client registry ──────────────────────────────────────
const sseClients = new Map();
let sseClientId = 0;

function broadcastSSE(data) {
    const payload = 'data: ' + JSON.stringify(data) + '\n\n';
    for (const [, res] of sseClients) {
        try { res.write(payload); } catch (_) {}
    }
}

// ── AQI Calculator ───────────────────────────────────────────
function calculateAQI(pm25) {
    const breakpoints = [
        { cLow: 0.0,   cHigh: 12.0,  iLow: 0,   iHigh: 50,  category: 'Good' },
        { cLow: 12.1,  cHigh: 35.4,  iLow: 51,  iHigh: 100, category: 'Moderate' },
        { cLow: 35.5,  cHigh: 55.4,  iLow: 101, iHigh: 150, category: 'Unhealthy for Sensitive Groups' },
        { cLow: 55.5,  cHigh: 150.4, iLow: 151, iHigh: 200, category: 'Unhealthy' },
        { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300, category: 'Very Unhealthy' },
        { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: 'Hazardous' },
    ];
    const bp = breakpoints.find(b => pm25 >= b.cLow && pm25 <= b.cHigh)
             || breakpoints[breakpoints.length - 1];
    const aqi = Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow
    );
    return { aqi, category: bp.category };
}

function isValidReading(val, min, max) {
    return typeof val === 'number' && !isNaN(val) && val >= min && val <= max;
}

// ── POST /api/readings — ESP32 pushes sensor data ─────────────
router.post('/', verifyNodeHmac, async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const isLegacyAllowed = process.env.ALLOW_LEGACY_ESP32_KEY === 'true';
    if (isLegacyAllowed && (!apiKey || apiKey !== process.env.ESP32_API_KEY) && !req.deviceAuth) {
        return res.status(401).json({ success: false, message: 'Invalid API key.' });
    }
    if (!isLegacyAllowed && !req.deviceAuth) {
        return res.status(401).json({ success: false, message: 'Missing per-device authentication.' });
    }

    const node_code = req.body.node_code;
    const pm1_0  = req.body.pm1_0  !== undefined ? Number(req.body.pm1_0)  : undefined;
    const pm2_5  = Number(req.body.pm2_5);
    const pm10   = req.body.pm10   !== undefined ? Number(req.body.pm10)   : undefined;

    if (!node_code || typeof node_code !== 'string' || node_code.trim().length === 0 || node_code.length > 50)
        return res.status(400).json({ success: false, message: 'Invalid node_code.' });
    if (!isValidReading(pm2_5, 0, 1000))
        return res.status(400).json({ success: false, message: 'pm2_5 must be 0–1000.' });
    if (pm1_0 !== undefined && !isValidReading(pm1_0, 0, 1000))
        return res.status(400).json({ success: false, message: 'pm1_0 must be 0–1000.' });
    if (pm10 !== undefined && !isValidReading(pm10, 0, 1000))
        return res.status(400).json({ success: false, message: 'pm10 must be 0–1000.' });

    try {
        // --- Look up node ---
        const nodeSnap = await db.collection('sensor_nodes')
            .where('node_code', '==', node_code.trim())
            .where('is_active', '==', true)
            .limit(1).get();

        if (nodeSnap.empty)
            return res.status(404).json({ success: false, message: 'Sensor node not found.' });

        const nodeRef  = nodeSnap.docs[0].ref;
        const node     = { id: nodeSnap.docs[0].id, ...nodeSnap.docs[0].data() };
        const { aqi, category } = calculateAQI(pm2_5);
        const smokeDetected = pm1_0 > 12;
        const ledColor = smokeDetected ? 'red' : 'green';

        // --- Save reading ---
        const readingRef = await db.collection('sensor_readings').add({
            node_id:       node.id,
            pm1_0:         pm1_0 ?? null,
            pm2_5,
            pm10:          pm10 ?? null,
            aqi_value:     aqi,
            aqi_category:  category,
            smoke_detected: smokeDetected,
            led_color:     ledColor,
            recorded_at:   admin.firestore.FieldValue.serverTimestamp()
        });

        await nodeRef.update({ last_seen: admin.firestore.FieldValue.serverTimestamp() });

        if (smokeDetected) {
            // Check for open events (Detected or Acknowledged)
            const openSnap = await db.collection('detection_events')
                .where('node_id', '==', node.id)
                .where('event_status', 'in', ['Detected', 'Acknowledged'])
                .limit(1).get();

            if (openSnap.empty) {
                // Check last Cleared event
                const clearedSnap = await db.collection('detection_events')
                    .where('node_id', '==', node.id)
                    .where('event_status', '==', 'Cleared')
                    .orderBy('resolved_at', 'desc')
                    .limit(1).get();

                let shouldCreateEvent = true;

                if (!clearedSnap.empty) {
                    const resolvedAt = clearedSnap.docs[0].data().resolved_at.toDate();
                    // Check for a clean reading after the last resolved event
                    const cleanSnap = await db.collection('sensor_readings')
                        .where('node_id', '==', node.id)
                        .where('smoke_detected', '==', false)
                        .where('recorded_at', '>', resolvedAt)
                        .limit(1).get();
                    shouldCreateEvent = !cleanSnap.empty;
                }

                if (shouldCreateEvent) {
                    const eventRef = await db.collection('detection_events').add({
                        node_id:       node.id,
                        reading_id:    readingRef.id,
                        location_name: node.location_name,
                        pm2_5_value:   pm2_5,
                        aqi_value:     aqi,
                        aqi_category:  category,
                        event_status:  'Detected',
                        detected_at:   admin.firestore.FieldValue.serverTimestamp(),
                        acknowledged_at: null,
                        resolved_at:   null,
                        acknowledged_by: null,
                        notes:         null
                    });

                    // Notify all admins
                    const adminSnap = await db.collection('accounts')
                        .where('position', '==', 'Administrator')
                        .where('is_active', '==', true)
                        .get();

                    const pm1ForEmail = pm1_0 !== undefined && !Number.isNaN(Number(pm1_0)) ? Number(pm1_0) : null;

                    for (const adminDoc of adminSnap.docs) {
                        const adminData = adminDoc.data();
                        const notifRef = await db.collection('push_notifications').add({
                            event_id:        eventRef.id,
                            recipient_email: adminData.email,
                            recipient_name:  adminData.full_name,
                            subject:         `Vape/Smoke Detected — ${node.location_name}`,
                            send_status:     'pending',
                            created_at:      admin.firestore.FieldValue.serverTimestamp()
                        });

                        try {
                            await sendAlertEmail(adminData.email, adminData.full_name, node.location_name, pm1ForEmail, category);
                            await notifRef.update({ send_status: 'sent', sent_at: admin.firestore.FieldValue.serverTimestamp() });
                        } catch (mailErr) {
                            await notifRef.update({ send_status: 'failed', error_message: mailErr.message });
                        }
                    }

                    try {
                        const pm1Push = pm1ForEmail != null ? `${pm1ForEmail.toFixed(1)}` : '—';
                        await sendPushToAll(
                            `Alert: ${node.location_name}`,
                            `Vape/Smoke detected! PM1.0: ${pm1Push} (${category})`,
                            'dashboard.html'
                        );
                    } catch (pushErr) {
                        console.warn('[push] Web push failed:', pushErr.message);
                    }
                }
            } else {
                // Open event exists — update its latest values
                await openSnap.docs[0].ref.update({
                    pm2_5_value:  pm2_5,
                    aqi_value:    aqi,
                    aqi_category: category,
                    reading_id:   readingRef.id
                });
            }
        }

        res.json({
            success: true,
            node: node.location_name,
            aqi,
            category,
            smoke_detected: smokeDetected,
            led_color: ledColor
        });

        broadcastSSE({
            node_code:     node.node_code,
            location_name: node.location_name,
            pm1_0:         pm1_0 ?? null,
            pm2_5,
            pm10:          pm10 ?? null,
            aqi_value:     aqi,
            aqi_category:  category,
            smoke_detected: smokeDetected,
            led_color:     ledColor,
            recorded_at:   new Date().toISOString(),
            node_active:   1,
        });

    } catch (err) {
        console.error('[readings POST] Error', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── GET /api/readings/live ────────────────────────────────────
router.get('/live', authMiddleware, async (req, res) => {
    try {
        const nodesSnap = await db.collection('sensor_nodes')
            .where('is_active', '==', true).get();

        const results = await Promise.all(nodesSnap.docs.map(async (nodeDoc) => {
            const node = { id: nodeDoc.id, ...nodeDoc.data() };

            const readingSnap = await db.collection('sensor_readings')
                .where('node_id', '==', node.id)
                .orderBy('recorded_at', 'desc')
                .limit(1).get();

            const reading = readingSnap.empty ? {} : readingSnap.docs[0].data();
            const lastSeen = node.last_seen ? node.last_seen.toDate() : null;
            const node_active = lastSeen && (Date.now() - lastSeen.getTime() < 15000) ? 1 : 0;

            return {
                node_code:     node.node_code,
                location_name: node.location_name,
                last_seen:     lastSeen,
                node_active,
                pm1_0:         reading.pm1_0 ?? null,
                pm2_5:         reading.pm2_5 ?? null,
                pm10:          reading.pm10 ?? null,
                aqi_value:     reading.aqi_value ?? null,
                aqi_category:  reading.aqi_category ?? null,
                smoke_detected: reading.smoke_detected ?? null,
                led_color:     reading.led_color ?? null,
                recorded_at:   reading.recorded_at ? reading.recorded_at.toDate() : null
            };
        }));

        res.json({ success: true, data: results });
    } catch (err) {
        console.error('[readings GET /live] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── GET /api/readings/stream ──────────────────────────────────
router.get('/stream', authMiddleware, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = ++sseClientId;
    sseClients.set(clientId, res);
    res.write('event: connected\ndata: {"clientId":' + clientId + '}\n\n');

    req.on('close', () => {
        sseClients.delete(clientId);
    });
});

// ── GET /api/readings/open-events ────────────────────────────
router.get('/open-events', authMiddleware, async (req, res) => {
    try {
        const snap = await db.collection('detection_events')
            .where('event_status', 'in', ['Detected', 'Acknowledged'])
            .orderBy('detected_at', 'desc').get();

        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, data });
    } catch (err) {
        console.error('[readings GET /open-events] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── POST /api/readings/acknowledge/:eventId ───────────────────
router.post('/acknowledge/:eventId', authMiddleware, async (req, res) => {
    const eventId = req.params.eventId;
    const { notes } = req.body;

    if (!eventId)
        return res.status(400).json({ success: false, message: 'Invalid event ID.' });

    try {
        const eventRef  = db.collection('detection_events').doc(eventId);
        const eventDoc  = await eventRef.get();

        if (!eventDoc.exists)
            return res.status(404).json({ success: false, message: 'Event not found.' });

        if (eventDoc.data().event_status !== 'Detected')
            return res.json({ success: true, message: 'Already acknowledged or resolved.' });

        await eventRef.update({
            event_status:     'Acknowledged',
            acknowledged_at:  admin.firestore.FieldValue.serverTimestamp(),
            acknowledged_by:  req.user.id,
            notes:            notes || eventDoc.data().notes || null
        });

        await db.collection('system_logs').add({
            account_id:  req.user.id,
            action:      'Alert Acknowledged',
            description: `Event ${eventId} acknowledged by user ${req.user.id}`,
            ip_address:  req.ip,
            created_at:  admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Alert acknowledged.', event_id: eventId });
    } catch (err) {
        console.error('[acknowledge] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── POST /api/readings/resolve/:eventId ───────────────────────
router.post('/resolve/:eventId', authMiddleware, async (req, res) => {
    const eventId = req.params.eventId;
    const { notes } = req.body;

    if (!eventId)
        return res.status(400).json({ success: false, message: 'Invalid event ID.' });

    try {
        const eventRef = db.collection('detection_events').doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists)
            return res.status(404).json({ success: false, message: 'Event not found.' });

        const data = eventDoc.data();
        if (data.event_status === 'Cleared')
            return res.json({ success: true, message: 'Already resolved.' });

        await eventRef.update({
            event_status:     'Cleared',
            resolved_at:      admin.firestore.FieldValue.serverTimestamp(),
            acknowledged_at:  data.acknowledged_at || admin.firestore.FieldValue.serverTimestamp(),
            acknowledged_by:  data.acknowledged_by || req.user.id,
            notes:            notes || data.notes || null
        });

        await db.collection('system_logs').add({
            account_id:  req.user.id,
            action:      'Alert Resolved',
            description: `Event ${eventId} resolved by user ${req.user.id}`,
            ip_address:  req.ip,
            created_at:  admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Alert resolved.' });
    } catch (err) {
        console.error('[resolve] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;