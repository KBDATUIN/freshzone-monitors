// ============================================================
//  api/profile.js — View & update user profile, change password
// ============================================================
const express = require('express');
const bcrypt  = require('bcryptjs');
const router  = express.Router();
const admin   = require('firebase-admin');
const { authMiddleware } = require('../middleware/auth');

const db = admin.firestore();

function sanitizeStr(val, maxLen = 100) {
    if (typeof val !== 'string') return '';
    return val.trim().slice(0, maxLen);
}

function isValidPhone(phone) {
    if (!phone) return true;
    return /^[0-9+\-\s()]{7,20}$/.test(phone);
}

function isValidPassword(pw) {
    return typeof pw === 'string' && pw.length >= 8 && pw.length <= 128
        && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

async function deleteCollection(col, field, value) {
    const snap = await db.collection(col).where(field, '==', value).get();
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
}

// ── GET /api/profile ──────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        const docRef = await db.collection('accounts').doc(req.user.id).get();
        if (!docRef.exists || !docRef.data().is_active)
            return res.status(404).json({ success: false, message: 'User not found.' });

        const { password_hash, ...user } = docRef.data();
        res.json({ success: true, user: { id: docRef.id, ...user } });
    } catch (err) {
        console.error('[profile GET] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── PUT /api/profile ──────────────────────────────────────────
router.put('/', authMiddleware, async (req, res) => {
    const full_name         = sanitizeStr(req.body.full_name, 100);
    const contact_number    = sanitizeStr(req.body.contact_number, 20);
    const emergency_contact = sanitizeStr(req.body.emergency_contact, 100);
    const photo_url         = typeof req.body.photo_url === 'string'
        ? req.body.photo_url.slice(0, 500000) : null;

    if (!full_name || full_name.length < 2)
        return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters.' });

    if (contact_number && !isValidPhone(contact_number))
        return res.status(400).json({ success: false, message: 'Invalid contact number format.' });

    try {
        await db.collection('accounts').doc(req.user.id).update({
            full_name,
            contact_number:    contact_number || null,
            emergency_contact: emergency_contact || null,
            photo_url:         photo_url || null,
            updated_at:        admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (err) {
        console.error('[profile PUT] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── POST /api/profile/change-password ────────────────────────
router.post('/change-password', authMiddleware, async (req, res) => {
    const current_password = typeof req.body.current_password === 'string' ? req.body.current_password.slice(0, 128) : '';
    const new_password     = typeof req.body.new_password === 'string' ? req.body.new_password.slice(0, 128) : '';

    if (!current_password || !new_password)
        return res.status(400).json({ success: false, message: 'Both fields are required.' });

    if (!isValidPassword(new_password))
        return res.status(400).json({ success: false, message: 'New password must be at least 8 characters with at least one letter and one number.' });

    if (current_password === new_password)
        return res.status(400).json({ success: false, message: 'New password must be different from current password.' });

    try {
        const docRef = await db.collection('accounts').doc(req.user.id).get();
        if (!docRef.exists || !docRef.data().is_active)
            return res.status(404).json({ success: false, message: 'Account not found.' });

        const valid = await bcrypt.compare(current_password, docRef.data().password_hash);
        if (!valid)
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

        const hash = await bcrypt.hash(new_password, 12);
        await db.collection('accounts').doc(req.user.id).update({
            password_hash: hash,
            updated_at:    admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        console.error('[change-password] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── DELETE /api/profile ───────────────────────────────────────
router.delete('/', authMiddleware, async (req, res) => {
    try {
        const docRef = await db.collection('accounts').doc(req.user.id).get();
        if (!docRef.exists)
            return res.status(404).json({ success: false, message: 'Account not found.' });

        const userId = req.user.id;
        const email  = docRef.data().email;

        await deleteCollection('push_subscriptions',  'account_id', userId);
        await deleteCollection('device_login_alerts', 'account_id', userId);
        await deleteCollection('known_devices',        'account_id', userId);
        await deleteCollection('push_notifications',  'recipient_email', email);
        await deleteCollection('login_attempts',       'email', email);
        await deleteCollection('system_logs',          'account_id', userId);
        await deleteCollection('contact_tickets',      'account_id', userId);
        await deleteCollection('auth_otp_store',       'email', email);

        // Anonymise detection events
        const eventSnap = await db.collection('detection_events')
            .where('acknowledged_by', '==', userId).get();
        const batch = db.batch();
        eventSnap.docs.forEach(doc => batch.update(doc.ref, { acknowledged_by: null }));
        await batch.commit();

        await db.collection('accounts').doc(userId).delete();

        res.json({ success: true, message: 'Account permanently deleted.' });
    } catch (err) {
        console.error('[profile DELETE] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── POST /api/profile/hard-delete ────────────────────────────
router.post('/hard-delete', authMiddleware, async (req, res) => {
    const confirmation = typeof req.body.confirmation === 'string' ? req.body.confirmation : '';

    if (confirmation !== 'DELETE MY DATA PERMANENTLY')
        return res.status(400).json({
            success: false,
            message: 'Please provide confirmation: "DELETE MY DATA PERMANENTLY"'
        });

    try {
        const docRef = await db.collection('accounts').doc(req.user.id).get();
        if (!docRef.exists)
            return res.status(404).json({ success: false, message: 'Account not found.' });

        const userId = req.user.id;
        const email  = docRef.data().email;
        let deletedCount = 0;

        const collections = [
            { col: 'push_subscriptions',  field: 'account_id',      value: userId },
            { col: 'device_login_alerts', field: 'account_id',      value: userId },
            { col: 'known_devices',        field: 'account_id',      value: userId },
            { col: 'push_notifications',  field: 'recipient_email', value: email  },
            { col: 'login_attempts',       field: 'email',           value: email  },
            { col: 'system_logs',          field: 'account_id',      value: userId },
            { col: 'contact_tickets',      field: 'account_id',      value: userId },
        ];

        for (const { col, field, value } of collections) {
            const snap = await db.collection(col).where(field, '==', value).get();
            const b = db.batch();
            snap.docs.forEach(doc => b.delete(doc.ref));
            await b.commit();
            deletedCount += snap.size;
        }

        // Anonymise detection events
        const eventSnap = await db.collection('detection_events')
            .where('acknowledged_by', '==', userId).get();
        const eventBatch = db.batch();
        eventSnap.docs.forEach(doc => eventBatch.update(doc.ref, { acknowledged_by: null }));
        await eventBatch.commit();

        // Delete account
        await db.collection('accounts').doc(userId).delete();
        deletedCount++;

        // Audit log
        await db.collection('data_retention_audit').add({
            table_name:               'accounts',
            records_deleted:          deletedCount,
            retention_days_applied:   0,
            cutoff_date:              admin.firestore.FieldValue.serverTimestamp(),
            status:                   'completed',
            executed_by:              'gdpr_api',
            error_message:            `User data erased for: ${email}`,
            created_at:               admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: `All personal data permanently erased. ${deletedCount} records deleted.` });
    } catch (err) {
        console.error('[hard-delete] Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error during data erasure.' });
    }
});

module.exports = router;