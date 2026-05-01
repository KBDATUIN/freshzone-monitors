// ============================================================
//  middleware/csrf.js — Double-submit cookie CSRF protection
// ============================================================
const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'fz_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

function getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: false, // Must be readable by JS so it can be sent as a header
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/',
    };
}

// Sets the CSRF cookie if not already present. Applied globally.
function ensureCsrfCookie(req, res, next) {
    let token = req.cookies?.[CSRF_COOKIE_NAME];
    if (!token) {
        token = generateCsrfToken();
        res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions());
    }
    req.csrfToken = token;
    next();
}

// FIX: Actually enforces CSRF validation.
// Previously the middleware let requests through when the header was missing.
// Now: GET/HEAD/OPTIONS are exempt; all mutating requests MUST include the
// x-csrf-token header matching the cookie. Device requests authenticated
// via x-signature (HMAC) are exempt since they can't carry cookies.
function csrfProtection(req, res, next) {
    const method = req.method.toUpperCase();

    // Safe methods — no state change, no validation needed
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return next();
    }

    // Device requests authenticated by HMAC signature bypass CSRF
    if (req.headers['x-signature']) {
        return next();
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME];

    // No cookie means the client has never loaded a page — reject
    if (!cookieToken) {
        return res.status(403).json({ success: false, message: 'CSRF token missing. Please refresh the page.' });
    }

    // Missing header on a mutating request — reject
    if (!headerToken) {
        return res.status(403).json({ success: false, message: 'CSRF token required.' });
    }

    // Both present — validate they match using constant-time comparison
    const cookieBuf = Buffer.from(cookieToken, 'utf8');
    const headerBuf = Buffer.from(headerToken, 'utf8');
    if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
        return res.status(403).json({ success: false, message: 'CSRF token validation failed.' });
    }

    req.csrfToken = cookieToken;
    return next();
}

function csrfTokenHandler(req, res) {
    return res.json({ success: true, csrfToken: req.csrfToken });
}

module.exports = {
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    ensureCsrfCookie,
    csrfProtection,
    csrfTokenHandler,
};
