/* Uperformance CRM – sidomenyn som i Legohus CRM (FAS 2, 2026-11-03): samma upplägg, rörelse, tider och kurvor – våra färger och funktioner.
   window.UPSido = { satt, dold, anpassa, glider }. crm.js (sattSido) anropar satt; knappen på kanten och [ ligger kvar i crm.js.
   - Glidningen: allt som hör till menyn rör sig som EN rörelse – samma tid (--glid, 460 ms) och lådkurva, startar i samma bildruta och
     landar samtidigt. Läget mäts före och efter växlingen och skillnaden spelas upp med Web Animations (FLIP: en layoutändring, sedan bara
     transform och opacitet, plus knappens egna små mått). Ett nytt klick mitt i glidningen mäts med den pågående glidningen inräknad och
     fortsätter därifrån, med kortare tid.
       menyn och kanten med knappen   glider i sidled
       knappen                        byter form (lång flik ⇄ rund i rälsen) och pilen vänder
       rälsen                         följer kanten och tonar in/ut
       innehållet                     glider som ett block
     Händelserna: 'up:sido' direkt vid växlingen (knappens läge före/efter, tid och kurva – chattens snabbknapp följer med, chatt.js) och
     'up:sido-klar' när allt har landat (3D-scenerna byter storlek först då, scen3d.js). Reducerad rörelse: en kort tvärtoning.
   - Mer: blir menyn för hög blir raderna först tätare, sedan flyttas det man använder minst (nerifrån, aldrig den valda sidan) in under
     "Mer" – en liten meny bredvid sidomenyn. Rälsen visar ändå alla sidor.
   - Klickkänslan: det man trycker på sjunker lätt och fjädrar tillbaka (släppet långsammare än trycket), och en mjuk ring tonar ut.
   - Entrén: menyn glider fram en gång när CRM:et öppnas.
   Stil: sidomeny.css. */
