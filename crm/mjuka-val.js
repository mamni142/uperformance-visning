/* Uperformance – mjuka val (2026-11-23, användaren: "fixa så att känslan är mjuk och fin när man klickar på flikarna och alla
   flikar eller knappar … inte hård och buggad", sedan "samma på mobilen" och "samma på hemsidan").

   Laddas av CRM:et (crm/index.html) och hemsidan (index.html). Det valda i en grupp (segment, filter, flikar, menyn, prickar – allt
   med aria-pressed/aria-selected/aria-current) hoppade direkt till sin nya plats. Nu glider en bubbla med det valdas utseende
   (bakgrund, hörn, skugga) från den gamla platsen till den nya med en fjäder, medan det nya valdas egen platta är dold. Två vägar:
   1. Attributet byts på befintliga element (hemsidans meny när man rullar, Företag/Idrott, Berättelsens prickar, mobilens flikrad):
      en MutationObserver ser vilket element som slutade vara valt och vilket som blev valt – det gamla står kvar och kan mätas.
   2. Vyn ritas om (CRM:ets G-hanterare byter hela vyn): det valda mäts vid klicket och gruppen hittas igen efter omritningen
      (samma tagg + klass + etikett + roll). CRM:ets hanterare stoppar klicket, så vi väntar på DOM-ändringen i stället.
   Båda körs före nästa målning – ingen bildruta utan bubbla. Bara transform + bredd/höjd på ett absolut placerat element.
   Hemsidan har också det mjuka trycket på knapparna (i CRM:et sköts det av sidomeny.js, "03-klickkänslan").
   Reducerad rörelse: ingenting av detta. Stil: .mjuk-bubbla och [data-mjuk-glid] sist i crm/apple.css och assets/apple.css. */
