// ============================================================
//   server.js — FreshZone Node.js + Express Backend
// ============================================================
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const cron         = require('node-cron');
const rateLimit    = require('express-rate-limit');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const pinoHttp     = require('pino-http');
const Sentry       = require('@sentry/node');
const db           = require('./db');
const { sendAlertEmail } = require('./mailer');
const logger       = require('./logger');
const { ensureCsrfCookie } = require('./middleware/csrf');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── SENTRY ────────────────────────────────────────────────────
const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
    Sentry.init({
        dsn: sentryDsn,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
        environment: process.env.NODE_ENV || 'development',
    });
}

// Trust Render's proxy for correct IP and HTTPS detection
app.set('trust proxy', 1);

// ── HTTPS REDIRECT ────────────────────────────────────────────
app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
});

// ── RATE LIMITING ─────────────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const p = req.path;
        return p === '/api/health' || !p.startsWith('/api/');
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const p = req.path;
        return p === '/csrf-token' || p === '/session' || p === '/logout';
    },
});

const pushLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many subscription requests.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const esp32Limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many readings.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', generalLimiter);

// ── CORS ──────────────────────────────────────────────────────
// FIX: Removed wildcard *.onrender.com allowance in production.
// Only the explicitly listed origins are permitted.
app.use(cors({
    origin: function (origin, callback) {
        const allowed = [
            process.env.FRONTEND_URL,
            'https://freshzone.space',
            'https://www.freshzone.space',
            process.env.RENDER_BACKEND_URL, // your own Render URL, set in env
            'http://localhost:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'http://127.0.0.1:3000',
        ].filter(Boolean);

        if (!origin || allowed.includes(origin)) {
            return callback(null, true);
        }

        // In development only, allow all
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        callback(new Error('Origin not allowed by CORS policy.'));
    },
    credentials: true,
}));

app.use(pinoHttp({ logger }));
app.use((req, res, next) => { const id = require('crypto').randomBytes(8).toString('hex'); req.requestId = id; res.setHeader('X-Request-ID', id); next(); });
app.use(cookieParser());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://*.googleapis.com", "https://fonts.googleapis.com", "https://api.fontshare.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://ui-avatars.com"],
            connectSrc: ["'self'", "https://freshzone.space", "https://www.freshzone.space", "https://*.googleapis.com", "https://api.fontshare.com", "https://cdn.fontshare.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://*.gstatic.com", "https://*.googleapis.com", "https://fonts.googleapis.com", "https://api.fontshare.com", "https://cdn.fontshare.com", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
            reportUri: ['/api/csp-report'],
        },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((req, res, next) => { res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()'); next(); });
app.use(cookieParser());
app.use(express.json({
    limit: '2mb',
    verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); },
}));
app.use(express.urlencoded({ extended: true }));
app.use(ensureCsrfCookie);

// CSP Violation Reporting Endpoint
app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
    logger.warn({ body: req.body }, '[CSP Violation]');
    res.status(204).end();
});

// ── STATIC FILES ──────────────────────────────────────────────
// Cache static assets for 7 days; HTML pages always re-validated
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    },
}));

// ── API ROUTES ────────────────────────────────────────────────
app.use('/api/auth',     authLimiter,  require('./api/auth'));
app.use('/api/readings', esp32Limiter, require('./api/readings'));
app.use('/api/history',               require('./api/history'));
app.use('/api/profile',               require('./api/profile'));
app.use('/api/contact',               require('./api/contact'));
app.use('/api/push',     pushLimiter,  require('./api/push'));

// ── DASHBOARD STATS ───────────────────────────────────────────
app.get('/api/stats/dashboard', async (req, res) => {
    try {
        const [nodes]  = await db.query('SELECT COUNT(*) as count FROM sensor_nodes');
        const [events] = await db.query("SELECT COUNT(*) as count FROM detection_events WHERE event_status IN ('Detected','Acknowledged')");
        const [recent] = await db.query(
            `SELECT de.id, de.location_name, de.event_status, de.detected_at, sn.node_code
             FROM detection_events de JOIN sensor_nodes sn ON sn.id=de.node_id
             WHERE de.event_status IN ('Detected','Acknowledged')
             ORDER BY de.detected_at DESC LIMIT 5`
        );
        res.json({ success: true, totalNodes: nodes[0].count, activeAlerts: events[0].count, recentEvents: recent });
    } catch (err) {
        logger.error({ err }, 'Stats error');
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// ── HEALTH CHECK ──────────────────────────────────────────────
// FIX: Actually pings the database so UptimeRobot reflects real health.
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', db: 'ok', time: new Date().toISOString() });
    } catch (err) {
        logger.error({ err }, 'Health check DB ping failed');
        res.status(503).json({ status: 'degraded', db: 'error', time: new Date().toISOString() });
    }
});

// ── FALLBACK ──────────────────────────────────────────────────
app.get('*', (req, res) => {
    const ext = path.extname(req.path);
    if (ext === '.html') {
        const file = path.join(__dirname, 'public', req.path);
        res.sendFile(file, err => {
            if (err) res.status(404).json({ success: false, message: 'Page not found.' });
        });
    } else if (ext === '') {
        res.sendFile(path.join(__dirname, 'public', 'auth.html'));
    } else {
        res.status(404).json({ success: false, message: 'Not found.' });
    }
});

// ── SCHEDULED JOBS ────────────────────────────────────────────

