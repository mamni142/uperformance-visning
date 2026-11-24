/* ============================================================================================================
   Uperformance CRM – guidemotorn (window.UPGuide), 2026-11-23.
   Grunden, idén och strukturen från Legohus-guiden (idealhus/crm/guide): guidemenyn "Lär dig CRM:et" med kurser,
   spotlight-turer med ett urklipp runt det man ska titta på och en glasruta med stegräknare, "Prova själv"-steg som
   går vidare när användaren gjort handlingen, framsteg per konto, fortsätt där man slutade, ? öppnar menyn,
   → ← Esc i turen och start via ?tur=<id>. Gjort bättre:
   - Slöjan är fyra paneler + fyra rundade hörn som bara flyttas och skalas (transform) – inga hopp, ingen förvrängd
     radie. Hålet och rutan glider i EN tween (420 ms, menyns kurva) och följer annars målet direkt (ingen släpning).
   - Mäts bara när något ändrats (scroll, resize, visualViewport, ResizeObserver, MutationObserver, menyns glidning).
   - Rutan placeras av en ren funktion (placera) som aldrig lägger den utanför fönstret (12 px kant), ger en högsta
     höjd med rullande text i stället för att klippa, räknar bort toppraden/flikraden/säkra kanter och aldrig lägger
     rutan över hålet i ett Prova själv-steg. Mobil (≤ 640 px): ett ark i den kant där det finns plats.
   - Lagret är en popover i översta lagret och flyttas in i det öppna arket (dialog.showModal) eller helskärmen,
     så att rutan aldrig hamnar under ett ark eller blir inert.
   - Esc och pilarna tar inte tangenterna från listor, fält och ark; fokus lämnas tillbaka när turen slutar;
     stegbyten läses upp (aria-live); Tab stannar i rutan (och målet när steget är interaktivt).
   - Övningsläget (tur.ovning) bara i demoläget, kopian i sessionStorage, och aldrig i skarpt läge.
   - Hoppade steg loggas (console.debug + lage().hoppade) så att ett testskript kan underkänna en tur.

   TUR-FORMATET (turerna skrivs i crm/guide-turer.js och lämnas till UPGuide.registrera):
   {
     id: 'kunder-ny',               // unik, stabil (sparas i framstegen)
     rubrik: 'Lägg in en kund',      // turens namn i menyn (namn: godtas också)
     beskrivning: 'Kort text',       // valfri, en rad i menyn
     kurs: 'kunder',                 // kursens id = kapitlets id i UPHjalpInnehall.guide (kom-igang, oversikt, kunder …)
     roller: ['salj', 'chef'],       // valfri: salj | test | chef | admin (tom = alla)
     sida: '#/kunder',               // valfri: sidan turen börjar på (gäller första steget som saknar egen sida)
     vy: 'kunder',                   // valfri: hashens första del – turen föreslås när man står där (annars ur sida)
     ovning: false,                  // valfri: kör mot en kopia av datan (bara demoläget), allt återställs efteråt
     nasta: 'kunder-kontakt',        // valfri: turen som föreslås i klarkortet
     klarRubrik, klarText,           // valfria: klarkortets text
     dold: false,                    // valfri: syns inte i menyn (kan startas med ?tur=)
     steg: [{
       id: 'lista',                  // valfri men rekommenderad: stabil nyckel för "fortsätt där du slutade"
       mal: '[data-g="ny-kund"]',    // väljare, lista med väljare (första synliga vinner), element eller fn(ctx). Utan mal = rutan mitt på.
       mobilMal: '.flikrad [data-nav-till="kunder"]', // valfri: provas först under 1000 px (mobil/surfplatta), sist annars
       rubrik: 'Ny kund',
       text: 'HTML – bara turernas egen text, aldrig data från CRM:et',
       sida: '#/kunder',             // valfri: sträng eller fn(ctx). Navigerar dit om hashen skiljer sig (sidaPrefix: true = räcker att börja så)
       prova: true,                  // Prova själv: steget går vidare när klar(ctx) blir sant
       klar: (ctx) => boolean,       // villkoret (kollas vid klick, input, change, hashchange, handelse och var 250:e ms)
       handelse: 'up:tema',          // valfri: en händelse på window som räknas som klar (eller som utlöser en kontroll av klar)
       gor: 'Klicka på Ny kund.',    // uppmaningen i Prova själv-rutan
       bra: 'Snyggt!',               // berömmet när det är gjort
       vanta: true,                  // användaren ska klicka på målet (klicket utlöser klar, eller går vidare om klar saknas)
       gorSjalv: (el, ctx) => {},    // valfri: knappen "Gör det åt mig"
       fyll: { '[name="namn"]': 'Exempel AB' }, // valfri: knappen "Fyll i exempel"
       om: (ctx) => boolean,         // valfri: steget visas bara när villkoret är sant
       roller: ['chef'],             // valfri: steget bara för vissa roller
       valfri: true,                 // valfri: leta bara kort efter målet (2 s)
       fore: (ctx) => {},            // valfri: körs före steget (får returnera ett löfte); i Prova själv-steg bara första gången
       efter: (ctx) => {},           // valfri: körs när steget lämnas (nästa, tillbaka, klar, stäng) – t.ex. stänga ett ark fore öppnade
       placering: 'under',           // valfri: under | over | hoger | vanster (provas först)
       luft: 8,                      // valfri: luft runt målet i px
       fri: true,                    // valfri: målet går att klicka även i ett visningssteg
       fritt: true,                  // valfri: hela sidan går att klicka (ingen spärr)
       behallArk: true,              // valfri: stäng inte ett öppet ark när steget byter sida
       undvik: ['.chf'],             // valfri: rutan läggs helst inte över dessa
       skylt: 'Klicka här'           // valfri: liten etikett vid ramen
     }]
   }
   ctx = { el, steg, tur, n, crm (window.UPCRM), db, jag, data (delas av turens steg), $, $$, hash }

   API: UPGuide.registrera(tur | [turer]) · starta(id, { fran, auto }) · stang({ tyst }) · nasta() · forra() · fortsatt()
        oppnaMeny() · stangMeny() · vaxlaMeny() · peka(mal, { sida, rubrik, text }) · klara() · turer · kurser
        registreraKurser([{ id, namn, ikon, text, roller }]) · tur(id) · turForSidan() · nastaTur() · lage() · nollstall()
        menyHtml() (samma innehåll i en vy) · knappHtml() · _placera (ren funktion för test).
   Händelsen 'up:guide' på window: { typ: start | steg | klar | slut, tur, steg, n }.
   Lagring per konto: up-guide-klara:<konto> { turId: ISO }, up-guide-pagar:<konto> { id, stegId, n, tid },
   up-guide-sett:<konto>. Övningens kopia: sessionStorage up-guide-ovning.
   Som CRM-modul: window.UPGuide.modul(BYGG) → { vagar: [[/^#\/lar$/, …]], G: guide-oppna, guide-starta, guide-fortsatt, guide-nollstall }.
   Inga inline-skript, inga onclick (CSP). Ikoner ur spriten i index.html.
   ============================================================================================================ */
