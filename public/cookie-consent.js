/* cookie-consent.js — FreshZone Cookie Consent (v4)
   Injects a centered modal overlay with accept/preferences buttons.
   Respects fz-theme (light/dark). Stores consent in localStorage. */

(function () {
    'use strict';

    const STORAGE_KEY  = 'fz-cookie-consent';
    const VERSION      = '2';

    /* Already consented? Skip */
    if (localStorage.getItem(STORAGE_KEY) === VERSION) return;

    /* ── Build HTML ──────────────────────────────────────────── */
    const overlay = document.createElement('div');
    overlay.id = 'cookie-banner';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Cookie consent');

    overlay.innerHTML = `
        <div class="cookie-box" role="document">

            <!-- Close button (top-right) -->
            <button class="close-btn" id="cookie-close" aria-label="Close cookie banner" onclick="document.getElementById('cookie-banner').remove()">
                &#x2715;
            </button>

            <!-- Cookie illustration (floats right beside text) -->
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23f59e0b'/%3E%3Ccircle cx='35' cy='38' r='7' fill='%2392400e'/%3E%3Ccircle cx='62' cy='30' r='5' fill='%2392400e'/%3E%3Ccircle cx='68' cy='55' r='8' fill='%2392400e'/%3E%3Ccircle cx='40' cy='65' r='6' fill='%2392400e'/%3E%3Ccircle cx='55' cy='72' r='4' fill='%2392400e'/%3E%3Ccircle cx='25' cy='58' r='4' fill='%2392400e'/%3E%3Ccircle cx='75' cy='38' r='3' fill='%2392400e'/%3E%3C/svg%3E"
                 alt="Cookie" class="cookie-img" width="72" height="72">

            <h2>Cookies</h2>
            <p>We use cookies and similar technologies to personalize your experience, remember settings, and keep FreshZone running smoothly. By clicking accept, you agree as outlined in our <a href="privacy.html">Cookies Policy</a>.</p>

            <div class="cookie-actions">
                <button class="btn-accept" id="cookie-accept">Accept</button>
                <button class="btn-preferences" id="cookie-prefs">Preferences</button>
            </div>

        </div>
    `;

    /* ── Inline styles (minimal — fz-fixes-v2.css handles most) ─ */
    const style = document.createElement('style');
    style.textContent = `
        #cookie-banner {
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: rgba(0, 20, 45, 0.52);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        #cookie-banner .cookie-box {
            position: relative;
            width: 100%;
            max-width: 460px;
            background: #ffffff;
            border-radius: 20px;
            padding: 2rem 2rem 1.75rem;
            box-shadow: 0 24px 64px rgba(0,30,60,0.25), 0 4px 16px rgba(0,0,0,0.10);
            border: 1px solid rgba(220,235,245,0.9);
            box-sizing: border-box;
        }
        html[data-theme='dark'] #cookie-banner .cookie-box {
            background: #0d1b2a;
            border-color: rgba(0,180,216,0.18);
        }
        #cookie-banner .close-btn {
            position: absolute;
            top: 0.9rem;
            right: 0.9rem;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 1.5px solid #e2e8f0;
            background: #f8fafc;
            color: #64748b;
            font-size: 0.85rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            line-height: 1;
            padding: 0;
            transition: background 0.18s;
        }
        #cookie-banner .close-btn:hover { background: #e2e8f0; color: #0f172a; }
        html[data-theme='dark'] #cookie-banner .close-btn {
            background: #1a2c3e;
            border-color: rgba(100,180,220,0.3);
            color: #94a3b8;
        }
        #cookie-banner .cookie-img {
            float: right;
            margin: 0 0 0.75rem 1rem;
            border-radius: 50%;
            flex-shrink: 0;
        }
        #cookie-banner h2 {
            font-size: 1.3rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 0.6rem;
            padding-right: 2rem; /* don't overlap close btn */
            font-family: inherit;
        }
        html[data-theme='dark'] #cookie-banner h2 { color: #e8f4fb; }
        #cookie-banner p {
            font-size: 0.875rem;
            line-height: 1.65;
            color: #475569;
            margin: 0;
            font-family: inherit;
        }
        html[data-theme='dark'] #cookie-banner p { color: #8fa8bc; }
        #cookie-banner a { color: #0077b6; font-weight: 600; }
        #cookie-banner .cookie-actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 1.4rem;
            clear: both;
        }
        #cookie-banner .btn-accept {
            flex: 1;
            padding: 0.72rem 1rem;
            border-radius: 11px;
            border: none;
            background: #0f172a;
            color: #fff;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            font-family: inherit;
            transition: background 0.18s;
        }
        #cookie-banner .btn-accept:hover { background: #1e293b; }
        #cookie-banner .btn-preferences {
            flex: 1;
            padding: 0.72rem 1rem;
            border-radius: 11px;
            border: 1.5px solid #dde4ec;
            background: transparent;
            color: #4a6278;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            transition: border-color 0.18s, background 0.18s;
        }
        #cookie-banner .btn-preferences:hover {
            border-color: #94a3b8;
            background: #f1f5f9;
        }
        html[data-theme='dark'] #cookie-banner .btn-preferences {
            border-color: rgba(100,180,220,0.25);
            color: #8fa8bc;
        }
        html[data-theme='dark'] #cookie-banner .btn-preferences:hover {
            background: rgba(100,180,220,0.08);
            color: #e8f4fb;
        }
        @media (max-width: 480px) {
            #cookie-banner .cookie-box { padding: 1.75rem 1.25rem 1.5rem; }
            #cookie-banner .cookie-actions { flex-direction: column; }
            #cookie-banner .cookie-img { float: none; margin: 0 auto 1rem; display: block; }
        }
    `;

    /* ── Wire up buttons ─────────────────────────────────────── */
    function acceptAll() {
        localStorage.setItem(STORAGE_KEY, VERSION);
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.25s';
        setTimeout(() => overlay.remove(), 260);
    }

    function openPreferences() {
        /* Simple preferences: just accept for now, or you can expand */
        acceptAll();
    }

    /* ── Mount ───────────────────────────────────────────────── */
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    /* Wire after mount */
    document.getElementById('cookie-accept').addEventListener('click', acceptAll);
    document.getElementById('cookie-prefs').addEventListener('click', openPreferences);

    /* Fade in */
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    });

})();
