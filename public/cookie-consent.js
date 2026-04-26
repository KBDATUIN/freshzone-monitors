/**
 * FreshZone Cookie Consent Manager
 * Shows a consent banner first and only opens preferences when explicitly requested.
 */

(function () {
    'use strict';

    const CONSENT_KEY = 'cookie-consent';
    const ANALYTICS_KEY = 'analytics-enabled';
    const PREFERENCES_KEY = 'preference-cookies';
    const ROOT_ID = 'fz-cookie-root';
    const STYLE_ID = 'fz-cookie-style';
    let previousBodyOverflow = '';

    const markup = `
        <div id="${ROOT_ID}" hidden>
            <section id="cookie-consent-banner" class="fz-cookie-banner" role="dialog" aria-modal="false" aria-labelledby="fz-cookie-title">
                <div class="fz-cookie-copy">
                    <p class="fz-cookie-eyebrow">Privacy choices</p>
                    <h2 id="fz-cookie-title">FreshZone uses essential cookies to keep your session secure.</h2>
                    <p class="fz-cookie-text">
                        Optional cookies help us remember your preferences and improve the experience. Read our
                        <a href="privacy.html#cookies">Privacy Policy</a>
                        for details.
                    </p>
                </div>
                <div class="fz-cookie-actions">
                    <button type="button" id="cookie-accept-btn" class="fz-cookie-btn fz-cookie-btn-primary">Accept all</button>
                    <button type="button" id="cookie-essentials-btn" class="fz-cookie-btn fz-cookie-btn-secondary">Essentials only</button>
                </div>
            </section>

            <div id="cookie-settings-modal" class="fz-cookie-modal-shell" hidden>
                <section class="fz-cookie-modal" role="dialog" aria-modal="true" aria-labelledby="fz-cookie-modal-title">
                    <div class="fz-cookie-modal-head">
                        <div>
                            <p class="fz-cookie-eyebrow">Cookie preferences</p>
                            <h2 id="fz-cookie-modal-title">Choose what FreshZone can store on this device.</h2>
                        </div>
                        <button type="button" id="cookie-modal-close" class="fz-cookie-icon-btn" aria-label="Close cookie preferences">x</button>
                    </div>

                    <div class="fz-cookie-pref-list">
                        <article class="fz-cookie-pref-card fz-cookie-pref-locked">
                            <div class="fz-cookie-pref-copy">
                                <h3>Essential cookies</h3>
                                <p>Required for login, security, and core page behavior. These are always on.</p>
                            </div>
                            <span class="fz-cookie-pill">Always active</span>
                        </article>

                        <article class="fz-cookie-pref-card">
                            <div class="fz-cookie-pref-copy">
                                <h3>Preference cookies</h3>
                                <p>Remember settings like theme mode and device-level UI choices.</p>
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
                color: var(--text, #003049);
                background: linear-gradient(165deg, rgba(240, 252, 255, 0.98), rgba(223, 245, 255, 0.98));
                border: 1px solid rgba(0, 103, 150, 0.16);
                box-shadow: 0 24px 60px rgba(0, 43, 73, 0.18);
                backdrop-filter: blur(18px);
                -webkit-backdrop-filter: blur(18px);
            }
            [data-theme="dark"] .fz-cookie-banner,
            [data-theme="dark"] .fz-cookie-modal {
                background: linear-gradient(165deg, rgba(8, 22, 40, 0.98), rgba(10, 28, 48, 0.98));
                border-color: rgba(34, 211, 238, 0.14);
                box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
            }
            .fz-cookie-banner {
                position: fixed;
                left: max(1rem, env(safe-area-inset-left));
                right: max(1rem, env(safe-area-inset-right));
                bottom: max(1rem, env(safe-area-inset-bottom));
                z-index: 10000;
                display: grid;
                gap: 1rem;
                max-width: 1040px;
                margin: 0 auto;
                padding: 1.15rem;
                border-radius: 24px;
            }
            .fz-cookie-copy h2,
            .fz-cookie-pref-copy h3,
            .fz-cookie-modal-head h2 {
                margin: 0;
                font-family: 'Syne', 'Space Grotesk', sans-serif;
                line-height: 1.2;
            }
            .fz-cookie-copy h2 {
                font-size: clamp(1rem, 2.3vw, 1.25rem);
            }
            .fz-cookie-eyebrow {
                margin: 0 0 0.45rem;
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--secondary, #00b4d8);
            }
            .fz-cookie-text,
            .fz-cookie-pref-copy p,
            .fz-cookie-helper {
                margin: 0;
                color: var(--text-muted, #5f7485);
                line-height: 1.65;
                font-size: 0.93rem;
            }
            [data-theme="dark"] .fz-cookie-text,
            [data-theme="dark"] .fz-cookie-pref-copy p,
            [data-theme="dark"] .fz-cookie-helper {
                color: var(--text-muted, #94a3b8);
            }
            .fz-cookie-text a {
                color: var(--primary, #004e7a);
                font-weight: 700;
                text-decoration: none;
            }
            .fz-cookie-text a:hover {
                text-decoration: underline;
            }
            .fz-cookie-actions,
            .fz-cookie-modal-actions {
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
            }
            .fz-cookie-btn,
            .fz-cookie-icon-btn {
                border: none;
                cursor: pointer;
                font: inherit;
            }
            .fz-cookie-btn {
                min-height: 46px;
                padding: 0.8rem 1.1rem;
                border-radius: 14px;
                font-size: 0.92rem;
                font-weight: 700;
                transition: transform 0.18s ease, filter 0.18s ease, background 0.18s ease;
            }
            .fz-cookie-btn:hover,
            .fz-cookie-icon-btn:hover {
                transform: translateY(-1px);
                filter: brightness(1.04);
            }
            .fz-cookie-btn-primary {
                color: #fff;
                background: linear-gradient(135deg, var(--primary, #004e7a), var(--secondary, #00b4d8));
                box-shadow: 0 12px 24px rgba(0, 120, 170, 0.22);
            }
            .fz-cookie-btn-secondary {
                color: var(--text, #003049);
                background: rgba(255, 255, 255, 0.7);
                border: 1px solid rgba(0, 78, 122, 0.14);
            }
            [data-theme="dark"] .fz-cookie-btn-secondary {
                color: var(--text, #e2f0f8);
                background: rgba(255, 255, 255, 0.05);
                border-color: rgba(34, 211, 238, 0.14);
            }
            .fz-cookie-modal-shell {
                position: fixed;
                inset: 0;
                z-index: 10001;
                display: grid;
                place-items: center;
                padding: 1rem;
                background: rgba(4, 18, 35, 0.45);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }
            .fz-cookie-modal {
                width: min(100%, 560px);
                padding: 1.35rem;
                border-radius: 26px;
            }
            .fz-cookie-modal-head {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 1rem;
                margin-bottom: 1rem;
            }
            .fz-cookie-modal-head h2 {
                font-size: clamp(1.05rem, 2.4vw, 1.35rem);
            }
            .fz-cookie-icon-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 2.25rem;
                height: 2.25rem;
                border-radius: 999px;
                color: var(--text, #003049);
                background: rgba(255, 255, 255, 0.7);
                border: 1px solid rgba(0, 78, 122, 0.12);
            }
            [data-theme="dark"] .fz-cookie-icon-btn {
                color: var(--text, #e2f0f8);
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(34, 211, 238, 0.12);
            }
            .fz-cookie-pref-list {
                display: grid;
                gap: 0.8rem;
            }
            .fz-cookie-pref-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                padding: 1rem;
                border-radius: 18px;
                background: rgba(255, 255, 255, 0.64);
                border: 1px solid rgba(0, 103, 150, 0.1);
            }
            [data-theme="dark"] .fz-cookie-pref-card {
                background: rgba(255, 255, 255, 0.04);
                border-color: rgba(34, 211, 238, 0.08);
            }
            .fz-cookie-pref-locked {
                align-items: flex-start;
            }
            .fz-cookie-pill {
                flex-shrink: 0;
                align-self: center;
                padding: 0.45rem 0.8rem;
                border-radius: 999px;
                font-size: 0.76rem;
                font-weight: 800;
                color: #0f766e;
                background: rgba(20, 184, 166, 0.12);
            }
            .fz-cookie-switch {
                position: relative;
                flex-shrink: 0;
                display: inline-flex;
                align-items: center;
                width: 52px;
                height: 30px;
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
                background: rgba(100, 116, 139, 0.4);
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
                margin-top: 1rem;
                font-size: 0.85rem;
            }
            .fz-cookie-modal-actions {
                margin-top: 1rem;
                justify-content: flex-end;
            }
            .fz-cookie-modal-actions .fz-cookie-btn {
                flex: 1 1 180px;
            }
            @media (min-width: 820px) {
                .fz-cookie-banner {
                    grid-template-columns: minmax(0, 1fr) auto;
                    align-items: center;
                    padding: 1.25rem 1.35rem;
                }
                .fz-cookie-actions {
                    justify-content: flex-end;
                }
            }
            @media (max-width: 640px) {
                .fz-cookie-banner,
                .fz-cookie-modal {
                    border-radius: 22px;
                }
                .fz-cookie-banner {
                    left: max(0.75rem, env(safe-area-inset-left));
                    right: max(0.75rem, env(safe-area-inset-right));
                    bottom: max(0.75rem, env(safe-area-inset-bottom));
                    padding: 1rem;
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

    function readBool(key, fallbackValue) {
        const value = localStorage.getItem(key);
        if (value === null) return fallbackValue;
        return value === 'true';
    }

    function getConsent() {
        return localStorage.getItem(CONSENT_KEY);
    }

    function isAnalyticsEnabled() {
        return readBool(ANALYTICS_KEY, false);
    }

    function arePreferenceCookiesEnabled() {
        return readBool(PREFERENCES_KEY, true);
    }

    function setAnalyticsEnabled(enabled) {
        localStorage.setItem(ANALYTICS_KEY, String(Boolean(enabled)));
        if (enabled) initializeAnalytics();
    }

    function setPreferenceCookiesEnabled(enabled) {
        localStorage.setItem(PREFERENCES_KEY, String(Boolean(enabled)));
    }

    function initializeAnalytics() {
        console.log('[Cookie Consent] Analytics initialized');
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
            preferenceToggle: document.getElementById('preference-toggle'),
        };
    }

    function bindUI() {
        const acceptBtn = document.getElementById('cookie-accept-btn');
        const essentialsBtn = document.getElementById('cookie-essentials-btn');
        const closeBtn = document.getElementById('cookie-modal-close');
        const saveBtn = document.getElementById('cookie-modal-save');
        const saveEssentialsBtn = document.getElementById('cookie-save-essentials');
        const modal = document.getElementById('cookie-settings-modal');

        acceptBtn.addEventListener('click', acceptAllCookies);
        essentialsBtn.addEventListener('click', function () {
            showSettings({ fromEssentials: true });
        });
        closeBtn.addEventListener('click', hideSettings);
        saveBtn.addEventListener('click', savePreferencesFromModal);
        saveEssentialsBtn.addEventListener('click', saveEssentialsOnly);

        modal.addEventListener('click', function (event) {
            if (event.target === modal) hideSettings();
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

    function syncToggles(defaultToEssentials) {
        const { analyticsToggle, preferenceToggle } = ensureUI();
        analyticsToggle.checked = defaultToEssentials ? false : isAnalyticsEnabled();
        preferenceToggle.checked = defaultToEssentials ? true : arePreferenceCookiesEnabled();
    }

    function showSettings(options) {
        const ui = ensureUI();
        ui.root.hidden = false;
        syncToggles(Boolean(options && options.fromEssentials));
        ui.modal.hidden = false;
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }

    function hideSettings() {
        const modal = document.getElementById('cookie-settings-modal');
        if (modal) modal.hidden = true;
        document.body.style.overflow = previousBodyOverflow;
        syncRootVisibility();
    }

    function persistConsent(type) {
        localStorage.setItem(CONSENT_KEY, type);
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
    };
})();
