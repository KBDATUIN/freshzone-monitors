/**
 * FreshZone AI Chat Widget
 * ─────────────────────────────────────────────────────────────
 * Self-contained — drop one <script> tag into any FreshZone page.
 * Uses the Groq API with a FreshZone-aware system prompt.
 * Respects dark/light theme, ARIA accessible, mobile-friendly.
 *
 * Usage:  <script src="fz-ai-chat.js" defer></script>
 */
(function () {
  'use strict';

  /* ─── SYSTEM PROMPT ──────────────────────────────────────────── */
  const SYSTEM_PROMPT = `You are FreshBot, the intelligent assistant for FreshZone — a campus air quality and vape aerosol detection system deployed in school buildings.

FreshZone monitors indoor air using ESP32-based sensors that measure PM1.0 particulate matter (vape aerosol). Data streams to a web dashboard used by authorized school staff and admins.

Key facts you know:
• Sensor zones: ESP32-ZONE1 and ESP32-ZONE2 placed in campus locations (restrooms, corridors, etc.)
• PM1.0 thresholds: ≤ 12 µg/m³ = Clear (safe), > 12 µg/m³ = Vape Detected (alert)
• Role-based access: Staff can view and acknowledge events; Admins can resolve events and manage users
• Authentication: Email + OTP (one-time password) system, sessions expire after 30 minutes of inactivity
• Push notifications: Staff can subscribe to browser push alerts for real-time vape detection
• History page: Shows past detection events with timestamps, zone, and resolution status
• Tech stack: Node.js API (hosted on Render), Firebase Hosting for frontend, MySQL database, ESP32 microcontrollers with PMS5003 PM sensors

Pages available:
- Dashboard (dashboard.html): Live sensor readings, zone cards, alert management
- History (history.html): Past detection event log with filters
- Profile (profile.html): Account settings, notification preferences
- Contact (contact.html): Send message to FreshZone team
- About (about.html): System info, team, tech stack

You can help users with:
1. Understanding sensor readings and PM1.0 air quality values
2. Navigating the dashboard and its features
3. Explaining alert workflows (acknowledge → resolve)
4. Troubleshooting: sensor offline, login issues, push notifications
5. Understanding vaping health risks and why FreshZone matters
6. General air quality questions

Tone: Professional yet friendly. You're a school safety tool — be clear, concise, and helpful. Use bullet points only when listing multiple items. Keep answers brief unless asked for details.

If asked something outside your knowledge (e.g., specific live sensor readings right now), let the user know you can't access live data directly and suggest they check the Dashboard page.`;

  /* ─── CSS INJECTION ──────────────────────────────────────────── */
  const CSS = `
    #fz-chat-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 10000;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #004e7a, #00b4d8);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,180,216,0.45), 0 2px 8px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      outline: none;
      color: #fff;
    }
    #fz-chat-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(0,180,216,0.55), 0 4px 12px rgba(0,0,0,0.2);
    }
    #fz-chat-fab:focus-visible {
      outline: 2px solid #00b4d8;
      outline-offset: 3px;
    }
    #fz-chat-fab svg { pointer-events: none; }
    #fz-chat-fab .fz-fab-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      width: 18px;
      height: 18px;
      background: #ef4444;
      border: 2px solid #fff;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, sans-serif;
      opacity: 0;
      transform: scale(0);
      transition: opacity 0.2s, transform 0.2s;
    }
    #fz-chat-fab .fz-fab-badge.show {
      opacity: 1;
      transform: scale(1);
    }
    #fz-chat-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      z-index: 10000;
      width: 360px;
      max-width: calc(100vw - 32px);
      height: 520px;
      max-height: calc(100vh - 120px);
      border-radius: 20px;
      background: var(--card-bg, rgba(227,244,255,0.98));
      box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 4px 20px rgba(0,78,122,0.12);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(0,180,216,0.2);
      transform: translateY(20px) scale(0.95);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
      font-family: 'Plus Jakarta Sans', 'Space Grotesk', system-ui, sans-serif;
    }
    #fz-chat-panel.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }
    [data-theme="dark"] #fz-chat-panel {
      background: rgba(10,20,32,0.98);
      border-color: rgba(0,180,216,0.18);
      box-shadow: 0 20px 60px rgba(0,0,0,0.55), 0 4px 20px rgba(0,180,216,0.08);
    }
    .fz-chat-header {
      padding: 16px 18px 14px;
      background: linear-gradient(135deg, #004e7a, #0077a8);
      color: #fff;
      display: flex;
      align-items: center;
      gap: 11px;
      flex-shrink: 0;
    }
    .fz-chat-header-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255,255,255,0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .fz-chat-header-text { flex: 1; min-width: 0; }
    .fz-chat-header-title {
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: 0.01em;
      line-height: 1.2;
    }
    .fz-chat-header-sub {
      font-size: 0.72rem;
      opacity: 0.8;
      margin-top: 1px;
    }
    .fz-chat-header-close {
      width: 30px;
      height: 30px;
      background: rgba(255,255,255,0.12);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      transition: background 0.15s;
      flex-shrink: 0;
      padding: 0;
    }
    .fz-chat-header-close:hover { background: rgba(255,255,255,0.22); }
    .fz-chat-header-close:focus-visible { outline: 2px solid rgba(255,255,255,0.7); outline-offset: 2px; border-radius: 50%; }
    .fz-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,180,216,0.3) transparent;
    }
    .fz-chat-messages::-webkit-scrollbar { width: 4px; }
    .fz-chat-messages::-webkit-scrollbar-track { background: transparent; }
    .fz-chat-messages::-webkit-scrollbar-thumb { background: rgba(0,180,216,0.3); border-radius: 2px; }
    .fz-msg {
      display: flex;
      gap: 8px;
      animation: fz-msg-in 0.2s ease;
    }
    @keyframes fz-msg-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fz-msg.user { flex-direction: row-reverse; }
    .fz-msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
      font-size: 12px;
      font-weight: 700;
    }
    .fz-msg.bot .fz-msg-avatar {
      background: linear-gradient(135deg, #004e7a, #00b4d8);
      color: #fff;
    }
    .fz-msg.user .fz-msg-avatar {
      background: linear-gradient(135deg, #00b4d8, #90e0ef);
      color: #004e7a;
    }
    .fz-msg-bubble {
      max-width: 80%;
      padding: 9px 13px;
      border-radius: 16px;
      font-size: 0.845rem;
      line-height: 1.55;
      word-break: break-word;
    }
    .fz-msg.bot .fz-msg-bubble {
      background: rgba(0,78,122,0.07);
      color: var(--dark, #1a3a52);
      border-bottom-left-radius: 4px;
    }
    [data-theme="dark"] .fz-msg.bot .fz-msg-bubble {
      background: rgba(0,180,216,0.08);
      color: #e2f0f8;
    }
    .fz-msg.user .fz-msg-bubble {
      background: linear-gradient(135deg, #004e7a, #0077a8);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .fz-msg-bubble ul, .fz-msg-bubble ol {
      margin: 6px 0 4px 16px;
      padding: 0;
    }
    .fz-msg-bubble li { margin-bottom: 3px; }
    .fz-msg-bubble strong { font-weight: 700; }
    .fz-msg-bubble code {
      background: rgba(0,0,0,0.08);
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 0.8em;
      font-family: monospace;
    }
    [data-theme="dark"] .fz-msg-bubble code { background: rgba(255,255,255,0.1); }
    .fz-msg-time {
      font-size: 0.66rem;
      opacity: 0.5;
      margin-top: 3px;
      text-align: right;
    }
    .fz-msg.bot .fz-msg-time { text-align: left; }
    .fz-typing {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .fz-typing-dots {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: rgba(0,78,122,0.07);
      border-radius: 16px;
      border-bottom-left-radius: 4px;
    }
    [data-theme="dark"] .fz-typing-dots { background: rgba(0,180,216,0.08); }
    .fz-typing-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #00b4d8;
      animation: fz-dot 1.2s infinite;
    }
    .fz-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .fz-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes fz-dot {
      0%,60%,100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-5px); opacity: 1; }
    }
    .fz-chat-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 14px 10px;
    }
    .fz-suggestion-chip {
      padding: 5px 11px;
      border-radius: 20px;
      border: 1px solid rgba(0,180,216,0.35);
      background: rgba(0,180,216,0.06);
      color: var(--primary, #004e7a);
      font-size: 0.75rem;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      font-family: inherit;
      white-space: nowrap;
    }
    .fz-suggestion-chip:hover {
      background: rgba(0,180,216,0.15);
      border-color: rgba(0,180,216,0.6);
    }
    [data-theme="dark"] .fz-suggestion-chip {
      color: #7dd3fc;
      border-color: rgba(0,180,216,0.25);
    }
    .fz-chat-footer {
      padding: 10px 12px 12px;
      border-top: 1px solid rgba(0,180,216,0.12);
      display: flex;
      gap: 8px;
      align-items: flex-end;
      flex-shrink: 0;
      background: rgba(255,255,255,0.4);
      backdrop-filter: blur(8px);
    }
    [data-theme="dark"] .fz-chat-footer {
      background: rgba(0,0,0,0.3);
      border-top-color: rgba(0,180,216,0.1);
    }
    #fz-chat-input {
      flex: 1;
      padding: 9px 13px;
      border-radius: 22px;
      border: 1px solid rgba(0,180,216,0.3);
      background: rgba(255,255,255,0.7);
      color: var(--dark, #1a3a52);
      font-size: 0.875rem;
      font-family: inherit;
      resize: none;
      min-height: 38px;
      max-height: 120px;
      line-height: 1.45;
      outline: none;
      transition: border-color 0.15s;
      overflow-y: auto;
    }
    #fz-chat-input:focus { border-color: rgba(0,180,216,0.7); }
    [data-theme="dark"] #fz-chat-input {
      background: rgba(10,20,32,0.8);
      color: #e2f0f8;
      border-color: rgba(0,180,216,0.2);
    }
    #fz-chat-input::placeholder { color: #94a3b8; }
    #fz-chat-send {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #004e7a, #00b4d8);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.15s, opacity 0.15s;
      padding: 0;
    }
    #fz-chat-send:hover { transform: scale(1.08); }
    #fz-chat-send:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
    #fz-chat-send:focus-visible { outline: 2px solid #00b4d8; outline-offset: 2px; border-radius: 50%; }
    .fz-chat-powered {
      text-align: center;
      font-size: 0.62rem;
      color: #94a3b8;
      padding-bottom: 2px;
      letter-spacing: 0.02em;
    }
    .fz-error-msg {
      background: rgba(239,68,68,0.1);
      color: #dc2626;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 0.8rem;
    }
    [data-theme="dark"] .fz-error-msg { color: #f87171; }
    @media (max-width: 480px) {
      #fz-chat-panel { right: 12px; bottom: 88px; width: calc(100vw - 24px); }
      #fz-chat-fab   { right: 16px; bottom: 20px; }
    }
  `;

  /* ─── INITIAL SUGGESTIONS ────────────────────────────────────── */
  const SUGGESTIONS = [
    'What is PM1.0?',
    'How do alerts work?',
    'Sensor is offline?',
    'Enable notifications',
    'Why FreshZone?',
  ];

  /* ─── STATE ──────────────────────────────────────────────────── */
  let isOpen = false;
  let isLoading = false;
  let messages = []; // { role, content, time }
  let unreadCount = 0;

  /* ─── DOM HELPERS ────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }

  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getUserInitials() {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const name = u.name || u.username || u.email || '';
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase() || 'U';
    } catch { return 'U'; }
  }

  /* ─── RENDER MARKDOWN-LITE ───────────────────────────────────── */
  function renderMarkdown(text) {
    // Escape HTML first
    let s = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold **text**
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Inline code `code`
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bullet points: lines starting with • or -
    s = s.replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    s = s.replace(/(<li>.*<\/li>\n?)+/gs, m => '<ul>' + m + '</ul>');
    // Numbered lists
    s = s.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // Line breaks (non-list lines)
    s = s.replace(/\n(?!<[uo]l)/g, '<br>');

    return s;
  }

  /* ─── BUILD UI ───────────────────────────────────────────────── */
  function buildUI() {
    // Inject styles
    const style = document.createElement('style');
    style.id = 'fz-chat-styles';
    style.textContent = CSS;
    document.head.appendChild(style);

    // FAB button
    const fab = document.createElement('button');
    fab.id = 'fz-chat-fab';
    fab.setAttribute('aria-label', 'Open FreshZone AI assistant');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'fz-chat-panel');
    fab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="fz-fab-badge" id="fz-chat-badge" aria-live="polite" aria-atomic="true"></span>`;

    // Panel
    const panel = document.createElement('div');
    panel.id = 'fz-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'FreshBot AI Assistant');
    panel.setAttribute('aria-modal', 'false');
    panel.innerHTML = `
      <div class="fz-chat-header">
        <div class="fz-chat-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="5"/><path d="M2 20c0-4.4 4.5-8 10-8s10 3.6 10 8"/>
          </svg>
        </div>
        <div class="fz-chat-header-text">
          <div class="fz-chat-header-title">FreshBot</div>
          <div class="fz-chat-header-sub">FreshZone AI Assistant • Online</div>
        </div>
        <button class="fz-chat-header-close" id="fz-chat-close" aria-label="Close chat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="fz-chat-messages" id="fz-chat-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div class="fz-chat-suggestions" id="fz-chat-suggestions"></div>
      <div class="fz-chat-footer">
        <textarea id="fz-chat-input" placeholder="Ask about FreshZone…" rows="1" aria-label="Message input"></textarea>
        <button id="fz-chat-send" aria-label="Send message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div class="fz-chat-powered">✦ Powered by Groq AI</div>`;

    document.body.appendChild(fab);
    document.body.appendChild(panel);
  }

  /* ─── APPEND MESSAGE ─────────────────────────────────────────── */
  function appendMessage(role, content, isError = false) {
    const msgs = $('fz-chat-messages');
    if (!msgs) return;

    const div = document.createElement('div');
    div.className = 'fz-msg ' + role;

    const initials = role === 'user' ? getUserInitials() : '🤖';
    const bubbleClass = isError ? 'fz-msg-bubble fz-error-msg' : 'fz-msg-bubble';
    const html = role === 'bot' ? renderMarkdown(content) : content
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    div.innerHTML = `
      <div class="fz-msg-avatar">${initials}</div>
      <div>
        <div class="${bubbleClass}">${html}</div>
        <div class="fz-msg-time">${getTime()}</div>
      </div>`;

    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;

    // Badge if closed
    if (!isOpen && role === 'bot') {
      unreadCount++;
      const badge = $('fz-chat-badge');
      if (badge) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.classList.add('show');
      }
    }
  }

  /* ─── TYPING INDICATOR ───────────────────────────────────────── */
  function showTyping() {
    const msgs = $('fz-chat-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'fz-msg bot';
    div.id = 'fz-typing-indicator';
    div.innerHTML = `
      <div class="fz-msg-avatar">🤖</div>
      <div class="fz-typing-dots">
        <span></span><span></span><span></span>
      </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    const t = $('fz-typing-indicator');
    if (t) t.remove();
  }

  /* ─── SUGGESTIONS ────────────────────────────────────────────── */
  function renderSuggestions(items) {
    const container = $('fz-chat-suggestions');
    if (!container) return;
    container.innerHTML = '';
    items.forEach(text => {
      const chip = document.createElement('button');
      chip.className = 'fz-suggestion-chip';
      chip.textContent = text;
      chip.addEventListener('click', () => {
        container.innerHTML = '';
        sendMessage(text);
      });
      container.appendChild(chip);
    });
  }

  /* ─── AUTO-RESIZE TEXTAREA ───────────────────────────────────── */
  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  /* ─── CALL GROQ API ─────────────────────────────────────────── */
  async function callGroq(userMessage) {
    messages.push({ role: 'user', content: userMessage });

    const key = window.FZ_GROQ_KEY || '';
    if (!key) throw new Error('API key not set. Add your Groq key to window.FZ_GROQ_KEY.');

    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10).map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: apiMessages,
        max_tokens: 1024,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Invalid Groq API key. Check window.FZ_GROQ_KEY in your HTML.');
      }
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from AI.');

    messages.push({ role: 'bot', content: text });
    return text;
  }

  /* ─── SEND MESSAGE ───────────────────────────────────────────── */
  async function sendMessage(text) {
    text = text.trim();
    if (!text || isLoading) return;

    const input = $('fz-chat-input');
    const sendBtn = $('fz-chat-send');

    // Hide suggestions after first real message
    const suggestions = $('fz-chat-suggestions');
    if (suggestions) suggestions.innerHTML = '';

    appendMessage('user', text);
    if (input) { input.value = ''; autoResize(input); }

    isLoading = true;
    if (sendBtn) sendBtn.disabled = true;
    showTyping();

    try {
      const reply = await callGroq(text);
      hideTyping();
      appendMessage('bot', reply);

      // Contextual follow-up suggestions based on reply keywords
      const lower = reply.toLowerCase();
      const followups = [];
      if (lower.includes('pm1.0') || lower.includes('particulate')) followups.push('Show thresholds');
      if (lower.includes('alert') || lower.includes('event')) followups.push('How to resolve alerts');
      if (lower.includes('sensor') || lower.includes('esp32')) followups.push('What if sensor is offline?');
      if (lower.includes('dashboard')) followups.push('Go to dashboard');
      if (followups.length > 0) renderSuggestions(followups.slice(0, 3));
    } catch (err) {
      hideTyping();
      appendMessage('bot', `Sorry, I couldn't process that. ${err.message || 'Please try again.'}`, true);
      console.error('[FreshBot]', err);
    } finally {
      isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();
    }
  }

  /* ─── OPEN / CLOSE ───────────────────────────────────────────── */
  function openChat() {
    isOpen = true;
    const panel = $('fz-chat-panel');
    const fab = $('fz-chat-fab');
    if (panel) panel.classList.add('open');
    if (fab) fab.setAttribute('aria-expanded', 'true');

    // Clear unread badge
    unreadCount = 0;
    const badge = $('fz-chat-badge');
    if (badge) badge.classList.remove('show');

    // Show welcome + suggestions on first open
    const msgs = $('fz-chat-messages');
    if (msgs && msgs.children.length === 0) {
      appendMessage('bot', "Hi! I'm **FreshBot** 👋 — your FreshZone assistant.\n\nI can help you understand sensor readings, navigate the dashboard, troubleshoot issues, or answer questions about air quality. What would you like to know?");
      renderSuggestions(SUGGESTIONS);
    }

    setTimeout(() => {
      const input = $('fz-chat-input');
      if (input) input.focus();
    }, 280);
  }

  function closeChat() {
    isOpen = false;
    const panel = $('fz-chat-panel');
    const fab = $('fz-chat-fab');
    if (panel) panel.classList.remove('open');
    if (fab) {
      fab.setAttribute('aria-expanded', 'false');
      fab.focus();
    }
  }

  /* ─── BIND EVENTS ────────────────────────────────────────────── */
  function bindEvents() {
    const fab    = $('fz-chat-fab');
    const close  = $('fz-chat-close');
    const input  = $('fz-chat-input');
    const sendBtn = $('fz-chat-send');

    if (fab)    fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
    if (close)  close.addEventListener('click', closeChat);

    if (input) {
      input.addEventListener('input', () => autoResize(input));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(input.value);
        }
      });
    }

    if (sendBtn) sendBtn.addEventListener('click', () => {
      if (input) sendMessage(input.value);
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) closeChat();
    });

    // Close on outside click
    document.addEventListener('mousedown', e => {
      const panel = $('fz-chat-panel');
      const fab   = $('fz-chat-fab');
      if (isOpen && panel && fab && !panel.contains(e.target) && !fab.contains(e.target)) {
        closeChat();
      }
    });
  }

  /* ─── INIT ───────────────────────────────────────────────────── */
  function init() {
    // Don't init twice
    if ($('fz-chat-fab')) return;
    buildUI();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
