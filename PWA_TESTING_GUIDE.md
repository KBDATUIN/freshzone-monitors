# FreshZone PWA Testing Guide

## How to Test if PWA Features are Working

### 1. Check Console Logs (Most Important!)

Open your phone's Chrome browser and follow these steps:

#### On Android Chrome:
1. Open Chrome on your phone
2. Go to `chrome://inspect` on your computer's Chrome browser
3. Find your phone in the device list
4. Click "Inspect" on your FreshZone page
5. Open the **Console** tab

#### What to Look For:
You should see these log messages when the page loads:
```
[PWA] Service Worker registered: /
[PWA] Pre-caching app shell
[PWA] App shell cached
```

If you see errors instead, there's an issue.

---

### 2. Test Service Worker Registration

In the browser DevTools (on your computer, inspecting your phone):

1. Go to **Application** tab
2. Click **Service Workers** in the left sidebar
3. You should see:
   - Status: **Activated and running**
   - Scope: `https://freshzone.space/`
   - Version: Should show `freshzone-v4`

If it says "Registration failed" or shows an error, check:
- Is your site using HTTPS? (Required for SW)
- Is `/sw.js` accessible? Try opening `https://freshzone.space/sw.js` directly

---

### 3. Test Offline Functionality

#### Step 1: Load the app while online
- Open FreshZone on your phone
- Navigate to Dashboard
- Wait for sensor data to load

#### Step 2: Go offline
- In DevTools → Network tab → Select **Offline**
- Or turn on Airplane mode on your phone

#### Step 3: Test navigation
- Try clicking to different pages (History, About, etc.)
- You should see the **offline page** if the page wasn't cached
- Or the **cached version** if it was previously loaded

#### Step 4: Check Cache
In DevTools → Application → Cache Storage:
- You should see `freshzone-v4` cache
- It should contain HTML, CSS, JS files

---

### 4. Test Install Prompt

#### On Android:
1. Open FreshZone in Chrome
2. Wait 4 seconds
3. You should see a banner at the bottom: **"Install FreshZone"**
4. Tap **Install** to add to home screen

#### If you don't see the banner:
- Check console for: `[PWA] beforeinstallprompt` event
- Make sure you're not already in standalone mode
- Clear browser data and try again

#### On iOS:
1. Open FreshZone in Safari
2. You should see iOS-specific instructions banner
3. Follow the steps to add to home screen

---

### 5. Test Background Sync

#### Step 1: Queue a reading while offline
```javascript
// In browser console, run:
window.FreshZoneSync.queueReading({
    node_code: 'TEST-NODE',
    pm1_0: 10.5,
    pm2_5: 25.3,
    pm10: 45.2,
    smoke_detected: false,
    aqi_value: 78,
    aqi_category: 'Moderate',
    recorded_at: new Date().toISOString()
});
```

#### Step 2: Check IndexedDB
- DevTools → Application → IndexedDB → FreshZoneDB → pendingReadings
- You should see the queued reading

#### Step 3: Go online
- Turn off Offline mode
- Wait a few seconds

#### Step 4: Check if it synced
- The reading should disappear from IndexedDB
- Console should show: `[SW] Background sync complete: X/X synced`

---

### 6. Test Caching Strategy

#### API Calls (Network-First):
1. Open DevTools → Network tab
2. Make sure **Disable cache** is unchecked
3. Load the dashboard
4. Go offline
5. Try to fetch live data - should fail or return cached data

#### Static Assets (Stale-While-Revalidate):
1. Load page online
2. Go offline
3. Reload page
4. CSS/JS should still load from cache
5. Go back online
6. Next reload should fetch fresh versions

---

### 7. Common Issues & Solutions

#### Issue: "Chrome warning instead of my warning"

**Cause**: Chrome shows its own security warnings when:
- Site is not HTTPS
- Service Worker has errors
- Mixed content (HTTP resources on HTTPS page)

**Solution**:
1. Make sure you're using `https://freshzone.space` (not http)
2. Check DevTools Console for SW registration errors
3. Check DevTools Security tab for mixed content warnings

#### Issue: Service Worker not registering

**Check**:
```javascript
// In console, run:
navigator.serviceWorker.getRegistrations().then(regs => {
    console.log('Registrations:', regs);
});
```

If empty, SW failed to register. Check:
- Is `/sw.js` returning 200 OK?
- Any syntax errors in sw.js?
- Is CSP blocking it?

#### Issue: Install prompt not showing

**Reasons**:
- Already installed
- User dismissed it before
- Not meeting PWA criteria (manifest, SW, HTTPS)
- Desktop browser (install prompt is mobile-only)

**Check**:
```javascript
// In console:
window.matchMedia('(display-mode: standalone)').matches
// Should be false if not installed
```

---

### 8. Quick Verification Checklist

- [ ] Site loads over HTTPS
- [ ] Console shows `[PWA] Service Worker registered`
- [ ] DevTools → Application → Service Workers shows active SW
- [ ] DevTools → Application → Cache Storage shows `freshzone-v4`
- [ ] DevTools → Application → Manifest shows your manifest
- [ ] Offline mode shows offline page or cached content
- [ ] Install banner appears (Android) or iOS instructions shown
- [ ] Background sync works (queue reading → go online → synced)

---

### 9. Debug Commands

Paste these in browser console to check status:

```javascript
// Check SW status
navigator.serviceWorker.getRegistration().then(reg => {
    console.log('SW State:', reg?.active?.state);
    console.log('SW Scope:', reg?.scope);
});

// Check cache
caches.keys().then(names => console.log('Caches:', names));

// Check if installed
console.log('Standalone:', window.matchMedia('(display-mode: standalone)').matches);
console.log('iOS Standalone:', window.navigator.standalone);

// Check online status
console.log('Online:', navigator.onLine);

// Check IndexedDB
const req = indexedDB.open('FreshZoneDB');
req.onsuccess = () => {
    const db = req.result;
    console.log('DB Stores:', db.objectStoreNames);
};

// Check manifest
fetch('/manifest.json').then(r => r.json()).then(m => {
    console.log('Manifest loaded:', m.name);
});
```

---

### 10. If Everything Fails

1. **Clear all data**:
   - DevTools → Application → Clear storage → Clear site data
   - Or: Chrome Settings → Site Settings → freshzone.space → Clear data

2. **Hard refresh**:
   - Ctrl+Shift+R (Windows)
   - Cmd+Shift+R (Mac)

3. **Check server logs**:
   - Look for errors serving `/sw.js` or `/manifest.json`

4. **Test on different device**:
   - Try on another phone or desktop Chrome

---

## Expected Behavior Summary

| Feature | Expected Result |
|---------|----------------|
| Service Worker | Registers successfully, shows as "Activated" |
| Offline Page | Shows when offline and page not cached |
| Cached Pages | Load instantly when offline |
| Install Prompt | Shows after 4 seconds on mobile (Android) |
| iOS Instructions | Shows on iOS devices in Safari |
| Background Sync | Syncs queued data when back online |
| Cache Strategy | API = network-first, Assets = SWR |
| Notifications | Push notifications work (if subscribed) |

If you see Chrome's default warnings instead of your custom ones, it usually means:
1. The feature isn't properly implemented
2. There's a security issue (HTTP instead of HTTPS)
3. The browser doesn't support the feature

Check the console logs first - they will tell you exactly what's happening!