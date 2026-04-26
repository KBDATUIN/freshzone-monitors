// ============================================================
//  sw.js — FreshZone Service Worker v4
//  Handles: Push Notifications + Offline Caching + PWA + Background Sync
//  Caching Strategy:
//    - API routes (/api/*): Network-first with cache fallback
//    - Static assets: Stale-While-Revalidate (SWR)
//    - HTML pages: Network-first with offline page fallback
// ============================================================

const CACHE_NAME = 'freshzone-v4';
const OFFLINE_PAGE = '/offline.html';

// Static assets to pre-cache (core app shell)
const STATIC_ASSETS = [
    '/',
    '/auth.html',
    '/dashboard.html',
    '/history.html',
    '/profile.html',
    '/contact.html',
    '/about.html',
    '/offline.html',
    '/style.css',
    '/style-v2.css',
    '/style-v3.css',
    '/style-fixes.css',
    '/pwa.css',
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
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Pre-caching app shell');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] App shell cached');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[SW] Pre-cache failed:', err);
                // Still skip waiting even if some assets fail
                return self.skipWaiting();
            })
    );
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
        // Network failed, try cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // No cached page - return offline page
        console.log('[SW] Serving offline page for:', request.url);
        return caches.match(OFFLINE_PAGE);
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