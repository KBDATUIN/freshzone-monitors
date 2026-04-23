/* FreshZone enhancement layer v2
   - Reveal-on-scroll for cards/sections
   - Tactile button ripple
   - Smooth scroll for in-page anchors
   No DOM structure changes; safe to load after page scripts. */
(function(){
  if (window.__fzEnhanceLoaded) return; window.__fzEnhanceLoaded = true;

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // ---- Reveal on scroll ----
  function setupReveal(){
    if (prefersReduced) return;
    var targets = document.querySelectorAll(
      '.glass-card, .card, .hero, .stat-box, .location-card, .log-container, .filter-bar, .auth-card, .profile-card'
    );
    targets.forEach(function(el){
      // skip if already animated by site's own animation classes (don't double-animate)
      if (el.classList.contains('animate-in')) return;
      el.classList.add('fz-reveal');
    });
    if (!('IntersectionObserver' in window)){
      targets.forEach(function(el){ el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    document.querySelectorAll('.fz-reveal').forEach(function(el){ io.observe(el); });
  }

  // ---- Button ripple ----
  function setupRipple(){
    if (prefersReduced) return;
    document.addEventListener('click', function(ev){
      var btn = ev.target.closest('button');
      if (!btn) return;
      // skip toggles & icon-only utility buttons
      if (btn.classList.contains('dark-toggle') ||
          btn.classList.contains('hamburger') ||
          btn.classList.contains('mobile-nav-close') ||
          btn.classList.contains('push-toggle-switch')) return;
      var cs = getComputedStyle(btn);
      if (cs.position === 'static') btn.style.position = 'relative';
      if (cs.overflow !== 'hidden') btn.style.overflow = 'hidden';
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var span = document.createElement('span');
      span.className = 'fz-ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (ev.clientX - rect.left - size/2) + 'px';
      span.style.top  = (ev.clientY - rect.top  - size/2) + 'px';
      btn.appendChild(span);
      setTimeout(function(){ span.remove(); }, 650);
    }, { passive: true });
  }

  // ---- Smooth scroll for hash anchors (e.g., contact "scroll to form") ----
  function setupSmoothAnchors(){
    document.addEventListener('click', function(ev){
      var a = ev.target.closest('a[href^="#"]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      ev.preventDefault();
      target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    });
  }

  ready(function(){
    try { setupReveal(); } catch(e){}
    try { setupRipple(); } catch(e){}
    try { setupSmoothAnchors(); } catch(e){}
  });
})();
