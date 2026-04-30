const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const admin    = require('firebase-admin');
const { sendOTPEmail } = require('../mailer');

const db = admin.firestore();

const otpAttempts = new Map();
const JWT_COOKIE_NAME = 'fz_token';

function getJwtCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/',
    };
}

function sanitizeStr(val, maxLen = 100) {
    if (typeof val !== 'string') return '';
    return val.trim().slice(0, maxLen);
}

function isValidEmail(email) {
    return /^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$/.test(email);
}

function isGmailAddress(email) {
    return /^[^\s@]{1,64}@(?:gmail\.com|googlemail\.com)$/i.test(email);
}

function isLikelyFakeGmail(email) {
    return /^[^\s@]{1,64}@(gmail|googlemail)\.[a-z]{2,}$/i.test(email)
        && !isGmailAddress(email);
}

function isAllowedEmailDomain(email) {
    const d = (email.split('@')[1] || '').toLowerCase();
    return /^(gmail\.com|googlemail\.com)$/.test(d)
        || /\.edu\.ph$/.test(d)
        || /\.edu$/.test(d)
        || /\.ac\.ph$/.test(d)
        || /\.ac\.[a-z]{2,}$/.test(d)
        || /\.sch\.[a-z]{2,}$/.test(d)
        || /\.k12\.[a-z]{2,}$/.test(d);
}

