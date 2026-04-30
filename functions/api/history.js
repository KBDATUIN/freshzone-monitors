// ============================================================
//  api/history.js — Detection history log
// ============================================================
const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const db = admin.firestore();

// ── GET /api/history ──────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    const search    = req.query.search ? String(req.query.search).slice(0, 100).toLowerCase() : '';
    const status    = req.query.status ? String(req.query.status).slice(0, 30) : '';
    const date      = req.query.date   ? String(req.query.date).slice(0, 10) : '';
    const safeLimit = Math.min(Math.max(parseInt(req.query.limit) || 200, 1), 500);

    try {
        let query = db.collection('detection_events')
            .orderBy('detected_at', 'desc')
            .limit(safeLimit);

        if (status) query = query.where('event_status', '==', status);

        const snap = await query.get();
        let events = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Get acknowledged_by names
        const userCache = {};
        for (const e of events) {
            if (e.acknowledged_by && !userCache[e.acknowledged_by]) {
                try {
                    const userDoc = await db.collection('accounts').doc(e.acknowledged_by).get();
                    userCache[e.acknowledged_by] = userDoc.exists ? userDoc.data().full_name : null;
                } catch (_) {
                    userCache[e.acknowledged_by] = null;
                }
            }
        }

        // Filter by date (Manila UTC+8)
        if (date) {
            events = events.filter(e => {
                if (!e.detected_at) return false;
                const d = e.detected_at.toDate ? e.detected_at.toDate() : new Date(e.detected_at);
                // Convert to Manila date string
                const manilaDate = new Date(d.getTime() + 8 * 60 * 60 * 1000)
                    .toISOString().slice(0, 10);
                return manilaDate === date;
            });
        }

        // Filter by search
        if (search) {
            events = events.filter(e => {
                const loc  = (e.location_name || '').toLowerCase();
                const stat = (e.event_status || '').toLowerCase();
                const name = (userCache[e.acknowledged_by] || '').toLowerCase();
                return loc.includes(search) || stat.includes(search) || name.includes(search);
            });
        }

        const toISO = (v) => {
            if (!v) return null;
            if (v.toDate) return v.toDate().toISOString();
            return new Date(v).toISOString();
        };

        const formatted = events.map(r => {
            const detectedAt     = toISO(r.detected_at);
            const acknowledgedAt = toISO(r.acknowledged_at);
            const resolvedAt     = toISO(r.resolved_at);

            // Response/resolution times in seconds
            const response_seconds = acknowledgedAt && detectedAt
                ? Math.round((new Date(acknowledgedAt) - new Date(detectedAt)) / 1000) : null;
            const resolution_seconds = resolvedAt && detectedAt
                ? Math.round((new Date(resolvedAt) - new Date(detectedAt)) / 1000) : null;

            let response = '—';
            if (r.notes) {
                response = r.notes;
            } else if (r.event_status === 'Cleared') {
                response = 'Resolved';
            } else if (r.event_status === 'Acknowledged') {
                response = 'Acknowledged — awaiting resolution';
            } else {
                response = 'Pending';
            }

            return {
                id:                 r.id,
                location:           r.location_name || '—',
                status:             r.event_status,
                pm2_5:              r.pm2_5_value,
                aqi:                r.aqi_value,
                aqi_category:       r.aqi_category,
                notes:              r.notes,
                response,
                handled_by:         userCache[r.acknowledged_by] || '—',
                detected_at:        detectedAt,
                acknowledged_at:    acknowledgedAt,
                resolved_at:        resolvedAt,
                response_seconds,
                resolution_seconds,
                datetime:           detectedAt,
            };
        });

        res.json({ success: true, data: formatted });

    } catch (err) {
        console.error('[history] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── GET /api/history/stats ────────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const allSnap = await db.collection('detection_events').get();
        const all = allSnap.docs.map(d => d.data());

        // Manila "today" date string
        const now = new Date();
        const manilaToday = new Date(now.getTime() + 8 * 60 * 60 * 1000)
            .toISOString().slice(0, 10);

        const total    = all.length;
        const resolved = all.filter(e => e.event_status === 'Cleared').length;
        const today    = all.filter(e => {
            if (!e.detected_at) return false;
            const d = e.detected_at.toDate ? e.detected_at.toDate() : new Date(e.detected_at);
            const manilaDate = new Date(d.getTime() + 8 * 60 * 60 * 1000)
                .toISOString().slice(0, 10);
            return manilaDate === manilaToday;
        }).length;

        res.json({ success: true, stats: { today, total, resolved } });
    } catch (err) {
        console.error('[history/stats] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── DELETE /api/history/clear-all (Admin only) ────────────────
router.delete('/clear-all', authMiddleware, adminOnly, async (req, res) => {
    try {
        const collections = [
            'push_notifications',
            'detection_events',
            'sensor_readings',
            'system_logs',
            'login_attempts'
        ];

        for (const col of collections) {
            const snap = await db.collection(col).get();
            const batch = db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        res.json({ success: true, message: 'All history cleared successfully.' });
    } catch (err) {
        console.error('[clear-all] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

module.exports = router;