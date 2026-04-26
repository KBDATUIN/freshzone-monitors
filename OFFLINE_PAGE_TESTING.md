# How to Test Your Custom Offline Page

## The Problem
When you go offline in Chrome, you see Chrome's default "No internet" dinosaur page instead of your custom `offline.html`. This happens because:

1. The service worker needs to be properly installed and activated
2. The `offline.html` file must be cached during service worker installation
3. The service worker must intercept navigation requests when offline

## Solution: Force Service Worker Update

### Step 1: Clear Old Service Worker
1. Open your site on your phone (Chrome)
2. On your computer, open `chrome://inspect`
3. Find your phone and click "Inspect"
4. Go to **Application** tab → **Service Workers**
5. Click **"Unregister"** next to any existing service worker
6. Check **"Update on reload"** box

### Step 2: Clear Cache
1. In DevTools → **Application** tab
2. Click **"Clear storage"** in the left sidebar
3. Click **"Clear site data"** button

### Step 3: Reload and Wait
1. Reload the page (pull to refresh on phone)
2. Wait for the page to fully load
3. Check console for: `[SW] Pre-caching app shell` and `[SW] App shell cached`

### Step 4: Verify Offline Page is Cached
1. In DevTools → **Application** → **Cache Storage**
2. Click on `freshzone-v4`
3. You should see `/offline.html` in the list

### Step 5: Test Offline
1. In DevTools → **Network** tab
2. Change from "No throttling" to **"Offline"**
3. Try to navigate to any page (or reload current page)
4. You should see your custom offline page instead of Chrome's dinosaur!

## Alternative: Quick Test Without DevTools

If you can't use DevTools on your phone:

1. **Open FreshZone** on your phone while online
2. **Wait 10 seconds** for service worker to install
3. **Turn on Airplane mode** (or disable Wi-Fi/mobile data)
4. **Try to open a new page** (like History or About)
5. If you see your custom offline page → ✅ Working!
6. If you see Chrome's dinosaur → ❌ Not working yet

## Troubleshooting

### Still seeing Chrome's dinosaur page?

**Check 1: Is the service worker active?**
- Open Chrome and go to `chrome://serviceworker-internals`
- Look for `freshzone.space` or your domain
- It should show as "Running"

**Check 2: Is offline.html accessible?**
- Try opening `https://freshzone.space/offline.html` directly
- It should load normally (when online)

**Check 3: Check console logs**
- Look for errors like:
  - `[SW] Pre-cache failed` - means offline.html couldn't be cached
  - `[SW] Network failed for navigation` - means SW is working but offline page not found

**Check 4: Force service worker update**
```javascript
// In browser console, run:
navigator.serviceWorker.getRegistration().then(reg => {
    if (reg) {
        reg.update();
        console.log('Service worker updated');
    } else {
        console.log('No service worker found');
    }
});
```

### Still not working?

Try this nuclear option:
1. Clear ALL browser data on your phone
2. Uninstall Chrome and reinstall
3. Visit your site fresh
4. Wait for service worker to install
5. Test offline

## Expected Behavior

When working correctly:
- **Online**: See normal FreshZone pages
- **Offline**: See your custom offline page with:
  - "You're Offline" heading
  - Connection status indicator
  - Retry button
  - Tips to get back online
  - iOS instructions (if on iOS)

## Important Notes

1. **First time offline**: The offline page might not work on the very first offline attempt. You need to:
   - Load the site while online first
   - Wait for service worker to install
   - Then go offline

2. **Service worker updates**: When you update `sw.js`, users need to:
   - Close all tabs of your site
   - Reopen the site
   - Wait for new service worker to activate

3. **HTTPS required**: Service workers only work on HTTPS (or localhost for testing)

4. **Browser support**: All modern browsers support service workers, but older phones might not

## Quick Verification

Run this in your browser console:
```javascript
// Check if service worker is ready
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
        console.log('Service Worker:', reg ? '✅ Active' : '❌ Not found');
        console.log('Scope:', reg?.scope);
    });
    
    // Check if offline page is cached
    caches.match('/offline.html').then(response => {
        console.log('Offline page cached:', response ? '✅ Yes' : '❌ No');
    });
} else {
    console.log('❌ Service Workers not supported');
}
```

If you see:
- `Service Worker: ✅ Active`
- `Offline page cached: ✅ Yes`

Then your offline page should work! Go offline and test it.

## Success Indicators

You'll know it's working when:
1. Console shows `[SW] App shell cached`
2. DevTools shows service worker as "Activated"
3. Cache Storage contains `/offline.html`
4. Going offline shows your custom page, not Chrome's dinosaur

If all these are true but you still see Chrome's page, try:
- Closing and reopening Chrome
- Clearing site data again
- Testing on a different device