function isValidPassword(pw) {
    return typeof pw === 'string' && pw.length >= 8 && pw.length <= 128
        && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

function isRealNamePart(value) {
    return /^[A-Za-zÀ-ÖØ-öø-ÿ''-]{2,}$/.test(value);
}

function isValidPhone(phone) {
    if (!phone) return true;
    return /^[0-9+\-\s()]{7,20}$/.test(phone);
}

function looksLikePhone(val) {
    return val.length >= 7 && /^[0-9+\-\s()]+$/.test(val);
}

function generateCode() {
    const buf = require('crypto').randomBytes(3);
    return (parseInt(buf.toString('hex'), 16) % 900000 + 100000).toString();
}

async function getFailedAttempts(identifier) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const snap = await db.collection('login_attempts')
        .where('email', '==', identifier)
        .where('success', '==', false)
        .where('attempted_at', '>', cutoff)
        .get();
    return snap.size;
}

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
    const identifier = sanitizeStr(req.body.email, 255);
    const password   = typeof req.body.password === 'string' ? req.body.password.slice(0, 128) : '';

    if (!identifier || !password)
        return res.status(400).json({ success: false, message: 'Email/phone and password are required.' });

    const isEmail = isValidEmail(identifier);
    const isPhone = looksLikePhone(identifier) && !isEmail;

    if (!isEmail && !isPhone)
        return res.status(400).json({ success: false, message: 'Enter a valid email address or phone number.' });

    try {
        const fails = await getFailedAttempts(identifier);
        if (fails >= 5)
            return res.status(429).json({ success: false, message: 'Too many failed attempts. Try again in 15 minutes.' });

        let userDoc = null;
        const emailSnap = await db.collection('accounts')
            .where('email', '==', identifier)
            .where('is_active', '==', true)
            .limit(1).get();

        if (!emailSnap.empty) {
            userDoc = { id: emailSnap.docs[0].id, ...emailSnap.docs[0].data() };
        } else {
            const phoneSnap = await db.collection('accounts')
                .where('contact_number', '==', identifier)
                .where('is_active', '==', true)
                .limit(1).get();
            if (!phoneSnap.empty)
                userDoc = { id: phoneSnap.docs[0].id, ...phoneSnap.docs[0].data() };
        }

        const valid = userDoc && await bcrypt.compare(password, userDoc.password_hash);

        await db.collection('login_attempts').add({
            email: userDoc ? userDoc.email : identifier,
            ip_address: req.ip,
            success: valid ? true : false,
            attempted_at: admin.firestore.FieldValue.serverTimestamp()
        });

        if (!valid)
            return res.status(401).json({ success: false, message: 'Invalid email/phone or password.' });

        if (!userDoc.is_active)
            return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });

        await db.collection('accounts').doc(userDoc.id).update({
            last_login: admin.firestore.FieldValue.serverTimestamp()
        });

        if (!process.env.JWT_SECRET)
            return res.status(500).json({ success: false, message: 'Authentication configuration error.' });

        const token = jwt.sign(
            { id: userDoc.id, email: userDoc.email, position: userDoc.position, name: userDoc.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        const { password_hash, ...safeUser } = userDoc;
        res.cookie(JWT_COOKIE_NAME, token, getJwtCookieOptions());
        return res.json({ success: true, user: safeUser });

    } catch (err) {
        console.error('[login] Error', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── POST /api/auth/send-otp ───────────────────────────────────
router.post('/send-otp', async (req, res) => {
    const email      = sanitizeStr(req.body.email, 255);
    const type       = sanitizeStr(req.body.type, 20);
    const firstName  = sanitizeStr(req.body.firstName, 50);
    const lastName   = sanitizeStr(req.body.lastName, 50);
    const employeeId = sanitizeStr(req.body.employeeId, 30);
    const contact    = sanitizeStr(req.body.contact, 20);
    const contactNorm = contact.replace(/[\s\-]/g, '');
    const position   = sanitizeStr(req.body.position, 50);
    const password   = typeof req.body.password === 'string' ? req.body.password.slice(0, 128) : '';

    if (contact && !/^(\+63|0)9\d{9}$/.test(contactNorm))
        return res.status(400).json({ success: false, message: 'Invalid contact number. Use format 09XXXXXXXXX or +639XXXXXXXXX.' });

    if (!email || !type)
        return res.status(400).json({ success: false, message: 'Email and type are required.' });

    if (!isValidEmail(email))
        return res.status(400).json({ success: false, message: 'Invalid email format.' });

    if (!['signup', 'reset'].includes(type))
        return res.status(400).json({ success: false, message: 'Invalid OTP type.' });

    if (type === 'signup') {
        if (!firstName || firstName.length < 2)
            return res.status(400).json({ success: false, message: 'First name must be at least 2 letters.' });
        if (!isRealNamePart(firstName))
            return res.status(400).json({ success: false, message: 'Enter a real first name without digits or usernames.' });
        if (!lastName || lastName.length < 2)
            return res.status(400).json({ success: false, message: 'Last name must be at least 2 letters.' });
        if (!isRealNamePart(lastName))
            return res.status(400).json({ success: false, message: 'Enter a real last name without digits or usernames.' });
        if (!employeeId || employeeId.length < 5)
            return res.status(400).json({ success: false, message: 'Invalid employee ID.' });
        if (contact && !isValidPhone(contact))
            return res.status(400).json({ success: false, message: 'Invalid contact number format.' });
        if (!['Administrator', 'Staff / Teachers'].includes(position))
            return res.status(400).json({ success: false, message: 'Invalid position.' });
        if (!isValidPassword(password))
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with at least one letter and one number.' });
        if (isLikelyFakeGmail(email))
            return res.status(400).json({ success: false, message: 'Please enter a real Gmail address ending in @gmail.com.' });
        if (!isAllowedEmailDomain(email))
            return res.status(400).json({ success: false, message: 'Only Gmail or school/institutional emails are allowed.' });

        const emailSnap = await db.collection('accounts')
            .where('email', '==', email)
            .where('is_active', '==', true)
            .limit(1).get();
        const empSnap = await db.collection('accounts')
            .where('employee_id', '==', employeeId)
            .where('is_active', '==', true)
            .limit(1).get();
        if (!emailSnap.empty || !empSnap.empty)
            return res.status(409).json({ success: false, message: 'An account with this email or employee ID already exists.' });
    }

    if (type === 'reset') {
        const snap = await db.collection('accounts')
            .where('email', '==', email)
            .where('is_active', '==', true)
            .limit(1).get();
        if (snap.empty)
            return res.status(404).json({ success: false, message: 'No active account found with this email.' });
    }

    const now = Date.now();
    const key = `otp_send_${email}`;
    const attempts = otpAttempts.get(key) || [];
    const recent = attempts.filter(t => now - t < 10 * 60 * 1000);
    if (recent.length >= 3)
        return res.status(429).json({ success: false, message: 'Too many OTP requests. Please wait 10 minutes.' });
    otpAttempts.set(key, [...recent, now]);

    try {
        const otp     = generateCode();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        const signupUserData = type === 'signup' ? { firstName, lastName, employeeId, contact, position, password } : null;
        const displayName = type === 'signup' ? `${firstName} ${lastName}`.trim() : 'User';

        // Delete old OTPs for this email+type
        const oldSnap = await db.collection('auth_otp_store')
            .where('email', '==', email)
            .where('otp_type', '==', type)
            .get();
        const batch = db.batch();
        oldSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();

        await db.collection('auth_otp_store').add({
            email,
            otp_code: otp,
            otp_type: type,
            expires_at: expires,
            attempts: 0,
            payload_json: signupUserData ? JSON.stringify(signupUserData) : null,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        try {
            await sendOTPEmail(email, displayName, otp, type);
        } catch (mailErr) {
            console.error('[send-otp] Email failed', mailErr);
            return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again later.' });
        }

        res.json({ success: true, message: `OTP sent to ${email}` });

    } catch (err) {
        console.error('[send-otp] Error', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────
router.post('/verify-otp', async (req, res) => {
    const email       = sanitizeStr(req.body.email, 255);
    const otp         = sanitizeStr(req.body.otp, 10);
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword.slice(0, 128) : '';

    if (!email || !otp)
        return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    if (!isValidEmail(email))
        return res.status(400).json({ success: false, message: 'Invalid email.' });
    if (!/^\d{6}$/.test(otp))
        return res.status(400).json({ success: false, message: 'OTP must be a 6-digit number.' });

    try {
        const snap = await db.collection('auth_otp_store')
            .where('email', '==', email)
            .orderBy('created_at', 'desc')
            .limit(1).get();

        if (snap.empty)
            return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });

        const docRef = snap.docs[0].ref;
        const stored = { id: snap.docs[0].id, ...snap.docs[0].data() };

        if (Date.now() > new Date(stored.expires_at).getTime()) {
            await docRef.delete();
            return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
        }

        if ((stored.attempts || 0) >= 5) {
            await docRef.delete();
            return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
        }

        if (stored.otp_code !== otp) {
            const newAttempts = (stored.attempts || 0) + 1;
            await docRef.update({ attempts: newAttempts });
            const remaining = 5 - newAttempts;
            if (remaining <= 0) {
                await docRef.delete();
                return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
            }
            return res.status(400).json({ success: false, message: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
        }

        await docRef.delete();

        // ── SIGNUP ──────────────────────────────────────────────
        if (stored.otp_type === 'signup') {
            let parsedPayload;
            try {
                parsedPayload = stored.payload_json
                    ? (typeof stored.payload_json === 'string' ? JSON.parse(stored.payload_json) : stored.payload_json)
                    : null;
            } catch {
                parsedPayload = null;
            }

            if (!parsedPayload)
                return res.status(400).json({ success: false, message: 'Registration data missing. Please start over.' });

            const { firstName, lastName, employeeId, contact, position, password } = parsedPayload;

            if (!firstName || !lastName || !employeeId || !position || !password)
                return res.status(400).json({ success: false, message: 'Registration data incomplete. Please start over.' });

            const dupEmail = await db.collection('accounts').where('email', '==', email).limit(1).get();
            const dupEmp   = await db.collection('accounts').where('employee_id', '==', employeeId).limit(1).get();
            if (!dupEmail.empty || !dupEmp.empty)
                return res.status(409).json({ success: false, message: 'An account with this email or employee ID already exists.' });

            const hash     = await bcrypt.hash(password, 12);
            const fullName = `${firstName} ${lastName}`.trim();

            await db.collection('accounts').add({
                employee_id:     employeeId,
                full_name:       fullName,
                email,
                contact_number:  contact || null,
                position,
                password_hash:   hash,
                is_active:       true,
                date_joined:     admin.firestore.FieldValue.serverTimestamp(),
                updated_at:      admin.firestore.FieldValue.serverTimestamp()
            });

            return res.json({ success: true, message: 'Account created successfully! You can now log in.' });
        }

        // ── PASSWORD RESET ───────────────────────────────────────
        if (stored.otp_type === 'reset') {
            if (!newPassword)
                return res.status(400).json({ success: false, message: 'New password is required.' });
            if (!isValidPassword(newPassword))
                return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with at least one letter and one number.' });

            const hash = await bcrypt.hash(newPassword, 12);
            const snap2 = await db.collection('accounts').where('email', '==', email).limit(1).get();
            if (!snap2.empty) {
                await snap2.docs[0].ref.update({
                    password_hash: hash,
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            return res.json({ success: true, message: 'Password updated successfully! You can now log in.' });
        }

        return res.status(400).json({ success: false, message: 'Unknown OTP type.' });

    } catch (err) {
        console.error('[verify-otp] Error', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ── GET /api/auth/session ─────────────────────────────────────
router.get('/session', async (req, res) => {
    const token = req.cookies?.[JWT_COOKIE_NAME] ||
        (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);
    if (!token) return res.status(200).json({ loggedIn: false });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const snap = await db.collection('accounts')
            .where('__name__', '==', decoded.id)
            .limit(1).get();

        // Try by doc ID directly
        const docRef = await db.collection('accounts').doc(decoded.id).get();
        if (!docRef.exists || !docRef.data().is_active)
            return res.status(200).json({ loggedIn: false, reason: 'invalid_token' });

        const user = { id: docRef.id, ...docRef.data() };
        const { password_hash, ...safeUser } = user;
        return res.status(200).json({ loggedIn: true, success: true, user: safeUser });
    } catch (err) {
        return res.status(200).json({ loggedIn: false, reason: 'invalid_token' });
    }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const clearOpts = { path: '/', sameSite: isProduction ? 'none' : 'lax', secure: isProduction };
    res.clearCookie(JWT_COOKIE_NAME, clearOpts);
    return res.json({ success: true, message: 'Logged out.' });
});

module.exports = router;