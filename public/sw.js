// ============================================================
//  sw.js — FreshZone Service Worker v4
//  Handles: Push Notifications + Offline Caching + PWA + Background Sync
//  Caching Strategy:
//    - API routes (/api/*): Network-first with cache fallback
//    - Static assets: Stale-While-Revalidate (SWR)
//    - HTML pages: Network-first with offline page fallback
// ============================================================

const CACHE_NAME = 'freshzone-v8';
const OFFLINE_PAGE = '/offline.html';

// Static assets to pre-cache (core app shell)
// IMPORTANT: offline.html MUST be cached for offline to work!
const STATIC_ASSETS = [
    '/',
    '/auth.html',
    '/dashboard.html',
    '/history.html',
    '/profile.html',
    '/contact.html',
    '/about.html',
    OFFLINE_PAGE,  // Cache the offline page
    '/style.css',
    '/style-v2.css',
    '/style-v3.css',
    '/style-fixes.css',
    '/pwa.css',
    '/cookie-consent.js',
    '/utils.js',
    '/auth.js',
    '/role-guard.js',
    '/enhance.js',
    '/pwa.js',
    '/logo.png',
    '/logo1.png',
    '/vape.png',
    '/favicon.ico',
    '/manifest.json',
    '/favicon_io/android-chrome-192x192.png',
    '/favicon_io/android-chrome-512x512.png',
    '/favicon_io/apple-touch-icon.png',
    '/favicon_io/favicon-32x32.png',
    '/favicon_io/favicon-16x16.png',
];

// ============================================================
// ── INSTALL ──────────────────────────────────────────────────
// ============================================================
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        console.log('[SW] Pre-caching app shell');

        const results = await Promise.allSettled(
            STATIC_ASSETS.map(async (asset) => {
                const request = new Request(asset, { cache: 'reload' });
                const response = await fetch(request);

                if (!response.ok) {
                    throw new Error(`Failed to precache ${asset}: ${response.status}`);
                }

                await cache.put(asset, response.clone());
            })
        );

        const failedAssets = results
            .map((result, index) => ({ result, asset: STATIC_ASSETS[index] }))
            .filter(({ result }) => result.status === 'rejected')
            .map(({ asset }) => asset);

        if (failedAssets.length) {
            console.warn('[SW] Some assets failed to precache:', failedAssets);
        }

        let offlineCached = await cache.match(OFFLINE_PAGE);
        if (!offlineCached) {
            const offlineResponse = await fetch(new Request(OFFLINE_PAGE, { cache: 'reload' }));
            if (offlineResponse.ok) {
                await cache.put(OFFLINE_PAGE, offlineResponse.clone());
                offlineCached = offlineResponse;
            }
        }

        if (!offlineCached) {
            throw new Error('Offline page was not cached successfully.');
        }

        console.log('[SW] App shell cached');
        await self.skipWaiting();
    })().catch(err => {
        console.error('[SW] Pre-cache failed:', err);
        return self.skipWaiting();
    }));
});

// ============================================================
// ── ACTIVATE ─────────────────────────────────────────────────
// ============================================================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => {
                // Delete old caches
                return Promise.all(
                    keys.filter(k => k !== CACHE_NAME).map(k => {
                        console.log('[SW] Deleting old cache:', k);
                        return caches.delete(k);
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activated and claiming clients');
                return self.clients.claim();
            })
    );
});

// ============================================================
// ── FETCH STRATEGIES ─────────────────────────────────────────
// ============================================================

/**
 * Network-First Strategy (for API calls)
 * Try network first, fall back to cache if offline
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // If successful, cache the response
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        console.log('[SW] Network failed, trying cache for:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // No cache available - return offline response for navigation
        if (request.destination === 'document' || request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
        }
        
        // Return error response
        return new Response(JSON.stringify({ error: 'Offline', message: 'No connection to server' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Stale-While-Revalidate Strategy (for static assets)
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Start network request in background
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => {
        // Network failed, cached response will be used
        console.log('[SW] SWR: Network failed for:', request.url);
        return cachedResponse || new Response('Offline', { status: 503 });
    });
    
    // Return cached response immediately, or wait for network if no cache
    return cachedResponse || fetchPromise;
}

/**
 * Navigation Strategy (for HTML pages)
 * Network-first with offline page fallback
 */
