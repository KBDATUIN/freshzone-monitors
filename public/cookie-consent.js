/**
 * FreshZone Cookie Consent Manager
 * Keeps consent isolated from auth/session cookies used elsewhere in the app.
 */

(function () {
    'use strict';

    const CONSENT_KEY = 'cookie-consent';
    const ANALYTICS_KEY = 'analytics-enabled';
    const PREFERENCES_KEY = 'preference-cookies';
    const CONSENT_COOKIE = 'fz_cookie_consent';
    const ANALYTICS_COOKIE = 'fz_cookie_analytics';
    const PREFERENCES_COOKIE = 'fz_cookie_preferences';
    const ROOT_ID = 'fz-cookie-root';
    const STYLE_ID = 'fz-cookie-style';
    const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
    let previousBodyOverflow = '';
    let reopenBannerOnModalClose = false;

    const markup = `
        <div id="${ROOT_ID}" hidden>
            <section id="cookie-consent-banner" class="fz-cookie-banner" role="dialog" aria-modal="false" aria-labelledby="fz-cookie-title">
                <button type="button" id="cookie-dismiss-btn" class="fz-cookie-close-btn" aria-label="Close cookie banner">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>

                <div class="fz-cookie-copy">
                    <h2 id="fz-cookie-title">Cookies</h2>
                    <p class="fz-cookie-text">
                        We use cookies and similar technologies to help personalise content, remember your settings,
                        and give you a smoother FreshZone experience. By clicking accept, you agree to this as outlined
                        in our <a href="privacy.html#cookies">Cookies Policy</a>.
                    </p>

                    <div class="fz-cookie-actions">
                        <button type="button" id="cookie-accept-btn" class="fz-cookie-btn fz-cookie-btn-primary">Accept</button>
                        <button type="button" id="cookie-preferences-btn" class="fz-cookie-btn fz-cookie-btn-secondary">Preferences</button>
                    </div>
                </div>

                <div class="fz-cookie-art" aria-hidden="true">
                    <span class="fz-cookie-biscuit">
                        <span class="fz-cookie-chip chip-1"></span>
                        <span class="fz-cookie-chip chip-2"></span>
                        <span class="fz-cookie-chip chip-3"></span>
                        <span class="fz-cookie-chip chip-4"></span>
                        <span class="fz-cookie-chip chip-5"></span>
                        <span class="fz-cookie-chip chip-6"></span>
                        <span class="fz-cookie-chip chip-7"></span>
                        <span class="fz-cookie-chip chip-8"></span>
                        <span class="fz-cookie-chip chip-9"></span>
                        <span class="fz-cookie-chip chip-10"></span>
                        <span class="fz-cookie-chip chip-11"></span>
                        <span class="fz-cookie-chip chip-12"></span>
                    </span>
                </div>
            </section>

            <div id="cookie-settings-modal" class="fz-cookie-modal-shell" hidden>
                <section class="fz-cookie-modal" role="dialog" aria-modal="true" aria-labelledby="fz-cookie-modal-title">
                    <div class="fz-cookie-modal-head">
                        <div>
                            <p class="fz-cookie-eyebrow">Cookie preferences</p>
                            <h2 id="fz-cookie-modal-title">Choose what FreshZone can store on this device.</h2>
                        </div>
                        <button type="button" id="cookie-modal-close" class="fz-cookie-icon-btn" aria-label="Close cookie preferences">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>

                    <div class="fz-cookie-pref-list">
                        <article class="fz-cookie-pref-card fz-cookie-pref-locked">
                            <div class="fz-cookie-pref-copy">
                                <h3>Essential cookies</h3>
                                <p>Required for login, security, CSRF protection, and core page behavior. These are always on.</p>
                            </div>
                            <span class="fz-cookie-pill">Always active</span>
                        </article>

                        <article class="fz-cookie-pref-card">
                            <div class="fz-cookie-pref-copy">
                                <h3>Preference cookies</h3>
                                <p>Remember settings like theme mode and device-level interface choices.</p>
                            </div>
                            <label class="fz-cookie-switch" for="preference-toggle">
                                <input type="checkbox" id="preference-toggle" />
                                <span class="fz-cookie-slider" aria-hidden="true"></span>
                            </label>
                        </article>

                        <article class="fz-cookie-pref-card">
                            <div class="fz-cookie-pref-copy">
                                <h3>Analytics cookies</h3>
                                <p>Help us understand usage patterns so we can optimize performance and layout.</p>
                            </div>
                            <label class="fz-cookie-switch" for="analytics-toggle">
                                <input type="checkbox" id="analytics-toggle" />
                                <span class="fz-cookie-slider" aria-hidden="true"></span>
                            </label>
                        </article>
                    </div>

                    <p class="fz-cookie-helper">You can keep only essentials, or save optional preferences for a smoother return visit.</p>

                    <div class="fz-cookie-modal-actions">
                        <button type="button" id="cookie-save-essentials" class="fz-cookie-btn fz-cookie-btn-secondary">Use essentials only</button>
                        <button type="button" id="cookie-modal-save" class="fz-cookie-btn fz-cookie-btn-primary">Save choices</button>
                    </div>
                </section>
            </div>
        </div>
    `;

    const styles = `
        <style id="${STYLE_ID}">
            #${ROOT_ID}[hidden] { display: none !important; }
            .fz-cookie-banner,
            .fz-cookie-modal {
                color: #1b2430;
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 250, 255, 0.98));
                border: 2px solid rgba(31, 41, 55, 0.68);
                box-shadow: 14px 14px 0 rgba(15, 23, 42, 0.11), 0 28px 58px rgba(15, 23, 42, 0.18);
            }
            [data-theme="dark"] .fz-cookie-banner,
            [data-theme="dark"] .fz-cookie-modal {
                color: #e2f0f8;
                background: linear-gradient(180deg, rgba(10, 20, 36, 0.985), rgba(9, 18, 32, 0.985));
                border-color: rgba(125, 211, 252, 0.22);
                box-shadow: 14px 14px 0 rgba(0, 0, 0, 0.22), 0 28px 58px rgba(0, 0, 0, 0.4);
            }
            .fz-cookie-banner {
                position: fixed;
                left: max(1rem, env(safe-area-inset-left));
                right: max(1rem, env(safe-area-inset-right));
                bottom: max(1rem, env(safe-area-inset-bottom));
                z-index: 10000;
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                gap: 1.2rem;
                align-items: center;
                max-width: 760px;
                margin: 0 auto;
                padding: 1.55rem 1.7rem;
                border-radius: 20px;
            }
            .fz-cookie-copy,
            .fz-cookie-modal-head,
            .fz-cookie-pref-copy {
                min-width: 0;
            }
            .fz-cookie-copy h2,
            .fz-cookie-pref-copy h3,
            .fz-cookie-modal-head h2 {
                margin: 0;
                color: inherit;
                font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
                line-height: 1.18;
            }
            .fz-cookie-copy h2 {
                font-size: clamp(1.55rem, 2.4vw, 1.9rem);
                font-weight: 800;
            }
            .fz-cookie-eyebrow {
                margin: 0 0 0.45rem;
                font-size: 0.74rem;
                font-weight: 800;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--secondary, #00b4d8);
            }
            .fz-cookie-text,
            .fz-cookie-pref-copy p,
            .fz-cookie-helper {
                margin: 0;
                color: #4b5563;
                font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
                font-size: 1rem;
                line-height: 1.55;
            }
            [data-theme="dark"] .fz-cookie-text,
            [data-theme="dark"] .fz-cookie-pref-copy p,
            [data-theme="dark"] .fz-cookie-helper {
                color: #a7b4c2;
            }
            .fz-cookie-text {
                max-width: 29rem;
                margin-top: 0.75rem;
                font-size: 0.98rem;
            }
            .fz-cookie-text a {
                color: var(--primary, #004e7a);
                font-weight: 700;
                text-decoration: none;
            }
            [data-theme="dark"] .fz-cookie-text a {
                color: #7dd3fc;
            }
            .fz-cookie-text a:hover,
            .fz-cookie-text a:focus-visible {
                text-decoration: underline;
            }
            .fz-cookie-actions,
            .fz-cookie-modal-actions {
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
            }
            .fz-cookie-actions {
                margin-top: 1.05rem;
            }
            .fz-cookie-btn,
            .fz-cookie-icon-btn,
            .fz-cookie-close-btn {
                border: none;
                cursor: pointer;
                font: inherit;
            }
            .fz-cookie-btn {
                width: auto;
                min-width: 138px;
                min-height: 50px;
                margin: 0;
                padding: 0.85rem 1.3rem;
                border-radius: 13px;
                font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
                font-size: 0.95rem;
                font-weight: 800;
                letter-spacing: 0;
                text-transform: none;
                transition: transform 0.18s ease, filter 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
                box-shadow: none;
                position: relative;
                overflow: visible;
            }
            .fz-cookie-btn::after,
            .fz-cookie-icon-btn::after,
            .fz-cookie-close-btn::after {
                display: none !important;
            }
            .fz-cookie-btn:hover,
            .fz-cookie-btn:focus-visible,
            .fz-cookie-icon-btn:hover,
            .fz-cookie-icon-btn:focus-visible,
            .fz-cookie-close-btn:hover,
            .fz-cookie-close-btn:focus-visible {
                transform: translateY(-1px);
                filter: brightness(1.02);
            }
            .fz-cookie-btn-primary {
                color: #fff;
                background: linear-gradient(180deg, #060606, #000000);
            }
            .fz-cookie-btn-secondary {
                color: #111827;
                background: linear-gradient(180deg, #f2f4f7, #eaedf2);
                border: 1px solid #d3dae4;
            }
            [data-theme="dark"] .fz-cookie-btn-secondary {
                color: #e2f0f8;
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(125, 211, 252, 0.16);
            }
            .fz-cookie-close-btn {
                position: absolute;
                top: 1rem;
                right: 1rem;
                width: 2.4rem;
                height: 2.4rem;
                margin: 0;
                padding: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: #334155;
                background: rgba(255, 255, 255, 0.12);
                box-shadow: none;
                border-radius: 999px;
            }
            [data-theme="dark"] .fz-cookie-close-btn {
                color: #cbd5e1;
                background: rgba(255, 255, 255, 0.05);
            }
            .fz-cookie-close-btn svg,
            .fz-cookie-icon-btn svg {
                width: 1.1rem;
                height: 1.1rem;
                display: block;
                pointer-events: none;
            }
            .fz-cookie-art {
                display: grid;
                place-items: center;
                padding-right: 0.25rem;
            }
            .fz-cookie-biscuit {
                position: relative;
                display: block;
                width: 8.8rem;
                aspect-ratio: 1;
                border-radius: 50%;
                background: radial-gradient(circle at 30% 30%, #f7bf7d 0%, #f6b46b 58%, #eea250 100%);
                box-shadow: inset -10px -10px 0 rgba(255, 255, 255, 0.1);
            }
            .fz-cookie-chip {
                position: absolute;
                width: 0.58rem;
                height: 0.58rem;
                border-radius: 50%;
                background: rgba(110, 74, 52, 0.8);
            }
            .chip-1 { top: 18%; left: 29%; }
            .chip-2 { top: 14%; left: 50%; }
            .chip-3 { top: 20%; left: 69%; }
            .chip-4 { top: 34%; left: 22%; }
            .chip-5 { top: 28%; left: 44%; }
            .chip-6 { top: 40%; left: 61%; }
            .chip-7 { top: 53%; left: 20%; }
            .chip-8 { top: 49%; left: 42%; }
            .chip-9 { top: 57%; left: 67%; }
            .chip-10 { top: 70%; left: 31%; }
            .chip-11 { top: 66%; left: 51%; }
            .chip-12 { top: 77%; left: 58%; }
            .fz-cookie-modal-shell {
                position: fixed;
                inset: 0;
                z-index: 10001;
                display: grid;
                place-items: center;
                padding: 1rem;
                background: rgba(6, 24, 41, 0.34);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
            }
            .fz-cookie-modal {
                width: min(100%, 580px);
                padding: 1.4rem;
                border-radius: 24px;
            }
            .fz-cookie-modal-head {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 1rem;
                margin-bottom: 1.15rem;
            }
            .fz-cookie-modal-head h2 {
                font-size: clamp(1.1rem, 2.4vw, 1.45rem);
            }
            .fz-cookie-icon-btn {
                width: 2.45rem;
                height: 2.45rem;
                margin: 0;
                padding: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                color: inherit;
                background: rgba(255, 255, 255, 0.84);
                border: 1px solid rgba(0, 78, 122, 0.12);
                box-shadow: none;
            }
            [data-theme="dark"] .fz-cookie-icon-btn {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(125, 211, 252, 0.16);
            }
            .fz-cookie-pref-list {
                display: grid;
                gap: 0.9rem;
            }
            .fz-cookie-pref-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                padding: 1rem 1rem 1rem 1.05rem;
                border-radius: 18px;
                background: linear-gradient(180deg, #eff4f9, #edf2f7);
                border: 1px solid rgba(0, 103, 150, 0.12);
            }
            [data-theme="dark"] .fz-cookie-pref-card {
                background: rgba(255, 255, 255, 0.05);
                border-color: rgba(125, 211, 252, 0.1);
            }
            .fz-cookie-pref-copy h3 {
                font-size: 0.98rem;
                font-weight: 800;
            }
            .fz-cookie-pref-copy p {
                margin-top: 0.35rem;
                font-size: 0.91rem;
                max-width: 21rem;
            }
            .fz-cookie-pref-locked {
                align-items: flex-start;
            }
            .fz-cookie-pill {
                flex-shrink: 0;
                align-self: center;
                padding: 0.45rem 0.9rem;
                border-radius: 999px;
                font-size: 0.76rem;
                font-weight: 800;
                color: #0f766e;
                background: rgba(20, 184, 166, 0.16);
            }
            .fz-cookie-switch {
                position: relative;
                flex-shrink: 0;
                display: inline-flex;
                align-items: center;
                width: 54px;
                height: 31px;
            }
            .fz-cookie-switch input {
                position: absolute;
                inset: 0;
                opacity: 0;
                cursor: pointer;
            }
            .fz-cookie-slider {
                position: absolute;
                inset: 0;
                border-radius: 999px;
                background: #a9b6c9;
                transition: background 0.2s ease;
            }
            .fz-cookie-slider::after {
                content: "";
                position: absolute;
                top: 3px;
                left: 3px;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: #fff;
                box-shadow: 0 4px 10px rgba(15, 23, 42, 0.16);
                transition: transform 0.2s ease;
            }
            .fz-cookie-switch input:checked + .fz-cookie-slider {
                background: linear-gradient(135deg, var(--primary, #004e7a), var(--secondary, #00b4d8));
            }
            .fz-cookie-switch input:checked + .fz-cookie-slider::after {
                transform: translateX(22px);
            }
            .fz-cookie-helper {
                margin-top: 1.05rem;
                font-size: 0.85rem;
            }
            .fz-cookie-modal-actions {
                margin-top: 1.1rem;
                justify-content: flex-end;
            }
            .fz-cookie-modal-actions .fz-cookie-btn {
                flex: 1 1 180px;
            }
            @media (min-width: 700px) {
                .fz-cookie-banner {
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 1.5rem;
                    padding-right: 1.45rem;
                }
            }
            @media (max-width: 699px) {
                .fz-cookie-art {
                    order: -1;
                    padding-right: 0;
                    padding-top: 0.1rem;
                }
                .fz-cookie-biscuit {
                    width: 7.1rem;
                }
            }
            @media (max-width: 640px) {
                .fz-cookie-banner,
                .fz-cookie-modal {
                    border-radius: 20px;
                }
                .fz-cookie-banner {
                    left: max(0.75rem, env(safe-area-inset-left));
                    right: max(0.75rem, env(safe-area-inset-right));
                    bottom: max(0.75rem, env(safe-area-inset-bottom));
                    padding: 1.15rem;
                    box-shadow: 8px 8px 0 rgba(15, 23, 42, 0.12), 0 20px 40px rgba(15, 23, 42, 0.16);
                }
                [data-theme="dark"] .fz-cookie-banner,
                [data-theme="dark"] .fz-cookie-modal {
                    box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.24), 0 20px 40px rgba(0, 0, 0, 0.36);
                }
                .fz-cookie-copy h2 {
                    font-size: 1.48rem;
                }
                .fz-cookie-text {
                    font-size: 0.92rem;
                }
                .fz-cookie-actions,
                .fz-cookie-modal-actions {
                    flex-direction: column;
                }
                .fz-cookie-actions .fz-cookie-btn,
                .fz-cookie-modal-actions .fz-cookie-btn {
                    width: 100%;
                }
                .fz-cookie-pref-card {
                    align-items: flex-start;
                }
                .fz-cookie-switch,
                .fz-cookie-pill {
                    align-self: flex-start;
                }
            }
        </style>
    `;

    function canUseStorage(storage) {
        try {
            const key = '__fz_storage_test__';
            storage.setItem(key, '1');
            storage.removeItem(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    const storageAvailable = canUseStorage(window.localStorage);

    function storageGet(key) {
        if (!storageAvailable) return null;
        try {
            return localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function storageSet(key, value) {
        if (!storageAvailable) return;
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            // Ignore storage write failures and keep the UI operational.
        }
    }

    function getCookie(name) {
        const encodedName = encodeURIComponent(name) + '=';
        const parts = document.cookie ? document.cookie.split('; ') : [];
        for (let index = 0; index < parts.length; index += 1) {
            if (parts[index].indexOf(encodedName) === 0) {
                return decodeURIComponent(parts[index].slice(encodedName.length));
            }
        }
        return null;
    }

    function setCookie(name, value, maxAgeSeconds) {
        document.cookie = [
            encodeURIComponent(name) + '=' + encodeURIComponent(value),
            'path=/',
            'max-age=' + String(maxAgeSeconds),
            'SameSite=Lax'
        ].join('; ');
    }

    function clearCookie(name) {
        document.cookie = encodeURIComponent(name) + '=; path=/; max-age=0; SameSite=Lax';
    }

    function readBool(cookieName, storageKey, fallbackValue) {
        const cookieValue = getCookie(cookieName);
        if (cookieValue !== null) return cookieValue === 'true';

        const storageValue = storageGet(storageKey);
        if (storageValue === null) return fallbackValue;
        return storageValue === 'true';
    }

    function getConsent() {
        return getCookie(CONSENT_COOKIE) || storageGet(CONSENT_KEY);
    }

    function isAnalyticsEnabled() {
        return readBool(ANALYTICS_COOKIE, ANALYTICS_KEY, false);
    }

    function arePreferenceCookiesEnabled() {
        return readBool(PREFERENCES_COOKIE, PREFERENCES_KEY, true);
    }

    function initializeAnalytics() {
        if (window.__freshZoneAnalyticsInitialized) return;
        window.__freshZoneAnalyticsInitialized = true;
        console.log('[Cookie Consent] Analytics initialized');
    }

    function setAnalyticsEnabled(enabled) {
        const normalized = String(Boolean(enabled));
        storageSet(ANALYTICS_KEY, normalized);

        if (enabled) {
            setCookie(ANALYTICS_COOKIE, normalized, COOKIE_MAX_AGE);
            initializeAnalytics();
        } else {
            clearCookie(ANALYTICS_COOKIE);
        }
    }

    function setPreferenceCookiesEnabled(enabled) {
        const normalized = String(Boolean(enabled));
        storageSet(PREFERENCES_KEY, normalized);

        if (enabled) {
            setCookie(PREFERENCES_COOKIE, normalized, COOKIE_MAX_AGE);
        } else {
            clearCookie(PREFERENCES_COOKIE);
        }
    }

    function emitConsentChange() {
        window.dispatchEvent(new CustomEvent('freshzone:cookie-consent-changed', {
            detail: {
                consent: getConsent(),
                analyticsEnabled: isAnalyticsEnabled(),
                preferenceCookiesEnabled: arePreferenceCookiesEnabled()
            }
        }));
    }

    function ensureUI() {
        if (!document.getElementById(STYLE_ID)) {
            document.head.insertAdjacentHTML('beforeend', styles);
        }
        if (!document.getElementById(ROOT_ID)) {
            document.body.insertAdjacentHTML('beforeend', markup);
            bindUI();
        }
        return {
            root: document.getElementById(ROOT_ID),
            banner: document.getElementById('cookie-consent-banner'),
            modal: document.getElementById('cookie-settings-modal'),
            analyticsToggle: document.getElementById('analytics-toggle'),
            preferenceToggle: document.getElementById('preference-toggle')
        };
    }

    function bindUI() {
        const acceptBtn = document.getElementById('cookie-accept-btn');
        const preferencesBtn = document.getElementById('cookie-preferences-btn');
        const dismissBtn = document.getElementById('cookie-dismiss-btn');
        const closeBtn = document.getElementById('cookie-modal-close');
        const saveBtn = document.getElementById('cookie-modal-save');
        const saveEssentialsBtn = document.getElementById('cookie-save-essentials');
        const modal = document.getElementById('cookie-settings-modal');

        acceptBtn.addEventListener('click', acceptAllCookies);
        preferencesBtn.addEventListener('click', function () {
            showSettings({ fromBanner: true });
        });
        dismissBtn.addEventListener('click', saveEssentialsOnly);
        closeBtn.addEventListener('click', hideSettings);
        saveBtn.addEventListener('click', savePreferencesFromModal);
        saveEssentialsBtn.addEventListener('click', saveEssentialsOnly);

        modal.addEventListener('click', function (event) {
            if (event.target === modal) hideSettings();
        });

        document.addEventListener('click', function (event) {
            const trigger = event.target.closest('[data-cookie-preferences]');
            if (!trigger) return;
            event.preventDefault();
            showSettings();
        });
    }

    function showBanner() {
        const ui = ensureUI();
        ui.root.hidden = false;
        ui.banner.hidden = false;
    }

    function syncRootVisibility() {
        const root = document.getElementById(ROOT_ID);
        const banner = document.getElementById('cookie-consent-banner');
        const modal = document.getElementById('cookie-settings-modal');
        if (!root || !banner || !modal) return;
        root.hidden = banner.hidden && modal.hidden;
    }

    function hideBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) banner.hidden = true;
        syncRootVisibility();
    }

    function syncToggles(defaultToExistingValues) {
        const ui = ensureUI();
        ui.analyticsToggle.checked = defaultToExistingValues ? isAnalyticsEnabled() : false;
        ui.preferenceToggle.checked = defaultToExistingValues ? arePreferenceCookiesEnabled() : true;
    }

    function showSettings(options) {
        const ui = ensureUI();
        ui.root.hidden = false;
        syncToggles(!(options && options.fromBanner));
        reopenBannerOnModalClose = Boolean(options && options.fromBanner && !getConsent());
        if (reopenBannerOnModalClose) {
            ui.banner.hidden = true;
        }
        ui.modal.hidden = false;
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }

    function hideSettings() {
        const modal = document.getElementById('cookie-settings-modal');
        const banner = document.getElementById('cookie-consent-banner');
        if (modal) modal.hidden = true;
        if (banner && reopenBannerOnModalClose && !getConsent()) {
            banner.hidden = false;
        }
        reopenBannerOnModalClose = false;
        document.body.style.overflow = previousBodyOverflow;
        syncRootVisibility();
    }

    function persistConsent(type) {
        storageSet(CONSENT_KEY, type);
        setCookie(CONSENT_COOKIE, type, COOKIE_MAX_AGE);
        emitConsentChange();
    }

    function acceptAllCookies() {
        setAnalyticsEnabled(true);
        setPreferenceCookiesEnabled(true);
        persistConsent('accepted');
        hideSettings();
        hideBanner();
    }

    function saveEssentialsOnly() {
        setAnalyticsEnabled(false);
        setPreferenceCookiesEnabled(false);
        persistConsent('essential');
        hideSettings();
        hideBanner();
    }

    function savePreferencesFromModal() {
        const analyticsToggle = document.getElementById('analytics-toggle');
        const preferenceToggle = document.getElementById('preference-toggle');
        const preferencesEnabled = Boolean(preferenceToggle && preferenceToggle.checked);
        const analyticsEnabled = Boolean(analyticsToggle && analyticsToggle.checked);

        setPreferenceCookiesEnabled(preferencesEnabled);
        setAnalyticsEnabled(analyticsEnabled);
        persistConsent(preferencesEnabled || analyticsEnabled ? 'custom' : 'essential');
        hideSettings();
        hideBanner();
    }

    function init() {
        const consent = getConsent();
        if (!consent) {
            showBanner();
            return;
        }

        if (isAnalyticsEnabled()) {
            initializeAnalytics();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.FreshZoneCookies = {
        getConsent: getConsent,
        isAnalyticsEnabled: isAnalyticsEnabled,
        arePreferenceCookiesEnabled: arePreferenceCookiesEnabled,
        setAnalyticsEnabled: setAnalyticsEnabled,
        showSettings: showSettings,
        acceptAll: acceptAllCookies,
        saveEssentialsOnly: saveEssentialsOnly
    };
})();
