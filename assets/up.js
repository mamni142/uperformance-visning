/* Uperformance – beteenden för startsidan. Ingen byggprocess, inga beroenden. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const lugn = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kr = (n) => Math.round(n).toLocaleString('sv-SE').replace(/,/g, ' ') + ' kr';

  /* Personaväxel ------------------------------------------------------------ */
  const satPersona = (p) => {
    if (p === 'idrott') html.dataset.persona = 'idrott'; else delete html.dataset.persona;
    $$('[data-persona-knapp]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.personaKnapp === (p || 'foretag'))));
    try { localStorage.setItem('up-persona', p); } catch (e) { /* privat läge */ }
  };
  satPersona(html.dataset.persona === 'idrott' ? 'idrott' : 'foretag');
  $$('[data-persona-knapp]').forEach((b) => b.addEventListener('click', () => satPersona(b.dataset.personaKnapp)));

  /* Demo-inloggningen i CRM:et gäller bara så länge man är kvar där: den som går till hemsidan
     loggas ut och får logga in igen via inloggningssidan (pageshow täcker även bakåtknappen) */
  const loggaUtCrm = () => { try { localStorage.removeItem('up-crm-inloggad'); } catch (err) { /* privat läge */ } };
  loggaUtCrm();
  addEventListener('pageshow', loggaUtCrm);

  /* Meny -------------------------------------------------------------------- */
  const topp = $('[data-topp]');
  const merScroll = () => { if (topp) topp.toggleAttribute('data-scrollad', scrollY > 24); };
  addEventListener('scroll', merScroll, { passive: true });
  merScroll();

  // Mobilmenyn växer fram i en cirkel från menyknappen; länkarna glider in en i taget (--i)
  const mobil = $('[data-mobilmeny]');
  const oppna = $('[data-meny-oppna]');
  if (mobil) $$(':scope > a', mobil).forEach((a, i) => a.style.setProperty('--i', i));
  const stangMeny = () => {
    if (!mobil || !mobil.hasAttribute('data-oppen')) return;
    mobil.removeAttribute('data-oppen');
    document.body.removeAttribute('data-meny-oppen');
    if (oppna) { oppna.setAttribute('aria-expanded', 'false'); oppna.setAttribute('aria-label', 'Öppna menyn'); }
    document.body.style.overflow = '';
  };
  const oppnaMeny = () => {
    const b = oppna.getBoundingClientRect();
    mobil.style.setProperty('--ox', `${b.left + b.width / 2}px`);
    mobil.style.setProperty('--oy', `${b.top + b.height / 2}px`);
    mobil.setAttribute('data-oppen', '');
    document.body.setAttribute('data-meny-oppen', '');
    oppna.setAttribute('aria-expanded', 'true'); oppna.setAttribute('aria-label', 'Stäng menyn');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const forsta = $('a', mobil); if (forsta) forsta.focus({ preventScroll: true }); }, 450);
  };
  oppna && mobil && oppna.addEventListener('click', () => { if (mobil.hasAttribute('data-oppen')) stangMeny(); else oppnaMeny(); });
  $('[data-meny-stang]') && $('[data-meny-stang]').addEventListener('click', () => { stangMeny(); oppna && oppna.focus(); });
  // Ankarlänkar stänger menyn; länkar till andra sidor låter den ligga kvar medan sidan tonar ut
  mobil && $$('a', mobil).forEach((a) => a.addEventListener('click', () => { if ((a.getAttribute('href') || '').startsWith('#')) stangMeny(); }));
  addEventListener('pageshow', (ev) => { if (ev.persisted) stangMeny(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && mobil && mobil.hasAttribute('data-oppen')) { stangMeny(); oppna && oppna.focus(); } });

  // Markera aktuell sektion i menyn
  // Alla sektioner följs (2026-11-23, "rätt ordning när man scrollar"): en sektion utan egen menyrad markerar den närmaste
  // menyraden ovanför sig (App-plattformen → Metod, Teamet → Om oss), och hjälten och kontakten markerar ingenting –
  // annars stod markeringen kvar på fel rad. Menyns ordning är sidans ordning, så markeringen går stadigt åt höger.
  const menyLankar = $$('.meny-lista .meny-lank, .meny-hoger .meny-lank[href^="#"]'); // Frågor står till höger i menyn
  const menyMal = new Set(menyLankar.map((a) => a.getAttribute('href').slice(1)));
  const allaSektioner = $$('main section[id], body > section[id], section[id]').filter((s, i, a) => a.indexOf(s) === i);
  const UTAN_MARKERING = new Set(['top', 'kontakt']);
  let senaste = null; const tillhor = new Map();
  allaSektioner.forEach((s) => { if (menyMal.has(s.id)) senaste = s.id; tillhor.set(s, UTAN_MARKERING.has(s.id) ? null : senaste); });
  if ('IntersectionObserver' in window && menyLankar.length) {
    const io = new IntersectionObserver((poster) => {
      poster.forEach((p) => {
        if (!p.isIntersecting) return;
        const mal = tillhor.get(p.target);
        menyLankar.forEach((a) => a.setAttribute('aria-current', String(!!mal && a.getAttribute('href') === '#' + mal)));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    allaSektioner.forEach((s) => io.observe(s));
  }

  /* Räkna upp nyckeltal ------------------------------------------------------- */
  const raknaUpp = (el) => {
    const mal = parseFloat(el.dataset.tal);
    const dec = parseInt(el.dataset.decimaler || '0', 10);
    const format = (v) => v.toLocaleString('sv-SE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (lugn) { el.textContent = format(mal); return; }
    const start = performance.now();
    const tid = 1600;
    const steg = (t) => {
      const p = Math.min(1, (t - start) / tid);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = format(mal * e);
      if (p < 1) requestAnimationFrame(steg);
    };
    requestAnimationFrame(steg);
  };

  /* Framtoning när block når vyn ---------------------------------------------- */
  const visa = (el) => {
    if (el.hasAttribute('data-synlig')) return;
    el.setAttribute('data-synlig', '');
    $$('[data-tal]', el).forEach(raknaUpp);
  };
  const block = $$('[data-in]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((poster) => {
      poster.forEach((p) => { if (p.isIntersecting) { visa(p.target); io.unobserve(p.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    block.forEach((b) => io.observe(b));
  } else {
    block.forEach(visa);
  }

  // Dekor som rör sig hela tiden pausas utanför bild (data-vilar, modul 15 i up.css): skimrande ord,
  // berättelsens bilder (stjärnor, Ken Burns, skimmer) och paketens ljusramar. Annars målas de om i varje bildruta.
  if ('IntersectionObserver' in window) {
    const vila = new IntersectionObserver((poster) => poster.forEach((p) => p.target.toggleAttribute('data-vilar', !p.isIntersecting)), { rootMargin: '100px 0px' });
    $$('.skimmer, .bs, .paket-rutnat, .sidfot-ord').forEach((el) => vila.observe(el));
  }

  // Filmloopar i korten (modul 21 i up.css): laddas när kortet syns, spelar bara i bild. Reducerad rörelse/dataspar → bara fotot.
  const loopar = $$('video.loopfilm[data-loop]');
  const sparData = navigator.connection && navigator.connection.saveData;
  if (loopar.length && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches && !sparData) {
    const loopIo = new IntersectionObserver((poster) => poster.forEach((p) => {
      const v = p.target;
      if (p.isIntersecting) {
        if (!v.src) {
          v.src = `${v.dataset.loop}${matchMedia('(max-width: 700px)').matches ? '-sm' : ''}.mp4`;
          v.addEventListener('playing', () => v.setAttribute('data-spelar', ''), { once: true });
        }
        const lova = v.play(); if (lova && lova.catch) lova.catch(() => { /* autoplay nekad – fotot står kvar */ });
      } else if (!v.paused) v.pause();
    }), { rootMargin: '200px 0px' });
    loopar.forEach((v) => loopIo.observe(v));
  }

  // Hjältens bakgrund pausas när den är ur bild – sparar batteri
  const hero = $('[data-hero]');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([p]) => hero.toggleAttribute('data-pausad', !p.isIntersecting)).observe(hero);
  }

  // Hjältescenen lutar lätt efter musen (--sx/--sy, -1…1): riskprofilen vrids i 3D, sidokorten glider – bara med mus
  if (hero && !lugn && matchMedia('(hover: hover)').matches) {
    let ram = 0, mx = 0, my = 0;
    const luta = () => {
      ram = 0;
      // 3D-rymden bakom rubriken (assets/apple.css 06, .hero-3d) lutar efter musen i hela hjälten (--hx/--hy, -1…1)
      const rymd = $('.hero-3d', hero);
      if (rymd) { rymd.style.setProperty('--hx', Math.max(-1, Math.min(1, mx / innerWidth * 2 - 1)).toFixed(3)); rymd.style.setProperty('--hy', Math.max(-1, Math.min(1, my / Math.max(1, innerHeight) * 2 - 1)).toFixed(3)); }
      $$('.scen', hero).forEach((scen) => {
        const r = scen.getBoundingClientRect();
        if (!r.width) return; // den dolda personans scen
        const sx = Math.max(-1, Math.min(1, (mx - (r.left + r.width / 2)) / (r.width / 2)));
        const sy = Math.max(-1, Math.min(1, (my - (r.top + r.height / 2)) / (r.height / 2)));
        scen.style.setProperty('--sx', sx.toFixed(3));
        scen.style.setProperty('--sy', sy.toFixed(3));
      });
    };
    hero.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (!ram) ram = requestAnimationFrame(luta); });
    hero.addEventListener('pointerleave', () => { $$('.scen', hero).forEach((s) => { s.style.setProperty('--sx', '0'); s.style.setProperty('--sy', '0'); }); const rymd = $('.hero-3d', hero); if (rymd) { rymd.style.setProperty('--hx', '0'); rymd.style.setProperty('--hy', '0'); } });
  }

  /* Rubriken i hjälten (2026-11-23, användaren: "fixa så den animeras och renderas snyggt"): texten före det tonade ordet delas i
     ord och bokstäver (.hr-ord > .hr-b, --i = ordningen) som stiger fram en i taget ur oskärpa – stilen i assets/apple.css. Orden
     hålls ihop (inget radbyte mitt i ett ord), och skärmläsare får hela rubriken via aria-label. Det tonade ordet (.skimmer) sveps
     fram som en helhet så att toningen löper obruten över ordet. */
  (() => {
    const h1 = hero && $('.hero-rubrik', hero); if (!h1 || lugn) return;
    const text = h1.textContent.replace(/\s+/g, ' ').trim(); let i = 0;
    [...h1.childNodes].forEach((n) => {
      if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
      const bit = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach((del) => {
        if (!del) return;
        if (/^\s+$/.test(del)) { bit.appendChild(document.createTextNode(' ')); return; }
        const ord = document.createElement('span'); ord.className = 'hr-ord'; ord.setAttribute('aria-hidden', 'true');
        [...del].forEach((c) => { const b = document.createElement('span'); b.className = 'hr-b'; b.style.setProperty('--i', i++); b.textContent = c; ord.appendChild(b); });
        bit.appendChild(ord);
      });
      h1.replaceChild(bit, n);
    });
    const ton = $('.skimmer', h1); if (ton) { ton.style.setProperty('--i', i); ton.setAttribute('aria-hidden', 'true'); }
    h1.setAttribute('aria-label', text); h1.setAttribute('data-delad', '');
  })();

  /* Flödet bakom hjälten (2026-11-23, användaren: "kom på en super cool stilren animering som passar Uperformance, en helt ny design"):
     ETT band av ljus – ett trettiotal hårfina linjer som tillsammans bildar ett silkesband som sakta vrider sig och böljar genom hjälten
     (kroppens signaler i rörelse: puls, andning, prestation – utan att vara en klinisk kurva). Bandet hänger i en mjuk U-form runt
     rubriken (varumärkets bokstav): högt vid kanterna, lägst under knapparna. Varje linje är en tråd tvärs över bandet; bandets vridning
     ger djupet (trådarna på framsidan är ljusare och tjockare). Färgen går från mint till is. Bandet ritas in från vänster en gång och
     följer musen svagt. Ritas på en canvas i .hero-3d (assets/apple.css) bara när hjälten syns och fliken är framme; utan canvas eller
     med reducerad rörelse står CSS-ringarna kvar. Tidigare idéer som avvisats: planetringar, löparbana + EKG, vattendroppe. */
  (() => {
    const rymd = hero && $('.hero-3d', hero);
    if (!rymd || lugn || !window.requestAnimationFrame) return;
    const duk = document.createElement('canvas'); const g = duk.getContext && duk.getContext('2d');
    if (!g) return;
    duk.className = 'h3-duk'; rymd.appendChild(duk); rymd.setAttribute('data-duk', '');
    const TRADAR = 34, PI = Math.PI;
    let b = 0, h = 0, k = 1, sy = 0, steg = 12, forra = 0, t = 0, syns = true, igang = 0, in0 = 0, ton = null;
    let mx = 0, my = 0, cx = 0, cy = 0;
    const matt = () => {
      const r = rymd.getBoundingClientRect(); if (!r.width) return;
      k = Math.min(1.5, window.devicePixelRatio || 1) * Math.min(1, 1500 / r.width);
      b = Math.round(r.width * k); h = Math.round(r.height * k); duk.width = b; duk.height = h;
      // bandets lägsta punkt ligger strax under raden under knapparna (den synliga personans)
      const not = $$('.hero-not', hero).find((x) => x.getClientRects().length);
      sy = ((not ? not.getBoundingClientRect().bottom - r.top : r.height * .6) + 58) * k;
      steg = Math.max(8, Math.round(b / 150));
      ton = g.createLinearGradient(0, 0, b, 0);
      ton.addColorStop(0, '#6fb6ff'); ton.addColorStop(.3, '#a7d2ff'); ton.addColorStop(.55, '#8fe6cf'); ton.addColorStop(.8, '#7ee0c3'); ton.addColorStop(1, '#6fb6ff');
    };
    const rita = (nu) => {
      igang = 0;
      if (!syns || document.hidden) return;
      const dt = Math.min(.05, (nu - (forra || nu)) / 1000); forra = nu; t += dt;
      if (!b) matt();
      in0 = Math.min(1, in0 + dt / 2.2);                               // bandet ritas in från vänster
      cx += (mx - cx) * Math.min(1, dt * 1.2); cy += (my - cy) * Math.min(1, dt * 1.2);
      const fram = 1 - Math.pow(1 - in0, 3);
      const smal = b < 760 * k;                                         // telefon: lägre U, smalare band
      const U = (smal ? 150 : 250) * k, W = (smal ? 46 : 78) * k;
      g.clearRect(0, 0, b, h);
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = ton; g.lineCap = 'round'; g.lineJoin = 'round';
      const slut = b * (fram * 1.1) ;
      for (let j = 0; j < TRADAR; j++) {
        const v = j / (TRADAR - 1) - .5;                               // −.5 … .5 tvärs över bandet
        let djupSum = 0, n = 0;
        g.beginPath();
        for (let x = -steg; x <= Math.min(b + steg, slut); x += steg) {
          const u = x / b;
          const kant = (u - .5) * 2;                                    // −1 … 1
          const mitt = sy - kant * kant * U                             // U-formen
            + Math.sin(u * 2.3 * PI + t * .28 + cx * .5) * 26 * k + Math.sin(u * 5.1 * PI - t * .19) * 9 * k + cy * 14 * k;
          const bredd = W * (.42 + .58 * (.5 + .5 * Math.sin(u * 2.9 * PI + t * .21 + 1.1)));
          const vrid = u * 2.6 * PI + t * .24 + Math.sin(u * 4.2 + t * .17) * .7 + cx * .35;
          const y = mitt + v * 2 * bredd * Math.cos(vrid) + Math.sin(u * 9 + j * .4 + t * .5) * 1.4 * k;
          djupSum += v * Math.sin(vrid); n++;
          if (x <= -steg + .5) g.moveTo(x, y); else g.lineTo(x, y);
        }
        if (n < 2) continue;
        const djup = .5 + djupSum / n;                                  // ≈ 0 (bak) … 1 (fram) i snitt
        const kantton = 1 - Math.abs(v) * .9;                           // bandets kanter svagare
        g.globalAlpha = (.07 + .3 * Math.max(0, Math.min(1, djup))) * (.45 + .55 * kantton) * fram;
        g.lineWidth = (.6 + .9 * Math.max(0, Math.min(1, djup))) * k;
        g.stroke();
      }
      // ett mjukt sken längs bandets mitt (en bred, svag tråd)
      g.beginPath();
      for (let x = -steg; x <= Math.min(b + steg, slut); x += steg * 2) {
        const u = x / b; const kant = (u - .5) * 2;
        const y = sy - kant * kant * U + Math.sin(u * 2.3 * PI + t * .28 + cx * .5) * 26 * k + Math.sin(u * 5.1 * PI - t * .19) * 9 * k + cy * 14 * k;
        if (x <= -steg + .5) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.globalAlpha = .05 * fram; g.lineWidth = W * 1.5; g.stroke();
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      igang = requestAnimationFrame(rita);
    };
    const starta = () => { if (!igang && syns && !document.hidden) { forra = 0; igang = requestAnimationFrame(rita); } };
    if ('IntersectionObserver' in window) new IntersectionObserver(([p]) => { syns = p.isIntersecting; starta(); }).observe(hero);
    document.addEventListener('visibilitychange', starta);
    addEventListener('resize', () => { b = 0; }, { passive: true });
    hero.addEventListener('click', (e) => { if (e.target.closest('[data-persona-knapp]')) setTimeout(() => { b = 0; }, 60); }); // ingressen byter höjd
    if (matchMedia('(hover: hover)').matches) {
      hero.addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / Math.max(1, innerHeight) * 2 - 1; }, { passive: true });
      hero.addEventListener('pointerleave', () => { mx = 0; my = 0; });
    }
    starta();
  })();

  /* Film ------------------------------------------------------------------------ */
  const film = $('[data-film]');
  const video = $('[data-film-video]');
  const filmKnapp = $('[data-film-knapp]');
  if (film && video && filmKnapp) {
    let anvandarenPausade = lugn; // med reducerad rörelse startar filmen bara på begäran
    let synlig = false;
    const uppdatera = () => {
      const spelar = !video.paused;
      filmKnapp.setAttribute('aria-pressed', String(spelar));
      $('use', filmKnapp).setAttribute('href', spelar ? '#i-paus' : '#i-play');
      $('[data-film-text]', filmKnapp).textContent = spelar ? 'Pausa film' : 'Spela film';
    };
    const spela = () => { video.preload = 'auto'; const p = video.play(); if (p && p.catch) p.catch(() => {}); };
    video.addEventListener('play', uppdatera);
    video.addEventListener('pause', uppdatera);
    filmKnapp.addEventListener('click', () => {
      if (video.paused) { anvandarenPausade = false; spela(); } else { anvandarenPausade = true; video.pause(); }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([p]) => {
        synlig = p.isIntersecting;
        if (synlig && !anvandarenPausade) spela();
        if (!synlig && !video.paused) video.pause();
      }, { threshold: 0.25 }).observe(film);
    }
  }

  /* Kontaktformulär = förfrågan till CRM:et (2026-11-23, användaren: "kunderna som skickar förfrågningar, väljer paket eller bokar
     ska hamna i CRM:et och de anställda få mejl") ---------------------------------------------------------------------------------
     Ärendet väljs överst (Fråga | Boka genomgång | Välja paket) – knapparna på sidan ("Boka en genomgång", "Välj Bas+" …) fyller i det.
     Skarpt läge (servern, server/api-kund.js): POST /api/forfragan sparar förfrågan i CRM:ets Förfrågningar och mejlar Gustav och
     Magnus. Utan server (demon på 3120, GitHub Pages): förfrågan läggs i webbläsarens "up-forfragningar-inkorg" som CRM-demon på
     samma adress hämtar – och besökaren får veta att det är en förhandsversion. */
  const form = $('[data-kontaktformular]');
  if (form) {
    const svar = $('[data-formular-svar]', form);
    const meddela = (typ, text) => { svar.dataset.typ = typ; svar.textContent = text; };
    const satArende = (arende, paket) => {
      form.elements.arende.value = arende;
      $$('[data-arende-val]', form).forEach((k) => k.setAttribute('aria-pressed', String(k.dataset.arendeVal === arende)));
      $$('[data-visa-for]', form).forEach((d) => { d.hidden = d.dataset.visaFor !== arende; });
      if (paket !== undefined) form.elements.paket.value = paket;
    };
    $$('[data-arende-val]', form).forEach((k) => k.addEventListener('click', () => satArende(k.dataset.arendeVal)));
    document.addEventListener('click', (ev) => {
      const l = ev.target.closest && ev.target.closest('[data-arende]'); if (!l) return;
      satArende(l.dataset.arende, l.dataset.paket || (l.dataset.arende === 'paket' ? form.elements.paket.value : ''));
      setTimeout(() => { try { form.elements.namn.focus({ preventScroll: true }); } catch (err) { /* äldre webbläsare */ } }, 700);
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const el = form.elements; const namn = el.namn, epost = el.epost;
      if (!namn.value.trim()) { meddela('fel', 'Skriv ditt namn.'); namn.focus(); return; }
      if (!epost.value.trim() || !epost.checkValidity()) { meddela('fel', 'Skriv en giltig e-postadress.'); epost.focus(); return; }
      if (el.arende.value === 'paket' && !el.paket.value) { meddela('fel', 'Välj vilket paket det gäller.'); el.paket.focus(); return; }
      if (!el.integritet.checked) { meddela('fel', 'Bekräfta att du har läst hur vi behandlar dina uppgifter.'); el.integritet.focus(); return; }
      const antal = parseInt(el.antal.value, 10);
      const data = { typ: el.arende.value, namn: namn.value.trim(), epost: epost.value.trim(), tel: el.tel.value.trim(), organisation: el.organisation.value.trim(),
        representerar: el.typ.value, paket: el.arende.value === 'paket' ? el.paket.value : '', antal: Number.isInteger(antal) && antal > 0 ? antal : null,
        onskad: el.arende.value === 'bokning' ? el.onskad.value.trim() : '', meddelande: el.meddelande.value.trim(), integritet: true, integritetVersion: '1', _gotcha: el._gotcha.value };
      const knapp = $('button[type="submit"]', form);
      knapp.disabled = true;
      const klart = (demo) => {
        form.reset(); satArende('kontakt', '');
        meddela('ok', data.typ === 'bokning' ? 'Tack! Vi hör av oss och bokar en tid som passar.' : data.typ === 'paket' ? 'Tack för ert val! Vi hör av oss med nästa steg.' : 'Tack! Vi hör av oss så snart vi kan.');
        if (demo) svar.textContent += ' (Förhandsversion: förfrågan sparades i CRM-demon i den här webbläsaren – inget mejl skickades.)';
      };
      try {
        const r = await fetch('/api/forfragan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-UP': '1', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (r.ok) { klart(false); return; }
        if (r.status === 422 || r.status === 429 || r.status === 400) { let j = {}; try { j = await r.json(); } catch (err) { /* tomt */ } meddela('fel', j.meddelande || 'Kontrollera fälten och försök igen.'); return; }
        // Bara "ingen server" (statisk värd: 404/405, python-förhandsvisningen: 501) ger demons inkorg. Andra fel från en riktig
        // server (403, 413, 500, 503 …) är fel – annars fick besökaren "Tack!" fast förfrågan aldrig sparades eller mejlades.
        if (r.status !== 404 && r.status !== 405 && r.status !== 501) { meddela('fel', 'Förfrågan kunde inte skickas just nu. Försök igen om en stund – det du skrivit finns kvar.'); return; }
        throw new Error('ingen server');
      } catch (err) {
        // ingen server här (nätverksfel eller statisk värd): demon – lägg förfrågan där CRM-demon på samma adress hämtar den
        if (data._gotcha) { klart(true); return; }
        try {
          const lista = JSON.parse(localStorage.getItem('up-forfragningar-inkorg') || '[]');
          const { _gotcha, ...post } = data;
          const nu = new Date().toISOString();
          lista.push({ ...post, integritet: { version: post.integritetVersion || '1', tid: nu }, id: 'f' + Math.random().toString(36).slice(2, 11), kalla: 'hemsidan', skapad: nu });
          localStorage.setItem('up-forfragningar-inkorg', JSON.stringify(lista.slice(-50)));
          klart(true);
        } catch (err2) { meddela('fel', 'Något gick fel. Försök igen om en stund.'); }
      } finally {
        knapp.disabled = false;
      }
    });
  }

  /* Berättelsen: bilder som i CRM:ets presentationsläge – raden längst ner visar bildens namn,
     prickar och "3 / 8", och pilarna/prickarna scrollar till föregående/nästa bild ------------------- */
  const berattelse = $('[data-berattelse]');
  if (berattelse) {
    const bilder = $$('.bs', berattelse);
    const aktuell = $('[data-bs-aktuell]', berattelse);
    const raknare = $('[data-bs-raknare]', berattelse);
    const prickar = $('[data-bs-prickar]', berattelse);
    const [bak, fram] = $$('[data-bs-steg]', berattelse);
    bilder.forEach((b, i) => {
      const p = document.createElement('button');
      p.type = 'button'; p.setAttribute('aria-label', `${i + 1}. ${b.dataset.bsNamn}`);
      p.addEventListener('click', () => b.scrollIntoView({ behavior: lugn ? 'auto' : 'smooth', block: 'start' }));
      prickar.appendChild(p);
    });
    let index = -1;
    const visaIndex = (i) => {
      if (i === index) return; index = i;
      aktuell.textContent = bilder[i].dataset.bsNamn;
      raknare.textContent = `${i + 1} / ${bilder.length}`;
      [...prickar.children].forEach((p, j) => p.setAttribute('aria-current', String(j === i)));
      bak.disabled = i === 0; fram.disabled = i === bilder.length - 1;
    };
    let ram = 0;
    const uppdatera = () => {
      ram = 0; const mitt = innerHeight * .5; let i = 0;
      bilder.forEach((b, j) => { if (b.getBoundingClientRect().top < mitt) i = j; });
      visaIndex(i);
    };
    [bak, fram].forEach((knapp) => knapp.addEventListener('click', () => {
      const mal = bilder[Math.max(0, Math.min(bilder.length - 1, index + Number(knapp.dataset.bsSteg)))];
      mal.scrollIntoView({ behavior: lugn ? 'auto' : 'smooth', block: 'start' });
    }));
    addEventListener('scroll', () => { if (!ram) ram = requestAnimationFrame(uppdatera); }, { passive: true });
    addEventListener('resize', () => { if (!ram) ram = requestAnimationFrame(uppdatera); });
    uppdatera();
  }

  /* Premiumkorten (Bas+ och Bas++) – gnistor med slumpad plats och fart (antal i data-premium-gnistor, annars 16),
     bockarna tänds i tur och ordning (--j), och på datorer lutar kortet i 3D efter musen medan ett ljus följer
     den (--rx/--ry, --lx/--ly). Bas+ dämpar lutningen med --luta i CSS. Utanför bild pausas allt (data-vilar). ---- */
  $$('[data-premium]').forEach((premium) => {
    const gnistor = $('[data-premium-gnistor]', premium);
    const farger = ['var(--accent)', 'var(--is)', '#fff'];
    const antal = Number(gnistor.dataset.premiumGnistor) || 16;
    for (let i = 0; i < antal; i++) {
      const g = document.createElement('i');
      const t = 3.2 + Math.random() * 3;
      g.style.cssText = `--x:${(4 + Math.random() * 92).toFixed(1)}%;--dx:${Math.round(Math.random() * 60 - 30)}px;--s:${(6 + Math.random() * 8).toFixed(1)}px;--t:${t.toFixed(2)}s;--f:${(-Math.random() * t).toFixed(2)}s;--c:${farger[i % 3]}`;
      gnistor.appendChild(g);
    }
    $$('.paket-lista .ikon', premium).forEach((ikon, i) => ikon.style.setProperty('--j', i));
    if (!lugn && matchMedia('(hover: hover)').matches) {
      let ram = 0, px = 0, py = 0;
      const rita = () => {
        ram = 0;
        const r = premium.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (px - r.left) / r.width));
        const y = Math.min(1, Math.max(0, (py - r.top) / r.height));
        premium.style.setProperty('--lx', `${Math.round(x * premium.offsetWidth)}px`); // ljusfläcken flyttas med translate
        premium.style.setProperty('--ly', `${Math.round(y * premium.offsetHeight)}px`);
        premium.style.setProperty('--ry', `${((x - .5) * 10).toFixed(2)}deg`);
        premium.style.setProperty('--rx', `${((.5 - y) * 8).toFixed(2)}deg`);
      };
      premium.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; if (!ram) ram = requestAnimationFrame(rita); });
      premium.addEventListener('pointerleave', () => { premium.style.setProperty('--rx', '0deg'); premium.style.setProperty('--ry', '0deg'); });
    }
  });

  /* Sidfotens stora ord: en span per bokstav (--k) för framtoningen, plus en kopia i ljusfönstret (.ord-ljus)
     med exakt samma uppdelning så att ljuset hamnar precis på bokstäverna (stil och rörelse i modul 14) */
  const ord = $('.sidfot-ord');
  if (ord) {
    const text = ord.textContent.trim();
    const bokstaver = (klass) => [...text].map((t, k) => `<span class="${klass}" style="--k:${k}">${t}</span>`).join('');
    ord.innerHTML = bokstaver('ord-bokstav') + `<span class="ord-ljus"><span>${bokstaver('ord-bokstav-ljus')}</span></span>`;
  }

  /* Årtal i sidfoten */
  const ar = $('[data-ar]'); if (ar) ar.textContent = String(new Date().getFullYear());
})();