(() => {
  'use strict';
  if (window.UPMjukaVal) return; window.UPMjukaVal = true;
  const lugn = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const VALD = '[aria-pressed="true"], [aria-selected="true"], [aria-current="page"], [aria-current="true"]';
  const KLICKBAR = 'a[href], button, [role="tab"], [role="radio"], [aria-pressed], [aria-selected]';
  const KURVA = 'cubic-bezier(.32, 1.22, .48, 1)';
  const arVald = (v) => v === 'true' || v === 'page';

  // gruppen = närmaste förälder (högst tre steg upp) som är en grupp/flikrad, eller har minst två knappar/länkar som barn och ett valt barn
  function grupp(el, kravVald = true) {
    let n = el.parentElement;
    for (let i = 0; n && i < 3; i++, n = n.parentElement) {
      if (n.matches('[role="group"], [role="tablist"], [role="radiogroup"]')) return n;
      // barnen är knapparna själva, eller listrader med en knapp/länk i (ul > li > a, som hemsidans meny)
      const barn = [...n.children].map((c) => (c.matches(KLICKBAR) ? c : c.children.length === 1 && c.firstElementChild.matches(KLICKBAR) ? c.firstElementChild : null)).filter(Boolean);
      if (barn.length >= 2 && (!kravVald || barn.some((c) => c.matches(VALD)))) return n;
    }
    return null;
  }
  const nyckel = (g) => `${g.tagName}|${g.className}|${g.getAttribute('aria-label') || ''}|${g.getAttribute('role') || ''}`;
  const hittaGrupp = (k, nara) => {
    const alla = [...document.querySelectorAll('[class], [role], [aria-label]')].filter((n) => nyckel(n) === k);
    if (alla.length < 2) return alla[0] || null;
    return alla.sort((a, b) => Math.abs(a.getBoundingClientRect().top - nara) - Math.abs(b.getBoundingClientRect().top - nara))[0];
  };
  const ruta = (el, g) => { const r = el.getBoundingClientRect(); const q = g.getBoundingClientRect(); return { x: r.left - q.left, y: r.top - q.top, b: r.width, h: r.height }; };

  /* Väg 1: attributet byts på befintliga element */
  new MutationObserver((poster) => {
    if (lugn()) return;
    const av = []; const pa = [];
    for (const p of poster) {
      const el = p.target; const nu = el.getAttribute(p.attributeName);
      if (arVald(p.oldValue) && !arVald(nu)) av.push(el); else if (!arVald(p.oldValue) && arVald(nu)) pa.push(el);
    }
    for (const ny of pa) {
      const g = grupp(ny); if (!g) continue;
      // det gamla: det som slutade vara valt i samma omgång – eller, om det slutar först i nästa omgång (hemsidans meny sätter
      // det nya före det gamla), det som fortfarande är valt bredvid
      const forra = av.find((x) => x.isConnected && g.contains(x) && x !== ny) || [...g.querySelectorAll(VALD)].find((x) => x !== ny); if (!forra) continue;
      glid(g, ny, forraRuta(forra, g));
    }
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['aria-pressed', 'aria-selected', 'aria-current'] });
  // det gamla valda mäts där det står (dess platta är redan borta, men platsen är densamma)
  const forraRuta = (el, g) => ruta(el, g);

  /* Väg 2: vyn ritas om efter klicket */
  document.addEventListener('click', (ev) => {
    if (lugn() || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    const knapp = ev.target.closest && ev.target.closest(KLICKBAR); if (!knapp || knapp.matches(VALD)) return;
    const g = grupp(knapp); if (!g) return;
    const forra = [...g.querySelectorAll(VALD)].find((x) => x !== knapp); if (!forra) return;
    const k = nyckel(g); const fran = ruta(forra, g); const nara = g.getBoundingClientRect().top;
    let klar = false;
    const prova = () => {
      if (klar) return;
      const g2 = hittaGrupp(k, nara); if (!g2 || g2 === g && g.isConnected && forra.isConnected) { if (g2 === g) { klar = true; sluta(); } return; } // samma element = väg 1 tar det
      const ny = g2.querySelector(VALD); if (!ny) return;
      klar = true; sluta(); glid(g2, ny, fran);
    };
    const mo = new MutationObserver(prova);
    const t = setTimeout(() => { klar = true; mo.disconnect(); }, 600);
    const sluta = () => { mo.disconnect(); clearTimeout(t); };
    mo.observe(document.body, { subtree: true, childList: true });
  }, true);

  function glid(g, ny, fran) {
    const till = ruta(ny, g);
    if (Math.abs(till.x - fran.x) < 1 && Math.abs(till.y - fran.y) < 1) return;
    if (!till.b || !fran.b) return;
    const forra = g.querySelector(':scope > .mjuk-bubbla'); if (forra) forra.remove();
    // det valdas slutliga utseende – utan dess egen övergång (annars läses färgen mitt i toningen, ofta genomskinlig)
    const gammal = ny.style.transition; ny.style.transition = 'none'; const s0 = getComputedStyle(ny);
    const s = { backgroundColor: s0.backgroundColor, backgroundImage: s0.backgroundImage, boxShadow: s0.boxShadow, borderRadius: s0.borderRadius };
    ny.style.transition = gammal;
    const genomskinlig = /^transparent$|rgba\(0, 0, 0, 0\)|\/ 0\)$/.test(s.backgroundColor);
    if (genomskinlig && s.backgroundImage === 'none') return; // ingen platta att flytta
    const bubbla = document.createElement('span');
    bubbla.className = 'mjuk-bubbla'; bubbla.setAttribute('aria-hidden', 'true');
    Object.assign(bubbla.style, { width: `${till.b}px`, height: `${till.h}px`, borderRadius: s.borderRadius, backgroundImage: s.backgroundImage, backgroundColor: s.backgroundColor, boxShadow: s.boxShadow });
    const statisk = getComputedStyle(g).position === 'static';
    if (statisk) g.style.position = 'relative';
    g.setAttribute('data-mjuk-glid', ''); g.appendChild(bubbla);
    const a = bubbla.animate([
      { transform: `translate(${fran.x}px, ${fran.y}px)`, width: `${fran.b}px`, height: `${fran.h}px` },
      { transform: `translate(${till.x}px, ${till.y}px)`, width: `${till.b}px`, height: `${till.h}px` },
    ], { duration: 440, easing: KURVA, fill: 'both' });
    const klar = () => { bubbla.remove(); if (!g.querySelector(':scope > .mjuk-bubbla')) { g.removeAttribute('data-mjuk-glid'); if (statisk) g.style.position = ''; } };
    a.onfinish = klar; a.oncancel = klar;
  }

  /* Mjukt tryck (hemsidan och sidor utan CRM:ets sidomeny): knappen glider in ~3 px på 220 ms och fjädrar tillbaka på 520 ms. */
  addEventListener('DOMContentLoaded', () => {
    if (window.UPSido) return; // CRM:et: sidomeny.js sköter trycket
    const TRYCK = 'a.knapp, button, [role="button"], .persona button, .meny a, .bs-botten button';
    const UNDANTAG = 'input, select, textarea, canvas, [data-tilt], .paket-premium, :disabled';
    let tryckt = null;
    document.addEventListener('pointerdown', (ev) => {
      if (lugn() || ev.button !== 0 || !ev.target.closest) return;
      const el = ev.target.closest(TRYCK); if (!el || el.closest(UNDANTAG)) return;
      const r = el.getBoundingClientRect(); if (r.width < 12 || r.width > 760) return;
      const djup = Math.max(.95, 1 - Math.min(.04, 6 / Math.max(1, Math.min(r.width, r.height * 3))));
      tryckt = { el, a: el.animate([{ scale: '1' }, { scale: String(djup) }], { duration: 220, easing: 'cubic-bezier(.25, .8, .35, 1)', fill: 'forwards' }) };
    }, { passive: true });
    const slapp = () => {
      const t = tryckt; tryckt = null; if (!t || !t.el.isConnected) return;
      const nu = getComputedStyle(t.el).scale; t.a.cancel();
      t.el.animate([{ scale: nu === 'none' ? '1' : nu }, { scale: '1' }], { duration: 520, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
    };
    for (const h of ['pointerup', 'pointercancel']) document.addEventListener(h, slapp, { passive: true });
  });
})();
