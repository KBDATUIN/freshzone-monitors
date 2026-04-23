/* FreshZone — v4 Enhancement Layer (drop-in for enhance.js)
   Pure progressive enhancement. No HTML changes required.
   Adds: reveal-on-scroll, magnetic buttons, ripple, count-up,
   tilt cards, password visibility toggle, smooth nav active state. */
(function () {
  "use strict";
  if (window.__fzEnhanced) return;
  window.__fzEnhanced = true;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ready = (fn) =>
    document.readyState !== "loading"
      ? fn()
      : document.addEventListener("DOMContentLoaded", fn);

  ready(() => {
    /* 1) Reveal-on-scroll for cards / panels / stats / table rows */
    const revealSel =
      ".card, .panel, .stat, .stat-card, .ticket, .order-card, .profile-card, form, table, .auth-card, section > h1, section > h2";
    const targets = $$(revealSel);
    targets.forEach((el, i) => {
      el.classList.add("fz-reveal");
      el.style.transitionDelay = Math.min(i * 60, 480) + "ms";
    });
    if ("IntersectionObserver" in window && !reduced) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      targets.forEach((el) => io.observe(el));
    } else {
      targets.forEach((el) => el.classList.add("is-in"));
    }

    /* 2) Ripple + magnetic on buttons */
    const btnSel =
      'button, .btn, input[type="submit"], a.btn, .button, .social-btn';
    $$(btnSel).forEach((btn) => {
      // ripple
      btn.addEventListener("click", (ev) => {
        if (reduced) return;
        const r = btn.getBoundingClientRect();
        const span = document.createElement("span");
        span.className = "fz-ripple";
        const size = Math.max(r.width, r.height);
        span.style.width = span.style.height = size + "px";
        span.style.left = ev.clientX - r.left - size / 2 + "px";
        span.style.top = ev.clientY - r.top - size / 2 + "px";
        const prevPos = getComputedStyle(btn).position;
        if (prevPos === "static") btn.style.position = "relative";
        btn.appendChild(span);
        setTimeout(() => span.remove(), 650);
      });
      // magnetic (primary buttons only — avoid moving every link)
      const isPrimary =
        btn.matches('button[type="submit"], .btn-primary, button.primary, .button.primary');
      if (isPrimary && !reduced && matchMedia("(pointer:fine)").matches) {
        btn.addEventListener("mousemove", (ev) => {
          const r = btn.getBoundingClientRect();
          const x = ev.clientX - r.left - r.width / 2;
          const y = ev.clientY - r.top - r.height / 2;
          btn.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px) translateY(-2px)`;
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.transform = "";
        });
      }
    });

    /* 3) Subtle 3D tilt on cards (desktop only) */
    if (!reduced && matchMedia("(pointer:fine)").matches) {
      $$(".card, .stat, .stat-card, .auth-card, .profile-card").forEach((card) => {
        card.addEventListener("mousemove", (ev) => {
          const r = card.getBoundingClientRect();
          const cx = (ev.clientX - r.left) / r.width - 0.5;
          const cy = (ev.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(900px) rotateX(${(-cy * 4).toFixed(2)}deg) rotateY(${(cx * 5).toFixed(2)}deg) translateY(-4px)`;
        });
        card.addEventListener("mouseleave", () => {
          card.style.transform = "";
        });
      });
    }

    /* 4) Count-up for numbers in .value / .stat-number */
    const numEls = $$(".stat .value, .stat-card .value, .stat-number");
    const animateNum = (el) => {
      const raw = (el.textContent || "").trim();
      const m = raw.match(/([\d,.]+)/);
      if (!m) return;
      const target = parseFloat(m[1].replace(/,/g, ""));
      if (!isFinite(target)) return;
      const prefix = raw.slice(0, m.index);
      const suffix = raw.slice(m.index + m[1].length);
      const dur = reduced ? 0 : 1100;
      const start = performance.now();
      const isInt = Number.isInteger(target);
      const fmt = (n) =>
        isInt ? Math.round(n).toLocaleString() : n.toFixed(1).toLocaleString();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + fmt(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      const io2 = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              animateNum(e.target);
              io2.unobserve(e.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      numEls.forEach((el) => io2.observe(el));
    }

    /* 5) Password visibility toggle */
    $$('input[type="password"]').forEach((inp) => {
      if (inp.dataset.fzEye) return;
      inp.dataset.fzEye = "1";
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:relative;display:block;";
      inp.parentNode.insertBefore(wrap, inp);
      wrap.appendChild(inp);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", "Show password");
      btn.textContent = "👁";
      btn.style.cssText =
        "position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:0;color:#9fb0c9;cursor:pointer;font-size:1rem;min-height:auto;padding:6px;";
      btn.addEventListener("click", () => {
        const isPw = inp.type === "password";
        inp.type = isPw ? "text" : "password";
        btn.textContent = isPw ? "🙈" : "👁";
      });
      wrap.appendChild(btn);
      inp.style.paddingRight = "40px";
    });

    /* 6) Highlight active nav link based on URL */
    const path = location.pathname.split("/").pop() || "index.html";
    $$("nav a, .navbar a").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("/").pop();
      if (href && href === path) a.classList.add("active");
    });

    /* 7) Floating orbs on auth page (if container exists) */
    const authWrap = document.querySelector(
      ".auth-wrap, .auth-container, .login-container, .signup-container"
    );
    if (authWrap && getComputedStyle(authWrap).position === "static") {
      authWrap.style.position = "relative";
    }

    /* 8) Smooth scroll for in-page hash links */
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href").slice(1);
        if (!id) return;
        const t = document.getElementById(id);
        if (!t) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      });
    });
  });
})();
