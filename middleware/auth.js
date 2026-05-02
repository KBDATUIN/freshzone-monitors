// ============================================================
//  middleware/auth.js — JWT verification middleware
// ============================================================
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader  = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies?.fz_token;
    const token       = cookieToken || bearerToken;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    if (process.env.NODE_ENV === 'production' && !cookieToken && bearerToken) {
        return res.status(401).json({ success: false, message: 'Token must be sent via cookie in production.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'freshzone-api', audience: 'freshzone-client', algorithms: ['HS256'] });
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
}

function adminOnly(req, res, next) {
    if (req.user?.position !== 'Administrator') {
        return res.status(403).json({ success: false, message: 'Administrator access required.' });
    }
    next();
}

module.exports = { authMiddleware, adminOnly };