// Send pending push notification emails (every 5 min)
cron.schedule('*/5 * * * *', async () => {
    try {
        const [pending] = await db.query(
            `SELECT pn.*, de.location_name, de.pm2_5_value, de.aqi_category, sr.pm1_0 AS pm1_for_email
             FROM push_notifications pn
             LEFT JOIN detection_events de ON de.id = pn.event_id
             LEFT JOIN sensor_readings sr ON sr.id = de.reading_id
             WHERE pn.send_status = 'pending' LIMIT 10`
        );
        for (const notif of pending) {
            try {
                await sendAlertEmail(notif.recipient_email, notif.recipient_name, notif.location_name, notif.pm1_for_email, notif.aqi_category);
                await db.query("UPDATE push_notifications SET send_status='sent', sent_at=NOW() WHERE id=?", [notif.id]);
            } catch (err) {
                await db.query('UPDATE push_notifications SET error_message=? WHERE id=?', [err.message, notif.id]);
            }
        }
    } catch (err) {
        logger.error({ err }, 'Pending notifications cron failed');
    }
});

// FIX: Merged the two overlapping escalation crons into one job.
// Previously: a */5 cron escalated to all admins AND a * * * * * cron
// escalated to ADMIN_EMAIL — causing duplicate emails every minute.
// Now: one */5 cron handles both, deduplicated.
cron.schedule('*/5 * * * *', async () => {
    try {
        const [unacked] = await db.query(
            `SELECT de.*, sn.location_name, sn.last_seen, sr.pm1_0 AS pm1_for_email
             FROM detection_events de
             JOIN sensor_nodes sn ON sn.id = de.node_id
             LEFT JOIN sensor_readings sr ON sr.id = de.reading_id
             WHERE de.event_status = 'Detected'
               AND de.detected_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
               AND (de.last_escalated_at IS NULL OR de.last_escalated_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE))
               AND sn.last_seen >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)`
        );
        for (const event of unacked) {
            try {
                // Notify all active admins from DB
                const [admins] = await db.query(
                    "SELECT full_name, email FROM accounts WHERE position = 'Administrator' AND is_active = 1"
                );

                // Also include ADMIN_EMAIL env var if set and not already in the list
                const adminEmails = new Set(admins.map(a => a.email));
                const extraEmail = process.env.ADMIN_EMAIL;
                if (extraEmail && !adminEmails.has(extraEmail)) {
                    admins.push({ email: extraEmail, full_name: 'Administrator' });
                }

                for (const admin of admins) {
                    await sendAlertEmail(admin.email, admin.full_name, event.location_name, event.pm1_for_email, event.aqi_category);
                }
                await db.query('UPDATE detection_events SET last_escalated_at=NOW() WHERE id=?', [event.id]);
                logger.warn({ eventId: event.id }, '[escalation] Re-notified admins');
            } catch (e) {
                logger.error({ err: e }, '[escalation] Error');
            }
        }
    } catch (err) {
        logger.error({ err }, 'Escalation cron failed');
    }
});

// Clean up old login attempts (hourly)
cron.schedule('0 * * * *', async () => {
    try {
        await db.query("DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    } catch (err) {
        logger.error({ err }, 'Login attempt cleanup failed');
    }
});

// Data retention cleanup (daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
    try {
        logger.info('[Data Retention] Starting scheduled cleanup...');
        await db.query('CALL sp_run_all_retention_cleanups()');
        logger.info('[Data Retention] Cleanup completed successfully');
    } catch (err) {
        logger.error({ err }, '[Data Retention] Cleanup failed');
    }
});

// ── SECURITY TABLES INIT ──────────────────────────────────────
async function ensureSecurityTables() {
    await db.query(
        `CREATE TABLE IF NOT EXISTS auth_otp_store (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp_code VARCHAR(10) NOT NULL,
            otp_type ENUM('signup', 'reset') NOT NULL,
            expires_at DATETIME NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            payload_json JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_auth_otp_email_type (email, otp_type),
            INDEX idx_auth_otp_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    await db.query(
        `CREATE TABLE IF NOT EXISTS device_key_store (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            node_id BIGINT NOT NULL,
            key_id VARCHAR(64) NOT NULL,
            secret_key VARCHAR(255) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_node_key (node_id, key_id),
            INDEX idx_device_key_store_node_id (node_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // Clean up expired OTPs on startup
    await db.query("DELETE FROM auth_otp_store WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY)");
}

if (sentryDsn) {
    Sentry.setupExpressErrorHandler(app);
}

// Global error handler
app.use((err, req, res, next) => {
    logger.error({ err }, 'Unhandled server error');
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── START ─────────────────────────────────────────────────────
// ── START ─────────────────────────────────────────────────────
ensureSecurityTables()
    .then(() => {
        const server = app.listen(PORT, () => {
            logger.info(`Server running on http://localhost:${PORT}`);
            logger.info(`Allowed Frontend: ${process.env.FRONTEND_URL || 'not set'}`);
        });

        function gracefulShutdown(signal) {
            logger.info(`[${signal}] Shutting down gracefully...`);
            server.close(async () => {
                try { await pool.end(); } catch (e) {}
                logger.info('All connections closed. Exiting.');
                process.exit(0);
            });
            setTimeout(() => { logger.error('Forced shutdown after 10s'); process.exit(1); }, 10000);
        }
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
    })
    .catch((err) => {
        logger.error({ err }, 'Failed to initialize security tables');
        process.exit(1);
    });
