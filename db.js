// ============================================================
//  db.js — MySQL connection pool
// ============================================================
const mysql = require('mysql2/promise');

// NOTE: Do NOT call dotenv here — Railway injects env vars directly.
// On local, dotenv is loaded once in server.js before this runs.

const pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               parseInt(process.env.DB_PORT) || 3306,
    database:           process.env.DB_NAME     || 'freshzone_db',
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASS     || '',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    timezone:           '+00:00',
    // ADDED SSL CONFIGURATION BELOW
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false }
});

// Test connection on startup
async function connectWithRetry(retries = 5, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            const conn = await pool.getConnection();
            conn.release();
            console.log('✅ MySQL connected successfully with SSL');
            console.log(`🔗 Connected to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
            return;
        } catch (err) {
            console.error(`❌ DB connect attempt ${i+1}/${retries} failed: ${err.message}`);
            if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)));
        }
    }
    throw new Error('Could not connect to MySQL after retries');
}
connectWithRetry().catch(err => { console.error('❌ MySQL connection failed:', err.message); });

pool.on('error', (err) => { console.error('MySQL pool error:', err.message); });

module.exports = pool;