// ============================================================
//  api/contact.js — Submit & manage support tickets
// ============================================================
const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');
const { authMiddleware, adminOnly } = require('../middleware/auth');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ── POST /api/contact ─────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    const subject = typeof req.body.subject === 'string' ? req.body.subject.trim().slice(0, 200) : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim().slice(0, 2000) : '';
    const name    = (req.body.name || req.user.full_name || req.user.name || '').toString().slice(0, 100);
    const email   = (req.body.email || req.user.email || '').toString().slice(0, 255);

    const validSubjects = ['Vape Alert Feedback', 'Device Maintenance', 'General Suggestion', 'Bug Report', 'Other'];
    if (!subject || !validSubjects.includes(subject))
        return res.status(400).json({ success: false, message: 'Please select a valid subject.' });

    if (!message)
        return res.status(400).json({ success: false, message: 'Message is required.' });

    if (message.length < 10)
        return res.status(400).json({ success: false, message: 'Message is too short (min 10 characters).' });

    const ticketRef = 'TK-' + Date.now().toString().slice(-6);

    try {
        await db.collection('contact_tickets').add({
            ticket_ref:      ticketRef,
            account_id:      req.user.id,
            submitter_name:  name,
            submitter_email: email,
            subject,
            message:         message.trim(),
            ticket_status:   'Open',
            resolved_by:     null,
            resolved_at:     null,
            created_at:      admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: `Report submitted! Ticket ID: ${ticketRef}`,
            ticket_ref: ticketRef
        });
    } catch (err) {
        console.error('[contact POST] Error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── GET /api/contact ──────────────────────────────────────────
router.get('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const snap = await db.collection('contact_tickets')
            .orderBy('created_at', 'desc').get();

        // Get resolved_by names
        const userCache = {};
        const tickets = await Promise.all(snap.docs.map(async (doc) => {
            const data = { id: doc.id, ...doc.data() };
            if (data.resolved_by && !userCache[data.resolved_by]) {
                try {
                    const userDoc = await db.collection('accounts').doc(data.resolved_by).get();
                    userCache[data.resolved_by] = userDoc.exists ? userDoc.data().full_name : null;
                } catch (_) {
                    userCache[data.resolved_by] = null;
                }
            }
            return {
                ...data,
                resolved_by_name: userCache[data.resolved_by] || null,
                created_at: data.created_at ? data.created_at.toDate().toISOString() : null,
                resolved_at: data.resolved_at ? data.resolved_at.toDate().toISOString() : null,
            };
        }));

        res.json({ success: true, data: tickets });
    } catch (err) {
        console.error('[contact GET] Error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── POST /api/contact/:id/resolve ────────────────────────────
router.post('/:id/resolve', authMiddleware, adminOnly, async (req, res) => {
    try {
        const docRef = db.collection('contact_tickets').doc(req.params.id);
        const doc    = await docRef.get();

        if (!doc.exists)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });

        await docRef.update({
            ticket_status: 'Resolved',
            resolved_by:   req.user.id,
            resolved_at:   admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Ticket marked as resolved.' });
    } catch (err) {
        console.error('[contact resolve] Error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── DELETE /api/contact/:id ───────────────────────────────────
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const docRef = db.collection('contact_tickets').doc(req.params.id);
        const doc    = await docRef.get();

        if (!doc.exists)
            return res.status(404).json({ success: false, message: 'Ticket not found.' });

        await docRef.delete();
        res.json({ success: true, message: 'Ticket deleted successfully.' });
    } catch (err) {
        console.error('[contact DELETE] Error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
