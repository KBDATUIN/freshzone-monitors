import { useState, useEffect, useRef } from "react";

const PAGES = ["auth","dashboard","history","about","profile","contact","privacy","terms"];

// ─── Shared CSS injected once ───────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg1:#caf0f8;--bg2:#90e0ef;--bg3:#0077b6;
  --p:#00527a;--p2:#0096c7;--acc:#00b4d8;
  --txt:#0c2340;--txt2:#2d5f7a;--txt3:#4a85a0;
  --card:rgba(255,255,255,0.97);--cb:rgba(0,100,160,0.14);
  --inp:#f0f9ff;--ib:rgba(0,100,160,0.22);
  --badge:rgba(0,90,140,0.11);--bb:rgba(0,90,140,0.26);--bt:#003d5c;
  --hdr:#002840;--lbl:#003855;--gray:#5a8a9f;
  --nav:rgba(255,255,255,0.92);--nb:rgba(0,100,160,0.18);
  --sh:0 20px 60px rgba(0,50,100,0.18);
  --r1:24px;--r2:14px;--r3:10px;
  --success:#065f46;--warn:#92400e;--danger:#991b1b;
  --fz-font:'DM Sans',sans-serif;
  --fz-display:'Syne',sans-serif;
  --fz-mono:'Space Mono',monospace;
}
.dark{
  --bg1:#020c18;--bg2:#041528;--bg3:#061d35;
  --p:#22d3ee;--p2:#38bdf8;--acc:#7dd3fc;
  --txt:#d0eeff;--txt2:#8ab8d0;--txt3:#6a98b0;
  --card:rgba(8,22,40,0.97);--cb:rgba(34,211,238,0.12);
  --inp:rgba(255,255,255,0.05);--ib:rgba(34,211,238,0.20);
  --badge:rgba(34,211,238,0.09);--bb:rgba(34,211,238,0.25);--bt:#a0dff0;
  --hdr:#e0f4ff;--lbl:#90cde4;--gray:#6a98b0;
  --nav:rgba(8,18,35,0.96);--nb:rgba(34,211,238,0.15);
  --sh:0 20px 60px rgba(0,0,0,0.45);
}
body{font-family:var(--fz-font);background:linear-gradient(145deg,var(--bg1) 0%,var(--bg2) 40%,var(--bg3) 100%);min-height:100vh;color:var(--txt);transition:background .4s,color .3s}
.smoke-bg{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.sp{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.16) 0%,transparent 70%);animation:smokeRise 18s ease-in-out infinite}
.dark .sp{background:radial-gradient(circle,rgba(0,180,220,0.08) 0%,transparent 70%)}
@keyframes smokeRise{0%{transform:translateY(110vh) scale(.6);opacity:0}20%{opacity:1}80%{opacity:.5}100%{transform:translateY(-20vh) scale(1.4);opacity:0}}
@keyframes dashRing{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.12);opacity:.9}}
/* NAV */
nav{position:sticky;top:0;z-index:100;background:var(--nav);border-bottom:1px solid var(--nb);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.nav-inner{max-width:1100px;margin:0 auto;padding:0 1.2rem;height:58px;display:flex;align-items:center;gap:0}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--txt);font-family:var(--fz-display);font-weight:900;font-size:1.12rem;flex-shrink:0;margin-right:1.4rem}
.nav-logo img{height:32px}
.nav-links{display:flex;gap:.1rem;flex:1;align-items:center}
.nav-links a{padding:.45rem .75rem;border-radius:10px;font-size:.84rem;font-weight:600;color:var(--txt2);text-decoration:none;transition:all .18s;cursor:pointer}
.nav-links a:hover,.nav-links a.active{background:rgba(0,100,160,.1);color:var(--p)}
.dark .nav-links a:hover,.dark .nav-links a.active{background:rgba(34,211,238,.1);color:#22d3ee}
.nav-right{display:flex;align-items:center;gap:.6rem;margin-left:auto}
.nav-user{display:flex;align-items:center;gap:6px;font-size:.8rem;font-weight:700;color:var(--txt2)}
.nav-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e}
.theme-btn{background:var(--badge);border:1.5px solid var(--bb);border-radius:99px;padding:5px 12px;font-size:.76rem;font-weight:700;color:var(--bt);cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:5px}
.theme-btn svg{width:13px;height:13px}
/* CONTAINER */
.page-wrap{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding:1.5rem 1.2rem 3rem}
.auth-wrap{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;padding:1.8rem 1rem 3rem;min-height:calc(100vh - 58px)}
/* CARDS */
.card{background:var(--card);border:1px solid var(--cb);border-radius:var(--r1);box-shadow:var(--sh);backdrop-filter:blur(20px);padding:1.6rem;transition:background .3s,border-color .3s}
.card-sm{background:var(--card);border:1px solid var(--cb);border-radius:var(--r2);box-shadow:0 8px 28px rgba(0,40,80,.1);padding:1.2rem 1.4rem}
/* GLASS SURFACE (lighter) */
.surface{background:rgba(255,255,255,.88);border:1px solid rgba(0,100,160,.13);border-radius:var(--r1);padding:1.4rem 1.6rem;box-shadow:0 12px 32px rgba(0,40,80,.12)}
.dark .surface{background:rgba(8,22,40,.92);border-color:rgba(34,211,238,.12)}
/* TYPOGRAPHY */
h1.display{font-family:var(--fz-display);font-size:2.2rem;font-weight:900;color:var(--hdr);letter-spacing:-.04em;line-height:1.1}
h2.section{font-family:var(--fz-display);font-size:1.4rem;font-weight:800;color:var(--hdr);margin-bottom:.7rem}
.eyebrow{font-size:.68rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--p2);display:block;margin-bottom:.4rem}
.muted{color:var(--txt2);font-size:.9rem;line-height:1.65}
.badge{display:inline-flex;align-items:center;gap:5px;background:var(--badge);border:1.5px solid var(--bb);border-radius:20px;padding:4px 12px 4px 10px;font-size:.74rem;font-weight:700;color:var(--bt)}
.badge svg{width:12px;height:12px;color:var(--p)}
.dark .badge svg{color:#22d3ee}
/* BUTTONS */
.btn{width:100%;display:flex;align-items:center;justify-content:center;gap:7px;background:linear-gradient(135deg,#004e7a,#0096c7,#00b4d8);color:white;border:none;border-radius:13px;padding:.8rem 1.4rem;font-family:var(--fz-font);font-size:.92rem;font-weight:800;cursor:pointer;box-shadow:0 6px 24px rgba(0,100,180,.3);transition:transform .2s,box-shadow .2s;margin-top:.9rem}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(0,100,180,.4)}
.btn svg{width:15px;height:15px}
.btn-sm{padding:.55rem 1.2rem;font-size:.83rem;border-radius:10px;width:auto;margin-top:0}
.btn-ghost{background:transparent;border:1.5px solid var(--ib);color:var(--txt2);box-shadow:none}
.btn-ghost:hover{background:var(--inp);box-shadow:none}
.btn-green{background:linear-gradient(135deg,#065f46,#10b981)}
.btn-red{background:linear-gradient(135deg,#991b1b,#ef4444)}
/* INPUTS */
.input-group{margin-bottom:.8rem}
.input-group label{display:block;font-size:.7rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--lbl);margin-bottom:.4rem}
.dark .input-group label{color:#7bbbd0}
input,select,textarea{width:100%;background:var(--inp);border:1.5px solid var(--ib);border-radius:var(--r3);padding:.65rem .85rem;font-family:var(--fz-font);font-size:.88rem;color:var(--txt);transition:border-color .2s,box-shadow .2s;outline:none;-webkit-appearance:none}
input::placeholder,textarea::placeholder{color:var(--txt3)}
input:focus,select:focus,textarea:focus{border-color:var(--p2);box-shadow:0 0 0 3px rgba(0,150,199,.14)}
.pw-wrap{position:relative}
.pw-wrap input{padding-right:2.6rem}
.eye-btn{position:absolute;right:.7rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray);padding:3px;width:auto;margin:0}
.eye-btn svg{width:16px;height:16px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
/* TABS */
.tabs{display:flex;background:rgba(0,80,130,.08);border-radius:14px;padding:4px;margin-bottom:1.4rem;gap:4px}
.dark .tabs{background:rgba(255,255,255,.05)}
.tab{flex:1;padding:.52rem .9rem;border:none;border-radius:11px;font-family:var(--fz-font);font-size:.84rem;font-weight:700;cursor:pointer;background:transparent;color:var(--txt3);transition:all .2s}
.tab.active{background:#004e7a;color:white;box-shadow:0 3px 12px rgba(0,78,122,.25)}
.dark .tab.active{background:#0096c7}
/* TRUST BADGES */
.trust-row{display:flex;gap:.45rem;justify-content:center;flex-wrap:wrap;margin-top:.85rem}
/* STAT CARDS */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.85rem;margin-bottom:1.4rem}
.stat{background:rgba(238,252,255,.97);border:1px solid rgba(255,255,255,.6);border-radius:16px;padding:1.1rem;text-align:center;box-shadow:0 4px 16px rgba(0,50,100,.1);transition:transform .22s}
.stat:hover{transform:translateY(-3px)}
.dark .stat{background:rgba(10,20,36,.97);border-color:rgba(34,211,238,.12)}
.stat-num{display:block;font-family:var(--fz-mono);font-size:1.7rem;font-weight:700;background:linear-gradient(135deg,#003a5c,#00b4d8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.1;margin-bottom:.25rem}
.dark .stat-num{background:linear-gradient(135deg,#7dd3fc,#22d3ee);-webkit-background-clip:text;background-clip:text}
.stat-lbl{font-size:.68rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.05em}
/* SENSOR CARD */
.sensor-card{background:var(--card);border:1px solid var(--cb);border-radius:var(--r2);padding:1.2rem;box-shadow:0 6px 20px rgba(0,40,80,.1);border-left:4px solid #22c55e;transition:all .3s}
.sensor-card.alert{border-left-color:#ef4444;animation:pulse-card 2s ease-in-out infinite}
.sensor-card.offline{border-left-color:#94a3b8;opacity:.75}
@keyframes pulse-card{0%,100%{box-shadow:0 6px 20px rgba(0,40,80,.1),0 0 0 0 rgba(239,68,68,.2)}50%{box-shadow:0 6px 20px rgba(0,40,80,.1),0 0 0 10px rgba(239,68,68,0)}}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;flex-shrink:0}
.dot-ok{background:#22c55e;box-shadow:0 0 5px #22c55e}
.dot-bad{background:#ef4444;box-shadow:0 0 5px #ef4444;animation:blink 1s ease-in-out infinite}
.dot-off{background:#94a3b8}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.aqi-pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:.72rem;font-weight:700;margin-top:4px}
.aqi-good{background:#dcfce7;color:#15803d}
.aqi-mod{background:#fef9c3;color:#854d0e}
.aqi-bad{background:#fee2e2;color:#dc2626}
.aqi-off{background:#f1f5f9;color:#64748b}
.pm-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.pm-chip{background:var(--inp);border:.5px solid var(--ib);border-radius:6px;padding:2px 8px;font-family:var(--fz-mono);font-size:.68rem;color:var(--txt3)}
.live-badge{display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#15803d;border-radius:20px;padding:2px 9px;font-size:.7rem;font-weight:700;margin-left:8px;vertical-align:middle}
.dark .live-badge{background:rgba(34,197,94,.15);color:#4ade80}
.live-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;animation:blink 1.5s ease-in-out infinite}
/* HISTORY TABLE */
.hist-table{width:100%;border-collapse:collapse;font-size:.86rem}
.hist-table th,.hist-table td{padding:.9rem 1rem;text-align:left;border-bottom:1px solid var(--cb)}
.hist-table th{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray);background:rgba(0,100,160,.04)}
.hist-table tbody tr:hover td{background:rgba(0,180,216,.06)}
.tag{display:inline-block;padding:2px 9px;border-radius:99px;font-size:.72rem;font-weight:700}
.tag-danger{background:#fee2e2;color:#dc2626}
.tag-ok{background:#dcfce7;color:#15803d}
.tag-warn{background:#fef9c3;color:#854d0e}
/* PROFILE */
.avatar{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#004e7a,#00b4d8);display:flex;align-items:center;justify-content:center;font-family:var(--fz-display);font-weight:900;font-size:1.8rem;color:white;box-shadow:0 6px 20px rgba(0,78,122,.35);flex-shrink:0}
.profile-field{display:flex;gap:.5rem;padding:.7rem 0;border-bottom:1px solid var(--cb);align-items:center}
.profile-field:last-child{border-bottom:none}
.pf-lbl{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gray);min-width:110px}
.pf-val{font-size:.88rem;color:var(--txt);font-weight:500}
/* TIMELINE */
.timeline{position:relative;padding-left:2rem}
.timeline::before{content:'';position:absolute;left:.55rem;top:8px;bottom:8px;width:2px;background:linear-gradient(180deg,#0077a8,#00c8e8,transparent);border-radius:2px}
.tl-item{position:relative;margin-bottom:1.4rem}
.tl-dot{position:absolute;left:-2rem;top:4px;width:13px;height:13px;border-radius:50%;background:linear-gradient(135deg,#0077a8,#00c8e8);border:2px solid rgba(255,255,255,.8);box-shadow:0 0 0 3px rgba(0,180,216,.2)}
.tl-yr{font-family:var(--fz-mono);font-size:.68rem;font-weight:700;color:var(--p2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.15rem}
.tl-title{font-family:var(--fz-display);font-size:.95rem;font-weight:700;color:var(--hdr);margin-bottom:.2rem}
.tl-desc{font-size:.82rem;color:var(--txt3);line-height:1.55}
/* VALUES GRID */
.val-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem;margin-top:1.2rem}
.val-card{background:rgba(255,255,255,.62);border:1px solid rgba(255,255,255,.72);border-radius:18px;padding:1.3rem;transition:all .25s}
.val-card:hover{transform:translateY(-4px);box-shadow:0 10px 28px rgba(0,30,55,.15)}
.dark .val-card{background:rgba(8,22,40,.78);border-color:rgba(0,200,232,.12)}
.val-icon{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:.9rem;color:white;flex-shrink:0}
.val-icon svg{width:20px;height:20px}
.val-card h4{font-size:.92rem;font-weight:700;color:var(--hdr);margin-bottom:.3rem}
.val-card p{font-size:.8rem;color:var(--txt3);line-height:1.6;margin:0}
/* TEAM GRID */
.team-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:.9rem}
.team-card{background:rgba(0,100,160,.05);border:1px solid rgba(0,120,180,.12);border-radius:14px;padding:1.2rem 1rem;text-align:center;transition:all .2s}
.team-card:hover{transform:translateY(-3px);box-shadow:0 8px 22px rgba(0,50,100,.12)}
.dark .team-card{background:rgba(34,211,238,.04);border-color:rgba(34,211,238,.10)}
.team-av{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto .7rem;font-family:var(--fz-mono);font-weight:700;font-size:.95rem;color:white;box-shadow:0 4px 12px rgba(0,78,122,.28)}
.team-name{font-weight:700;font-size:.86rem;color:var(--hdr);margin-bottom:.1rem}
.team-role{font-size:.74rem;color:var(--p2);font-weight:600}
/* TECH GRID */
.tech-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.8rem}
.tech-pill{display:flex;align-items:center;gap:.7rem;background:rgba(0,100,160,.06);border:1px solid rgba(0,120,180,.13);border-radius:12px;padding:.8rem .9rem;transition:all .2s}
.tech-pill:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,50,100,.1)}
.dark .tech-pill{background:rgba(34,211,238,.05);border-color:rgba(34,211,238,.12)}
.tech-icon{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#004e7a,#0077a8);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white}
.tech-icon svg{width:16px;height:16px}
.tech-label{font-weight:700;font-size:.86rem;color:var(--hdr)}
.tech-sub{font-size:.68rem;color:var(--txt3);margin-top:1px}
/* LEGAL */
.legal-section{background:var(--card);border:1px solid var(--cb);border-radius:var(--r2);padding:1.5rem;margin-bottom:1rem;box-shadow:0 8px 24px rgba(0,40,80,.09)}
.legal-section h2{font-family:var(--fz-display);font-size:1rem;font-weight:800;color:var(--hdr);margin-bottom:.7rem;display:flex;align-items:center;gap:8px}
.legal-section h2 svg{width:17px;height:17px;color:var(--p2);flex-shrink:0}
.legal-section p,.legal-section li{font-size:.86rem;color:var(--txt2);line-height:1.72;margin-bottom:.5rem}
.legal-section ul{padding-left:1.3rem}
.legal-hero{background:var(--card);border:1px solid var(--cb);border-radius:var(--r1);padding:2rem;margin-bottom:1.2rem;text-align:center;box-shadow:var(--sh)}
/* CONTACT */
.contact-info-row{display:flex;align-items:center;gap:10px;padding:.75rem 0;border-bottom:1px solid var(--cb)}
.contact-info-row:last-child{border-bottom:none}
.contact-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0}
.contact-icon svg{width:16px;height:16px}
/* FOOTER */
footer{text-align:center;padding:1.5rem;color:var(--txt3);font-size:.76rem;line-height:1.7;border-top:1px solid var(--cb);margin-top:1.5rem}
footer a{color:var(--p2);text-decoration:none;font-weight:600}
/* AQ GUIDE */
.aq-guide{border-radius:var(--r1);background:rgba(255,255,255,.88);border:1px solid rgba(0,100,160,.13);padding:1.4rem 1.6rem;box-shadow:0 12px 32px rgba(0,40,80,.11);margin-top:1.2rem}
.dark .aq-guide{background:rgba(8,22,40,.92);border-color:rgba(34,211,238,.12)}
.aq-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
.aq-head h3{font-family:var(--fz-display);font-size:1rem;font-weight:800;color:var(--txt)}
.aq-chip{font-size:.66rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:rgba(0,180,216,.12);color:var(--p);border-radius:99px;padding:3px 10px;border:1px solid rgba(0,180,216,.28)}
.aq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem}
.aq-card{background:rgba(0,100,160,.06);border:1px solid rgba(0,120,180,.13);border-radius:14px;padding:1rem .85rem}
.dark .aq-card{background:rgba(0,140,200,.06);border-color:rgba(34,211,238,.10)}
.aq-card h4{font-size:.8rem;font-weight:800;color:var(--p);margin-bottom:.35rem}
.aq-card p{font-size:.77rem;color:var(--txt2);line-height:1.55;margin:0}
/* RESPONSIVE */
@media(max-width:700px){.grid2{grid-template-columns:1fr}.nav-links{display:none}.stat-grid{grid-template-columns:repeat(2,1fr)}}
/* TOAST */
.toast{position:fixed;bottom:1.4rem;left:50%;transform:translateX(-50%);background:#003855;color:white;padding:.65rem 1.3rem;border-radius:12px;font-size:.84rem;font-weight:600;box-shadow:0 10px 28px rgba(0,0,0,.22);z-index:9999;pointer-events:none;transition:opacity .3s;opacity:0}
.toast.show{opacity:1}
.toast.ok{background:#065f46}
.toast.err{background:#991b1b}
/* AQI BAND */
.aqi-bands{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem}
.aqi-band{flex:1;min-width:90px;border-radius:12px;padding:.7rem .8rem;font-size:.75rem}
.aqi-band strong{display:block;font-size:.9rem;margin-bottom:2px}
/* CONFID BANNER */
.confid{width:100%;max-width:500px;background:rgba(255,230,100,.16);border:1.5px solid rgba(200,160,0,.33);border-radius:13px;padding:9px 15px;display:flex;align-items:flex-start;gap:9px;margin-bottom:1rem;backdrop-filter:blur(8px)}
.dark .confid{background:rgba(200,150,0,.09);border-color:rgba(200,160,0,.2)}
.confid svg{flex-shrink:0;width:15px;height:15px;margin-top:1px;color:#a06800}
.dark .confid svg{color:#fbbf24}
.confid p{font-size:.73rem;font-weight:600;color:#6b4400;line-height:1.45}
.dark .confid p{color:#fbbf24}
/* RESEARCH NOTICE */
.research-notice{width:100%;max-width:500px;background:rgba(220,240,255,.9);border:1.5px solid rgba(0,100,200,.18);border-radius:17px;padding:1.1rem 1.4rem;margin-top:1.1rem}
.dark .research-notice{background:rgba(0,30,60,.8);border-color:rgba(34,211,238,.15)}
.research-notice strong{font-size:.8rem;font-weight:800;color:#003055;display:flex;align-items:center;gap:7px;margin-bottom:.5rem}
.dark .research-notice strong{color:#90d8f0}
.research-notice svg{width:15px;height:15px;color:#004e7a}
.dark .research-notice svg{color:#38bdf8}
.research-notice p{font-size:.77rem;color:#2a5070;line-height:1.6;margin:0}
.dark .research-notice p{color:#78aec8}
/* HERO */
.hero-section{text-align:center;padding:1.5rem 1rem 1rem;margin-bottom:1.2rem}
.hero-section h1{font-family:var(--fz-display);font-size:2rem;font-weight:900;color:white;text-shadow:0 2px 20px rgba(0,0,0,.18);margin-bottom:.5rem;letter-spacing:-.03em}
.hero-section p{color:rgba(255,255,255,.88);font-size:.95rem;line-height:1.6;max-width:580px;margin:0 auto}
/* SENSOR GRID */
.sensor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:1rem;margin-bottom:1.5rem}
/* FILTER ROW */
.filter-row{display:flex;gap:.7rem;flex-wrap:wrap;margin-bottom:1.2rem;align-items:flex-end}
.filter-row .input-group{margin-bottom:0;flex:1;min-width:130px}
.filter-row button{margin-top:0}
/* TABLE SCROLL */
.table-scroll{overflow-x:auto}
/* INFO ALERT */
.info-alert{display:flex;gap:7px;align-items:flex-start;background:rgba(0,100,160,.07);border:1px solid rgba(0,100,160,.15);border-radius:10px;padding:.7rem .85rem;margin-bottom:.9rem;font-size:.82rem;color:var(--txt2);line-height:1.55}
.info-alert svg{flex-shrink:0;width:15px;height:15px;margin-top:1px;color:var(--p2)}
/* PW STRENGTH */
.pw-bar-wrap{height:4px;border-radius:2px;background:#e2e8f0;overflow:hidden;margin-top:5px}
.pw-bar{height:100%;border-radius:2px;transition:width .3s,background .3s}
.pw-lbl{font-size:.7rem;color:var(--gray);margin-top:3px;display:block}
/* OTP BOX */
.otp-box{margin-top:.9rem;padding:1rem;background:rgba(0,100,160,.05);border:1px solid rgba(0,100,160,.12);border-radius:13px}
.email-banner{display:flex;align-items:center;gap:9px;background:rgba(0,180,100,.08);border:1px solid rgba(0,180,100,.2);border-radius:9px;padding:.6rem .85rem;margin-bottom:.8rem}
.email-banner svg{width:16px;height:16px;color:#15803d;flex-shrink:0}
.email-banner strong{font-size:.8rem;color:#065f46;display:block}
.dark .email-banner strong{color:#6ee7b7}
.email-banner span{font-size:.73rem;color:var(--txt3)}
`;

// ─── ICONS ─────────────────────────────────────────────────────────────
const Icon = ({ n, s = 16 }) => {
  const paths = {
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></>,
    moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,
    sun: <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    login: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></>,
    dashboard: <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
    history: <><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5-4v-4h4"/></>,
    about: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    chart: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    esp: <><rect x="2" y="3" width="20" height="14" rx="2"/></>,
    code: <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
    db: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    pwa: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eye_off: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    warn: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[n]}</svg>;
};

// ─── SHARED NAV ─────────────────────────────────────────────────────────
function Nav({ page, setPage, dark, setDark }) {
  const links = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "history", label: "History", icon: "history" },
    { id: "about", label: "About", icon: "about" },
    { id: "profile", label: "Profile", icon: "user" },
    { id: "contact", label: "Contact", icon: "mail" },
  ];
  return (
    <nav>
      <div className="nav-inner">
        <div className="nav-logo" onClick={() => setPage("dashboard")} style={{ cursor: "pointer" }}>
          <Icon n="bell" s={20} />
          FreshZone
        </div>
        <div className="nav-links">
          {links.map(l => (
            <a key={l.id} className={page === l.id ? "active" : ""} onClick={() => setPage(l.id)}>
              {l.label}
            </a>
          ))}
        </div>
        <div className="nav-right">
          <div className="nav-user">
            <span className="nav-dot" />
            <span>J. Dela Cruz</span>
          </div>
          <button className="theme-btn" onClick={() => setDark(!dark)}>
            <Icon n={dark ? "sun" : "moon"} s={13} />
            {dark ? "Light" : "Dark"}
          </button>
          <button className="theme-btn btn-ghost" onClick={() => setPage("auth")} style={{ color: "var(--danger)", borderColor: "rgba(153,27,27,.3)" }}>
            <Icon n="logout" s={13} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── SMOKE ──────────────────────────────────────────────────────────────
function Smoke() {
  return (
    <div className="smoke-bg" aria-hidden>
      {[[5,300,300,0],[28,240,240,4],[65,360,360,8],[85,200,200,2]].map(([l,w,h,d],i) => (
        <div key={i} className="sp" style={{ left:`${l}%`, width:w, height:h, animationDelay:`${d}s`, bottom:"-50px" }} />
      ))}
    </div>
  );
}

// ─── TOAST ──────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ msg: "", type: "", show: false });
  const show = (msg, type = "") => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };
  const el = <div className={`toast ${toast.type} ${toast.show ? "show" : ""}`}>{toast.msg}</div>;
  return [show, el];
}

// ════════════════════════════════════════════════════════════════════════
//  AUTH PAGE
// ════════════════════════════════════════════════════════════════════════
function AuthPage({ setPage }) {
  const [tab, setTab] = useState("login");
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState("");
  const [notify, toastEl] = useToast();

  const pwStrength = pw.length === 0 ? 0 : Math.min(4, [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length);
  const strengthColors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="auth-wrap">
      <Smoke />
      {/* Confidential Banner */}
      <div className="confid">
        <Icon n="lock" s={14} />
        <p><strong>Confidential Research System</strong> — Restricted to STI Sta. Mesa staff, teachers &amp; administrators only. Do not share with students.</p>
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "1.3rem", maxWidth: 500, width: "100%" }}>
        <h1 style={{ fontFamily: "var(--fz-display)", fontSize: "2.4rem", fontWeight: 900, color: "var(--hdr)", letterSpacing: "-.04em", textShadow: "0 2px 20px rgba(255,255,255,.5)", marginBottom: ".4rem" }}>FreshZone</h1>
        <p style={{ fontSize: ".9rem", color: "var(--hdr)", fontWeight: 600, opacity: .8, lineHeight: 1.5 }}>
          Real-time vape aerosol detection · STI Sta. Mesa 4th Floor CR
        </p>
        <div className="trust-row">
          {[["lock","Secure Login"],["shield","Verified Access"],["clock","Real-time Alerts"]].map(([icon,label]) => (
            <span key={label} className="badge"><Icon n={icon} s={12} />{label}</span>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="card" style={{ maxWidth: 500, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#004e7a,#00b4d8)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white", boxShadow: "0 6px 20px rgba(0,78,122,.35)" }}>
            <Icon n="bell" s={24} />
          </div>
          <div style={{ fontFamily: "var(--fz-display)", fontWeight: 800, fontSize: "1rem", color: "var(--hdr)", marginTop: 6 }}>FRESHZONE · STI STA. MESA</div>
        </div>

        <div className="tabs">
          {["login","signup","forgot"].map(t => (
            <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "login" ? "Sign In" : t === "signup" ? "Create Account" : "Forgot Password"}
            </button>
          ))}
        </div>

        {tab === "login" && (
          <div>
            <div className="input-group"><label>Email or Phone</label><input type="text" placeholder="name@gmail.com or 09XXXXXXXXX" /></div>
            <div className="input-group">
              <label>Password</label>
              <div className="pw-wrap">
                <input type={showPw ? "text" : "password"} placeholder="••••••••" />
                <button className="eye-btn" onClick={() => setShowPw(!showPw)}><Icon n={showPw ? "eye_off" : "eye"} /></button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: ".8rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--txt2)", fontWeight: 600, cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ width: "auto", accentColor: "var(--p2)" }} /> Stay logged in
              </label>
              <span style={{ color: "var(--p2)", fontWeight: 700, cursor: "pointer" }} onClick={() => setTab("forgot")}>Forgot password?</span>
            </div>
            <button className="btn" onClick={() => { setPage("dashboard"); notify("Welcome back!", "ok"); }}>
              <Icon n="login" /> Sign In
            </button>
            <p style={{ textAlign: "center", marginTop: ".9rem", fontSize: ".82rem", color: "var(--txt2)" }}>
              New here? <span style={{ color: "var(--p2)", fontWeight: 700, cursor: "pointer" }} onClick={() => setTab("signup")}>Create account</span>
            </p>
          </div>
        )}

        {tab === "signup" && (
          <div>
            <div className="grid2">
              <div className="input-group"><label>First Name</label><input type="text" placeholder="Juan" /></div>
              <div className="input-group"><label>Last Name</label><input type="text" placeholder="Dela Cruz" /></div>
            </div>
            <div className="grid2">
              <div className="input-group"><label>Employee ID</label><input type="text" placeholder="02XXXXXX" /></div>
              <div className="input-group">
                <label>Position</label>
                <select><option value="" disabled defaultValue="">Select position</option><option>Administrator</option><option>Staff / Teacher</option></select>
              </div>
            </div>
            <div className="input-group"><label>Email Address</label><input type="email" placeholder="email@gmail.com" /></div>
            <div className="input-group"><label>Contact Number</label><input type="tel" placeholder="+63 9xx xxx xxxx" /></div>
            <div className="input-group">
              <label>Password</label>
              <div className="pw-wrap">
                <input type={showPw ? "text" : "password"} placeholder="Min. 8 characters" value={pw} onChange={e => setPw(e.target.value)} />
                <button className="eye-btn" onClick={() => setShowPw(!showPw)}><Icon n={showPw ? "eye_off" : "eye"} /></button>
              </div>
              <div className="pw-bar-wrap"><div className="pw-bar" style={{ width: pw ? `${pwStrength * 25}%` : "0%", background: strengthColors[pwStrength] }} /></div>
              <span className="pw-lbl">{pw ? strengthLabels[pwStrength] : ""}</span>
            </div>
            <button className="btn" onClick={() => notify("OTP sent to your email!", "ok")}><Icon n="mail" /> Send Verification OTP</button>
            <p style={{ textAlign: "center", marginTop: ".9rem", fontSize: ".82rem", color: "var(--txt2)" }}>
              Already have an account? <span style={{ color: "var(--p2)", fontWeight: 700, cursor: "pointer" }} onClick={() => setTab("login")}>Sign In</span>
            </p>
          </div>
        )}

        {tab === "forgot" && (
          <div>
            <div className="info-alert"><Icon n="about" /><p>Enter your registered email to receive a password reset code. Only authorized STI Sta. Mesa personnel accounts are eligible.</p></div>
            <div className="input-group"><label>Registered Email</label><input type="email" placeholder="name@gmail.com" /></div>
            <button className="btn" onClick={() => notify("Reset code sent!", "ok")}><Icon n="mail" /> Send Reset Code</button>
            <p style={{ textAlign: "center", marginTop: ".9rem", fontSize: ".82rem" }}>
              <span style={{ color: "var(--p2)", fontWeight: 700, cursor: "pointer" }} onClick={() => setTab("login")}>← Back to Sign In</span>
            </p>
          </div>
        )}
      </div>

      {/* AQ Guide */}
      <div className="aq-guide" style={{ maxWidth: 500, width: "100%" }}>
        <div className="aq-head">
          <h3>What FreshZone monitors</h3>
          <span className="aq-chip">Live Sensors</span>
        </div>
        <div className="aq-grid">
          <div className="aq-card"><h4>PM1.0, PM2.5, PM10</h4><p>Multi-size particle detection to identify vape aerosol presence in real time.</p></div>
          <div className="aq-card"><h4>AQI Score (0–500)</h4><p>Health-based air quality index computed from PM2.5. Alerts fire at Moderate+.</p></div>
          <div className="aq-card"><h4>Why it matters</h4><p>Faster detection → faster staff response → safer campus air for everyone.</p></div>
        </div>
      </div>

      <footer style={{ maxWidth: 500, width: "100%", textAlign: "center", marginTop: "1.4rem", fontSize: ".73rem", color: "rgba(0,40,70,.6)", lineHeight: 1.7 }}>
        <p>© 2026 FreshZone — Campus Vape Aerosol Detection System</p>
        <p><span style={{ color: "var(--p)", cursor: "pointer", fontWeight: 600 }} onClick={() => setPage("privacy")}>Privacy Policy</span> · <span style={{ color: "var(--p)", cursor: "pointer", fontWeight: 600 }} onClick={() => setPage("terms")}>Terms of Service</span> · <a href="mailto:freshzone.alerts@gmail.com" style={{ color: "var(--p)", fontWeight: 600 }}>Contact DPO</a></p>
        <p style={{ marginTop: ".25rem", opacity: .65 }}>A capstone research project by ITMAWD students · STI Sta. Mesa College · 2026</p>
      </footer>
      {toastEl}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ════════════════════════════════════════════════════════════════════════
function DashboardPage() {
  const [notify, toastEl] = useToast();
  const sensors = [
    { id: "z1", name: "4th Floor Male CR", status: "detecting", aqi: 142, pm1: 38.2, pm25: 47.6, pm10: 61.3, ts: "3s ago" },
    { id: "z2", name: "4th Floor Female CR", status: "clear", aqi: 32, pm1: 4.1, pm25: 7.2, pm10: 9.8, ts: "3s ago" },
    { id: "z3", name: "4th Floor Hallway", status: "offline", aqi: null, pm1: null, pm25: null, pm10: null, ts: "12m ago" },
  ];
  const statusClass = { detecting: "alert", clear: "", offline: "offline" };
  const dotClass = { detecting: "dot-bad", clear: "dot-ok", offline: "dot-off" };
  const aqiClass = { detecting: "aqi-bad", clear: "aqi-good", offline: "aqi-off" };
  const aqiLabel = { detecting: "UNHEALTHY", clear: "GOOD", offline: "OFFLINE" };

  return (
    <div className="page-wrap">
      {/* Hero Masthead */}
      <div className="card" style={{ marginBottom: "1.4rem", background: "linear-gradient(135deg,rgba(0,78,122,.96),rgba(0,150,199,.95))", border: "none", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span style={{ fontSize: ".68rem", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", opacity: .75 }}>STI Sta. Mesa · 4th Floor Monitoring</span>
            <h1 style={{ fontFamily: "var(--fz-display)", fontSize: "1.75rem", fontWeight: 900, margin: ".35rem 0 .5rem", lineHeight: 1.1 }}>
              Campus Vape Detector <span className="live-badge"><span className="live-dot" />LIVE</span>
            </h1>
            <p style={{ fontSize: ".88rem", opacity: .85, lineHeight: 1.6, maxWidth: 500 }}>
              Live PM1.0, PM2.5 &amp; PM10 readings from IoT sensors in the 4th floor comfort rooms. Alerts staff &amp; admins immediately on detection.
            </p>
            <div style={{ marginTop: ".8rem", display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", borderRadius: 99, padding: "4px 12px", fontSize: ".8rem", fontWeight: 600 }}>
                <span className="nav-dot" /> Logged in as: J. Dela Cruz — Staff
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            {/* Radar rings animation */}
            <div style={{ position: "relative", width: 100, height: 100 }}>
              {[0,16,32].map((inset,i) => (
                <span key={i} style={{ position: "absolute", inset, borderRadius: "50%", border: "2px solid rgba(255,255,255,.4)", animation: `dashRing ${2.8+i*.3}s ease-in-out infinite`, animationDelay: `${i*.35}s` }} />
              ))}
              <div style={{ position: "absolute", inset: 38, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon n="bell" s={12} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Info Bar */}
      <div style={{ background: "rgba(255,243,205,.95)", border: "1px solid rgba(255,193,7,.5)", borderRadius: 12, padding: "10px 14px", marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: 8, fontSize: ".84rem", color: "#856404", fontWeight: 500 }}>
        <Icon n="about" s={15} />
        <span>You are logged in as <strong>Staff</strong>. Administrators can acknowledge vape alerts. You will receive push notifications on detection.</span>
      </div>

      {/* Sensor Grid */}
      <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--gray)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".6rem" }}>Sensor Status · Updated 3s ago</div>
      <div className="sensor-grid">
        {sensors.map(s => (
          <div key={s.id} className={`sensor-card ${statusClass[s.status]}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <Icon n="bell" s={16} />
              <h3 style={{ fontSize: ".95rem", fontWeight: 800, color: "var(--hdr)", margin: 0 }}>{s.name}</h3>
            </div>
            <p style={{ fontWeight: 700, fontSize: ".85rem", display: "flex", alignItems: "center", gap: 2, margin: "4px 0" }}>
              <span className={`dot ${dotClass[s.status]}`} />
              <span style={{ color: "var(--txt)" }}>{s.status === "detecting" ? "Vape Detected!" : s.status === "clear" ? "Clear — No Detection" : "Sensor Offline"}</span>
            </p>
            <span className={`aqi-pill ${aqiClass[s.status]}`}>
              AQI: {s.aqi ?? "—"} · {aqiLabel[s.status]}
            </span>
            {s.pm1 !== null && (
              <div className="pm-row">
                <span className="pm-chip">PM1.0: {s.pm1} µg/m³</span>
                <span className="pm-chip">PM2.5: {s.pm25} µg/m³</span>
                <span className="pm-chip">PM10: {s.pm10} µg/m³</span>
              </div>
            )}
            <small style={{ fontSize: ".68rem", color: "var(--gray)", marginTop: 5, display: "block" }}>Last reading: {s.ts}</small>
            {s.status === "detecting" && (
              <button className="btn btn-sm btn-red" style={{ marginTop: 8 }} onClick={() => notify("Alert acknowledged — response team notified", "ok")}>
                <Icon n="check" s={13} /> Acknowledge Alert
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="stat-grid" style={{ marginTop: "1.4rem" }}>
        <div className="stat"><span className="stat-num">1</span><span className="stat-lbl">Active Alert</span></div>
        <div className="stat"><span className="stat-num">142</span><span className="stat-lbl">Current AQI</span></div>
        <div className="stat"><span className="stat-num">47.6</span><span className="stat-lbl">PM2.5 µg/m³</span></div>
        <div className="stat"><span className="stat-num">24/7</span><span className="stat-lbl">Monitoring</span></div>
      </div>

      {/* AQI Band Guide */}
      <div className="aq-guide" style={{ marginTop: "1.4rem" }}>
        <div className="aq-head"><h3>AQI Reference Guide</h3><span className="aq-chip">WHO Standard</span></div>
        <div className="aqi-bands">
          {[["#dcfce7","#15803d","0–50","Good","Air quality is satisfactory — no health risk"],["#fef9c3","#854d0e","51–100","Moderate","Sensitive groups may experience minor effects"],["#fee2e2","#dc2626","101–150","Unhealthy","All users should be aware. FreshZone alerts fire here."],["#fce7f3","#9d174d","151+","Hazardous","Immediate action required — evacuate area"]].map(([bg,col,range,label,desc]) => (
            <div key={label} className="aqi-band" style={{ background: bg, color: col }}>
              <strong style={{ color: col }}>{range} — {label}</strong>
              <span style={{ fontSize: ".72rem", color: col, opacity: .85 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
      {toastEl}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  HISTORY PAGE
// ════════════════════════════════════════════════════════════════════════
function HistoryPage() {
  const rows = [
    { id: "EVT-041", date: "May 1, 2026", time: "10:14 AM", loc: "4th Floor Male CR", aqi: 148, pm25: 49.2, status: "Resolved" },
    { id: "EVT-040", date: "Apr 30, 2026", time: "3:52 PM", loc: "4th Floor Male CR", aqi: 162, pm25: 57.8, status: "Resolved" },
    { id: "EVT-039", date: "Apr 29, 2026", time: "11:07 AM", loc: "4th Floor Female CR", aqi: 134, pm25: 41.3, status: "Resolved" },
    { id: "EVT-038", date: "Apr 28, 2026", time: "2:33 PM", loc: "4th Floor Male CR", aqi: 178, pm25: 68.4, status: "Resolved" },
    { id: "EVT-037", date: "Apr 25, 2026", time: "9:41 AM", loc: "4th Floor Hallway", aqi: 112, pm25: 33.1, status: "Resolved" },
    { id: "EVT-036", date: "Apr 24, 2026", time: "4:18 PM", loc: "4th Floor Male CR", aqi: 155, pm25: 52.9, status: "Acknowledged" },
  ];
  const [filter, setFilter] = useState("");
  const filtered = rows.filter(r => !filter || r.loc.toLowerCase().includes(filter.toLowerCase()) || r.date.includes(filter));

  return (
    <div className="page-wrap">
      {/* Hero */}
      <div className="hero-section">
        <h1>Detection History</h1>
        <p>Complete log of vape aerosol detection events at STI Sta. Mesa — 4th Floor. Accessible to authorized staff and administrators only.</p>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat"><span className="stat-num">41</span><span className="stat-lbl">Total Events (Apr–May)</span></div>
        <div className="stat"><span className="stat-num">38</span><span className="stat-lbl">Resolved</span></div>
        <div className="stat"><span className="stat-num">156</span><span className="stat-lbl">Peak AQI Recorded</span></div>
      </div>

      {/* Filter + Export */}
      <div className="filter-row">
        <div className="input-group"><label>Search by location or date</label><input type="text" placeholder="e.g. Male CR or Apr 30" value={filter} onChange={e => setFilter(e.target.value)} /></div>
        <div className="input-group">
          <label>Location</label>
          <select onChange={e => setFilter(e.target.value)}>
            <option value="">All Locations</option>
            <option>4th Floor Male CR</option>
            <option>4th Floor Female CR</option>
            <option>4th Floor Hallway</option>
          </select>
        </div>
        <button className="btn btn-sm btn-green" style={{ alignSelf: "flex-end" }}><Icon n="file" s={13} /> Export CSV</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table className="hist-table">
            <thead>
              <tr>
                <th>Event ID</th><th>Date</th><th>Time</th><th>Location</th><th>AQI</th><th>PM2.5 µg/m³</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><span style={{ fontFamily: "var(--fz-mono)", fontSize: ".78rem", color: "var(--p2)" }}>{r.id}</span></td>
                  <td style={{ fontSize: ".85rem" }}>{r.date}</td>
                  <td style={{ fontSize: ".85rem", color: "var(--txt2)" }}>{r.time}</td>
                  <td style={{ fontSize: ".85rem" }}>{r.loc}</td>
                  <td><span className={`tag ${r.aqi > 150 ? "tag-danger" : "tag-warn"}`}>{r.aqi}</span></td>
                  <td style={{ fontFamily: "var(--fz-mono)", fontSize: ".82rem" }}>{r.pm25}</td>
                  <td><span className="tag tag-ok">{r.status}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--gray)", fontStyle: "italic" }}>No events match your filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* AQ Guide on History */}
      <div className="aq-guide" style={{ marginTop: "1.4rem" }}>
        <div className="aq-head"><h3>PM &amp; AQI Interpretation</h3><span className="aq-chip">Reference</span></div>
        <div className="aq-grid">
          <div className="aq-card"><h4>PM1.0 — Ultra-fine particles</h4><p>Particles &lt;1 µm. Primary indicator of vape aerosol — penetrates deepest into lung tissue.</p></div>
          <div className="aq-card"><h4>PM2.5 — WHO benchmark</h4><p>Used to compute AQI. Readings above 35 µg/m³ indicate poor indoor air quality.</p></div>
          <div className="aq-card"><h4>How to read events</h4><p>Include time, location, and AQI peak when reporting. Events above AQI 100 trigger automatic staff notifications.</p></div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  ABOUT PAGE
// ════════════════════════════════════════════════════════════════════════
function AboutPage({ setPage }) {
  return (
    <div className="page-wrap">
      {/* Hero */}
      <div className="hero-section">
        <h1>About FreshZone</h1>
        <p>A campus-grade IoT air quality monitoring system developed to detect vape aerosols in real time — keeping the STI Sta. Mesa campus safer for students and staff.</p>
      </div>

      {/* Research Context — KEY SECTION for this page */}
      <div className="card" style={{ marginBottom: "1.2rem", borderLeft: "4px solid var(--p2)" }}>
        <span className="eyebrow">Research Background</span>
        <h2 className="section">The Problem We're Solving</h2>
        <p className="muted" style={{ marginBottom: ".85rem" }}>
          Vaping among students at STI Sta. Mesa College has been identified as a recurring concern, particularly in the 4th floor comfort rooms (CRs). Traditional enforcement relies on manual patrols — slow, inconsistent, and easily evaded. Our ITMAWD research team developed FreshZone to replace guesswork with data.
        </p>
        <p className="muted" style={{ marginBottom: ".85rem" }}>
          Low-cost ESP32-based IoT sensors continuously sample the air for PM1.0, PM2.5, and PM10 particulate matter. When concentrations exceed safe thresholds, the system flags the location, sends push notifications to registered staff, and logs the incident for administrative review.
        </p>
        <div style={{ background: "rgba(255,230,100,.14)", border: "1.5px solid rgba(200,160,0,.3)", borderRadius: 12, padding: "10px 14px", display: "flex", gap: 9, alignItems: "flex-start", marginTop: ".5rem" }}>
          <Icon n="warn" s={15} />
          <p style={{ fontSize: ".78rem", color: "#6b4400", fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
            <strong>Confidentiality Notice:</strong> This research is conducted exclusively by ITMAWD students and is restricted to authorized STI Sta. Mesa staff, teachers, and administrators. The existence and findings of this monitoring system must not be disclosed to students, as doing so would compromise the integrity and effectiveness of the research.
          </p>
        </div>
      </div>

      {/* Key Stats */}
      <div className="stat-grid">
        <div className="stat"><span className="stat-num">2</span><span className="stat-lbl">Sensor Nodes Active</span></div>
        <div className="stat"><span className="stat-num">5s</span><span className="stat-lbl">Update Interval</span></div>
        <div className="stat"><span className="stat-num">PM1.0</span><span className="stat-lbl">Primary Metric</span></div>
        <div className="stat"><span className="stat-num">24/7</span><span className="stat-lbl">Live Monitoring</span></div>
      </div>

      {/* Core Values */}
      <div className="card" style={{ marginBottom: "1.2rem" }}>
        <span className="eyebrow">Core Values</span>
        <h2 className="section">How We Build</h2>
        <div className="val-grid">
          {[
            ["linear-gradient(135deg,#0077a8,#00c8e8)","shield","Privacy-first","No cameras or microphones. We detect aerosols — not people. All data is anonymized at the sensor level."],
            ["linear-gradient(135deg,#0ea266,#1de9b6)","chart","Real-time","Sensor readings update every 3–5 seconds. Staff sees live AQI before any manual inspection would begin."],
            ["linear-gradient(135deg,#7c3aed,#a855f7)","dashboard","Accessible","PWA-ready on any device. Works on low-end phones with offline fallback through a service worker."],
            ["linear-gradient(135deg,#d97706,#fbbf24)","file","Accountable","Every detection event is timestamped, location-tagged, and logged. Full history exportable as CSV."],
          ].map(([bg,icon,title,desc]) => (
            <div key={title} className="val-card">
              <div className="val-icon" style={{ background: bg }}><Icon n={icon} s={18} /></div>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="card" style={{ marginBottom: "1.2rem" }}>
        <span className="eyebrow">Technology Stack</span>
        <h2 className="section">Built With</h2>
        <div className="tech-grid">
          {[
            ["linear-gradient(135deg,#004e7a,#0077a8)","esp","ESP32","Sensor controller"],
            ["linear-gradient(135deg,#1a7a4a,#22c55e)","code","Node.js","Backend API"],
            ["linear-gradient(135deg,#1e40af,#3b82f6)","db","MySQL","Database"],
            ["linear-gradient(135deg,#d97706,#f59e0b)","bell","Web Push","Notifications"],
            ["linear-gradient(135deg,#7c3aed,#a855f7)","pwa","PWA","Installable app"],
            ["linear-gradient(135deg,#065f46,#10b981)","mail","Nodemailer","Email / OTP"],
          ].map(([bg,icon,label,sub]) => (
            <div key={label} className="tech-pill">
              <div className="tech-icon" style={{ background: bg }}><Icon n={icon} s={14} /></div>
              <div><div className="tech-label">{label}</div><div className="tech-sub">{sub}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="card" style={{ marginBottom: "1.2rem" }}>
        <span className="eyebrow">Timeline</span>
        <h2 className="section">Project Milestones</h2>
        <div className="timeline">
          {[
            ["2025 Q1 — Concept","Problem Definition & Hardware Selection","Identified student vaping in 4th floor CRs as an enforcement gap. Selected ESP32 + PMS7003 sensor after evaluating cost vs. accuracy."],
            ["2025 Q2 — Prototype","First Sensor Node & API","Built the first physical sensor enclosure and the Node.js REST API. Validated PM readings against a reference monitor in a controlled test."],
            ["2025 Q3 — Dashboard","Web UI, Auth & Notifications","Launched the live dashboard with role-based access, OTP email auth, real-time AQI cards, and Web Push alerts for staff and admins."],
            ["2026 — Present","Full Deployment & Iteration","Sensor nodes active across the 4th floor. History export, CSV reporting, incident logging, and continuous UI improvements in production."],
          ].map(([yr,title,desc],i) => (
            <div key={i} className="tl-item">
              <div className="tl-dot" />
              <div className="tl-yr">{yr}</div>
              <div className="tl-title">{title}</div>
              <p className="tl-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="card" style={{ marginBottom: "1.2rem" }}>
        <span className="eyebrow">The Team</span>
        <h2 className="section">Built by ITMAWD Students</h2>
        <p className="muted" style={{ marginBottom: "1.2rem" }}>
          FreshZone is a capstone research project developed by Information Technology Mobile App and Web Development (ITMAWD) students at STI Sta. Mesa College — combining IoT hardware engineering, full-stack web development, and UX design.
        </p>
        <div className="team-grid">
          {[
            ["#004e7a,#00b4d8","KD","Project Lead","Full-Stack Dev","Node.js API, database design, sensor integration & deployment"],
            ["#0ea266,#1de9b6","UI","UI/UX Designer","Frontend Dev","Dashboard interface, design system, PWA implementation"],
            ["#7c3aed,#a855f7","HW","Hardware Lead","IoT Engineer","ESP32 firmware, sensor calibration & enclosure design"],
            ["#d97706,#fbbf24","QA","QA & Docs","Testing Lead","System testing, user documentation & presentation"],
          ].map(([grad,init,name,role,desc]) => (
            <div key={name} className="team-card">
              <div className="team-av" style={{ background: `linear-gradient(135deg,${grad})` }}>{init}</div>
              <div className="team-name">{name}</div>
              <div className="team-role">{role}</div>
              <p style={{ fontSize: ".74rem", color: "var(--txt3)", marginTop: ".45rem", lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Acknowledgements */}
      <div className="card" style={{ textAlign: "center", marginBottom: "1.2rem" }}>
        <span className="eyebrow">Acknowledgements</span>
        <h2 className="section">With Gratitude</h2>
        <p className="muted" style={{ maxWidth: 520, margin: "0 auto 1.2rem" }}>
          We thank our thesis adviser, the STI Sta. Mesa administration, and all faculty and staff members who supported this research project and gave feedback during testing phases.
        </p>
        <button className="btn btn-sm" style={{ width: "auto", display: "inline-flex" }} onClick={() => setPage("contact")}>
          <Icon n="mail" s={13} /> Send Feedback
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  PROFILE PAGE
// ════════════════════════════════════════════════════════════════════════
function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [notify, toastEl] = useToast();
  const [notifs, setNotifs] = useState(true);
  const user = { name: "Juan Dela Cruz", position: "Staff / Teacher", contact: "+63 912 345 6789", email: "jdelacruz@sti.edu.ph", empId: "02-00145", joined: "March 12, 2026", role: "Staff" };

  return (
    <div className="page-wrap" style={{ maxWidth: 760 }}>
      {/* Hero */}
      <div className="hero-section">
        <h1>My Profile</h1>
        <p>Manage your FreshZone account, notifications, and access settings.</p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: "1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
          <div className="avatar">JD</div>
          <div>
            <h2 style={{ fontFamily: "var(--fz-display)", fontSize: "1.4rem", fontWeight: 900, color: "var(--hdr)", marginBottom: 3 }}>{user.name}</h2>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              <span className="badge" style={{ fontSize: ".7rem" }}><Icon n="shield" s={11} />{user.position}</span>
              <span className="badge" style={{ fontSize: ".7rem", background: "rgba(34,197,94,.12)", borderColor: "rgba(34,197,94,.3)", color: "#065f46" }}><span className="dot dot-ok" style={{ width: 6, height: 6 }} /> Active</span>
            </div>
          </div>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto", width: "auto" }} onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        <div style={{ borderTop: "1px solid var(--cb)", paddingTop: "1rem" }}>
          {[
            ["Position", user.position],
            ["Email", user.email],
            ["Contact Number", user.contact],
            ["Employee ID", user.empId],
            ["Date Joined", user.joined],
            ["Access Level", user.role],
          ].map(([label, val]) => (
            <div key={label} className="profile-field">
              <span className="pf-lbl">{label}</span>
              {editing && label !== "Employee ID" && label !== "Date Joined" && label !== "Access Level" ? (
                <input type="text" defaultValue={val} style={{ flex: 1, padding: ".4rem .7rem", fontSize: ".85rem" }} />
              ) : (
                <span className="pf-val">{val}</span>
              )}
            </div>
          ))}
        </div>

        {editing && (
          <button className="btn btn-green" style={{ marginTop: "1rem" }} onClick={() => { setEditing(false); notify("Profile updated successfully!", "ok"); }}>
            <Icon n="check" /> Save Changes
          </button>
        )}
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: "1.2rem" }}>
        <span className="eyebrow">Notification Settings</span>
        <h2 className="section">Alert Preferences</h2>
        {[
          ["Push Notifications", "Receive browser/mobile push alerts when AQI exceeds Moderate threshold", notifs, () => setNotifs(!notifs)],
          ["Email Alerts", "Receive email summary of detection events at end of day", true, () => notify("Email alerts updated", "ok")],
          ["Critical Alarm", "Full-screen alarm overlay when AQI exceeds 150 (Unhealthy)", true, () => notify("Alarm setting updated", "ok")],
        ].map(([label, desc, active, toggle]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".85rem 0", borderBottom: "1px solid var(--cb)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--hdr)", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: ".76rem", color: "var(--txt3)" }}>{desc}</div>
            </div>
            <div
              style={{ width: 44, height: 24, borderRadius: 12, background: active ? "#0096c7" : "#ccc", position: "relative", cursor: "pointer", flexShrink: 0, marginLeft: 16, transition: "background .25s" }}
              onClick={toggle}
            >
              <div style={{ position: "absolute", top: 3, left: active ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .25s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Security */}
      <div className="card" style={{ marginBottom: "1.2rem" }}>
        <span className="eyebrow">Security</span>
        <h2 className="section">Account Security</h2>
        <p className="muted" style={{ marginBottom: "1rem" }}>Your account is secured with email OTP verification. Change your password periodically to maintain security.</p>
        <div style={{ display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
          <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => notify("Password reset link sent to your email", "ok")}>Change Password</button>
          <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => notify("Active sessions cleared", "ok")}>Clear All Sessions</button>
        </div>
      </div>

      {/* Research Participation Badge */}
      <div className="research-notice" style={{ maxWidth: "100%", marginTop: 0 }}>
        <strong><Icon n="shield" /> Research Participation — Confidential</strong>
        <p>You are registered as an authorized participant in the FreshZone research study conducted by ITMAWD students at STI Sta. Mesa College. Your participation and the data collected are strictly confidential. Please do not disclose this system's existence or findings to students.</p>
      </div>
      {toastEl}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  CONTACT PAGE
// ════════════════════════════════════════════════════════════════════════
function ContactPage() {
  const [notify, toastEl] = useToast();
  const [msg, setMsg] = useState("");
  const [subject, setSubject] = useState("");

  return (
    <div className="page-wrap" style={{ maxWidth: 800 }}>
      {/* Hero */}
      <div className="hero-section">
        <h1>Contact &amp; Reports</h1>
        <p>Send feedback, report device issues, or flag a concern to the FreshZone research team or campus administrator.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.2rem", alignItems: "start" }} className="contact-layout">
        {/* Report Form */}
        <div className="card">
          <span className="eyebrow">Submit a Report</span>
          <h2 className="section">Send a Message</h2>
          <p className="muted" style={{ marginBottom: "1.1rem" }}>Use this form to report sensor issues, vape alert feedback, or system bugs to the admin team.</p>

          <div className="grid2">
            <div className="input-group"><label>Full Name</label><input type="text" placeholder="Juan Dela Cruz" /></div>
            <div className="input-group"><label>Email</label><input type="email" placeholder="you@email.com" /></div>
          </div>
          <div className="input-group">
            <label>Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}>
              <option value="" disabled>Select a subject</option>
              <option>Vape Alert Feedback</option>
              <option>Sensor Maintenance Request</option>
              <option>False Positive Report</option>
              <option>General Suggestion</option>
              <option>Bug Report</option>
              <option>Research Inquiry</option>
              <option>Confidentiality Concern</option>
              <option>Other</option>
            </select>
          </div>
          <div className="input-group">
            <label>Message <span style={{ float: "right", fontSize: ".7rem", color: "var(--gray)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>{msg.length}/2000</span></label>
            <textarea rows={5} placeholder="Describe the issue or feedback in detail. Include time, location, and sensor ID if relevant…" value={msg} onChange={e => setMsg(e.target.value.slice(0, 2000))} />
          </div>
          <button className="btn" onClick={() => notify("Report submitted! Admin will review shortly.", "ok")}>
            <Icon n="send" /> Submit Report
          </button>
        </div>

        {/* Contact Info Sidebar */}
        <div>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <span className="eyebrow">Contact Details</span>
            <div>
              {[
                ["linear-gradient(135deg,#004e7a,#0096c7)","mail","Research Email","freshzone.alerts@gmail.com"],
                ["linear-gradient(135deg,#065f46,#10b981)","shield","DPO Contact","freshzone.alerts@gmail.com"],
                ["linear-gradient(135deg,#7c3aed,#a855f7)","about","Institution","STI Sta. Mesa College"],
                ["linear-gradient(135deg,#d97706,#fbbf24)","bell","Dept","BSIT — ITMAWD Program"],
              ].map(([bg,icon,label,val]) => (
                <div key={label} className="contact-info-row">
                  <div className="contact-icon" style={{ background: bg }}><Icon n={icon} s={14} /></div>
                  <div>
                    <div style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--gray)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                    <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--txt)", wordBreak: "break-word" }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <span className="eyebrow">Response Time</span>
            <p className="muted" style={{ fontSize: ".8rem", marginTop: ".3rem" }}>Reports are reviewed by the admin team typically within <strong>24 hours</strong> on school days. For urgent sensor issues, please also notify your immediate supervisor.</p>
          </div>
        </div>
      </div>

      {/* PM Reference */}
      <div className="aq-guide" style={{ marginTop: "1.4rem" }}>
        <div className="aq-head"><h3>Before submitting: PM &amp; AQI reference</h3><span className="aq-chip">Shared Terms</span></div>
        <div className="aq-grid">
          <div className="aq-card"><h4>PM1.0 / PM2.5 / PM10</h4><p>Particle size groups in µg/m³. Smaller = deeper lung penetration. FreshZone monitors all three.</p></div>
          <div className="aq-card"><h4>How AQI is used</h4><p>AQI converts PM2.5 into a 0–500 scale. Readings above 100 automatically trigger staff alerts.</p></div>
          <div className="aq-card"><h4>Helpful report detail</h4><p>Include event time, sensor location, whether PM stayed elevated, and ventilation status (windows open/closed).</p></div>
        </div>
      </div>

      <style>{`@media(max-width:700px){.contact-layout{grid-template-columns:1fr!important}}`}</style>
      {toastEl}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  PRIVACY PAGE
// ════════════════════════════════════════════════════════════════════════
function PrivacyPage({ setPage }) {
  const sections = [
    { icon: "about", title: "Overview", content: "FreshZone is a campus research system operated by ITMAWD students at STI Sta. Mesa College. This Privacy Policy explains how we collect, process, store, and protect personal data as required by the Republic Act 10173 — Data Privacy Act of 2012 (DPA) of the Philippines." },
    { icon: "file", title: "Data We Collect", list: [
      "Account information: full name, employee ID, position, email address, contact number",
      "Authentication data: encrypted password hash, OTP tokens (not stored after verification), session tokens",
      "Access logs: login timestamps, IP address, device type, browser information",
      "Environmental data: PM1.0, PM2.5, PM10, AQI readings — collected from IoT sensors (no personal identifiers attached to sensor data)",
      "Communication data: messages and reports submitted through the Contact page",
    ]},
    { icon: "shield", title: "How We Use Your Data", list: [
      "To authenticate your identity and manage role-based access (Staff / Administrator)",
      "To deliver real-time vape aerosol alerts via push notifications and email",
      "To log and review detection events for research documentation and administrative action",
      "To maintain audit trails for security and compliance purposes",
      "To contact you for research-related updates and account communications",
    ]},
    { icon: "lock", title: "Confidentiality & Research Ethics", content: "This research is classified as confidential. All participants (staff, teachers, administrators) are required to maintain the confidentiality of the system, its findings, and its existence. Under no circumstances should this platform's operation or detection data be disclosed to students of STI Sta. Mesa College, as doing so would compromise the integrity and safety outcomes of the research. Breach of confidentiality may result in removal of system access." },
    { icon: "shield", title: "Data Storage & Security", list: [
      "All personal data is stored in an encrypted MySQL database hosted on a secured server",
      "Passwords are hashed using bcrypt — we never store plaintext passwords",
      "CSRF tokens protect all authenticated API requests",
      "OTP codes expire within 10 minutes and are invalidated after use",
      "Session tokens are rotated on each login and invalidated on logout",
      "Data transmission is encrypted via HTTPS/TLS",
    ]},
    { icon: "user", title: "Your Rights Under the DPA", list: [
      "Right to be informed about how your data is processed",
      "Right to access a copy of your personal data held by FreshZone",
      "Right to correct inaccurate or incomplete personal information",
      "Right to object to processing for specific purposes",
      "Right to erasure or blocking of data under certain conditions",
      "Right to data portability (export of your account data in CSV format)",
    ]},
    { icon: "clock", title: "Data Retention", content: "Account data is retained for the duration of the research period and for one (1) year thereafter. Environmental sensor data is retained indefinitely for longitudinal research analysis but contains no personal identifiers. Access logs are retained for six (6) months for security purposes." },
    { icon: "mail", title: "Contact & DPO", content: "For data privacy concerns, requests, or inquiries, contact our Data Protection Officer (DPO) at: freshzone.alerts@gmail.com. We will respond to all requests within ten (10) working days as required by the National Privacy Commission." },
  ];

  return (
    <div className="page-wrap" style={{ maxWidth: 820 }}>
      {/* Legal Hero */}
      <div className="legal-hero">
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#004e7a,#0096c7)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white", marginBottom: "1rem" }}>
          <Icon n="shield" s={22} />
        </div>
        <h1 style={{ fontFamily: "var(--fz-display)", fontSize: "1.8rem", fontWeight: 900, color: "var(--hdr)", marginBottom: ".5rem" }}>Privacy Policy</h1>
        <p className="muted">FreshZone — Campus Vape Aerosol Detection System</p>
        <p style={{ fontSize: ".76rem", color: "var(--gray)", marginTop: ".5rem" }}>Effective: April 26, 2026 · Last updated: May 1, 2026 · Governed by RA 10173 — Data Privacy Act of 2012</p>
      </div>

      {sections.map((s, i) => (
        <div key={i} className="legal-section">
          <h2><Icon n={s.icon} s={16} /> {i + 1}. {s.title}</h2>
          {s.content && <p>{s.content}</p>}
          {s.list && <ul>{s.list.map((item, j) => <li key={j}>{item}</li>)}</ul>}
        </div>
      ))}

      <footer>
        <p>© 2026 FreshZone — STI Sta. Mesa College · ITMAWD Research Project</p>
        <p><span style={{ cursor: "pointer", color: "var(--p2)", fontWeight: 600 }} onClick={() => setPage("terms")}>Terms of Service</span> · <a href="mailto:freshzone.alerts@gmail.com" style={{ color: "var(--p2)", fontWeight: 600 }}>freshzone.alerts@gmail.com</a></p>
      </footer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  TERMS PAGE
// ════════════════════════════════════════════════════════════════════════
function TermsPage({ setPage }) {
  const sections = [
    { icon: "about", title: "Acceptance of Terms", content: "By creating an account and accessing FreshZone, you agree to these Terms of Service in full. These terms constitute a binding agreement between you and the FreshZone research team. If you do not agree, do not use this platform. Access is granted exclusively to STI Sta. Mesa College personnel authorized by the research team." },
    { icon: "user", title: "Eligibility & Authorized Users", list: [
      "FreshZone is strictly limited to STI Sta. Mesa College staff, teachers, and administrators",
      "Access is granted only after identity verification via Employee ID, institutional email, and OTP",
      "Students are explicitly prohibited from accessing this system",
      "Sharing account credentials with any unauthorized person is a violation of these Terms",
      "Accounts may be revoked at any time without notice if eligibility criteria are not met",
    ]},
    { icon: "shield", title: "Confidentiality Obligations", list: [
      "You agree to maintain strict confidentiality regarding the existence, purpose, and operation of FreshZone",
      "You must not disclose detection events, system alerts, or research findings to students",
      "You must not share screenshots, exports, or data outputs with unauthorized parties",
      "You understand that this system is part of an ongoing academic research study",
      "Violation of this obligation may result in immediate account termination and academic consequences",
    ]},
    { icon: "dashboard", title: "Acceptable Use", list: [
      "Use FreshZone only for monitoring air quality and responding to vape aerosol detection alerts",
      "Do not attempt to access, modify, or delete data belonging to other users",
      "Do not use the platform to harass, discriminate against, or surveil individual students",
      "Do not exploit, reverse-engineer, or attempt to bypass authentication or security mechanisms",
      "Do not submit false reports or manipulate sensor data",
    ]},
    { icon: "bell", title: "Alerts & Response Obligations", content: "Administrators who receive vape detection alerts are expected to respond promptly and appropriately in accordance with campus policies. FreshZone provides detection data as an investigative tool — it does not automatically identify individuals. All enforcement actions must follow established STI Sta. Mesa disciplinary procedures." },
    { icon: "file", title: "Data & Intellectual Property", content: "All sensor data, algorithms, system designs, and research materials produced by the FreshZone project are the intellectual property of the ITMAWD research team and STI Sta. Mesa College. You may not reproduce, distribute, or commercialize any part of this system or its data without explicit written consent from the research advisers." },
    { icon: "warn", title: "Limitation of Liability", content: "FreshZone is a student research prototype. While we strive for accuracy, we do not guarantee 100% detection reliability. False positives and sensor outages may occur. The platform is provided 'as is' without warranties of any kind. The research team shall not be liable for enforcement actions taken based solely on system alerts without proper investigation." },
    { icon: "lock", title: "Termination", content: "The research team reserves the right to suspend or terminate access to FreshZone at any time, for any reason, without prior notice. Grounds for termination include but are not limited to: breach of confidentiality, unauthorized access attempts, misuse of alert data, or end of the research period." },
    { icon: "clock", title: "Governing Law", content: "These Terms are governed by the laws of the Republic of the Philippines, including Republic Act 10173 (Data Privacy Act of 2012) and other applicable national legislation. Disputes shall be resolved through the appropriate regulatory bodies or courts of the Philippines." },
  ];

  return (
    <div className="page-wrap" style={{ maxWidth: 820 }}>
      {/* Legal Hero */}
      <div className="legal-hero">
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white", marginBottom: "1rem" }}>
          <Icon n="file" s={22} />
        </div>
        <h1 style={{ fontFamily: "var(--fz-display)", fontSize: "1.8rem", fontWeight: 900, color: "var(--hdr)", marginBottom: ".5rem" }}>Terms of Service</h1>
        <p className="muted">FreshZone — Campus Vape Aerosol Detection System</p>
        <p style={{ fontSize: ".76rem", color: "var(--gray)", marginTop: ".5rem" }}>Effective: April 26, 2026 · Last updated: May 1, 2026</p>
        <div style={{ marginTop: "1rem", background: "rgba(255,230,100,.16)", border: "1.5px solid rgba(200,160,0,.3)", borderRadius: 12, padding: "10px 14px", display: "inline-flex", gap: 8, alignItems: "flex-start", textAlign: "left", maxWidth: 500 }}>
          <Icon n="warn" s={15} />
          <p style={{ fontSize: ".77rem", color: "#6b4400", fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
            This platform is strictly confidential. By using FreshZone, you agree to maintain the confidentiality of this research system and its findings at all times.
          </p>
        </div>
      </div>

      {sections.map((s, i) => (
        <div key={i} className="legal-section">
          <h2><Icon n={s.icon} s={16} /> {i + 1}. {s.title}</h2>
          {s.content && <p>{s.content}</p>}
          {s.list && <ul>{s.list.map((item, j) => <li key={j}>{item}</li>)}</ul>}
        </div>
      ))}

      <footer>
        <p>© 2026 FreshZone — STI Sta. Mesa College · ITMAWD Research Project</p>
        <p><span style={{ cursor: "pointer", color: "var(--p2)", fontWeight: 600 }} onClick={() => setPage("privacy")}>Privacy Policy</span> · <a href="mailto:freshzone.alerts@gmail.com" style={{ color: "var(--p2)", fontWeight: 600 }}>freshzone.alerts@gmail.com</a></p>
      </footer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  APP ROOT
// ════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("auth");
  const [dark, setDark] = useState(false);

  return (
    <div className={dark ? "dark" : ""} style={{ minHeight: "100vh" }}>
      <style>{CSS}</style>

      {page !== "auth" && <Nav page={page} setPage={setPage} dark={dark} setDark={setDark} />}
      {page !== "auth" && <Smoke />}

      {page === "auth" && <AuthPage setPage={setPage} />}
      {page === "dashboard" && <DashboardPage />}
      {page === "history" && <HistoryPage />}
      {page === "about" && <AboutPage setPage={setPage} />}
      {page === "profile" && <ProfilePage />}
      {page === "contact" && <ContactPage />}
      {page === "privacy" && <PrivacyPage setPage={setPage} />}
      {page === "terms" && <TermsPage setPage={setPage} />}

      {/* Bottom nav for legal pages */}
      {(page === "privacy" || page === "terms") && (
        <div style={{ position: "fixed", bottom: "1rem", left: "50%", transform: "translateX(-50%)", zIndex: 200 }}>
          <button className="btn btn-sm" style={{ width: "auto", boxShadow: "0 8px 24px rgba(0,50,100,.3)" }} onClick={() => setPage("auth")}>
            ← Back to Login
          </button>
        </div>
      )}
    </div>
  );
}