(() => {
  'use strict';
  const D = document, R = document.documentElement;
  const SKARP = !!(window.UP_SKARPT && window.UP_SKARPT.lage === 'skarp');
  const GLID_MS = 420;
  const KANT = 12;
  const lugnMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const lugn = () => lugnMQ.matches;
  const mobil = () => innerWidth <= 640;
  const smal = () => innerWidth < 1000; // CRM:ets mobil-/surfplattelayout (topprad + flikrad, ingen sidomeny)
  const $ = (s, r = D) => r.querySelector(s);
  const $$ = (s, r = D) => Array.from(r.querySelectorAll(s));
  const e = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ik = (n, k = '') => `<svg class="ikon${k ? ' ' + k : ''}" aria-hidden="true"><use href="#i-${D.getElementById('i-' + n) ? n : 'kompass'}"/></svg>`;
  const kor = (fn, ...a) => { try { return fn(...a); } catch (err) { console.debug('[guide]', err); return undefined; } };
  const klam = (v, a, b) => Math.max(a, Math.min(b, v));
  const vila = (ms) => new Promise((r) => setTimeout(r, ms));
  const bild = () => new Promise((r) => requestAnimationFrame(() => r()));

  // menyns kurva cubic-bezier(.32, .72, 0, 1)
  const kurva = (() => {
    const x1 = .32, y1 = .72, x2 = 0, y2 = 1;
    const bx = (t) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
    const by = (t) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
    return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 22; i++) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; } return by(t); };
  })();

  /* --- Lagring (alltid i try/catch) ------------------------------------------------------------------------ */
  const lasJ = (lager, nyckel, std) => { try { const v = lager.getItem(nyckel); return v ? JSON.parse(v) : std; } catch (err) { return std; } };
  const skrivJ = (lager, nyckel, v) => { try { if (v == null) lager.removeItem(nyckel); else lager.setItem(nyckel, JSON.stringify(v)); } catch (err) { /* privat läge */ } };
  const LS = (() => { try { return localStorage; } catch (err) { return null; } })();
  const SS = (() => { try { return sessionStorage; } catch (err) { return null; } })();
  const konto = () => {
    const c = window.UPCRM; if (c && c.jag) return c.jag;
    if (SKARP && window.UP_SKARPT.jag) return window.UP_SKARPT.jag.id;
    try { return localStorage.getItem('up-crm-jag') || 'gs'; } catch (err) { return 'gs'; }
  };
  const nyckel = (n) => `up-guide-${n}:${konto()}`;
  const klaraObj = () => (LS ? lasJ(LS, nyckel('klara'), {}) : {}) || {};
  const pagarObj = () => (LS ? lasJ(LS, nyckel('pagar'), null) : null);

  /* --- Roller ---------------------------------------------------------------------------------------------- */
  const minaRoller = () => {
    const r = new Set(); let u = null;
    try { const c = window.UPCRM; u = c && c.db && (c.db.anvandare || []).find((x) => x.id === konto()); } catch (err) { /* ingen data än */ }
    if (!u && SKARP) u = window.UP_SKARPT.jag;
    if (!u) return r;
    if (u.roll) r.add(u.roll);
    if (u.chef) r.add('chef');
    if (u.admin || u.roll === 'admin') r.add('admin');
    return r;
  };
  const rollOk = (roller) => { if (!roller || !roller.length) return true; const m = minaRoller(); return roller.some((x) => m.has(x)); };

  /* --- Turer och kurser ------------------------------------------------------------------------------------ */
  const TURER = new Map();
  let egnaKurser = null;
  const namnFor = (t) => t.rubrik || t.namn || t.id;
  function registrera(t) {
    (Array.isArray(t) ? t : [t]).forEach((x) => {
      if (!x || !x.id || !Array.isArray(x.steg)) { console.warn('[guide] ogiltig tur', x); return; }
      x.steg.forEach((s, i) => { if (!s.id) s.id = 's' + i; });
      TURER.set(x.id, x);
    });
    if (menyEl && menyEl.matches(':popover-open')) ritaMeny();
    lankStart();
  }
  const synligaTurer = () => Array.from(TURER.values()).filter((t) => !t.dold && !t.tillfallig && rollOk(t.roller));
  const kursLista = () => {
    const bas = egnaKurser || ((window.UPHjalpInnehall && window.UPHjalpInnehall.guide) || []).map((k) => ({ id: k.id, namn: k.rubrik, ikon: k.ikon, ton: k.ton, text: k.ingress, roller: k.roller }));
    const turer = synligaTurer();
    const ut = bas.filter((k) => rollOk(k.roller)).map((k) => ({ ...k, turer: turer.filter((t) => t.kurs === k.id).map((t) => t.id) })).filter((k) => k.turer.length);
    const kanda = new Set(ut.flatMap((k) => k.turer));
    const ovriga = turer.filter((t) => !kanda.has(t.id)).map((t) => t.id);
    if (ovriga.length) ut.push({ id: 'ovrigt', namn: 'Mer att lära', ikon: 'kompass', text: 'Fler turer i CRM:et.', turer: ovriga });
    return ut;
  };
  const minuter = (t) => Math.max(1, Math.round((antalSteg(t) * 15) / 60));
  const nastaTur = () => { const k = klaraObj(); for (const kurs of kursLista()) for (const id of kurs.turer) if (!k[id]) return TURER.get(id); return null; };
  const vyFor = (t) => (t.vy != null ? t.vy : String(t.sida || (t.steg[0] && typeof t.steg[0].sida === 'string' ? t.steg[0].sida : '') || '').split('/')[1] || '');
  const turForSidan = () => {
    const del = (location.hash || '#/').split('/'); const vy = (del[1] || '').split('?')[0];
    const k = klaraObj(); const alla = synligaTurer().filter((t) => vyFor(t) === vy && (!t.vyDel || t.vyDel === del[2]));
    return alla.find((t) => !k[t.id]) || alla[0] || null;
  };

  /* --- Lagret (popover i översta lagret, återanvänds) ------------------------------------------------------- */
  let rot = null, P = {}, ring = null, ruta = null, kort = null, sr = null, sa = null;
  function lager() {
    if (rot) return rot;
    rot = D.createElement('div');
    rot.className = 'upg'; rot.setAttribute('data-upg-rot', '');
    try { rot.popover = 'manual'; } catch (err) { /* äldre webbläsare: vanligt fast lager */ }
    rot.innerHTML = `<div class="upg-slo" aria-hidden="true">
        <i class="upg-p" data-p="t"></i><i class="upg-p" data-p="b"></i><i class="upg-p" data-p="v"></i><i class="upg-p" data-p="h"></i>
        <i class="upg-p upg-las" data-p="las"></i>
        <i class="upg-h" data-h="tv"></i><i class="upg-h" data-h="th"></i><i class="upg-h" data-h="bv"></i><i class="upg-h" data-h="bh"></i>
      </div>
      <div class="upg-ring" aria-hidden="true"><span class="upg-skylt"></span></div>
      <section class="upg-ruta" role="dialog" aria-modal="false" aria-labelledby="upg-rubrik" aria-describedby="upg-text"><div class="upg-kort" tabindex="-1"></div></section>
      <p class="upg-sr" aria-live="polite" aria-atomic="true"></p>
      <i class="upg-sa" aria-hidden="true"></i>`;
    $$('[data-p]', rot).forEach((x) => { P[x.dataset.p] = x; });
    $$('[data-h]', rot).forEach((x) => { P[x.dataset.h] = x; });
    ring = $('.upg-ring', rot); ruta = $('.upg-ruta', rot); kort = $('.upg-kort', rot); sr = $('.upg-sr', rot); sa = $('.upg-sa', rot);
    // Klick utanför hålet: rutan skakar (klicket når inte sidan). Hjulet rullar det som ligger under.
    $$('.upg-p', rot).forEach((p) => {
      p.addEventListener('pointerdown', (ev) => { ev.preventDefault(); skaka(); });
      p.addEventListener('wheel', vidareHjul, { passive: true });
    });
    rot.addEventListener('click', rotKlick);
    // Ett tryck på rutans knappar tar inte fokus från sidan (sökfältet stängde annars sin träfflista mitt i klicket,
    // rutan flyttade sig och klicket tappades), och rutan står still tills knappen släpps
    kort.addEventListener('mousedown', (ev) => { if (ev.target.closest('button, summary')) ev.preventDefault(); });
    kort.addEventListener('pointerdown', () => { if (A) A.pekNere = true; });
    const slapp = () => { if (!A || !A.pekNere) return; A.pekNere = false; if (A.vantarMat) { A.vantarMat = false; setTimeout(smuts, 0); } };
    addEventListener('pointerup', slapp, true); addEventListener('pointercancel', slapp, true);
    kort.addEventListener('scroll', markeraRull, true);
    D.body.appendChild(rot);
    matVy();
    return rot;
  }
  const visaLager = () => { if (!rot) return; try { if (rot.popover && !rot.matches(':popover-open')) rot.showPopover(); } catch (err) { /* ignorera */ } };
  // Flytta in lagret i det översta öppna modala arket eller helskärmen – annars hamnar det under och blir inert
  function vard() {
    const fs = D.fullscreenElement; if (fs && fs !== R && fs !== D.body) return fs;
    const modala = $$('dialog[open]').filter((d) => { try { return d.matches(':modal'); } catch (err) { return true; } });
    return modala[modala.length - 1] || D.body;
  }
  function hissa(el, alltid = false) {
    if (!el) return;
    const v = vard(); const oppen = (() => { try { return el.matches(':popover-open'); } catch (err) { return false; } })();
    if (el.parentNode !== v) {
      v.appendChild(el); alltid = true;
      // flyttat in i (eller ut ur) ett ark som självt glider: koordinaterna hoppar en bildruta – rutan tonar in i stället (mobilens Mer-ark)
      if (el === rot && ruta && ruta.animate && !lugn()) { tw = null; ruta.animate([{ opacity: 0 }, { opacity: 0, offset: .35 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' }); }
    }
    if (!el.popover) return;
    if (!oppen || alltid) { try { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } catch (err) { /* ignorera */ } }
  }
  let hissaTimer = 0;
  const hissaSnart = () => { clearTimeout(hissaTimer); hissaTimer = setTimeout(() => { if (A && rot) { hissa(rot); smuts(); } if (menyEl && menyEl.matches(':popover-open')) hissa(menyEl); }, 0); };

  /* --- Mätning --------------------------------------------------------------------------------------------- */
  let VW = 0, VH = 0;
  function matVy() {
    VW = R.clientWidth || innerWidth; VH = R.clientHeight || innerHeight;
    if (rot) { rot.style.setProperty('--upg-w', VW + 'px'); rot.style.setProperty('--upg-h', VH + 'px'); }
  }
  const sakra = () => {
    if (!sa) return { t: 0, b: 0, l: 0, r: 0 };
    const c = getComputedStyle(sa);
    return { t: parseFloat(c.paddingTop) || 0, b: parseFloat(c.paddingBottom) || 0, l: parseFloat(c.paddingLeft) || 0, r: parseFloat(c.paddingRight) || 0 };
  };
  // Det fria fönstret: visualViewport (tangentbordet), säkra kanter och de fasta raderna (toppraden, flikraden)
  function fonster() {
    const vv = window.visualViewport;
    let x = 0, y = 0, w = VW, h = VH;
    if (vv) { x = vv.offsetLeft; y = vv.offsetTop; w = Math.min(VW, vv.width); h = Math.min(VH, vv.height); }
    const s = sakra();
    let topp = y + s.t, botten = y + h - s.b;
    for (const sel of ['.topprad', '.flikrad']) {
      const el = $(sel); if (!el || el.contains(A && A.el)) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if (getComputedStyle(el).position !== 'fixed') continue;
      if (r.top <= topp + 4 && r.bottom < y + h / 2) topp = Math.max(topp, r.bottom);
      else if (r.bottom >= botten - 4 && r.top > y + h / 2) botten = Math.min(botten, r.top);
    }
    return { x: x + s.l, y: topp, w: w - s.l - s.r, h: Math.max(120, botten - topp), vx: x, vy: y, vw: w, vh: h };
  }
  const synlig = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    const c = getComputedStyle(el); if (c.visibility === 'hidden' || c.display === 'none' || parseFloat(c.opacity) === 0 && !el.closest('[data-vilar]')) return false;
    return !el.closest('[inert]') || !!el.closest('dialog[open]');
  };
  function halFor(el, s) {
    const r = el.getBoundingClientRect(); const luft = s && s.luft != null ? s.luft : 8; const f = fonster();
    const x0 = Math.max(f.vx + 4, r.left - luft), y0 = Math.max(f.vy + 4, r.top - luft);
    const x1 = Math.min(f.vx + f.vw - 4, r.right + luft), y1 = Math.min(f.vy + f.vh - 4, r.bottom + luft);
    return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0), rad: Math.min(22, (A && A.rad != null ? A.rad : 10) + luft) };
  }

  /* --- Placeringen av rutan (ren funktion – testas av skript) ----------------------------------------------
     hal: { x, y, w, h } eller null · ruta: { w, h } (naturlig höjd) · f: fritt fönster { x, y, w, h }
     opt: { sida, mobil, skydda (lägg aldrig över hålet), hinder: [rekt] } → { x, y, w, sida, maxH } */
  function placera(hal, rt, f, opt = {}) {
    const k = KANT, gap = 14;
    const maxAlla = Math.max(140, f.h - 2 * k);
    // minsta höjd: topp + rubrik + Prova själv + fot + några rader text (mätt i naturlig()) – rutan trycks aldrig ihop under den
    const minH = Math.min(maxAlla, Math.max(140, rt.min || 0));
    const inom = (x, w) => klam(x, f.x + k, f.x + f.w - w - k);
    const inomY = (y, h) => klam(y, f.y + k, f.y + f.h - h - k);
    const ytor = (hinder, r) => hinder.reduce((s, b) => s + Math.max(0, Math.min(r.x + r.w, b.x + b.w) - Math.max(r.x, b.x)) * Math.max(0, Math.min(r.y + r.h, b.y + b.h) - Math.max(r.y, b.y)), 0);
    if (opt.mobil) {
      const w = Math.min(f.w - 32, 560); const x = f.x + (f.w - w) / 2; const tak = Math.min(560, maxAlla);
      if (!hal) { const h = Math.min(rt.h, tak); return { x, y: f.y + f.h - h - k, w, sida: 'nere', maxH: tak }; }
      const over = hal.y - f.y - gap - k, under = f.y + f.h - (hal.y + hal.h) - gap - k;
      const behov = Math.min(rt.h, tak);
      // hela rutan ryms under eller över hålet → där; annars den större sidan om minsta höjden ryms; annars får rutan
      // täcka en del av hålet (arket i den kant som har mest plats) – men aldrig krympa under minsta höjden
      const nere = under >= behov ? true : over >= behov ? false : under >= over;
      const plats = nere ? under : over;
      const maxH = klam(Math.max(plats, minH), minH, tak);
      const h = Math.min(rt.h, maxH);
      const y = nere ? f.y + f.h - h - k : f.y + k;
      return { x, y, w, sida: plats >= minH ? (nere ? 'nere' : 'uppe') : 'inne', maxH };
    }
    const w = Math.min(rt.w, f.w - 2 * k);
    if (!hal) { const h = Math.min(rt.h, maxAlla); return { x: f.x + (f.w - w) / 2, y: f.y + Math.max(k, (f.h - h) / 2 - 20), w, sida: 'mitt', maxH: maxAlla }; }
    const plats = {
      under: f.y + f.h - (hal.y + hal.h) - gap - k, over: hal.y - f.y - gap - k,
      hoger: f.x + f.w - (hal.x + hal.w) - gap - k, vanster: hal.x - f.x - gap - k,
    };
    const forslag = (sida, maxH) => {
      const h = Math.min(rt.h, maxH);
      if (sida === 'under') return { x: inom(hal.x + hal.w / 2 - w / 2, w), y: hal.y + hal.h + gap, h };
      if (sida === 'over') return { x: inom(hal.x + hal.w / 2 - w / 2, w), y: hal.y - gap - h, h };
      if (sida === 'hoger') return { x: hal.x + hal.w + gap, y: inomY(hal.y + hal.h / 2 - h / 2, h), h };
      return { x: hal.x - gap - w, y: inomY(hal.y + hal.h / 2 - h / 2, h), h };
    };
    const ordning = [opt.sida, 'under', 'over', 'hoger', 'vanster'].filter((s, i, a) => s && plats[s] != null && a.indexOf(s) === i);
    const hinder = opt.hinder || [];
    // 1) en sida där hela rutan ryms (och som inte täcker något som ska undvikas)
    for (const s of ordning) {
      const ryms = s === 'under' || s === 'over' ? plats[s] >= rt.h : plats[s] >= w && rt.h <= maxAlla;
      if (!ryms) continue;
      const p = forslag(s, maxAlla);
      if (hinder.length && ytor(hinder, { x: p.x, y: p.y, w, h: p.h }) > 0 && ordning.some((o) => o !== s && (o === 'under' || o === 'over' ? plats[o] >= rt.h : plats[o] >= w))) continue;
      return { x: p.x, y: p.y, w, sida: s, maxH: maxAlla };
    }
    // 2) i sidled med full höjd, eller ovanför/under med rullande text – men aldrig under minsta höjden. Ett stort mål
    //    (mer än 45 % av fönstret) i ett visningssteg: hellre ett hörn inuti målet än en hoptryckt ruta under 200 px.
    const sidled = plats.hoger >= plats.vanster ? 'hoger' : 'vanster';
    if (plats[sidled] >= w) { const p = forslag(sidled, maxAlla); return { x: p.x, y: p.y, w, sida: sidled, maxH: maxAlla }; }
    const lodrat = plats.under >= plats.over ? 'under' : 'over';
    const stortMal = hal.w * hal.h > .45 * f.w * f.h;
    const golv = !opt.skydda && stortMal ? Math.max(minH, Math.min(rt.h, 200)) : minH;
    if (plats[lodrat] >= golv) { const p = forslag(lodrat, plats[lodrat]); return { x: p.x, y: p.y, w, sida: lodrat, maxH: plats[lodrat] }; }
    // 3) inget ryms: ett hörn som täcker hålet (och sidomenyn, hindren) så lite som möjligt – med minst minsta höjden
    const h = Math.min(rt.h, opt.skydda ? Math.max(minH, plats.under, plats.over) : maxAlla);
    const horn = [[f.x + k, f.y + f.h - h - k], [f.x + f.w - w - k, f.y + f.h - h - k], [f.x + f.w - w - k, f.y + k], [f.x + k, f.y + k]];
    const mjuka = opt.mjuka || [];
    let bast = null;
    for (const [x, y] of horn) { const r = { x, y, w, h }; const o = ytor([hal, ...hinder], r) + ytor(mjuka, r) * 1.5; if (!bast || o < bast.o - 1) bast = { x, y, o }; }
    return { x: bast.x, y: bast.y, w, sida: 'inne', maxH: Math.max(h, minH) };
  }

  /* --- Ritning: slöjan, ramen och rutan (bara transform/opacity) -------------------------------------------- */
  let vis = null; // det som syns nu: { hal: {x,y,w,h,rad}, rx, ry }
  let tw = null;  // pågående glidning { fran, till, t0, dur }
  function ritaSlo(h) {
    const W = VW || 1, H = VH || 1;
    const dpr = devicePixelRatio || 1; const snap = (v) => Math.round(v * dpr) / dpr;
    const t = snap(klam(h.y, 0, H)), b = snap(klam(h.y + h.h, 0, H)), l = snap(klam(h.x, 0, W)), r = snap(klam(h.x + h.w, 0, W));
    const mitt = Math.max(0, b - t) / H;
    P.t.style.transform = `scale(1, ${t / H})`;
    P.b.style.transform = `translate3d(0, ${b}px, 0) scale(1, ${(H - b) / H})`;
    P.v.style.transform = `translate3d(0, ${t}px, 0) scale(${l / W}, ${mitt})`;
    P.h.style.transform = `translate3d(${r}px, ${t}px, 0) scale(${(W - r) / W}, ${mitt})`;
    P.las.style.transform = `translate3d(${l}px, ${t}px, 0) scale(${Math.max(0, r - l) / W}, ${mitt})`;
    const rad = Math.max(0, Math.min(h.rad || 0, (r - l) / 2, (b - t) / 2)); const k = rad / 32;
    P.tv.style.transform = `translate3d(${l}px, ${t}px, 0) scale(${k})`;
    P.th.style.transform = `translate3d(${r - rad}px, ${t}px, 0) scale(${k})`;
    P.bv.style.transform = `translate3d(${l}px, ${b - rad}px, 0) scale(${k})`;
    P.bh.style.transform = `translate3d(${r - rad}px, ${b - rad}px, 0) scale(${k})`;
  }
  // Det fria fönstrets kanter (sätts i mat): rutan hålls inom dem i varje bildruta – även mitt i en glidning där rutan
  // redan fått nästa stegs höjd
  let ram = null;
  function rita(v) {
    ritaSlo(v.hal);
    let y = v.ry, x = v.rx;
    if (ram && kort) {
      const hh = kort.offsetHeight, ww = kort.offsetWidth;
      y = Math.max(ram.topp, Math.min(y, ram.botten - hh));
      if (ww && VW) x = Math.max(KANT, Math.min(x, VW - ww - KANT)); // även i sidled – en bildruta mitt i ett byte låg annars utanför
    }
    ruta.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  }
  const blanda = (a, b, t) => a + (b - a) * t;
  function tweenSteg(nu) {
    if (!tw) return;
    const p = tw.dur ? klam((nu - tw.t0) / tw.dur, 0, 1) : 1; const t = kurva(p);
    const f = tw.fran, m = tw.till;
    vis = {
      hal: tw.baraRuta ? { ...m.hal } : { x: blanda(f.hal.x, m.hal.x, t), y: blanda(f.hal.y, m.hal.y, t), w: blanda(f.hal.w, m.hal.w, t), h: blanda(f.hal.h, m.hal.h, t), rad: blanda(f.hal.rad, m.hal.rad, t) },
      rx: blanda(f.rx, m.rx, t), ry: blanda(f.ry, m.ry, t),
    };
    rita(vis);
    if (p < 1) { requestAnimationFrame(tweenSteg); return; }
    tw = null; vis = m; R.removeAttribute('data-upg-glider'); rot && rot.removeAttribute('data-glider'); visaRing();
  }
  // baraRuta: rutan byter plats men hålet står där målet är – ramen följer hålet hela tiden
  function satMal(m, glid, baraRuta = false) {
    if (!vis || !glid || lugn()) {
      if (tw) { tw.till = m; if (tw.baraRuta) visaRing(); return; }
      vis = m; rita(m); visaRing(); return;
    }
    const igang = !!tw;
    tw = { fran: vis, till: m, t0: performance.now(), dur: GLID_MS, baraRuta: baraRuta && (!igang || tw.baraRuta) };
    rot.setAttribute('data-glider', ''); if (!tw.baraRuta) ring.removeAttribute('data-syns');
    // rita utgångsläget direkt (inom fönstret med det nya innehållets höjd) – annars målades en bildruta med den
    // gamla platsen och det nya, högre innehållet, och rutan stack ut under kanten
    if (!igang) { rita(vis); requestAnimationFrame(tweenSteg); }
    if (tw.baraRuta) visaRing();
  }
  function visaRing() {
    if (!A || !A.hal || (tw && !tw.baraRuta)) { ring.removeAttribute('data-syns'); return; }
    const h = A.hal; const k = [h.w, h.h, h.rad].map(Math.round).join();
    if (k !== ring.dataset.k) { ring.dataset.k = k; ring.style.width = Math.round(h.w) + 'px'; ring.style.height = Math.round(h.h) + 'px'; ring.style.borderRadius = Math.round(h.rad) + 'px'; }
    ring.style.transform = `translate3d(${Math.round(h.x)}px, ${Math.round(h.y)}px, 0)`;
    ring.setAttribute('data-syns', '');
  }

  // När sidan senast rullades – ett mål som flyttar sig långt UTAN rullning har flyttats av en omritning (menyn som anpassar sig,
  // en entré): då glider hålet dit i stället för att hoppa (guideteamets fynd: 160–170 px på en bildruta i Dokument och Kom igång)
  let senastRull = 0; const noteraRull = () => { senastRull = performance.now(); };
  // EN mätning per smutsig bildruta
  let smutsig = false, nyckelNu = '';
  function smuts() { if (smutsig || !A) return; smutsig = true; requestAnimationFrame(() => { smutsig = false; mat(false); }); }
  function mat(glid) {
    if (!A || !rot) return;
    // mellan två steg (nästa mål letas fram och rullas fram) står hålet och rutan still – det gamla målet följs inte ut ur bild
    if (!A.s && !glid && vis && !rot.hasAttribute('data-klar')) return;
    const s = A.s; let el = A.el;
    if (s && s.mal && (!el || !el.isConnected || !synlig(el))) {
      // ett mål som tonar in efter en omritning byts inte mot ett reservmål – hålet står kvar tills det syns
      const r = hittaInfo(s, A.ctx); const ny = r.el && !r.tidig ? r.el : null;
      if (ny) bytEl(ny); el = ny;
    }
    if (el) { A.hal = halFor(el, s); A.saknas = 0; }
    else if (s && s.mal && A.hal) { if (!A.saknas) A.saknas = performance.now(); if (performance.now() - A.saknas > 1500) A.hal = null; }
    else if (!s || !s.mal) A.hal = null;
    const f = fonster();
    const nat = naturlig();
    const rekt = (x) => { const r = x.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const hinder = (s && s.undvik ? [].concat(s.undvik) : []).flatMap((q) => $$(q)).filter(synlig).map(rekt);
    // sidomenyn är ett mjukt hinder: rutan läggs helst inte i hörnet över den (när målet inte ligger i den)
    const meny = !smal() && $('#sidomeny'); const mjuka = meny && synlig(meny) && !(el && meny.contains(el)) ? [rekt(meny)] : [];
    const p0 = placera(A.hal, nat, f, { sida: (s && s.placering) || (el && el.closest('#sidomeny, .sido-rals') ? 'hoger' : undefined), mobil: mobil(), skydda: !!(s && (s.prova || s.vanta)), hinder, mjuka });
    // sista skyddet: rutan ligger alltid helt i det fria fönstret, vad placeringen än räknat fram
    const hojd = Math.min(nat.h, p0.maxH);
    ram = { topp: f.y + KANT, botten: f.y + f.h - KANT };
    const p = { ...p0, x: klam(p0.x, f.x + KANT, Math.max(f.x + KANT, f.x + f.w - p0.w - KANT)), y: klam(p0.y, f.y + KANT, Math.max(f.y + KANT, f.y + f.h - hojd - KANT)) };
    const h = A.hal || { x: VW / 2, y: VH / 2, w: 0, h: 0, rad: 0 };
    const k = [h.x, h.y, h.w, h.h, p.x, p.y, p.w, p.maxH, VW, VH].map((v) => Math.round(v)).join(',');
    if (k === nyckelNu && !glid) { if (!tw && A.hal && !ring.hasAttribute('data-syns')) visaRing(); return; }
    // Medan en pekare är nedtryckt i rutan står rutan still – annars kan knappen flytta sig under musen och klicket tappas
    if (A.pekNere && vis && !glid) { A.vantarMat = true; return; }
    nyckelNu = k;
    ruta.style.setProperty('--upg-maxh', Math.round(p.maxH) + 'px');
    ruta.style.width = mobil() ? Math.round(p.w) + 'px' : '';
    ruta.setAttribute('data-sida', p.sida);
    // ett byte av placering (rutan flyttar mer än några px på en gång) glider i stället för att hoppa;
    // att följa ett mål som rullar eller växer sker direkt (då rör sig hålet och rutan tillsammans)
    // (hålet följer målet direkt även då – bara rutan glider)
    const hopp = !!(vis && !glid && !tw && (Math.abs((vis.hal.x - h.x) - (vis.rx - p.x)) > 24 || Math.abs((vis.hal.y - h.y) - (vis.ry - p.y)) > 24));
    const flyttad = !!(vis && !glid && !tw && performance.now() - senastRull > 160 && (Math.abs(vis.hal.x - h.x) > 48 || Math.abs(vis.hal.y - h.y) > 48));
    // mobil: arket som byter kant (uppe ⇄ nere) tonar över på plats – en glidning tvärs över skärmen gav ett hopp på 600 px
    const kantByte = mobil() && vis && A.kant && A.kant !== p.sida && Math.abs(vis.ry - p.y) > 160;
    A.kant = p.sida;
    if (kantByte) { if (tw) tw = null; rot.removeAttribute('data-glider'); vis = { hal: { ...h }, rx: p.x, ry: p.y }; rita(vis); visaRing(); if (!lugn() && ruta.animate) ruta.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' }); requestAnimationFrame(markeraRull); return; }
    satMal({ hal: { ...h }, rx: p.x, ry: p.y }, glid || hopp || flyttad, !glid && !flyttad && hopp);
    requestAnimationFrame(markeraRull);
  }
  // Naturlig höjd oberoende av den höjd rutan fått – annars kan placeringen svänga mellan två lägen
  function naturlig() {
    const t = $('.upg-text', kort);
    const h = kort.offsetHeight + (t ? t.scrollHeight - t.clientHeight : 0);
    // det som aldrig rullar (topp, rubrik, Prova själv, fot) + högst tre rader text
    let min = h;
    if (t) { const rad = parseFloat(getComputedStyle(t).lineHeight) || 22; min = kort.offsetHeight - t.clientHeight + Math.min(t.scrollHeight, Math.ceil(rad * 3)); }
    return { w: kort.offsetWidth || 348, h, min };
  }
  // Rullar texten (rutan fick mindre höjd än innehållet) tonas nederkanten – en synlig signal om att det finns mer
  function markeraRull() {
    const t = kort && $('.upg-text', kort); if (!t) return;
    const rullar = t.scrollHeight - t.clientHeight > 2;
    t.toggleAttribute('data-rullar', rullar);
    t.toggleAttribute('data-slut', !rullar || t.scrollTop + t.clientHeight >= t.scrollHeight - 2);
    if (rullar) t.tabIndex = 0; else t.removeAttribute('tabindex');
  }

  // Lyssnarna: bara medan en tur visas
  let ro = null, mo = null, poll = 0, foljTill = 0;
  function starkLyssnare() {
    addEventListener('scroll', smuts, { capture: true, passive: true });
    addEventListener('scroll', noteraRull, { capture: true, passive: true });
    addEventListener('resize', vidResize, { passive: true });
    if (window.visualViewport) { visualViewport.addEventListener('resize', smuts); visualViewport.addEventListener('scroll', smuts); }
    ro = new ResizeObserver(smuts); ro.observe(kort);
    mo = new MutationObserver(() => { smuts(); }); mo.observe(D.body, { childList: true, subtree: true });
    addEventListener('up:sido', foljSnart); addEventListener('up:sido-klar', smuts);
    // Reserv för det som rör sig utan händelser (menyns glidning, entréer): en billig kontroll fyra gånger i sekunden
    poll = setInterval(() => { if (A && A.el) { const r = A.el.getBoundingClientRect(); const k = [r.left, r.top, r.width, r.height].map(Math.round).join(); if (k !== A.elNyckel) { A.elNyckel = k; smuts(); } } }, 250);
  }
  function stoppaLyssnare() {
    removeEventListener('scroll', smuts, { capture: true }); removeEventListener('scroll', noteraRull, { capture: true }); removeEventListener('resize', vidResize);
    if (window.visualViewport) { visualViewport.removeEventListener('resize', smuts); visualViewport.removeEventListener('scroll', smuts); }
    ro && ro.disconnect(); mo && mo.disconnect(); ro = mo = null;
    removeEventListener('up:sido', foljSnart); removeEventListener('up:sido-klar', smuts);
    clearInterval(poll);
  }
  function vidResize() { matVy(); smuts(); }
  // Följ varje bildruta en kort stund (menyns glidning, entréer efter sidbyte)
  function foljSnart(ms = 700) {
    const till = performance.now() + (typeof ms === 'number' ? ms : 700); const igang = foljTill > performance.now(); foljTill = Math.max(foljTill, till);
    if (igang) return;
    const loop = () => { if (!A) return; mat(false); if (performance.now() < foljTill) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  function bytEl(el) { if (A.el === el) return; if (ro && A.el) ro.unobserve(A.el); A.el = el; A.ctx.el = el; if (ro && el) ro.observe(el); }

  /* --- Hitta, förbered och rulla fram målet ----------------------------------------------------------------- */
  function kandidater(s, ctx) {
    const lista = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
    const mal = lista(typeof s.mal === 'function' ? kor(s.mal, ctx) : s.mal), mob = lista(s.mobilMal);
    return smal() ? [...mob, ...mal] : [...mal, ...mob];
  }
  // { el, i (kandidatens plats), tidig (en tidigare kandidat finns med yta men syns inte än – t.ex. mitt i en entré) }
  function hittaInfo(s, ctx, ocksaDolda = false) {
    let tidig = false; let i = -1;
    for (const k of kandidater(s, ctx)) {
      i++;
      let alla = [];
      if (k instanceof Element) alla = [k];
      else if (typeof k === 'string') { try { alla = $$(k); } catch (err) { console.debug('[guide] ogiltig väljare', k); continue; } }
      else continue;
      const s1 = alla.find(synlig); if (s1) return { el: s1, i, tidig };
      if (ocksaDolda && alla[0] && alla[0].isConnected) return { el: alla[0], i, tidig };
      if (alla.some((x) => { if (!x.isConnected) return false; const r = x.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const c = getComputedStyle(x); return c.display !== 'none' && c.visibility !== 'hidden'; })) tidig = true;
    }
    return { el: null, i: -1, tidig };
  }
  const hitta = (s, ctx, ocksaDolda = false) => hittaInfo(s, ctx, ocksaDolda).el;
  function leta(s, ctx, ms, bytt = false) {
    return new Promise((klart) => {
      let slut = false; const t0 = performance.now();
      const fardig = (el) => { if (slut) return; slut = true; clearInterval(iv); m.disconnect(); clearTimeout(letarT); A && A.tok === tok && kort.removeAttribute('data-letar'); klart(el); };
      const tok = A.tok;
      // Ett reservmål godtas först när det första målet inte har dykt upp på en stund: entréer tonar in från opacitet 0,
      // och efter ett sidbyte byggs delar av sidan (3D-scenernas text) först en stund senare
      const kolla = () => {
        if (!A || A.tok !== tok) return fardig(null);
        const r = hittaInfo(s, ctx); const tid = performance.now() - t0;
        const vantaPaForsta = r.i > 0 && ((r.tidig && tid < 900) || (bytt && tid < 1200));
        if (r.el && !vantaPaForsta) return fardig(r.el);
        if (tid > ms) fardig(r.el || null);
      };
      const m = new MutationObserver(kolla); m.observe(D.body, { childList: true, subtree: true });
      const iv = setInterval(kolla, 120);
      const letarT = setTimeout(() => { if (!slut && A && A.tok === tok) kort.setAttribute('data-letar', ''); }, 700);
      kolla();
    });
  }
  // Ligger målet i den infällda sidomenyn fälls menyn ut (och in igen när turen slutar)
  // Menyn fälls ut/in utan att valet sparas (kontots eget val står kvar); reserv: knappen på kanten
  function vaxlaSido(dold) {
    if (window.UPSido && typeof window.UPSido.satt === 'function') { window.UPSido.satt(dold, true, false, () => dispatchEvent(new Event('resize'))); return true; }
    const k = $('[data-sido-knapp]'); if (!k) return false; k.click(); return true;
  }
  async function fallUt(s, ctx) {
    if (smal() || !R.hasAttribute('data-sido-dold')) return;
    const dold = hitta(s, ctx, true); if (!dold || !dold.closest('#sidomeny')) return;
    if (!vaxlaSido(false)) return;
    A.faldaIn = true;
    await new Promise((r) => { const t = setTimeout(r, 700); addEventListener('up:sido-klar', () => { clearTimeout(t); r(); }, { once: true }); });
  }
  async function framfor(el) {
    const f = fonster(); const r = el.getBoundingClientRect();
    // mobil: arket (upp till ~42 % av höjden) står i kanten med mest plats – målet ska rymmas ovanför det, annars rullas det upp till toppen
    const ark = mobil() ? Math.min(f.h * .42, 360) : 0;
    const ok = r.top >= f.y + 8 && r.bottom <= f.y + f.h - 8 - (ark && r.height <= f.h - ark - 24 ? ark : 0) && r.left >= f.x && r.right <= f.x + f.w;
    if (!ok) {
      // mobil: alltid mot toppen (arket står då nedanför), på dator mitt i bild om målet ryms
      const stor = r.height > f.h * .7 || !!ark;
      el.scrollIntoView({ block: stor ? 'start' : 'center', inline: 'nearest', behavior: lugn() ? 'auto' : 'smooth' });
      if (!lugn()) await new Promise((klart) => { let t = 0; const slut = () => { clearTimeout(t); removeEventListener('scrollend', slut, true); klart(); }; t = setTimeout(slut, 900); addEventListener('scrollend', slut, true); });
    }
    // mobil: toppraden ligger över sidan – står målet under den efter rullningen flyttas sidan ned så mycket
    if (ark) { const q = el.getBoundingClientRect(); if (q.top < f.y + 8) scrollBy({ top: q.top - f.y - 12, behavior: 'auto' }); }
    // vänta tills läget stått still i åtta bildrutor (≈130 ms: entréer, sena bilder, menyn som anpassar sig) – med tre landade
    // sena omritningar efter att steget visats och hålet hoppade 160–200 px (guideteamets fynd i Dokument och Kom igång)
    let forra = '', still = 0;
    for (let i = 0; i < 60 && still < 8; i++) { await bild(); const q = el.getBoundingClientRect(); const k = [q.left, q.top, q.width, q.height].map(Math.round).join(); still = k === forra ? still + 1 : 0; forra = k; }
  }
  const hashOk = (sida, prefix) => { const h = location.hash || '#/'; const m = sida === '#' ? '#/' : sida; return prefix ? h.startsWith(m) : h === m || (m === '#/' && (h === '' || h === '#')); };

  /* --- Turens gång ----------------------------------------------------------------------------------------- */
  let A = null; // aktiv tur
  const handelse = (typ, extra = {}) => { try { dispatchEvent(new CustomEvent('up:guide', { detail: { typ, tur: A && A.tur.id, ...extra } })); } catch (err) { /* ignorera */ } };
  const kontext = (s, n) => ({ el: null, steg: s, tur: A.tur, n, crm: window.UPCRM, get db() { return window.UPCRM && window.UPCRM.db; }, jag: konto(), data: A.data, $, $$, get hash() { return location.hash; } });
  // Stegen som visas: rätt roll, om() sant och inte hoppade. Kommande valfria steg på samma sida kontrolleras i förväg
  // (målet finns inte → räknas inte), så att "Steg x av N" inte byter N mitt i turen.
  const egenSida = (s) => { if (s.sida == null) return false; const x = typeof s.sida === 'function' ? kor(s.sida, kontext(s, 0)) : s.sida; return !!x && !hashOk(x, s.sidaPrefix); };
  const giltiga = () => {
    const T = A.tur.steg;
    // tidigare steg ligger på samma sida om inget steg mellan dem och det som visas har en egen sida eller är ett Prova själv-steg
    let forst = A.n; while (forst > 0 && !T[forst].sida && !T[forst - 1].prova && !T[forst - 1].vanta) forst--;
    let sammaSida = true; // kommande steg ligger på sidan som visas tills ett steg byter sida (eller ett Prova själv-steg kan byta den)
    return T.filter((s, i) => {
      if (i > A.n && (egenSida(s) || (A.tur.steg[i - 1] && (A.tur.steg[i - 1].prova || A.tur.steg[i - 1].vanta) && i - 1 !== A.n))) sammaSida = false;
      if (!rollOk(s.roller) || A.hoppade.has(s.id) || A.forutgjorda.has(s.id)) return false;
      if (i === A.n || A.besokta.has(s.id)) return true;
      if (s.om && kor(s.om, kontext(s, i)) === false) return false;
      if ((i > A.n ? sammaSida : i >= forst) && s.valfri && s.mal && !s.fore && !hitta(s, kontext(s, i), true)) return false; // fore kan skapa målet (öppna ett ark)
      return true;
    });
  };
  // Antalet steg för en tur utan att den körs (menyn, Hjälp): roller och om() – samma som turen visar på den här skärmen
  function antalSteg(t) {
    if (!t || !Array.isArray(t.steg)) return 0;
    const ctx = { el: null, tur: t, crm: window.UPCRM, get db() { return window.UPCRM && window.UPCRM.db; }, jag: konto(), data: {}, $, $$, get hash() { return location.hash; } };
    return t.steg.filter((s) => rollOk(s.roller) && (!s.om || kor(s.om, { ...ctx, steg: s }) !== false)).length || t.steg.length;
  }

  function starta(id, opt = {}) {
    const tur = typeof id === 'object' ? id : TURER.get(id);
    if (!tur) { console.warn('[guide] okänd tur', id); return false; }
    if (!rollOk(tur.roller) && !opt.tvinga) { console.debug('[guide] turen gäller inte rollen', tur.id); return false; }
    if (A) stang({ tyst: true, byte: true });
    stangMeny(true);
    lager(); matVy();
    const ovning = !!tur.ovning && !SKARP && window.UPCRM && window.UPCRM.db;
    A = { tur, n: 0, tok: 0, hoppade: new Set(), klara: new Set(), besokta: new Set(), forutgjorda: new Set(), sEfter: null, sidor: {}, data: {},returFokus: D.activeElement, faldaIn: false, auto: !!opt.auto, ovning: false, behall: false };
    if (ovning) { try { const snap = JSON.stringify(window.UPCRM.db); SS && SS.setItem('up-guide-ovning', snap); A.ovning = true; } catch (err) { console.debug('[guide] ingen övningskopia', err); } }
    rot.setAttribute('data-aktiv', '');
    rot.removeAttribute('data-klar');
    R.setAttribute('data-guide', '');
    hissa(rot, true); visaLager();
    vis = null; nyckelNu = '';
    starkLyssnare();
    requestAnimationFrame(() => rot && rot.setAttribute('data-synlig', ''));
    let fran = 0;
    if (opt.fran != null) {
      const i = typeof opt.fran === 'number' ? opt.fran : tur.steg.findIndex((s) => s.id === opt.fran);
      fran = klam(i < 0 ? 0 : i, 0, tur.steg.length - 1);
      if (A.ovning) fran = 0;
      let j = fran; while (j > 0 && !tur.steg[j].sida) j--;
      if (tur.steg[j].sida || !tur.sida) fran = j; else A.forstaSida = tur.sida; // turens sida gäller det första steget som visas
    }
    A.forstaFokus = true;
    kort.innerHTML = '<div class="upg-innehall upg-laddar"><p>' + ik('kompass') + 'Öppnar rätt ställe …</p></div>';
    rot.setAttribute('data-redo', '');
    mat(false);
    handelse('start');
    visa(fran, 1);
    return true;
  }
  function stegSida(s, n, ctx) {
    if (A.forstaSida && !s.sida) { const x = A.forstaSida; A.forstaSida = null; return x; }
    A.forstaSida = null;
    if (typeof s.sida === 'function') return kor(s.sida, ctx);
    if (s.sida) return s.sida;
    if (A.tur.sida && n === A.tur.steg.findIndex((x) => rollOk(x.roller))) return A.tur.sida;
    return null;
  }
  async function visa(n, dir) {
    if (!A) return;
    const tok = ++A.tok;
    stoppaVakt();
    const steg = A.tur.steg;
    if (n >= steg.length) { klar(); return; }
    if (n < 0) n = 0;
    const s = steg[n]; const ctx = kontext(s, n);
    const vidare = () => { const nn = n + dir; return visa(nn < 0 ? n + 1 : nn, nn < 0 ? 1 : dir); };
    lamnaSteg();
    if (!rollOk(s.roller) || (s.om && kor(s.om, ctx) === false)) return vidare();
    A.n = n; A.s = null; A.ctx = ctx; A.klarat = false;
    ring && ring.removeAttribute('data-syns'); // ramen tonar bort medan nästa mål letas fram
    // fore körs vid varje besök – utom i ett Prova själv-steg man redan besökt (utgångsläget står kvar när man går tillbaka)
    const arkFore = $('dialog[open]');
    if (s.fore && !((s.prova || s.vanta) && A.besokta.has(s.id))) { try { await s.fore(ctx); } catch (err) { console.debug('[guide] fore', err); } if (!A || A.tok !== tok) return; }
    A.besokta.add(s.id);
    if ($('dialog[open]') !== arkFore) A.forstaFokus = true; // fore öppnade ett ark – arket tar fokus, guiden tar tillbaka det
    if (dir > 0 && s.prova && s.klar && !A.klara.has(s.id) && kor(s.klar, ctx) === true && n < steg.length - 1) { console.debug('[guide] redan gjort', A.tur.id, s.id); A.forutgjorda.add(s.id); return vidare(); }
    let sida = stegSida(s, n, ctx);
    // tillbaka till ett steg utan egen sida som visades på en annan sida (turen har bytt sida sedan dess): gå dit igen
    if (!sida && dir < 0) {
      let x = A.sidor[s.id];
      for (let j = n - 1; !x && j >= 0; j--) { const t = steg[j]; x = A.sidor[t.id] || (typeof t.sida === 'string' ? t.sida : null); }
      if (!x) x = A.tur.sida;
      if (x && !hashOk(x)) sida = x;
    }
    let bytt = false;
    if (sida && !hashOk(sida, s.sidaPrefix)) {
      const ark = $('dialog[data-ark][open]'); if (ark && !s.behallArk) ark.close();
      location.hash = sida; bytt = true;
      A.forstaFokus = true; // CRM:et lägger fokus på vyn efter sidbytet – guiden tar tillbaka det till rutan
      await vila(60);
      if (!A || A.tok !== tok) return;
    }
    let el = null;
    if (s.mal) {
      await fallUt(s, ctx); if (!A || A.tok !== tok) return;
      el = await leta(s, ctx, bytt ? 7000 : s.valfri ? 2000 : 4500, bytt);
      if (!A || A.tok !== tok) return;
      if (!el) { A.hoppade.add(s.id); console.debug('[guide] hoppade över steget (målet saknas)', A.tur.id, s.id, s.mal); return vidare(); }
      ctx.el = el;
      await framfor(el); if (!A || A.tok !== tok) return;
    }
    visaSteg(s, n, el, ctx);
  }
  function lamnaSteg() { if (!A || !A.sEfter) return; const [s, c] = A.sEfter; A.sEfter = null; kor(s.efter, c); }
  // Fokus som "ingen" äger: body, vyn (CRM:et lägger fokus där efter ett sidbyte) och andra element som inte är kontroller
  const KONTROLL = 'a[href], button, input, select, textarea, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="tab"], [role="option"], [role="slider"], [role="menuitem"], [role="listbox"], [role="combobox"], [tabindex]:not([tabindex="-1"])';
  const ledigtFokus = (t) => !t || t === D.body || t === R || !(t instanceof Element) || (!t.closest(KONTROLL) && !t.closest('dialog[open]'));
  function visaSteg(s, n, el, ctx) {
    const forraEl = A.el;
    A.s = s; A.ctx = ctx; if (A.el && ro) ro.unobserve(A.el); A.el = null; bytEl(el);
    A.sEfter = s.efter ? [s, ctx] : null; A.sidor[s.id] = location.hash || '#/';
    A.rad = el ? Math.min(16, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 8) : 0;
    A.hal = el ? halFor(el, s) : null;
    const g = giltiga(); const nr = Math.max(1, g.indexOf(s) + 1); const tot = Math.max(nr, g.length);
    const interaktiv = !!(s.prova || s.vanta || s.fri);
    rot.toggleAttribute('data-fritt', !!s.fritt);
    rot.toggleAttribute('data-oppet', interaktiv);
    rot.toggleAttribute('data-utan-mal', !el);
    ring.toggleAttribute('data-andas', !!(s.prova || s.vanta));
    $('.upg-skylt', ring).textContent = s.skylt || (s.vanta ? (matchMedia('(pointer: coarse)').matches ? 'Tryck här' : 'Klicka här') : '');
    kort.innerHTML = stegHtml(s, nr, tot);
    kort.removeAttribute('data-letar');
    const ae = D.activeElement;
    const fokusVar = ledigtFokus(ae) || kort.contains(ae) || ae === kort || (!!forraEl && forraEl.contains(ae) && !skriver(ae));
    hissa(rot); visaLager();
    mat(true);
    foljSnart(600);
    if (fokusVar || A.forstaFokus) { A.forstaFokus = false; try { kort.focus({ preventScroll: true }); } catch (err) { /* ignorera */ } }
    // ett Prova själv-steg man redan klarat (man gick tillbaka) visas som klart, med Nästa
    if ((s.prova || s.vanta) && A.klara.has(s.id)) markeraKlar(s);
    annonsera(`Steg ${nr} av ${tot}: ${s.rubrik || ''}`);
    if (!A.tur.tillfallig && LS) skrivJ(LS, nyckel('pagar'), { id: A.tur.id, stegId: s.id, n, tid: new Date().toISOString() });
    vakta(s, ctx);
    if (A.auto) autospel(s);
    handelse('steg', { steg: s.id, n });
  }
  function stegHtml(s, nr, tot) {
    const sista = A.n >= A.tur.steg.length - 1 || nr >= tot;
    const prova = s.prova || s.vanta;
    const forsta = nr <= 1;
    return `<div class="upg-innehall">
      <div class="upg-topp">
        <span class="upg-steg">Steg ${nr} av ${tot}</span>
        <span class="upg-mat" aria-hidden="true"><i style="--p:${(nr / tot).toFixed(3)}"></i></span>
        <button class="upg-x" type="button" data-upg="stang" aria-label="Avsluta guiden" title="Avsluta (Esc)">${ik('stang')}</button>
      </div>
      ${A.tur.tillfallig ? '' : `<p class="upg-tur">${ik('kompass')}${e(namnFor(A.tur))}</p>`}
      <h2 class="upg-rubrik" id="upg-rubrik">${e(s.rubrik || '')}</h2>
      <div class="upg-text" id="upg-text">${s.text || ''}</div>
      ${prova ? `<div class="upg-prova" data-lage="vantar" role="status">
          <span class="upg-prova-ikon" aria-hidden="true">${ik('gnista', 'upg-ik-vantar')}${ik('bock', 'upg-ik-klar')}</span>
          <span class="upg-prova-text"><strong>Prova själv</strong><span data-upg-gor>${e(s.gor || (s.vanta ? 'Klicka på det som är markerat.' : 'Gör det som står ovan.'))}</span></span>
        </div>` : ''}
      <div class="upg-fot">
        ${forsta ? '<span></span>' : prova || s.fyll ? `<button class="upg-knapp upg-sek upg-rund" type="button" data-upg="forra" aria-label="Tillbaka" title="Tillbaka (←)">${ik('pil-v')}</button>` : `<button class="upg-knapp upg-sek" type="button" data-upg="forra">${ik('pil-v')}<span>Tillbaka</span></button>`}
        <span class="upg-fot-hoger">
          ${s.fyll ? '<button class="upg-knapp upg-sek" type="button" data-upg="fyll">Fyll i exempel</button>' : ''}
          ${prova && (s.gorSjalv || s.vanta) ? '<button class="upg-knapp upg-sek" type="button" data-upg="gor">Gör det åt mig</button>' : ''}
          <button class="upg-knapp ${prova ? 'upg-sek' : 'upg-prim'}" type="button" data-upg="nasta" data-upg-nasta>${prova ? 'Hoppa över' : sista ? 'Klar' : 'Nästa'}${prova ? '' : ik(sista ? 'bock' : 'pil')}</button>
        </span>
      </div>
    </div>`;
  }
  const annonsera = (t) => { if (!sr) return; sr.textContent = ''; setTimeout(() => { sr.textContent = t; }, 40); };
  function skaka() {
    if (!kort || lugn()) return;
    kort.removeAttribute('data-skaka'); void kort.offsetWidth; kort.setAttribute('data-skaka', '');
  }

  // Prova själv: villkoret kollas när något händer (klick, inmatning, hash, händelse) och var 250:e ms
  let vakt = null;
  function stoppaVakt() { if (!vakt) return; vakt.stopp(); vakt = null; }
  function vakta(s, ctx) {
    if (!(s.prova || s.vanta || s.handelse)) return;
    const kolla = () => { if (!A || A.s !== s || A.klarat) return; if (s.klar && kor(s.klar, ctx) === true) lyckat(s); };
    const snart = () => setTimeout(kolla, 80);
    const klick = (ev) => {
      if (!A || A.s !== s || A.klarat || rot.contains(ev.target)) return;
      if (s.vanta) {
        const traff = (A.el && A.el.contains(ev.target)) || (s.klick && ev.target.closest && ev.target.closest(s.klick));
        if (traff) { if (s.klar) { setTimeout(kolla, 120); setTimeout(kolla, 450); } else setTimeout(() => lyckat(s), 250); return; }
      }
      snart();
    };
    const hand = () => { if (s.klar) snart(); else lyckat(s); };
    D.addEventListener('click', klick, true);
    D.addEventListener('input', snart, true); D.addEventListener('change', snart, true);
    addEventListener('hashchange', snart);
    if (s.handelse) addEventListener(s.handelse, hand);
    const iv = s.klar ? setInterval(kolla, 250) : 0;
    vakt = { stopp: () => { D.removeEventListener('click', klick, true); D.removeEventListener('input', snart, true); D.removeEventListener('change', snart, true); removeEventListener('hashchange', snart); if (s.handelse) removeEventListener(s.handelse, hand); clearInterval(iv); } };
  }
  function lyckat(s) {
    if (!A || A.s !== s || A.klarat) return;
    markeraKlar(s);
    annonsera(s.bra || 'Klart.');
    const tok = A.tok;
    setTimeout(() => { if (A && A.tok === tok && A.s === s) nasta(); }, lugn() ? 1600 : 1100);
  }
  function markeraKlar(s) {
    A.klarat = true; A.klara.add(s.id); stoppaVakt();
    const b = $('.upg-prova', kort);
    if (b) { b.setAttribute('data-lage', 'klar'); const t = $('[data-upg-gor]', b); if (t) t.textContent = s.bra || 'Snyggt – det var allt.'; }
    const n = $('[data-upg-nasta]', kort);
    if (n) { n.className = 'upg-knapp upg-prim'; const sista = A.n >= A.tur.steg.length - 1; n.innerHTML = `${sista ? 'Klar' : 'Nästa'}${ik(sista ? 'bock' : 'pil')}`; }
    const g = $('[data-upg="gor"]', kort); g && g.remove();
  }

  function nasta() { if (!A) return; if (rot.hasAttribute('data-klar')) { stang(); return; } if (!A.s) return; visa(A.n + 1, 1); }
  function forra() {
    if (!A || !A.s) return;
    let i = A.n - 1;
    while (i >= 0 && (A.hoppade.has(A.tur.steg[i].id) || !rollOk(A.tur.steg[i].roller))) i--;
    if (i >= 0) visa(i, -1);
  }
  function klar() {
    if (!A) return;
    const tur = A.tur; stoppaVakt(); lamnaSteg();
    if (!tur.tillfallig) {
      const k = klaraObj(); const kurs = kursLista().find((x) => x.turer.includes(tur.id));
      const varKlar = kurs && kurs.turer.every((id) => k[id]);
      k[tur.id] = new Date().toISOString(); LS && skrivJ(LS, nyckel('klara'), k);
      LS && skrivJ(LS, nyckel('pagar'), null);
      A.kursKlar = kurs && !varKlar && kurs.turer.every((id) => k[id]) ? kurs : null;
    }
    handelse('klar');
    if (tur.tillfallig) { stang({ tyst: true }); return; }
    A.s = null; A.el && ro && ro.unobserve(A.el); A.el = null; A.hal = null; A.n = tur.steg.length;
    rot.setAttribute('data-klar', ''); rot.toggleAttribute('data-fritt', false); rot.toggleAttribute('data-utan-mal', true);
    const nastaT = (tur.nasta && TURER.get(tur.nasta) && !klaraObj()[tur.nasta] && rollOk(TURER.get(tur.nasta).roller)) ? TURER.get(tur.nasta) : nastaTur();
    kort.innerHTML = `<div class="upg-innehall upg-klarkort">
      <div class="upg-topp"><span class="upg-steg">${A.kursKlar ? 'Kursen är klar' : 'Turen är klar'}</span><button class="upg-x" type="button" data-upg="stang" aria-label="Stäng">${ik('stang')}</button></div>
      <span class="upg-klar-ikon" aria-hidden="true">${ik(A.kursKlar ? 'medalj' : 'bock')}</span>
      <h2 class="upg-rubrik" id="upg-rubrik">${e(tur.klarRubrik || (A.kursKlar ? `Du har gått igenom ${A.kursKlar.namn}` : `Klart: ${namnFor(tur)}`))}</h2>
      <div class="upg-text" id="upg-text">${tur.klarText || '<p>Bra jobbat. Allt du gick igenom finns kvar i menyn Lär dig CRM:et – ' + (matchMedia('(pointer: coarse)').matches ? 'öppna Hjälp under Mer när du vill se den.</p>' : 'tryck <kbd>?</kbd> när du vill öppna den.</p>')}</div>
      ${A.ovning ? '<label class="upg-behall"><input type="checkbox" data-upg-behall> Behåll det jag gjorde i övningen</label>' : ''}
      <div class="upg-fot">
        <button class="upg-knapp upg-sek" type="button" data-upg="meny">${ik('rutnat')}<span>Alla turer</span></button>
        <span class="upg-fot-hoger">${nastaT ? `<button class="upg-knapp upg-prim" type="button" data-upg="starta" data-tur="${e(nastaT.id)}">Nästa: ${e(namnFor(nastaT))}${ik('pil')}</button>` : '<button class="upg-knapp upg-prim" type="button" data-upg="stang">Stäng</button>'}</span>
      </div></div>`;
    mat(true);
    try { kort.focus({ preventScroll: true }); } catch (err) { /* ignorera */ }
    annonsera(`Klart: ${namnFor(tur)}`);
    if (A.kursKlar) konfetti();
  }
  function stang(opt = {}) {
    if (!A) return;
    const a = A; stoppaVakt(); lamnaSteg();
    const behall = !!(kort && $('[data-upg-behall]', kort) && $('[data-upg-behall]', kort).checked);
    if (a.ovning && !behall) aterstallOvning(false); else if (a.ovning) { SS && SS.removeItem('up-guide-ovning'); }
    if (a.faldaIn && !R.hasAttribute('data-sido-dold') && !smal()) vaxlaSido(true);
    A = null; tw = null; vis = null;
    stoppaLyssnare();
    if (rot) {
      rot.removeAttribute('data-synlig');
      const r = rot; setTimeout(() => { if (A) return; r.removeAttribute('data-aktiv'); r.removeAttribute('data-klar'); ring.removeAttribute('data-syns'); try { if (r.matches(':popover-open')) r.hidePopover(); } catch (err) { /* ignorera */ } }, lugn() ? 0 : 260);
    }
    R.removeAttribute('data-guide');
    if (!opt.byte) {
      // knappen man kom från finns kvar → dit; annars (turen bytte sida) vyns rubrik eller vyn, aldrig body
      const f = a.returFokus; const kvar = f && f.isConnected && f !== D.body && f.getClientRects().length && !f.closest('[inert]');
      const mal = kvar ? f : ($('#vy h1') || $('#vy'));
      if (mal) { if (!kvar && !mal.hasAttribute('tabindex')) mal.tabIndex = -1; try { mal.focus({ preventScroll: true }); } catch (err) { /* ignorera */ } }
      if (!opt.tyst) annonsera('Guiden är stängd.');
    }
    handelse('slut', { tur: a.tur.id });
  }
  function fortsatt() {
    const p = pagarObj();
    if (p && TURER.get(p.id) && !klaraObj()[p.id]) return starta(p.id, { fran: p.stegId != null ? p.stegId : p.n });
    const t = nastaTur(); return t ? starta(t.id) : (oppnaMeny(), false);
  }
  function peka(mal, opt = {}) {
    return starta({ id: '_peka', tillfallig: true, rubrik: opt.rubrik || 'Här', steg: [{ id: 'peka', mal, sida: opt.sida, rubrik: opt.rubrik || 'Här finns det', text: opt.text || '', saknas: opt.saknas, valfri: true }] }, { tvinga: true });
  }

  // Övningen: kopian läggs tillbaka i CRM:ets data (bara demoläget)
  function aterstallOvning(rester) {
    const snap = SS && SS.getItem('up-guide-ovning'); if (!snap) return;
    SS.removeItem('up-guide-ovning');
    const c = window.UPCRM; if (!c || !c.db || SKARP) return;
    try {
      const gammal = JSON.parse(snap); const db = c.db;
      Object.keys(db).forEach((k) => { if (!(k in gammal)) delete db[k]; });
      Object.assign(db, gammal);
      kor(c.spara); kor(c.rendera);
      if (rester && c.toast) c.toast('Övningen avbröts – datan är som före övningen.');
    } catch (err) { console.debug('[guide] övningen kunde inte återställas', err); }
  }

  // Autospel (?tur=…&auto=1): lästiden efter textens längd, klick görs åt en
  function autospel(s) {
    const tok = A.tok; const text = ((s.rubrik || '') + ' ' + String(s.text || '').replace(/<[^>]+>/g, '')).length;
    const ms = klam(1400 + 38 * text, 2600, 9000);
    setTimeout(() => {
      if (!A || A.tok !== tok) return;
      if (s.prova || s.vanta) { if (s.gorSjalv) kor(s.gorSjalv, A.el, A.ctx); else if (s.vanta && A.el) A.el.click(); setTimeout(() => { if (A && A.tok === tok) nasta(); }, 900); }
      else nasta();
    }, ms);
  }

  function konfetti() {
    if (lugn() || !rot) return;
    const lag = D.createElement('div'); lag.className = 'upg-konfetti'; lag.setAttribute('aria-hidden', 'true');
    const toner = ['var(--accent)', 'var(--is, #a7d2ff)', 'var(--gul, #f4c95d)', 'var(--navy, #183653)'];
    lag.innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="--x:${Math.round((Math.random() - .5) * 520)}px;--y:${Math.round(-140 - Math.random() * 240)}px;--r:${Math.round(Math.random() * 720 - 360)}deg;--d:${Math.round(Math.random() * 120)}ms;background:${toner[i % 4]}"></i>`).join('');
    rot.appendChild(lag); setTimeout(() => lag.remove(), 1800);
  }

  // Hjulet över slöjan rullar det som ligger under (sidan eller arket)
  function vidareHjul(ev) {
    const under = D.elementsFromPoint(ev.clientX, ev.clientY).find((x) => !rot.contains(x) && x !== rot);
    let el = under; const f = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? VH : 1;
    while (el && el !== D.body && el !== R) {
      const c = getComputedStyle(el);
      if (/(auto|scroll)/.test(c.overflowY) && el.scrollHeight > el.clientHeight + 1) break;
      el = el.parentElement;
    }
    (el && el !== D.body && el !== R ? el : D.scrollingElement || R).scrollBy({ top: ev.deltaY * f, left: ev.deltaX * f });
  }

  /* --- Knappar i rutan och menyn --------------------------------------------------------------------------- */
  function rotKlick(ev) {
    const b = ev.target.closest('[data-upg]'); if (!b) return;
    const g = b.dataset.upg;
    if (g === 'stang') stang();
    else if (g === 'nasta') nasta();
    else if (g === 'forra') forra();
    else if (g === 'meny') { stang({ tyst: true }); oppnaMeny(); }
    else if (g === 'starta') starta(b.dataset.tur);
    else if (g === 'gor' && A && A.s) { const s = A.s; if (s.gorSjalv) kor(s.gorSjalv, A.el, A.ctx); else if (A.el) A.el.click(); }
    else if (g === 'fyll' && A && A.s && A.s.fyll) fyll(A.s.fyll);
  }
  function fyll(falt) {
    Object.entries(falt).forEach(([sel, v]) => {
      const el = (A.el && A.el.matches && A.el.matches(sel) ? A.el : null) || (A.el && $(sel, A.el)) || $(sel); if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!v;
      else { const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; const d = Object.getOwnPropertyDescriptor(proto, 'value'); d && d.set ? d.set.call(el, v) : (el.value = v); }
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  /* --- Guidemenyn "Lär dig CRM:et" ------------------------------------------------------------------------- */
  let menyEl = null, menyFokus = null;
  const fold = (s) => String(s || '').toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e');
  function menyHtml(opt = {}) {
    const k = klaraObj(); const kurser = kursLista(); const turer = synligaTurer();
    const antal = turer.length, klarAntal = turer.filter((t) => k[t.id]).length;
    const pct = antal ? Math.round((klarAntal / antal) * 100) : 0;
    const senast = Object.entries(k).filter(([id]) => TURER.get(id)).sort((a, b) => String(b[1]).localeCompare(String(a[1])))[0];
    const p = pagarObj(); const pt = p && TURER.get(p.id) && !k[p.id] && rollOk(TURER.get(p.id).roller) ? TURER.get(p.id) : null;
    const nt = nastaTur();
    let huvud = '';
    if (pt) { const n = antalSteg(pt); const i = klam(pt.steg.filter((s, j) => j < Math.max(0, pt.steg.findIndex((x) => x.id === p.stegId)) && rollOk(s.roller) && (!s.om || kor(s.om, { $, $$, data: {}, steg: s, tur: pt, jag: konto() }) !== false)).length, 0, n - 1); huvud = `<button class="upg-huvud" type="button" data-upg-m="fortsatt">${ik('aterstall', 'upg-huvud-ik')}<span><strong>Fortsätt där du slutade</strong><small>${e(namnFor(pt))} · steg ${i + 1} av ${n}</small></span>${ik('pil')}</button>`; }
    else if (nt) huvud = `<button class="upg-huvud" type="button" data-upg-m="starta" data-tur="${e(nt.id)}">${ik(klarAntal ? 'pil' : 'gnista', 'upg-huvud-ik')}<span><strong>${klarAntal ? 'Nästa' : 'Börja här'}: ${e(namnFor(nt))}</strong><small>${antalSteg(nt)} steg · ca ${minuter(nt)} min</small></span>${ik('pil')}</button>`;
    else if (antal) huvud = `<p class="upg-allt">${ik('medalj')}<span><strong>Du har gått igenom allt.</strong><small>Gå gärna igenom en tur igen när något är nytt.</small></span></p>`;
    const sidan = turForSidan();
    const forslag = sidan && sidan !== nt && sidan !== pt && !k[sidan.id] ? `<button class="upg-forslag" type="button" data-upg-m="starta" data-tur="${e(sidan.id)}">${ik('kompass')}<span><small>För sidan du står på</small><strong>${e(namnFor(sidan))}</strong></span><span class="upg-tid">ca ${minuter(sidan)} min</span></button>` : '';
    const nastaKurs = nt && kurser.find((x) => x.turer.includes(nt.id));
    const kursHtml = kurser.map((ku) => {
      const lista = ku.turer.map((id) => TURER.get(id)); const kl = lista.filter((t) => k[t.id]).length;
      const kvar = lista.filter((t) => !k[t.id]).reduce((s, t) => s + minuter(t), 0);
      const status = kl === lista.length ? ['klar', 'Klar'] : ku === nastaKurs ? ['nasta', 'Nästa'] : kl ? ['pagar', 'Pågår'] : ['ny', 'Inte börjad'];
      return `<details class="upg-kurs" data-ton="${e(ku.ton || 'mint')}"${ku === nastaKurs ? ' open' : ''}>
        <summary><span class="upg-kurs-ik">${ik(ku.ikon || 'kompass')}</span><span class="upg-kurs-text"><strong>${e(ku.namn)}</strong><small>${kl} av ${lista.length}${kvar ? ` · ca ${kvar} min kvar` : ''}</small></span><span class="upg-status" data-status="${status[0]}">${status[1]}</span>${ik('chevron', 'upg-kurs-pil')}</summary>
        <ul>${lista.map((t) => `<li data-upg-sok="${e(fold([namnFor(t), t.beskrivning, ...t.steg.map((s) => s.rubrik)].join(' ')))}"><button type="button" class="upg-turrad" data-upg-m="starta" data-tur="${e(t.id)}"${k[t.id] ? ' data-klar' : ''}${t === nt ? ' data-nasta' : ''}><span class="upg-turrad-ik">${ik(k[t.id] ? 'bock' : t === nt ? 'pil' : 'kompass')}</span><span class="upg-turrad-text"><strong>${e(namnFor(t))}</strong>${t.beskrivning ? `<small>${e(t.beskrivning)}</small>` : ''}</span><span class="upg-tid">${antalSteg(t)} steg · ${minuter(t)} min</span></button></li>`).join('')}</ul>
      </details>`;
    }).join('');
    return `<div class="upg-meny-inre${opt.vy ? ' upg-meny-vy' : ''}">
      ${opt.vy ? '' : `<div class="upg-meny-topp"><h2 id="upg-meny-rubrik">${ik('kompass')}Lär dig CRM:et</h2><button class="upg-x" type="button" data-upg-m="stang" aria-label="Stäng">${ik('stang')}</button></div>`}
      <div class="upg-framsteg">
        <svg class="upg-ring-mat" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" pathLength="100"/><circle class="upg-ring-fyll" cx="24" cy="24" r="20" pathLength="100" style="stroke-dashoffset:${100 - pct}"/></svg>
        <span class="upg-pct">${pct}<small>%</small></span>
        <span class="upg-framsteg-text"><strong>${klarAntal} av ${antal} turer klara</strong><small>${senast ? `Senast lärde du dig: ${e(namnFor(TURER.get(senast[0])))}` : 'Korta turer som visar var allt finns – och låter dig prova själv.'}</small></span>
      </div>
      ${huvud}${forslag}
      ${antal > 4 ? `<label class="upg-sok">${ik('sok')}<input type="search" data-upg-sok-falt placeholder="Sök bland turerna" aria-label="Sök bland turerna" autocomplete="off"></label>` : ''}
      <div class="upg-kurser" data-upg-kurser>${kursHtml || '<p class="upg-tomt">Inga turer för din roll än.</p>'}<p class="upg-tomt" data-upg-ingen hidden>Ingen tur matchar sökningen.</p></div>
      <div class="upg-meny-fot">
        <span class="upg-tips">${matchMedia('(pointer: coarse)').matches ? '' : '<kbd>?</kbd> öppnar menyn · <kbd>→</kbd> <kbd>←</kbd> i turen · <kbd>Esc</kbd> stänger'}</span>
        ${klarAntal || pt ? '<button class="upg-lank" type="button" data-upg-m="nollstall">Börja om</button>' : ''}
      </div>
    </div>`;
  }
  function byggMeny() {
    if (menyEl) return menyEl;
    menyEl = D.createElement('div');
    menyEl.className = 'upg-meny'; menyEl.setAttribute('role', 'dialog'); menyEl.setAttribute('aria-labelledby', 'upg-meny-rubrik'); menyEl.tabIndex = -1;
    try { menyEl.popover = 'auto'; } catch (err) { /* ignorera */ }
    menyEl.addEventListener('toggle', (ev) => {
      if (ev.newState === 'closed') { R.removeAttribute('data-guide-meny'); const f = menyFokus; menyFokus = null; if (f && f.isConnected && !A) { try { f.focus({ preventScroll: true }); } catch (err) { /* ignorera */ } } }
    });
    menyEl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !menyEl.popover) { ev.preventDefault(); stangMeny(); }
      if (ev.key !== 'Tab') return;
      const f = $$('button:not([disabled]), input, summary, a[href]', menyEl).filter((x) => !x.closest('svg') && x.getClientRects().length);
      if (!f.length) return;
      if (ev.shiftKey && D.activeElement === f[0]) { ev.preventDefault(); f[f.length - 1].focus(); }
      else if (!ev.shiftKey && D.activeElement === f[f.length - 1]) { ev.preventDefault(); f[0].focus(); }
    });
    menyEl.addEventListener('input', (ev) => { if (ev.target.matches('[data-upg-sok-falt]')) sokMeny(menyEl, ev.target.value); });
    D.body.appendChild(menyEl);
    return menyEl;
  }
  function sokMeny(rot2, q) {
    const f = fold(q.trim()); let traff = 0;
    $$('.upg-kurs', rot2).forEach((ku) => {
      let n = 0; $$('li[data-upg-sok]', ku).forEach((li) => { const ok = !f || li.dataset.upgSok.includes(f); li.hidden = !ok; if (ok) n++; });
      ku.hidden = !n; if (f && n) ku.open = true; traff += n;
    });
    const ingen = $('[data-upg-ingen]', rot2); if (ingen) ingen.hidden = !!traff;
  }
  function ritaMeny() { if (!menyEl) return; menyEl.innerHTML = menyHtml(); }
  function oppnaMeny() {
    if (A) stang({ tyst: true });
    byggMeny(); ritaMeny();
    if (!menyEl.matches || !menyEl.matches(':popover-open')) menyFokus = D.activeElement;
    hissa(menyEl, true);
    if (!menyEl.popover) menyEl.setAttribute('data-oppen', '');
    R.setAttribute('data-guide-meny', '');
    LS && skrivJ(LS, nyckel('sett'), new Date().toISOString());
    requestAnimationFrame(() => { const h = $('.upg-huvud, .upg-forslag, .upg-turrad', menyEl) || menyEl; try { h.focus({ preventScroll: true }); } catch (err) { /* ignorera */ } });
  }
  function stangMeny(tyst) {
    if (!menyEl) return;
    if (tyst) menyFokus = null;
    try { if (menyEl.popover && menyEl.matches(':popover-open')) menyEl.hidePopover(); } catch (err) { /* ignorera */ }
    menyEl.removeAttribute('data-oppen'); R.removeAttribute('data-guide-meny');
  }
  const menyOppen = () => !!(menyEl && (menyEl.hasAttribute('data-oppen') || (() => { try { return menyEl.matches(':popover-open'); } catch (err) { return false; } })()));
  const vaxlaMeny = () => (menyOppen() ? stangMeny() : oppnaMeny());
  function nollstall() {
    if (!LS) return;
    skrivJ(LS, nyckel('klara'), null); skrivJ(LS, nyckel('pagar'), null);
    if (menyOppen()) ritaMeny();
    $$('[data-upg-vy]').forEach((v) => { v.innerHTML = menyHtml({ vy: true }); });
  }
  // Klick på menyns knappar (menyn, vyn #/lar och knappar med data-g="guide-*" när modulen inte är registrerad)
  D.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('[data-upg-m]');
    if (b) {
      const g = b.dataset.upgM;
      if (g === 'stang') stangMeny();
      else if (g === 'starta') { stangMeny(true); starta(b.dataset.tur); }
      else if (g === 'fortsatt') { stangMeny(true); fortsatt(); }
      else if (g === 'nollstall') {
        if (!b.hasAttribute('data-sakert')) { b.setAttribute('data-sakert', ''); b.textContent = 'Säker? Klicka igen'; setTimeout(() => { if (b.isConnected) { b.removeAttribute('data-sakert'); b.textContent = 'Börja om'; } }, 3500); return; }
        nollstall();
      }
      return;
    }
    if (UPGuide._registrerad) return;
    const g = ev.target.closest && ev.target.closest('[data-g^="guide-"]'); if (!g) return;
    ev.preventDefault(); G[g.dataset.g] && G[g.dataset.g](g, ev);
  });
  D.addEventListener('input', (ev) => { if (ev.target.matches && ev.target.matches('[data-upg-vy] [data-upg-sok-falt]')) sokMeny(ev.target.closest('[data-upg-vy]'), ev.target.value); });

  /* --- Tangenterna ----------------------------------------------------------------------------------------- */
  const skriver = (t) => !!(t && t.closest && t instanceof Element && t.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
  addEventListener('keydown', (ev) => {
    if (ev.defaultPrevented || ev.isComposing) return;
    const t = ev.target instanceof Element ? ev.target : null; const mod = ev.ctrlKey || ev.metaKey || ev.altKey;
    if (ev.key === '?' && !mod && !skriver(t) && !D.querySelector('.mote, html[data-vm-oppen]')) { ev.preventDefault(); ev.stopPropagation(); vaxlaMeny(); return; }
    if (!A) return;
    const iRuta = !!(kort && kort.contains(t));
    const ledig = iRuta || ledigtFokus(t); // vyn efter ett sidbyte räknas som ledig – bara fält och kontroller behåller pilarna
    if (ev.key === 'Escape' && iRuta) { ev.preventDefault(); ev.stopPropagation(); stang(); return; }
    if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && !mod && !ev.shiftKey && ledig && !skriver(t)) {
      ev.preventDefault(); ev.stopPropagation();
      if (ev.key === 'ArrowRight') { if (!A.s || !(A.s.prova || A.s.vanta) || A.klarat) nasta(); else skaka(); } else forra();
      return;
    }
    if (ev.key === 'Tab' && iRuta) {
      const interaktiv = A.s && (A.s.prova || A.s.vanta || A.s.fri) && A.el;
      // a[href] – inte [href], som också träffar SVG:ns <use href> i knapparna (då läckte fällan ut till sidan)
      const sel = 'button:not([disabled]), a[href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), summary';
      const f = [...$$(sel, kort), ...(interaktiv ? [...(A.el.matches(sel) ? [A.el] : []), ...$$(sel, A.el)] : [])].filter((x) => !x.closest('svg') && !x.closest('[inert]') && x.getClientRects().length);
      if (!f.length) return;
      const i = f.indexOf(D.activeElement);
      if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); }
      else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
    }
  }, true);
  // Esc med fokus på sidan (inte i ett fält, en lista eller ett ark): sidan får tangenten först
  addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !A || ev.defaultPrevented || menyOppen()) return;
    const t = D.activeElement;
    if (t && t !== D.body && t !== R && t.closest('dialog[open], [popover]')) return;
    if (skriver(t)) return;
    stang();
  });

  /* --- Översta lagret: följ ark, listor och helskärm ------------------------------------------------------- */
  new MutationObserver((lista) => { if ((A || menyOppen()) && lista.some((m) => m.target.tagName === 'DIALOG')) hissaSnart(); })
    .observe(D.documentElement, { attributes: true, attributeFilter: ['open'], subtree: true });
  D.addEventListener('close', () => { if (A || menyOppen()) hissaSnart(); }, true);
  D.addEventListener('fullscreenchange', () => { if (A || menyOppen()) hissaSnart(); });
  lugnMQ.addEventListener && lugnMQ.addEventListener('change', () => smuts());

  /* --- Start via länk (?tur=<id>&auto=1) och kvarglömd övning ---------------------------------------------- */
  const LANK = (() => {
    try {
      const q = new URLSearchParams(location.search); const tur = q.get('tur'); if (!tur) return null;
      const auto = q.get('auto') === '1'; q.delete('tur'); q.delete('auto');
      history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
      return { tur, auto };
    } catch (err) { return null; }
  })();
  let lankKord = false;
  function lankStart() {
    if (!LANK || lankKord || !TURER.get(LANK.tur)) return;
    lankKord = true;
    redo().then(() => setTimeout(() => starta(LANK.tur, { auto: LANK.auto }), 500));
  }
  function redo() {
    return new Promise((klart) => {
      const t0 = performance.now();
      const kolla = () => { const vy = $('#vy'); const ok = vy && vy.children.length && !$('.hamtar', vy) && window.UPCRM; if (ok || performance.now() - t0 > 9000) klart(); else setTimeout(kolla, 150); };
      kolla();
    });
  }
  const init = () => {
    if (!SKARP && SS && SS.getItem('up-guide-ovning')) redo().then(() => aterstallOvning(true));
    lankStart();
    if (LANK && !TURER.get(LANK.tur)) setTimeout(() => { if (!lankKord) console.warn('[guide] okänd tur i länken', LANK.tur); }, 6000);
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
  // Annat konto i samma flik (kontobyte i demon): menyn ritas om med kontots framsteg
  addEventListener('storage', (ev) => { if (ev.key && ev.key.startsWith('up-guide-') && menyOppen()) ritaMeny(); });

  /* --- Som CRM-modul (crm.js: GUI = window.UPGuide.modul(BYGG)) -------------------------------------------------- */
  const G = {
    'guide-oppna': () => oppnaMeny(),
    'guide-starta': (el) => starta(el.dataset.tur),
    'guide-fortsatt': () => fortsatt(),
    'guide-nollstall': () => nollstall(),
  };
  function modul(BYGG) {
    UPGuide._registrerad = true;
    const visaLar = () => {
      const k = klaraObj(); const t = synligaTurer(); const kl = t.filter((x) => k[x.id]).length;
      const p = pagarObj(); const pt = p && TURER.get(p.id) && !k[p.id];
      const knappar = `<button class="knapp knapp-accent" type="button" data-g="guide-fortsatt">${BYGG.ik('pil')}${pt ? 'Fortsätt där du slutade' : kl ? 'Nästa tur' : 'Börja här'}</button>`;
      return `${BYGG.sidhjalte({ ogon: 'Lär dig CRM:et', titel: 'Lär dig CRM:et', text: 'Korta turer som visar var allt finns – och låter dig prova själv. Tryck ? var som helst för att öppna menyn.', knappar,
        tal: [{ emo: 'medalj', etikett: 'Klara turer', text: `${kl} av ${t.length}` }, { emo: 'kompass', etikett: 'Kurser', varde: kursLista().length }] })}
        <section class="kort upg-vy-kort" data-upg-vy>${menyHtml({ vy: true })}</section>`;
    };
    return { vagar: [[/^#\/lar$/, visaLar, 'lar', 'Lär dig CRM:et']], G, FORM: {} };
  }
  const UPGuide = { _registrerad: false };
  Object.assign(UPGuide, {
    modul, arKlar: (id) => !!klaraObj()[id], antalSteg: (t) => antalSteg(typeof t === 'string' ? TURER.get(t) : t),
    registrera, starta, stang, nasta, forra, fortsatt, peka, klara: () => ({ ...klaraObj() }),
    oppnaMeny, stangMeny, vaxlaMeny, menyHtml, turForSidan, nastaTur, nollstall,
    tur: (id) => TURER.get(id) || null,
    registreraKurser: (k) => { egnaKurser = Array.isArray(k) ? k : null; },
    knappHtml: (text = 'Lär dig CRM:et') => `<button class="knapp knapp-kontur" type="button" data-g="guide-oppna">${ik('kompass')}${e(text)}</button>`,
    lage: () => (A ? { aktiv: true, tur: A.tur.id, n: A.n, steg: A.s && A.s.id, hoppade: Array.from(A.hoppade), klar: rot.hasAttribute('data-klar'), glider: !!tw, hal: A.hal && { ...A.hal }, ruta: (() => { const r = kort.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })(), sida: ruta.dataset.sida, el: !!A.el } : { aktiv: false, meny: menyOppen() }),
    _placera: placera,
  });
  Object.defineProperty(UPGuide, 'turer', { get: () => synligaTurer() });
  Object.defineProperty(UPGuide, 'allaTurer', { get: () => Array.from(TURER.values()) });
  Object.defineProperty(UPGuide, 'kurser', { get: () => kursLista(), set: (k) => { egnaKurser = Array.isArray(k) ? k : null; } });
  window.UPGuide = UPGuide;
})();