(() => {
  'use strict';
  const rot = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const dator = matchMedia('(min-width: 1000px)');
  const lugnMq = matchMedia('(prefers-reduced-motion: reduce)');
  const ik = (namn) => `<svg class="ikon" aria-hidden="true"><use href="#i-${namn}"/></svg>`;
  const syns = (el) => !!el && el.getClientRects().length > 0;
  const ruta = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const arDold = () => rot.hasAttribute('data-sido-dold');

  /* 01-glidningen ------------------------------------------------------------------------------------------------ */
  // Tiden läses ur --glid (sidomeny.css) så att CSS och JS inte kan glida isär. Kurvan hör ihop med lada() nedan.
  const GLID = 460; const KURVA = 'cubic-bezier(0.32,0.72,0,1)';
  function glidTid() {
    const v = getComputedStyle(rot).getPropertyValue('--glid').trim(); const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? Math.round(/ms$/.test(v) ? n : n * 1000) : GLID;
  }
  // Lådkurvans förlopp vid en viss tid (för att korta tiden när man vänder mitt i)
  function lada(x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 10; i++) {
      const fx = 0.96 * t * (1 - t) * (1 - t) + t * t * t - x;
      const d = 0.96 * (1 - t) * (1 - t) - 1.92 * t * (1 - t) + 3 * t * t;
      if (Math.abs(fx) < 1e-5 || Math.abs(d) < 1e-6) break;
      t = Math.min(1, Math.max(0, t - fx / d));
    }
    return 2.16 * t * (1 - t) * (1 - t) + 3 * t * t * (1 - t) + t * t * t;
  }
  let glid = null; // pågående glidning: { start, tid, dold, anims, frysta }
  const KNAPP_MATT = ['left', 'top', 'width', 'height', 'marginTop', 'marginLeft', 'borderRadius'];
  function delar() {
    const e = { sido: $('.sido'), kant: $('.sido-kant'), knapp: $('[data-sido-knapp]'), rals: $('[data-sido-rals]'), vy: $('#vy') };
    e.pil = e.knapp && $('.ikon', e.knapp);
    e.ankare = e.vy && ([...e.vy.children].find((x) => syns(x) && x.offsetHeight > 2) || e.vy);
    return e;
  }
  function vinkel(el) {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    const m = new DOMMatrixReadOnly(t); return Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI * 100) / 100;
  }
  const opac = (el) => { const c = getComputedStyle(el); return c.visibility === 'hidden' || c.display === 'none' ? 0 : +c.opacity; };
  const tf = (el) => { const t = getComputedStyle(el).transform; return t && t !== 'none' ? t : ''; };
  // Läget just nu – med en pågående glidning inräknad
  function matt(e) {
    const m = {};
    ['sido', 'kant', 'ankare'].forEach((k) => { if (syns(e[k])) m[k] = ruta(e[k]); });
    if (e.knapp && syns(e.knapp)) { const cs = getComputedStyle(e.knapp); m.knapp = {}; KNAPP_MATT.forEach((p) => { m.knapp[p] = cs[p]; }); m.knappRuta = ruta(e.knapp); }
    if (e.pil) m.vinkel = vinkel(e.pil);
    if (e.rals) m.rals = opac(e.rals);
    return m;
  }
  // Rälsens plats för chattens snabbknapp hänger på infälld meny: medan rälsen tonar ut står den kvar, så att ikonerna inte hoppar
  function frysRals() { return $$('.sido-rals .rals-plats').map((el) => [el, getComputedStyle(el).marginBottom]); }
  // Medan menyn glider bär delarna själva data-glider (sidomeny.css stänger av deras övergångar) – en klass på <html> skulle räkna om
  // stilen för hela sidan (över tusen element) när glidningen börjar och när den slutar
  const GLIDDELAR = '.app, .huvud, #vy, #sidomeny, .sido-kant, [data-sido-rals], .chf-ikon';
  // Barnens övergångar (knappen i kanten, rälsens rader) stängs av med ett eget attribut på bara de två delarna – se sidomeny.css 09
  function markera(pa) { $$(GLIDDELAR).forEach((el) => el.toggleAttribute('data-glider', pa)); $$('.sido-kant, [data-sido-rals]').forEach((el) => el.toggleAttribute('data-glider-barn', pa)); }
  function stoppa(slut) {
    if (!glid) return;
    const g = glid; glid = null;
    g.anims.forEach((a) => a.cancel());
    g.frysta.forEach(([el]) => { el.style.marginBottom = ''; });
    if (slut) markera(false);
  }
  function klar(dold) { dispatchEvent(new CustomEvent('up:sido-klar', { detail: { dold } })); }
  const rutaUt = (r) => (r ? { left: r.x, top: r.y, width: r.w, height: r.h, right: r.x + r.w, bottom: r.y + r.h } : null);

  // dold: infälld eller inte. animera: glid (annars direkt). minns: spara valet. vidVaxling: körs direkt efter växlingen, före mätningen –
  // det som byter layout efter bredden (kolumnerna, crm.js klistraKolumner) hamnar då i slutläget, så att inget hoppar efteråt.
  function satt(dold, animera = true, minns = true, vidVaxling = null) {
    const lugnt = lugnMq.matches;
    const rora = !!animera && dator.matches && !lugnt && !!rot.animate;
    if (rora && glid && glid.dold === dold && arDold() === dold) return; // redan på väg dit
    const e = delar(); let fore = null; let tid = glidTid(); let frysta = [];
    // Magnetens förskjutning ska inte följa med knappen eller chattikonen till det nya läget
    [e.knapp, $('.chf-ikon')].forEach((el) => { if (el) el.style.translate = ''; });
    if (rora) {
      // Mät före – med en pågående glidning inräknad – och avbryt den sedan, så att ett snabbt andra klick fortsätter därifrån
      fore = matt(e);
      if (glid) tid = Math.round(tid * (0.4 + 0.6 * lada(Math.min(1, (performance.now() - glid.start) / glid.tid))));
      if (!dold) frysta = frysRals();
      stoppa(false);
      frysta.forEach(([el, v]) => { el.style.marginBottom = v; });
      markera(true);
    } else stoppa(true);
    rot.toggleAttribute('data-sido-dold', dold);
    if (e.sido) e.sido.inert = dold && dator.matches;
    if (e.rals) e.rals.inert = !(dold && dator.matches);
    const text = dold ? 'Visa menyn' : 'Dölj menyn';
    if (e.knapp) { e.knapp.setAttribute('aria-expanded', String(!dold)); e.knapp.setAttribute('aria-label', text); e.knapp.title = `${text}  [`; }
    if (minns) { try { localStorage.setItem('up-crm-sido-dold', dold ? '1' : '0'); } catch (err) { /* ingen lagring */ } }
    if (vidVaxling) { try { vidVaxling(); } catch (err) { console.error('[sidomeny]', err); } }

    let efter = null; const anims = [];
    if (rora) {
      efter = matt(e);
      const spela = (el, kf, o) => {
        if (!el) return null;
        const opt = { duration: tid, easing: KURVA, ...(o || {}) };
        const a = el.animate(kf, opt); anims.push(a); return a;
      };
      // Tonar in (efter att kanten hunnit en bit) eller ut (under första halvan) – linjärt i tid
      const tona = (el, fran, till, o = {}) => {
        if (!el || (fran === till && !o.synlig)) return null;
        const kf = till > fran ? [{ opacity: fran, offset: 0 }, { opacity: fran, offset: 0.12 }, { opacity: till, offset: 0.62 }, { opacity: till }]
          : [{ opacity: fran }, { opacity: till, offset: 0.42 }, { opacity: till }];
        if (o.synlig) kf.forEach((f) => { f.visibility = 'visible'; });
        return spela(el, kf, { easing: 'linear' });
      };
      // Innehållet
      if (fore.ankare && efter.ankare) {
        const vdx = fore.ankare.x - efter.ankare.x; const vdy = fore.ankare.y - efter.ankare.y;
        if (Math.abs(vdx) > 0.5 || Math.abs(vdy) > 0.5) spela(e.vy, [{ transform: `translate3d(${vdx}px,${vdy}px,0)` }, { transform: 'none' }]);
      }
      // Menyn och kanten (med knappen) glider i sidled; menyn är täckt hela vägen ut och in
      if (fore.sido && efter.sido) { const ts = tf(e.sido); spela(e.sido, [{ transform: `translateX(${fore.sido.x - efter.sido.x}px) ${ts}`, opacity: 1, visibility: 'visible' }, { transform: ts || 'none', opacity: 1, visibility: 'visible' }]); }
      const kdx = fore.kant && efter.kant ? fore.kant.x - efter.kant.x : 0;
      if (kdx) { const tk = tf(e.kant); spela(e.kant, [{ transform: `translateX(${kdx}px) ${tk}` }, { transform: tk || 'none' }]); }
      // Knappen byter form och läge, pilen vänder
      if (fore.knapp && efter.knapp) {
        // Knappen glider bara i sidled (som kanten): byter den höjd (fliken mitt på kanten ⇄ sin plats i rälsen) tonar den ut på sin
        // gamla höjd och fram på den nya under glidningens första del – förut gled den snett över menyn (fynd-2-meny 6).
        const hopp = fore.knapp.top !== efter.knapp.top;
        const k0 = {}; const k1 = {};
        KNAPP_MATT.filter((p) => !hopp || p !== 'top').forEach((p) => { k0[p] = fore.knapp[p]; k1[p] = efter.knapp[p]; });
        spela(e.knapp, [k0, k1]);
        if (hopp) {
          const t0 = fore.knapp.top; const t1 = efter.knapp.top;
          spela(e.knapp, [{ top: t0, opacity: 1 }, { top: t0, opacity: 0, offset: 0.12 }, { top: t1, opacity: 0, offset: 0.13 }, { top: t1, opacity: 1, offset: 0.4 }, { top: t1, opacity: 1 }], { easing: 'linear' });
        }
      }
      if (e.pil && fore.vinkel !== efter.vinkel) spela(e.pil, [{ transform: `rotate(${fore.vinkel}deg)` }, { transform: `rotate(${efter.vinkel}deg)` }]);
      // Rälsen följer kanten och tonar (den ligger för sig, inte i kanten – därför samma förflyttning som kanten)
      if (e.rals && kdx) {
        if (dold) spela(e.rals, [{ transform: `translateX(${kdx}px)` }, { transform: 'none' }]);
        else spela(e.rals, [{ transform: 'none' }, { transform: `translateX(${-kdx}px)` }]);
      }
      tona(e.rals, fore.rals == null ? (dold ? 0 : 1) : fore.rals, dold ? 1 : 0, { synlig: true });
      const denna = glid = { start: performance.now(), tid, dold, anims, frysta };
      Promise.all(anims.map((a) => a.finished)).then(() => {
        if (glid !== denna) return;
        stoppa(true);
        klar(dold);
      }, () => { /* avbruten av ett nytt klick */ });
    }
    if (!rora && animera && lugnt && dator.matches && rot.animate) {
      // Reducerad rörelse: en kort tvärtoning i stället för glidning
      [[$('.huvud'), 0.5], [e.kant, 0], [dold ? null : e.sido, 0], [dold ? e.rals : null, 0]].forEach(([el, op]) => { if (el) el.animate([{ opacity: op }, { opacity: 1 }], { duration: 160, easing: 'linear' }); });
    }
    // Direkt vid växlingen: knappens läge före och efter, tid och kurva – så att chattens snabbknapp kan följa med i takt med menyn
    dispatchEvent(new CustomEvent('up:sido', { detail: { dold, animera: rora, tid: rora ? tid : 0, kurva: KURVA,
      knappFran: rora && fore.knappRuta ? rutaUt(fore.knappRuta) : null, knappTill: rora && efter.knappRuta ? rutaUt(efter.knappRuta) : null } }));
    if (!rora) setTimeout(() => klar(dold), animera && lugnt ? 160 : 0);
  }
  dator.addEventListener('change', () => { const s = $('.sido'); const r = $('[data-sido-rals]'); if (s) s.inert = arDold() && dator.matches; if (r) r.inert = !(arDold() && dator.matches); });

  /* 02-Mer: menyn får alltid plats utan att rulla --------------------------------------------------------------- */
  // Först lägre rader (data-sido-tat), sedan flyttas de rader som inte ryms (det man använder minst först, aldrig den valda) in under "Mer".
  const ORDNING = ['installningar', 'enkater', 'videomote', 'klubbmotorn', 'dokument', 'mote', 'anvandare', 'sakerhet', 'admin', 'chef', 'projekt', 'chatt', 'att-gora', 'kunder', 'salj', 'hem'];
  const ORDNING_TEST = ['installningar', 'enkater', 'videomote', 'klubbmotorn', 'mote', 'dokument', 'salj', 'anvandare', 'chatt', 'kunder', 'att-gora', 'projekt', 'hem'];
  let merKnapp = null;
  function anpassa() {
    const sido = $('#sidomeny'); const nav = sido && $('[data-nav]', sido);
    if (!nav || !syns(sido) || !dator.matches) return;
    const fore = `${rot.getAttribute('data-sido-tat')}|${$$('[data-mer-dold]', nav).length}`;
    rot.removeAttribute('data-sido-tat');
    $$('[data-mer-dold]', nav).forEach((el) => el.removeAttribute('data-mer-dold'));
    if (merKnapp) { merKnapp.remove(); merKnapp = null; }
    // Markören ligger absolut med transform och räknas in i scrollHeight – står den kvar på en rad långt ner (förra höjden) ser menyn
    // för hög ut och nästan allt flyttas in under Mer. Den mäts därför inte; flyttaPuck (crm.js) lägger den på plats efteråt.
    const puck = $('[data-nav-puck]', nav); if (puck) puck.style.display = 'none';
    const over = () => nav.scrollHeight > nav.clientHeight + 1;
    // två steg: 1 = lägre rader, 2 = även märket, verktygsraden och foten tätare (sidomeny.css 06b) – först därefter Mer.
    // Förut visade 1280 × 480 bara den valda sidan (fynd 16).
    if (over()) rot.setAttribute('data-sido-tat', '1');
    if (over()) rot.setAttribute('data-sido-tat', '2');
    if (over()) {
      const mitt = $('[data-nav-mitt-grupp]', nav) || nav;
      merKnapp = document.createElement('button');
      merKnapp.type = 'button'; merKnapp.className = 'navlank nav-merknapp'; merKnapp.setAttribute('aria-haspopup', 'menu'); merKnapp.setAttribute('aria-expanded', 'false');
      merKnapp.innerHTML = `${ik('mer')}<span>Mer</span><b class="nav-merantal" hidden></b>`;
      mitt.appendChild(merKnapp);
      const ordning = rot.hasAttribute('data-roll-test') ? ORDNING_TEST : ORDNING;
      const vikt = (el) => { const i = ordning.indexOf(el.dataset.navTill); return i < 0 ? -1 : i; };
      const rader = $$('a.navlank', nav).filter(syns).map((el, i) => ({ el, i }));
      rader.sort((a, b) => vikt(a.el) - vikt(b.el) || b.i - a.i);
      // rubriker utan synliga rader döljs också – direkt i varje steg, så att deras plats räknas och inte fler rader än nödvändigt flyttas
      const rubriker = () => $$('.nav-etikett', nav).forEach((r) => {
        let el = r.nextElementSibling; let synligRad = false;
        while (el && !el.matches('.nav-etikett')) { if (el.matches('a.navlank') && !el.hasAttribute('data-mer-dold') && syns(el)) synligRad = true; el = el.nextElementSibling; }
        r.toggleAttribute('data-mer-dold', !synligRad);
      });
      for (let n = 0; n < rader.length && over(); n++) { if (!rader[n].el.hasAttribute('aria-current')) { rader[n].el.setAttribute('data-mer-dold', ''); rubriker(); } }
      rubriker();
      const dolda = $$('a.navlank[data-mer-dold]', nav);
      // Brickan på Mer summerar de dolda varma räknarna (t.ex. 2 försenade uppgifter), inte antalet rader
      const varma = dolda.reduce((s, d) => { const b = $('.rakna.rakna-varm:not([hidden])', d); return s + (b ? parseInt(b.textContent, 10) || 0 : 0); }, 0);
      const b = $('.nav-merantal', merKnapp); b.textContent = varma || ''; b.hidden = !varma;
      merKnapp.title = `Fler sidor: ${dolda.map(namnPa).join(', ')}`;
      merKnapp.setAttribute('aria-label', `Mer: ${dolda.map(namnPa).join(', ')}${varma ? `, ${varma} att se över` : ''}`);
      if (!dolda.length) { merKnapp.remove(); merKnapp = null; }
    }
    pilMer();
    if (puck) puck.style.display = '';
    const efter = `${rot.getAttribute('data-sido-tat')}|${$$('[data-mer-dold]', nav).length}`;
    if (efter !== fore || puck) dispatchEvent(new CustomEvent('up:sido-anpassad')); // markören till sin rad igen
  }
  const namnPa = (a) => { const k = a.cloneNode(true); $$('.rakna, svg, b', k).forEach((x) => x.remove()); return k.textContent.trim(); };
  // Mer-menyn: kopior av de dolda raderna i ett litet kort som glider fram bredvid knappen
  function stangMer(fokus) {
    const p = $('.nav-merpop'); if (!p || p.hasAttribute('data-ut')) return;
    if (merKnapp) merKnapp.setAttribute('aria-expanded', 'false');
    p.setAttribute('data-ut', ''); setTimeout(() => p.remove(), lugnMq.matches ? 0 : 180);
    if (fokus && merKnapp) merKnapp.focus({ preventScroll: true });
  }
  function oppnaMer(knapp) {
    if ($('.nav-merpop:not([data-ut])')) { stangMer(); return; }
    $$('.nav-merpop[data-ut]').forEach((p) => p.remove()); // en meny som håller på att stänga: ett snabbt nytt klick öppnar igen
    const nav = knapp.closest('[data-nav]'); const pop = document.createElement('div');
    pop.className = 'nav-merpop'; pop.setAttribute('role', 'menu'); pop.setAttribute('aria-label', 'Fler sidor');
    let html = ''; let rubrik = '';
    const barn = [...nav.children].flatMap((x) => (x.matches('[data-nav-mitt-grupp]') ? [...x.children] : [x]))
      .map((x, i) => ({ x, i, o: parseInt(getComputedStyle(x.matches('[data-nav-mitt-grupp] > *') ? x.parentElement : x).order, 10) || 0 }))
      .sort((a, b) => a.o - b.o || a.i - b.i).map((r) => r.x);
    for (const el of barn) {
      if (el.matches('.nav-etikett')) { rubrik = el.textContent.trim(); continue; }
      if (!el.matches('a.navlank[data-mer-dold]')) continue;
      if (rubrik) { html += `<p class="nav-merrubrik">${rubrik.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</p>`; rubrik = ''; }
      const k = el.cloneNode(true); k.removeAttribute('data-mer-dold'); k.removeAttribute('aria-current'); k.removeAttribute('id'); k.setAttribute('role', 'menuitem');
      html += k.outerHTML;
    }
    pop.innerHTML = html; document.body.appendChild(pop);
    const r = knapp.getBoundingClientRect(); const sido = $('.sido').getBoundingClientRect();
    // till höger om menyknappen som sitter i mellanrummet – den ska inte hamna halvt under kortet
    const kn = $('[data-sido-knapp]'); const knr = kn ? kn.getBoundingClientRect() : null;
    pop.style.left = `${Math.max(sido.right + 10, knr && knr.width ? knr.right + 10 : 0)}px`;
    pop.style.top = `${Math.max(12, Math.min(innerHeight - pop.offsetHeight - 12, r.bottom - pop.offsetHeight))}px`;
    knapp.setAttribute('aria-expanded', 'true');
    pop.addEventListener('click', (ev) => { if (ev.target.closest('a, button')) setTimeout(stangMer, 0); });
    const poster = () => $$('[role="menuitem"]', pop);
    pop.addEventListener('keydown', (ev) => {
      const p = poster(); const n = p.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); p[(n + (ev.key === 'ArrowDown' ? 1 : -1) + p.length) % p.length].focus(); }
      else if (ev.key === 'Home' || ev.key === 'End') { ev.preventDefault(); p[ev.key === 'Home' ? 0 : p.length - 1].focus(); }
      else if (ev.key === 'Tab') stangMer(true); // fokus till Mer först – Tab går sedan vidare därifrån (förut försvann fokus med listan)
    });
    const forsta = poster()[0]; if (forsta) forsta.focus({ preventScroll: true });
  }
  document.addEventListener('click', (ev) => {
    const k = ev.target.closest && ev.target.closest('.nav-merknapp');
    if (k) { ev.preventDefault(); oppnaMer(k); return; }
    if (!(ev.target.closest && ev.target.closest('.nav-merpop'))) stangMer();
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && $('.nav-merpop:not([data-ut])')) { stangMer(true); ev.stopPropagation(); } }, true);
  // Vid sidbyte räknas menyn bara om när den valda raden ligger under Mer (den får aldrig döljas)
  addEventListener('hashchange', () => { stangMer(); setTimeout(() => { if ($('.sido a.navlank[aria-current][data-mer-dold]')) anpassa(); }, 30); });
  addEventListener('resize', stangMer);
  // Menyn rullar bara om inte ens Mer räcker: då visar en liten "Mer ↓" att det finns rader under kanten
  function pilMer() {
    const nav = $('.sido [data-nav]'); const sido = $('.sido'); if (!nav || !sido) return;
    sido.toggleAttribute('data-nav-mer', nav.scrollTop + nav.clientHeight < nav.scrollHeight - 6);
    sido.toggleAttribute('data-nav-rullad', nav.scrollTop > 4);
  }
  document.addEventListener('scroll', (ev) => { if (ev.target && ev.target.matches && ev.target.matches('.sido [data-nav]')) pilMer(); }, true);

  /* 03-klickkänslan ------------------------------------------------------------------------------------------- */
  // Det man trycker på sjunker lätt och fjädrar tillbaka (Web Animations på egenskapen scale – rör inte elementens egna övergångar), och en
  // mjuk ring växer ut från knappen eller kortet. Bara en kort tändning vid klicket, inget som följer musen. Inte i presentationen,
  // videomötet, 3D-scenerna eller det som dras (säljtavlans kort).
  const TRYCK = 'button, a.knapp, [role="button"], [role="tab"], a.chip, .lank-rad, .navlank, .rals-lista a, .flikrad a, a.sido-lank, .mer-rutnat a';
  const UNDANTAG = '.mote, .vm, .vm-mini, .vm-scen, .film-dialog, [data-dra], [data-pek-drag], .chf-ikon, canvas';
  function tryck(el) {
    if (el.__tryck) el.__tryck.cancel();
    // Mjukt (2026-11-23, användaren: "samma mjuka känsla på knapparna" – 90 ms ease-out kändes hårt): glider in på 220 ms och krymper
    // ungefär 3 px oavsett storlek (breda rader hoppar inte), släppet fjädrar tillbaka på 520 ms med en liten överskjutning.
    const r0 = el.getBoundingClientRect(); const djup = Math.max(.95, 1 - Math.min(.04, 6 / Math.max(1, Math.min(r0.width, r0.height * 3))));
    el.__tryck = el.animate([{ scale: '1' }, { scale: String(djup) }], { duration: 220, easing: 'cubic-bezier(.25, .8, .35, 1)', fill: 'forwards' });
    const slapp = () => {
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.removeEventListener(t, slapp));
      const a = el.__tryck; if (!a) return; el.__tryck = null;
      const nu = getComputedStyle(el).scale; a.cancel();
      const eget = getComputedStyle(el).scale;
      el.animate([{ scale: nu === 'none' ? '1' : nu }, { scale: eget === 'none' ? '1' : eget }], { duration: 520, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.addEventListener(t, slapp));
  }
  document.addEventListener('pointerdown', (ev) => {
    if (lugnMq.matches || ev.button !== 0 || !ev.target.closest) return;
    const el = ev.target.closest(TRYCK);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest(UNDANTAG)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 12 || r.width > 760 || r.height > 420) return;
    if (el.animate) tryck(el);
    const ring = document.createElement('i');
    ring.className = 'klick-ring'; ring.setAttribute('aria-hidden', 'true');
    ring.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:${getComputedStyle(el).borderRadius}`;
    document.body.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());
    setTimeout(() => ring.remove(), 900); // reserv om animationen aldrig spelas (dold flik)
  }, { passive: true });

  /* 03b-raderna: texten i en egen span (glider 2 px vid hovring), och "Mer ↓" när menyn ändå rullar ---------------------- */
  $$('#sidomeny .navlank').forEach((a) => {
    const t = [...a.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); if (!t) return;
    const s = document.createElement('span'); s.className = 'navlank-text'; t.replaceWith(s); s.append(t);
  });
  const fot = $('#sidomeny .sido-fot');
  if (fot) {
    const pil = document.createElement('button');
    pil.type = 'button'; pil.className = 'nav-mer-pil'; pil.tabIndex = -1; pil.setAttribute('aria-hidden', 'true'); pil.innerHTML = `Mer ${ik('chevron')}`;
    pil.addEventListener('click', () => { const nav = $('#sidomeny [data-nav]'); if (nav) nav.scrollBy({ top: Math.round(nav.clientHeight * 0.8), behavior: lugnMq.matches ? 'auto' : 'smooth' }); });
    fot.prepend(pil);
  }

  /* 04-entrén: menyn glider fram en gång när CRM:et öppnas, inte när den ritas om ----------------------------------- */
  if (!lugnMq.matches) {
    rot.classList.add('sido-entre');
    setTimeout(() => rot.classList.remove('sido-entre'), 1200);
  }

  /* 05 Fotens verktygsrad (Hemsidan · Logga ut · återställ, 2026-11-24, användaren: "lägg till mjuk känsla och animering"): en ljus
     platta som glider mellan knapparna efter pekaren och tangentbordsfokus, som iOS – bara transform/opacity och en bredd på ett
     litet lager. Delegerat på dokumentet, så att en omritad fot fungerar direkt. */
  (() => {
    const platta = (rad) => { let p = rad.querySelector(':scope > .sido-lank-ljus'); if (!p) { p = document.createElement('span'); p.className = 'sido-lank-ljus'; p.setAttribute('aria-hidden', 'true'); rad.prepend(p); } return p; };
    const till = (knapp) => {
      const rad = knapp.closest('.sido-lankar'); if (!rad) return;
      const p = platta(rad);
      const forst = !rad.hasAttribute('data-ljus');
      if (forst) p.style.transition = 'none';  // första gången: tona fram på plats, glid sedan mellan knapparna
      p.style.width = knapp.offsetWidth + 'px';
      p.style.transform = 'translateX(' + knapp.offsetLeft + 'px)';
      rad.setAttribute('data-ljus', '');
      rad.querySelectorAll('.sido-lank').forEach((k) => k.toggleAttribute('data-ljus', k === knapp));
      if (forst) { void p.offsetWidth; p.style.transition = ''; }
    };
    const bort = (rad) => { rad.removeAttribute('data-ljus'); rad.querySelectorAll('.sido-lank[data-ljus]').forEach((k) => k.removeAttribute('data-ljus')); };
    document.addEventListener('pointerover', (e) => { const k = e.target.closest && e.target.closest('#sidomeny .sido-lank'); if (k && e.pointerType !== 'touch') till(k); });
    document.addEventListener('pointerout', (e) => { const rad = e.target.closest && e.target.closest('#sidomeny .sido-lankar'); if (rad && !rad.contains(e.relatedTarget)) bort(rad); });
    document.addEventListener('focusin', (e) => { const k = e.target.closest && e.target.closest('#sidomeny .sido-lank'); if (k && k.matches(':focus-visible')) till(k); });
    document.addEventListener('focusout', (e) => { const rad = e.target.closest && e.target.closest('#sidomeny .sido-lankar'); if (rad && !rad.contains(e.relatedTarget)) bort(rad); });
  })();

  let anpT = 0;
  addEventListener('resize', () => { clearTimeout(anpT); anpT = setTimeout(anpassa, 120); });
  try { document.fonts.ready.then(() => anpassa()); } catch (err) { /* äldre webbläsare */ }
  window.UPSido = { satt, anpassa, dold: arDold, glider: () => !!glid, KURVA };
})();