async function handleNavigation(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache the page
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed for navigation, serving offline fallback for:', request.url);

        const requestPath = new URL(request.url).pathname;
        const cachedResponse = await caches.match(request);
        const offlineResponse = await caches.match(OFFLINE_PAGE)
            || await caches.match('/offline.html')
            || await caches.match('offline.html');

        if (requestPath === OFFLINE_PAGE && cachedResponse) {
            return cachedResponse;
        }

        if (offlineResponse) {
            console.log('[SW] Serving offline page');
            return offlineResponse;
        }

        if (cachedResponse) {
            console.log('[SW] Offline page missing, falling back to cached page:', request.url);
            return cachedResponse;
        }

        // Last resort: create a simple offline response
        console.log('[SW] No offline page cached either, creating fallback');
        return new Response(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>FreshZone — Offline</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: linear-gradient(135deg, #004e7a, #00b4d8);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        text-align: center;
                        color: white;
                        max-width: 400px;
                    }
                    h1 { font-size: 2rem; margin-bottom: 10px; }
                    p { opacity: 0.9; line-height: 1.6; }
                    button {
                        background: white;
                        color: #004e7a;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 10px;
                        font-size: 1rem;
                        font-weight: bold;
                        cursor: pointer;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>You're Offline</h1>
                    <p>Check your internet connection and try again.</p>
                    <button onclick="location.reload()">Retry Connection</button>
                </div>
            </body>
            </html>
        `, {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// ============================================================
// ── FETCH EVENT ──────────────────────────────────────────────
// ============================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Only handle GET requests (POST, PUT, DELETE go to network)
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip cross-origin requests (except fonts from Google)
    if (url.origin !== location.origin && !url.origin.includes('fonts.googleapis.com') && !url.origin.includes('fontshare.com')) {
        return;
    }

    // Skip fontshare CDN font files — let browser handle natively (avoids SW errors on CDN outages)
    if (url.origin.includes('cdn.fontshare.com')) {
        return;
    }
    
    // ── API ROUTES: Network-first ──
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // ── NAVIGATION: Network-first with offline fallback ──
    if (request.destination === 'document' || request.mode === 'navigate') {
        event.respondWith(handleNavigation(request));
        return;
    }
    
    // ── STATIC ASSETS (CSS, JS, Images): Stale-While-Revalidate ──
     // Bypass SW cache for AI chat scripts � always use fresh version
     if (request.destination === 'script' && (
         request.url.includes('/fz-config.js') ||
         request.url.includes('/fz-ai-chat.js'))) {
         event.respondWith(fetch(request));
         return;
     }

    if (['style', 'script', 'image', 'font'].includes(request.destination)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }
    
    // ── DEFAULT: Stale-While-Revalidate ──
    event.respondWith(staleWhileRevalidate(request));
});

// ============================================================
// ── PUSH NOTIFICATION ────────────────────────────────────────
// ============================================================
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try { data = event.data.json(); }
    catch { data = { title: '🚨 FreshZone Alert', body: event.data.text() }; }

    const options = {
        body:    data.body  || 'Vape/smoke detected on campus!',
        icon:    '/favicon_io/android-chrome-192x192.png',
        badge:   '/favicon_io/favicon-32x32.png',
        image:   '/vape.png',

        // Vibrate strongly — long-short-long-short-long pattern
        vibrate: [500, 200, 500, 200, 500, 200, 500],

        // Use unique tag per alert so each event shows separately
        tag:      'freshzone-alert-' + Date.now(),
        renotify: true,

        // CRITICAL: keeps notification on screen until user taps it
        requireInteraction: true,

        // CRITICAL: never silent — triggers sound + screen wake
        silent: false,

        // Priority hint (Android)
        priority: 'high',

        actions: [
            { action: 'view',    title: '👁 Open Dashboard' },
            { action: 'dismiss', title: '✕ Dismiss' }
        ],
        data: { url: data.url || '/dashboard.html', timestamp: Date.now() }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || '🚨 FreshZone Alert', options)
    );
});

// ============================================================
// ── NOTIFICATION CLICK ───────────────────────────────────────
// ============================================================
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/dashboard.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Focus existing window if open
                for (const client of clientList) {
                    if ('focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) return clients.openWindow(url);
            })
    );
});

// ============================================================
// ── BACKGROUND SYNC ──────────────────────────────────────────
// ============================================================
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-readings') {
        event.waitUntil(syncPendingReadings());
    }
});

/**
 * Sync pending readings from IndexedDB to server
 */
async function syncPendingReadings() {
    console.log('[SW] Starting background sync for pending readings');
    
    try {
        // Open IndexedDB
        const db = await openDB();
        const tx = db.transaction('pendingReadings', 'readwrite');
        const store = tx.objectStore('pendingReadings');
        
        // Get all pending readings
        const getAllRequest = store.getAll();
        await getAllRequest;
        const readings = getAllRequest.result || [];
        
        console.log(`[SW] Found ${readings.length} pending readings to sync`);
        
        if (readings.length === 0) {
            console.log('[SW] No pending readings to sync');
            return;
        }
        
        // Try to send each reading
        let successCount = 0;
        for (const reading of readings) {
            try {
                const response = await fetch('/api/readings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reading.data)
                });
                
                if (response.ok) {
                    // Remove from pending
                    store.delete(reading.id);
                    successCount++;
                    console.log(`[SW] Synced reading #${reading.id}`);
                } else {
                    console.warn(`[SW] Server rejected reading #${reading.id}:`, response.status);
                }
            } catch (err) {
                console.error(`[SW] Failed to sync reading #${reading.id}:`, err);
            }
        }
        
        console.log(`[SW] Background sync complete: ${successCount}/${readings.length} synced`);
        
        // Notify clients about sync completion
        const remainingCount = readings.length - successCount;
        clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_COMPLETE',
                    synced: successCount,
                    remaining: remainingCount
                });
            });
        });
        
    } catch (err) {
        console.error('[SW] Background sync error:', err);
    }
}

/**
 * Open IndexedDB for pending readings
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FreshZoneDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pendingReadings')) {
                db.createObjectStore('pendingReadings', { keyPath: 'id', autoIncrement: true });
                console.log('[SW] Created pendingReadings store');
            }
        };
    });
}

// ============================================================
// ── MESSAGE HANDLER ──────────────────────────────────────────
// ============================================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_READINGS') {
        // Client is requesting to cache a reading for later sync
        cacheReadingForSync(event.data.reading);
    }
});

/**
 * Cache a reading in IndexedDB for later sync
 */
async function cacheReadingForSync(readingData) {
    try {
        const db = await openDB();
        const tx = db.transaction('pendingReadings', 'readwrite');
        const store = tx.objectStore('pendingReadings');
        
        const entry = {
            data: readingData,
            timestamp: Date.now()
        };
        
        const addRequest = store.add(entry);
        await addRequest;
        
        console.log('[SW] Reading cached for background sync');
        
        // Try to register background sync if available
        if ('sync' in self.registration) {
            try {
                await self.registration.sync.register('sync-readings');
                console.log('[SW] Background sync registered');
            } catch (err) {
                console.log('[SW] Could not register background sync:', err);
            }
        }
        
    } catch (err) {
        console.error('[SW] Failed to cache reading:', err);
    }
}

// ============================================================
// ── PERIODIC BACKGROUND SYNC (if supported) ──────────────────
// ============================================================
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'periodic-readings-sync') {
        event.waitUntil(syncPendingReadings());
    }
});

// ============================================================
// ── PUSH SUBSCRIPTION CHANGE ─────────────────────────────────
// ============================================================
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('[SW] Push subscription changed');
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true
        }).then(subscription => {
            // Send new subscription to server
            return fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    oldSubscription: event.oldSubscription ? event.oldSubscription.toJSON() : null
                })
            });
        })
    );
});

