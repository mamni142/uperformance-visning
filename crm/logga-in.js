/* Uperformance – inloggningssidan.
   Demoläget: logga in som demoroll utan lösenord. Rollen sparas i webbläsaren (up-crm-inloggad + up-crm-jag)
   och CRM:et släpper in den som är inloggad.
   Skarpt läge (node server/server.js): e-postadress → engångskod (6 siffror) → sessionskaka från servern.
   Lokalt skickas ingen e-post – koden skrivs i serverns konsol och i server/data/utkorg/. */
(() => {
  'use strict';
  const L = window.UPLager;
  const SKARP = !!(L && L.skarp);
  const lugn = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const q = new URLSearchParams(location.search);
  // Vart man var på väg i CRM:et – bara interna vägar (#/…), aldrig en extern adress
  const nasta = /^#\/[\w/-]*$/.test(q.get('nasta') || '') ? q.get('nasta') : '';
  const lasInloggad = () => { try { return JSON.parse(localStorage.getItem('up-crm-inloggad') || 'null'); } catch (err) { return null; } };

  // Redan inloggad: direkt in i CRM:et (som Kaster). Efter utloggning visas sidan med en bekräftelse.
  if ((SKARP ? L.inloggad() : lasInloggad()) && !q.has('utloggad')) { location.replace('./' + nasta); return; }

  $('[data-ar]').textContent = new Date().getFullYear();

  // Hälsning efter tid på dygnet (samma gränser som översikten i CRM:et)
  const tim = new Date().getHours();
  const halsning = tim < 5 ? 'God natt' : tim < 10 ? 'God morgon' : tim < 17 ? 'Hej' : 'God kväll'; // samma som översikten i CRM:et
  document.querySelectorAll('[data-li-halsning]').forEach((el) => { el.textContent = halsning; });

  function toast(text) {
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = `<svg class="ikon" aria-hidden="true"><use href="#i-bock"/></svg><span>${e(text)}</span>`;
    $('[data-toaster]').appendChild(t);
    setTimeout(() => { t.setAttribute('data-ut', ''); setTimeout(() => t.remove(), 320); }, 3200);
  }
  if (q.has('utloggad')) { toast('Du är utloggad'); history.replaceState(null, '', location.pathname); }

  /* Flödet i bakgrunden (2026-11-23, användaren: "fixa bort matrix-bakgrunden och fixa samma animering från hemsidan"): samma
     silkesband av ljus som bakom hemsidans hjälte (assets/up.js "Flödet") – ett trettiotal hårfina linjer som vrider sig och böljar
     i en mjuk U-form, här under den centrerade inloggningen. Ritas på en canvas bakom allt, följer musen svagt, står still när fliken
     är dold och ritas inte alls vid reducerad rörelse. */
  (() => {
    const bak = $('.li-bakgrund'); if (!bak || lugn || !window.requestAnimationFrame) return;
    const duk = document.createElement('canvas'); const g = duk.getContext && duk.getContext('2d'); if (!g) return;
    duk.className = 'li-flode'; duk.setAttribute('aria-hidden', 'true'); bak.appendChild(duk);
    const TRADAR = 34, PI = Math.PI;
    let b = 0, h = 0, k = 1, steg = 12, forra = 0, t = 0, in0 = 0, ton = null, igang = 0, mx = 0, my = 0, cx = 0, cy = 0;
    const matt = () => {
      const r = bak.getBoundingClientRect(); if (!r.width) return;
      k = Math.min(1.5, window.devicePixelRatio || 1) * Math.min(1, 1500 / r.width);
      b = duk.width = Math.round(r.width * k); h = duk.height = Math.round(r.height * k);
      steg = Math.max(8, Math.round(b / 150));
      ton = g.createLinearGradient(0, 0, b, 0);
      ton.addColorStop(0, '#6fb6ff'); ton.addColorStop(.3, '#a7d2ff'); ton.addColorStop(.55, '#8fe6cf'); ton.addColorStop(.8, '#7ee0c3'); ton.addColorStop(1, '#6fb6ff');
    };
    const rita = (nu) => {
      igang = 0; if (document.hidden || document.querySelector('.upl[data-in]')) return; // virveln täcker – Flödet vilar
      const dt = Math.min(.05, (nu - (forra || nu)) / 1000); forra = nu; t += dt;
      if (!b) matt();
      in0 = Math.min(1, in0 + dt / 2.2); const fram = 1 - Math.pow(1 - in0, 3);
      cx += (mx - cx) * Math.min(1, dt * 1.2); cy += (my - cy) * Math.min(1, dt * 1.2);
      const smal = b < 760 * k; const sy = h * (smal ? .86 : .8); const U = h * (smal ? .16 : .3), W = (smal ? 44 : 80) * k;
      const mitt = (u) => { const kant = (u - .5) * 2; return sy - kant * kant * U + Math.sin(u * 2.3 * PI + t * .28 + cx * .5) * 26 * k + Math.sin(u * 5.1 * PI - t * .19) * 9 * k + cy * 14 * k; };
      g.clearRect(0, 0, b, h); g.globalCompositeOperation = 'lighter'; g.strokeStyle = ton; g.lineCap = 'round'; g.lineJoin = 'round';
      const slut = b * fram * 1.1;
      for (let j = 0; j < TRADAR; j++) {
        const v = j / (TRADAR - 1) - .5; let djupSum = 0, n = 0;
        g.beginPath();
        for (let x = -steg; x <= Math.min(b + steg, slut); x += steg) {
          const u = x / b;
          const bredd = W * (.42 + .58 * (.5 + .5 * Math.sin(u * 2.9 * PI + t * .21 + 1.1)));
          const vrid = u * 2.6 * PI + t * .24 + Math.sin(u * 4.2 + t * .17) * .7 + cx * .35;
          const y = mitt(u) + v * 2 * bredd * Math.cos(vrid) + Math.sin(u * 9 + j * .4 + t * .5) * 1.4 * k;
          djupSum += v * Math.sin(vrid); n++;
          if (x <= -steg + .5) g.moveTo(x, y); else g.lineTo(x, y);
        }
        if (n < 2) continue;
        const djup = Math.max(0, Math.min(1, .5 + djupSum / n));
        g.globalAlpha = (.07 + .3 * djup) * (.45 + .55 * (1 - Math.abs(v) * .9)) * fram; g.lineWidth = (.6 + .9 * djup) * k; g.stroke();
      }
      g.beginPath();
      for (let x = -steg; x <= Math.min(b + steg, slut); x += steg * 2) { const y = mitt(x / b); if (x <= -steg + .5) g.moveTo(x, y); else g.lineTo(x, y); }
      g.globalAlpha = .05 * fram; g.lineWidth = W * 1.5; g.stroke();
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      igang = requestAnimationFrame(rita);
    };
    const starta = () => { if (!igang && !document.hidden) { forra = 0; igang = requestAnimationFrame(rita); } };
    document.addEventListener('visibilitychange', starta);
    addEventListener('resize', () => { b = 0; }, { passive: true });
    if (matchMedia('(hover: hover)').matches) addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / Math.max(1, innerHeight) * 2 - 1; }, { passive: true });
    starta();
  })();

  /* Avkodningen av kodrutorna (tvåstegsverifieringen, båda lägena): slumpsiffror flimrar i rutorna och landar en i taget medan en
     skanningslinje sveper över – sedan står rutorna tomma och väntar på koden. skrivText låter en text "avkodas" på samma sätt. */
  function stoppaAvkodning(rutorEl) {
    if (!rutorEl || !rutorEl._avk) return;
    clearInterval(rutorEl._avk); rutorEl._avk = 0;
    rutorEl.querySelectorAll('i[data-skramlar]').forEach((r) => { r.removeAttribute('data-skramlar'); r.textContent = ''; });
  }
  function avkoda(rutorEl, efter) {
    if (!rutorEl || lugn) { if (efter) efter(); return; }
    stoppaAvkodning(rutorEl);
    const rutor = [...rutorEl.querySelectorAll('i')]; const t0 = performance.now();
    const kod = rutorEl.closest('.li-kod'); if (kod) { kod.removeAttribute('data-skannar'); void kod.offsetWidth; kod.setAttribute('data-skannar', ''); }
    rutorEl._avk = setInterval(() => {
      const gatt = performance.now() - t0; let kvar = false;
      rutor.forEach((r, i) => {
        if (gatt < 420 + i * 95) { r.setAttribute('data-skramlar', ''); r.textContent = String(Math.floor(Math.random() * 10)); kvar = true; }
        else if (r.hasAttribute('data-skramlar')) { r.removeAttribute('data-skramlar'); r.textContent = ''; }
      });
      if (!kvar) { clearInterval(rutorEl._avk); rutorEl._avk = 0; if (efter) efter(); }
    }, 45);
  }
  function skrivText(el, text) {
    if (!el) return; if (lugn) { el.textContent = text; return; }
    const TECKEN = 'ABCDEFGHJKLMNPRSTUVXYZ0123456789'; const t0 = performance.now(); clearInterval(el._skr);
    el._skr = setInterval(() => {
      const n = Math.floor((performance.now() - t0) / 28);
      el.textContent = [...text].map((c, i) => (i < n || c === ' ' ? c : TECKEN[Math.floor(Math.random() * TECKEN.length)])).join('');
      if (n >= text.length) { clearInterval(el._skr); el.textContent = text; }
    }, 28);
  }

  // Gemensam utgång: tona ut sidan och gå in i CRM:et (testteamet börjar i sina projekt, sälj på översikten)
  let valt = false;
  function ganIn(roll) {
    // Virveln (laddning.js, 2026-11-24) tar över: den börjar här och fortsätter i CRM:et tills vyn är ritad
    setTimeout(() => { document.body.setAttribute('data-lamnar', ''); if (window.UPLaddning) UPLaddning.visa(); }, lugn ? 0 : 380);
    const mal = './' + (nasta || (roll === 'test' ? '#/projekt' : ''));
    // virveln snurrar en stund, dras sedan ihop i märket och sidan byts när bara loggan syns (UPLaddning.lamna)
    setTimeout(() => { if (window.UPLaddning) UPLaddning.lamna(mal); else location.href = mal; }, lugn ? 120 : (window.UPLaddning ? 1700 : 950)); // admin börjar på kontrollcentralen (#/)
  }

  if (!SKARP) {
    // Den roll man senast var inloggad som (demo) får en liten "Senast"-bricka
    let senast = null;
    try { senast = localStorage.getItem('up-crm-jag'); } catch (err) { /* privat läge */ }
    const senastKort = ['gs', 'ma', 'dr', 'ad'].includes(senast) && document.querySelector(`[data-roll="${senast}"]`);
    const bricka = senastKort && $('[data-li-senast]', senastKort); if (bricka) bricka.hidden = false;

    /* Steg två i demon (2026-11-23, användaren: "ser ingen skillnad" – tvåstegsverifieringen fanns bara i den skarpa versionen):
       efter att man valt konto visas samma steg som i skarpt läge, "Steg 2 av 2 · Tvåstegsverifiering" med sex kodrutor.
       Demon har ingen server och ingen telefon – därför visas koden i en ruta som föreställer autentiseringsappen, tydligt
       märkt som demo (i den skarpa versionen finns koden bara i telefonen). Koden byts var 30:e sekund som i en riktig app. */
    { const konton = $('.li-konton'); const eller = konton && $('.li-eller', konton);
      if (eller) {
        const sp = $('span', eller); if (sp) sp.textContent = 'Demokonton';
        eller.setAttribute('role', 'button'); eller.setAttribute('tabindex', '0'); eller.setAttribute('aria-expanded', 'false');
        const vaxla = () => { const pa = konton.toggleAttribute('data-oppen'); eller.setAttribute('aria-expanded', pa ? 'true' : 'false'); };
        eller.addEventListener('click', vaxla);
        eller.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); vaxla(); } });
      } }
    const main = $('.li-main'); let steg2 = null; let demoKod = ''; let demoSlut = 0; let demoTick = 0; let vantar = null;
    const nyDemoKod = () => { demoKod = String(Math.floor(Math.random() * 1000000)).padStart(6, '0'); demoSlut = Date.now() + 30000; };
    function byggSteg2() {
      steg2 = document.createElement('section'); steg2.className = 'li-demo2'; steg2.setAttribute('aria-label', 'Tvåstegsverifiering');
      steg2.innerHTML = `
        <p class="li-stegmarke li-stegmarke-demo"><svg class="ikon" aria-hidden="true"><use href="#i-las"/></svg>Steg 2 av 2 · Tvåstegsverifiering</p>
        <p class="li-demo2-vem">Loggar in som <strong data-d2-namn></strong></p>
        <p class="li-demo2-text">Skriv den sexsiffriga koden från din autentiseringsapp.</p>
        <form class="li-inlogg" data-d2-form novalidate>
          <label class="li-kodetikett"><span class="sr">Kod från autentiseringsappen</span>
            <span class="li-kod"><input class="li-kodfalt" type="text" inputmode="numeric" autocomplete="off" maxlength="6" spellcheck="false" data-d2-kod>
              <span class="li-rutor" aria-hidden="true"><i></i><i></i><i></i><b></b><i></i><i></i><i></i></span></span>
          </label>
          <button class="li-knapp" type="submit" data-d2-knapp>Verifiera<svg class="ikon" aria-hidden="true"><use href="#i-pil"/></svg><svg class="ikon li-bock" aria-hidden="true"><use href="#i-bock"/></svg></button>
          <p class="li-fel" data-d2-fel role="alert" hidden><svg class="ikon" aria-hidden="true"><use href="#i-varning"/></svg><span></span></p>
        </form>
        <div class="li-app" data-d2-app>
          <span class="li-app-ikon" aria-hidden="true"><svg class="ikon"><use href="#i-skold"/></svg></span>
          <span class="li-app-text"><small>Autentiseringsapp · Uperformance CRM</small><strong data-d2-visa aria-live="off"></strong><i class="li-app-tid" aria-hidden="true"><i data-d2-tid></i></i></span>
          <button type="button" class="li-app-fyll" data-d2-fyll>Fyll i</button>
        </div>
        <p class="li-demo2-not"><svg class="ikon" aria-hidden="true"><use href="#i-info"/></svg><span>Demo: här visas koden på sidan. I den skarpa versionen finns den bara i din telefon.</span></p>
        <div class="li-kodlankar"><button type="button" data-d2-tillbaka>Tillbaka</button></div>`;
      const efter = $('[data-li-demo]'); (efter && efter.parentNode ? efter.parentNode : main).insertBefore(steg2, efter ? efter.nextSibling : null);
      const falt = $('[data-d2-kod]', steg2); const rutor = [...steg2.querySelectorAll('.li-rutor i')]; const rutorEl = $('.li-rutor', steg2);
      const fel = $('[data-d2-fel]', steg2);
      const rita = () => { if (rutorEl._avk) return; const v = falt.value; const fokus = document.activeElement === falt; rutor.forEach((r, i) => { r.textContent = v[i] || ''; r.toggleAttribute('data-fylld', !!v[i]); r.toggleAttribute('data-aktiv', fokus && i === Math.min(v.length, 5)); }); };
      const visaFel = (t) => { $('span', fel).textContent = t; fel.hidden = !t; rutorEl.removeAttribute('data-fel'); if (t) { void rutorEl.offsetWidth; rutorEl.setAttribute('data-fel', ''); } };
      const prova = () => {
        if (valt || !vantar) return;
        if (falt.value.length !== 6) { visaFel('Koden består av 6 siffror.'); falt.focus(); return; }
        if (falt.value !== demoKod) { visaFel('Fel kod. Skriv koden som appen visar just nu.'); falt.select(); return; }
        visaFel(''); rutorEl.setAttribute('data-klar', ''); clearInterval(demoTick);
        { const m = $('.li-stegmarke', steg2); if (m) { m.setAttribute('data-ok', ''); m.textContent = ''; skrivText(m, 'Åtkomst beviljad'); } }
        const v = vantar; vantar = null; const kn = $('[data-d2-knapp]', steg2); kn.setAttribute('data-klar', '');
        setTimeout(() => slutfor(v.id, v.roll, kn), lugn ? 0 : 800); // slutanimationen (gröna rutor, "Åtkomst beviljad") hinner synas
      };
      falt.addEventListener('input', () => { stoppaAvkodning(rutorEl); const ren = falt.value.replace(/\D/g, '').slice(0, 6); if (ren !== falt.value) falt.value = ren; visaFel(''); rita(); if (ren.length === 6) prova(); });
      ['focus', 'blur', 'keyup', 'click'].forEach((h) => falt.addEventListener(h, rita));
      $('[data-d2-form]', steg2).addEventListener('submit', (ev) => { ev.preventDefault(); prova(); });
      $('[data-d2-fyll]', steg2).addEventListener('click', () => { stoppaAvkodning(rutorEl); falt.value = demoKod; rita(); prova(); });
      $('[data-d2-tillbaka]', steg2).addEventListener('click', () => { vantar = null; clearInterval(demoTick); main.removeAttribute('data-steg2'); document.querySelectorAll('[data-valjer]').forEach((k) => k.removeAttribute('data-valjer')); const f = $('[data-li-demo-epost]'); if (f) { f.value = ''; f.focus(); } });
      steg2.rita = rita; steg2.falt = falt; steg2.visaFel = visaFel;
    }
    function tickDemo() {
      if (Date.now() >= demoSlut) nyDemoKod();
      $('[data-d2-visa]', steg2).textContent = demoKod.slice(0, 3) + ' ' + demoKod.slice(3);
      $('[data-d2-tid]', steg2).style.transform = 'scaleX(' + Math.max(0, (demoSlut - Date.now()) / 30000).toFixed(3) + ')';
    }
    function visaSteg2(id, roll) {
      if (!steg2) byggSteg2();
      const u = (((exempel() || {}).anvandare) || []).find((x) => x.id === id);
      $('[data-d2-namn]', steg2).textContent = u ? u.namn : 'demokontot';
      vantar = { id, roll }; nyDemoKod(); steg2.falt.value = ''; steg2.visaFel(''); $('.li-rutor', steg2).removeAttribute('data-klar');
      { const m = $('.li-stegmarke', steg2); if (m) { m.removeAttribute('data-ok'); m.innerHTML = '<svg class="ikon" aria-hidden="true"><use href="#i-las"/></svg>Steg 2 av 2 · Tvåstegsverifiering'; } }
      { const f = $('[data-li-demo-epost]'); if (f && u && u.epost) f.value = u.epost; }   // raden står kvar med kontots adress
      main.setAttribute('data-steg2', ''); tickDemo(); clearInterval(demoTick); demoTick = setInterval(tickDemo, 250);
      steg2.falt.focus(); avkoda($('.li-rutor', steg2), steg2.rita);
    }
    // Välj konto → steg två. Själva inloggningen (slutfor) sker när koden stämmer.
    function loggaInSom(id, roll, markera) {
      if (valt || vantar) return;
      if (markera && !markera.matches('.li-knapp')) markera.setAttribute('data-valjer', '');
      visaSteg2(id, roll);
    }
    function slutfor(id, roll, markera) {
      if (valt) return; valt = true;
      try {
        localStorage.setItem('up-crm-jag', id);
        localStorage.setItem('up-crm-inloggad', JSON.stringify({ id, tid: new Date().toISOString(), demo: true }));
      } catch (err) { /* privat läge – CRM:et släpper då in ändå */ }
      if (markera) markera.setAttribute(markera.matches('.li-knapp') ? 'data-klar' : 'data-valjer', '');
      ganIn(roll);
    }
    const ROLL = { gs: 'salj', ma: 'salj', dr: 'test', ad: 'admin' }; // Gustav och Magnus är säljare
    document.addEventListener('click', (ev) => { const knapp = ev.target.closest('[data-roll]'); if (knapp) loggaInSom(knapp.dataset.roll, ROLL[knapp.dataset.roll] || 'salj', knapp); });
    // E-post i demon: demokontonas adresser (förslag i listan) loggar in direkt – inget lösenord och ingen kod i demoläget
    const demoForm = $('[data-li-demo]');
    if (demoForm) {
      const aktiv = (u) => u.aktiv !== false && u.aktiv !== 0; // samma som arAktiv i crm.js
      const konton = () => { const d = exempel(); return ((d && d.anvandare) || []).filter((u) => u.epost && aktiv(u)); };
      const lista = $('[data-li-demo-adresser]'); if (lista) lista.innerHTML = konton().map((u) => `<option value="${e(u.epost)}">${e(u.namn)}</option>`).join('');
      const fel = $('[data-li-demo-fel]'); const falt = $('[data-li-demo-epost]');
      const visa = (text) => { $('span', fel).textContent = text; fel.hidden = !text; if (text) falt.setAttribute('aria-invalid', 'true'); else falt.removeAttribute('aria-invalid'); };
      // Inaktiverat av administratören (CRM:et skickar hit med ?orsak=inaktiverad): säg varför även i demoläget
      if (q.get('orsak') === 'inaktiverad') { $('span', fel).textContent = 'Ditt konto har inaktiverats – kontakta administratören.'; fel.hidden = false; }
      falt.addEventListener('input', () => visa(''));
      /* Förslagen under raden (2026-11-23, användaren om webbläsarens vita lista: "gör snyggare"): demokontonas adresser i en egen
         lista i sidans mörka glas – initialer, namn och adress. Visas när fältet har fokus, filtreras medan man skriver,
         pilar + Enter väljer, Esc stänger. Webbläsarens datalist kopplas bort (den går inte att styla). */
      falt.removeAttribute('list');
      const forslag = document.createElement('div'); forslag.className = 'li-forslag'; forslag.setAttribute('role', 'listbox'); forslag.id = 'li-forslag'; forslag.hidden = true;
      demoForm.appendChild(forslag);
      falt.setAttribute('role', 'combobox'); falt.setAttribute('aria-controls', 'li-forslag'); falt.setAttribute('aria-expanded', 'false'); falt.setAttribute('aria-autocomplete', 'list');
      let vald = -1;
      const AVATAR = { ma: 'li-avatar-salj', dr: 'li-avatar-test', ad: 'li-avatar-admin' };
      const traffar = () => { const v = falt.value.trim().toLowerCase(); return konton().filter((u) => !v || u.epost.toLowerCase().includes(v) || (u.namn || '').toLowerCase().includes(v)); };
      const stangForslag = () => { forslag.hidden = true; vald = -1; falt.setAttribute('aria-expanded', 'false'); falt.removeAttribute('aria-activedescendant'); };
      function ritaForslag() {
        const t = traffar();
        if (!t.length || main.hasAttribute('data-steg2') || (t.length === 1 && t[0].epost.toLowerCase() === falt.value.trim().toLowerCase())) { stangForslag(); return; }
        vald = Math.min(vald, t.length - 1);
        forslag.innerHTML = t.map((u, i) => `<button type="button" class="li-forslag-rad" role="option" id="li-forslag-${i}" data-epost="${e(u.epost)}" aria-selected="${i === vald}" tabindex="-1">
          <span class="li-avatar ${AVATAR[u.id] || ''}" aria-hidden="true">${e(u.initialer || (u.namn || '?').slice(0, 2).toUpperCase())}</span>
          <span class="li-forslag-text"><strong>${e(u.namn || u.epost)}</strong><small>${e(u.epost)}</small></span></button>`).join('');
        forslag.hidden = false; falt.setAttribute('aria-expanded', 'true');
        if (vald >= 0) falt.setAttribute('aria-activedescendant', 'li-forslag-' + vald); else falt.removeAttribute('aria-activedescendant');
      }
      const valj = (epost) => { falt.value = epost; stangForslag(); if (demoForm.requestSubmit) demoForm.requestSubmit(); else demoForm.dispatchEvent(new Event('submit', { cancelable: true })); };
      falt.addEventListener('focus', ritaForslag);
      falt.addEventListener('input', () => { vald = -1; ritaForslag(); });
      falt.addEventListener('blur', () => setTimeout(stangForslag, 140));
      falt.addEventListener('keydown', (ev) => {
        if (forslag.hidden) { if (ev.key === 'ArrowDown') { ev.preventDefault(); ritaForslag(); } return; }
        const n = forslag.children.length;
        if (ev.key === 'ArrowDown') { ev.preventDefault(); vald = (vald + 1) % n; ritaForslag(); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); vald = (vald - 1 + n) % n; ritaForslag(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); stangForslag(); }
        else if (ev.key === 'Enter' && vald >= 0) { ev.preventDefault(); valj(forslag.children[vald].dataset.epost); }
      });
      forslag.addEventListener('pointerdown', (ev) => { const r = ev.target.closest('[data-epost]'); if (r) { ev.preventDefault(); valj(r.dataset.epost); } });
      demoForm.addEventListener('submit', (ev) => {
        ev.preventDefault(); if (valt) return;
        const v = falt.value.trim().toLowerCase();
        if (!v) { visa('Skriv e-postadressen till ett demokonto – eller välj ett konto nedan.'); falt.focus(); return; }
        const alla = ((exempel() || {}).anvandare || []);
        if (alla.some((x) => x.epost && x.epost.toLowerCase() === v && !aktiv(x))) { visa('Kontot är inaktiverat. Kontakta administratören.'); falt.focus(); falt.select(); return; }
        const u = konton().find((x) => x.epost.toLowerCase() === v);
        if (!u) { visa('Ingen demoanvändare har den adressen. Välj ett konto nedan.'); falt.focus(); falt.select(); return; }
        const rad = document.querySelector(`[data-roll="${u.id}"]`); if (rad) rad.setAttribute('data-valjer', '');
        loggaInSom(u.id, u.roll === 'test' ? 'test' : u.roll === 'admin' ? 'admin' : 'salj', $('[data-li-demo-knapp]'));
      });
    }
    // Tangenterna 1–4 väljer konto (inte när man skriver någonstans)
    document.addEventListener('keydown', (ev) => {
      if (valt || ev.ctrlKey || ev.metaKey || ev.altKey || (ev.target.closest && ev.target.closest('input, textarea, select, [contenteditable]'))) return;
      const kort = { 1: 'gs', 2: 'ma', 3: 'dr', 4: 'ad' }[ev.key]; const k = kort && document.querySelector(`[data-roll="${kort}"]`);
      if (k) { ev.preventDefault(); k.focus({ preventScroll: true }); k.click(); }
    });
  } else startaSkarp();

  // Tillbaka med bakåtknappen: visa sidan igen i stället för den urtonade
  addEventListener('pageshow', (ev) => {
    if (!ev.persisted) return;
    if (SKARP) { location.reload(); return; } // skarpt läge: kontrollera inloggningen på nytt hos servern i stället för ett fruset kodsteg
    valt = false; document.body.removeAttribute('data-lamnar');
    { const m = $('.li-main'); if (m) m.removeAttribute('data-steg2'); }
    document.querySelectorAll('[data-valjer]').forEach((k) => k.removeAttribute('data-valjer'));
    const kn = $('[data-li-knapp-kod]'); if (kn) { kn.removeAttribute('data-klar'); kn.disabled = false; }
    const dk = $('[data-li-demo-knapp]'); if (dk) dk.removeAttribute('data-klar');
    const rutor = $('.li-rutor'); if (rutor) rutor.removeAttribute('data-klar');
  });

  /* Skarpt läge: e-post och engångskod ------------------------------------------------- */
  function startaSkarp() {
    const form = $('[data-li-form]'); if (!form) return;
    const falt = { epost: $('[data-li-epost]'), kod: $('[data-li-kod]'), losen: $('[data-li-losen]'), nytt: $('[data-li-nytt]'), upprepa: $('[data-li-upprepa]'), nykod: $('[data-li-nykod]'), epostkod: $('[data-li-epostkod]') };
    /* Lösenord (2026-11-23): steg ett är e-post + lösenord (metod "losenord"); "Glömt lösenordet?" byter till engångskod via e-post
       (metod "kod", som förut). Det tillfälliga lösenordet → steget "nytt" (välj ett eget) → tvåsteg om det är på → CRM:et. */
    let metod = 'losenord'; let bytBiljett = null; let minst = 10;
    const knappText = $('[data-li-knapptext]'); const metodLank = form.querySelector('[data-li="metod"]');
    function satMetod(m) {
      metod = m; form.dataset.metod = m;
      if (knappText) knappText.textContent = m === 'losenord' ? 'Logga in' : 'Skicka engångskod';
      if (metodLank) metodLank.textContent = m === 'losenord' ? 'Glömt lösenordet? Logga in med engångskod' : 'Logga in med lösenord';
      if (falt.losen) { falt.losen.required = m === 'losenord'; if (m !== 'losenord') falt.losen.value = ''; }
    }
    const felRuta = $('[data-li-fel]');
    const EPOST = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // samma mönster som EPOST_MONSTER i data.js
    const KOD_GILTIG_S = 10 * 60; // samma som KOD_GILTIG i server/auth.js
    const NY_KOD_VANTA_S = 20; // "Skicka en ny kod" vilar en stund – servern tillåter 3 koder per 15 min
    const INGEN_KOD_S = 30; // tips om stavning om ingen har loggat in efter en halv minut
    let steg = 'epost'; let epost = ''; let skickar = false;

    const miljo = L.lage.miljo;
    const eyebrow = $('[data-li-eyebrow]');
    if (eyebrow) eyebrow.textContent = miljo === 'lokal' ? 'Lokal testmiljö' : miljo === 'test' ? 'Testmiljö' : 'Uperformance CRM';
    // Rutan om serverns konsol gäller bara e-postkoden: visas i steget "kod" utan tvåstegsbiljett (synkaKonsol), aldrig vid lösenord, appens kod eller QR
    function synkaKonsol() { const k = $('[data-li-konsol]'); if (k) k.hidden = !(miljo === 'lokal' && steg === 'kod' && !biljett); }
    // Hälsoformuläret är avstängt i skarpt läge som standard – dölj exempellänken dit
    const halsa = $('[data-li-halsa]'); if (halsa && !L.lage.halsoformular) halsa.hidden = true;

    /* De sex rutorna visar det som står i det (osynliga) inmatningsfältet */
    const rutorEl = $('.li-rutor', form);
    const rutor = rutorEl ? [...rutorEl.querySelectorAll('i')] : [];
    function ritaKod() {
      if (!rutor.length || (rutorEl && rutorEl._avk)) return;
      const v = falt.kod.value; const fokus = document.activeElement === falt.kod;
      const start = falt.kod.selectionStart ?? v.length; const slut = falt.kod.selectionEnd ?? v.length;
      const markerat = fokus && slut > start;
      rutor.forEach((r, i) => {
        const siffra = v[i] || '';
        if (r.textContent !== siffra) {
          r.textContent = siffra;
          if (siffra) { r.removeAttribute('data-fylld'); void r.offsetWidth; } // starta om den lilla studsen
        }
        r.toggleAttribute('data-fylld', !!siffra);
        r.toggleAttribute('data-aktiv', fokus && !markerat && i === Math.min(start, rutor.length - 1));
        r.toggleAttribute('data-vald', markerat && i >= start && i < slut);
      });
    }
    const markeraFel = (pa) => {
      if (!rutorEl) return;
      rutorEl.removeAttribute('data-fel');
      if (pa) { void rutorEl.offsetWidth; rutorEl.setAttribute('data-fel', ''); }
    };
    ['focus', 'blur', 'keyup', 'click', 'select'].forEach((h) => falt.kod.addEventListener(h, ritaKod));
    document.addEventListener('selectionchange', () => { if (document.activeElement === falt.kod) ritaKod(); });

    /* Nedräkning: koden gäller i 10 minuter från att den skickades */
    const giltig = $('[data-li-giltig]'); const giltigText = $('[data-li-giltig-text]'); const stapel = $('[data-li-stapel]');
    const nyKod = form.querySelector('[data-li="ny-kod"]'); const ingenKod = $('[data-li-ingenkod]');
    let kodSkickad = 0; let tickare = 0; let kodSlut = false; // kodSlut: servern säger att koden inte gäller längre
    const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    function tick() {
      if (!kodSkickad || !giltig) return;
      const gatt = (Date.now() - kodSkickad) / 1000;
      const kvar = kodSlut ? 0 : Math.max(0, Math.ceil(KOD_GILTIG_S - gatt));
      if (kvar > 0) {
        const b = document.createElement('b'); b.textContent = mmss(kvar);
        giltigText.replaceChildren('Koden gäller i ', b);
      } else giltigText.textContent = kodSlut ? 'Koden gäller inte längre – skicka en ny kod.' : 'Koden har gått ut – skicka en ny kod.';
      giltig.dataset.lage = kvar === 0 ? 'ute' : kvar <= 60 ? 'snart' : '';
      stapel.style.transform = `scaleX(${(kvar / KOD_GILTIG_S).toFixed(4)})`;
      if (!skickar) {
        const vila = Math.max(0, Math.ceil(NY_KOD_VANTA_S - gatt));
        nyKod.disabled = vila > 0;
        nyKod.textContent = vila > 0 ? `Skicka en ny kod (${vila})` : 'Skicka en ny kod';
      }
      nyKod.toggleAttribute('data-viktig', kvar === 0); form.toggleAttribute('data-kod-ute', kvar === 0);
      if (ingenKod) ingenKod.hidden = !(gatt >= INGEN_KOD_S && kvar > 0);
      if (kvar === 0 && gatt >= NY_KOD_VANTA_S) stoppaNedrakning(true);
    }
    function startaNedrakning() {
      stoppaNedrakning();
      kodSkickad = Date.now(); kodSlut = false;
      if (stapel) { stapel.style.transition = 'none'; stapel.style.transform = 'scaleX(1)'; void stapel.offsetWidth; stapel.style.transition = ''; }
      tick(); tickare = setInterval(tick, 1000);
    }
    function stoppaNedrakning(behall) {
      clearInterval(tickare); tickare = 0;
      if (!behall) { kodSkickad = 0; form.removeAttribute('data-kod-ute'); nyKod.disabled = false; nyKod.textContent = 'Skicka en ny kod'; nyKod.removeAttribute('data-viktig'); if (ingenKod) ingenKod.hidden = true; }
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

    const visaFel = (text) => { $('span', felRuta).textContent = text; felRuta.hidden = !text; };
    // Utloggad av servern (CRM:et skickar med orsaken): säg varför i stället för att bara visa inloggningen
    const ORSAK_TEXT = { inaktiverad: 'Ditt konto har inaktiverats – kontakta administratören.', 'utloggad-av-admin': 'En administratör har loggat ut dig. Logga in igen med en ny kod.', 'losenord-bytt': 'Lösenordet har bytts på en annan enhet – logga in igen.' };
    if (ORSAK_TEXT[q.get('orsak')]) visaFel(ORSAK_TEXT[q.get('orsak')]);
    const visaSteg = (nytt) => {
      steg = nytt;
      document.querySelectorAll('[data-li-steg]').forEach((s) => { s.hidden = s.dataset.liSteg !== nytt; });
      if (nytt === 'kod') { const till = $('[data-li-till]'); if (till) till.textContent = epost; falt.kod.value = ''; markeraFel(false); falt.kod.focus(); ritaKod(); }
      else if (nytt === 'ny-tvasteg') { stoppaNedrakning(); if (falt.nykod) { falt.nykod.value = ''; falt.nykod.focus(); } }
      else if (nytt === 'reservkoder') { stoppaNedrakning(); const k = $('[data-li-knapp-reserv]'); if (k) k.focus(); }
      else if (nytt === 'nytt') { stoppaNedrakning(); falt.nytt.value = ''; falt.upprepa.value = ''; { const r = $('[data-li-bara-epostkod]'); if (r) r.hidden = !epostKodKravs; const t = $('.li-nytt-text span:last-child'); if (t && epostKodKravs && !t.dataset.kod) { t.dataset.kod = '1'; t.insertAdjacentHTML('afterbegin', 'Vi har skickat en kod till <b>' + epost.replace(/[&<>"]/g, '') + '</b>. '); } } const m = $('[data-li-minst]'); if (m) m.textContent = String(minst); styrka(); (epostKodKravs && falt.epostkod ? falt.epostkod : falt.nytt).focus(); }
      else { stoppaNedrakning(); falt.epost.focus(); }
      synkaKonsol();
    };
    const vantaText = (sek) => { const m = Math.ceil((Number(sek) || 60) / 60); return m <= 1 ? 'en minut' : `${m} minuter`; };
    const feltext = (svar) => {
      switch (svar.fel) {
        case 'natverk': return 'Kunde inte nå servern. Kontrollera att den är igång och försök igen.';
        case 'ogiltig': return 'E-postadressen ser inte rätt ut.';
        case 'for-manga-forsok': return `För många försök. Vänta ${vantaText(svar.vantaSek)} och försök igen.`;
        case 'fel-kod': return Number.isFinite(svar.kvar) && svar.kvar > 0 ? `Fel kod – ${svar.kvar} försök kvar.` : 'Fel kod. Begär en ny kod.';
        case 'kod-utgangen': return 'Koden har gått ut eller använts för många gånger. Begär en ny kod.';
        case 'fel-losenord': return 'E-postadressen eller lösenordet stämmer inte.';
        case 'svagt-losenord': return svar.meddelande || 'Välj ett starkare lösenord.';
        default: return svar.meddelande || 'Något gick fel. Försök igen.';
      }
    };
    const lasKnappar = (las) => { form.querySelectorAll('button').forEach((b) => { b.disabled = las; }); if (!las) tick(); };

    /* Tvåstegsverifiering: biljetten från servern gäller i fem minuter. Samma kodrutor används för appens kod; en reservkod
       (8 siffror) skrivs i ett vanligt fält. */
    let biljett = null; let reserv = false;
    // Kodstegets egen text – inte den första .li-skickat i formuläret (den ligger i steget "nytt")
    const skickatText = $('[data-li-steg="kod"] .li-skickat > span:last-child', form); const skickatFore = skickatText ? skickatText.innerHTML : '';
    const knappKod = $('[data-li-knapp-kod]'); const reservKnapp = form.querySelector('[data-li="reserv"]');
    function satReserv(pa) {
      reserv = pa; form.toggleAttribute('data-reserv', pa);
      falt.kod.value = ''; falt.kod.maxLength = pa ? 8 : 11; falt.kod.setAttribute('pattern', pa ? '[0-9]{8}' : '[0-9]{6}');
      falt.kod.placeholder = pa ? '8 siffror' : '000000'; falt.kod.setAttribute('autocomplete', pa ? 'off' : 'one-time-code');
      if (reservKnapp) reservKnapp.textContent = pa ? 'Använd koden från appen' : 'Använd en reservkod';
      if (skickatText) skickatText.textContent = pa ? 'Skriv en av dina reservkoder (8 siffror). Varje kod gäller en gång.' : 'Öppna din autentiseringsapp och skriv den sexsiffriga koden för Uperformance CRM.';
      markeraFel(false); visaFel(''); ritaKod(); falt.kod.focus();
    }
    function visaTvasteg(nyBiljett) {
      biljett = nyBiljett; stoppaNedrakning(); form.setAttribute('data-tvasteg', '');
      if (knappKod && knappKod.firstChild) knappKod.firstChild.nodeValue = 'Verifiera';
      satReserv(false); synkaKonsol();
      avkoda(rutorEl, ritaKod);
    }
    function lamnaTvasteg() {
      biljett = null; reserv = false; form.removeAttribute('data-tvasteg'); form.removeAttribute('data-reserv');
      falt.kod.maxLength = 11; falt.kod.setAttribute('pattern', '[0-9]{6}'); falt.kod.placeholder = '000000'; falt.kod.setAttribute('autocomplete', 'one-time-code');
      if (skickatText) skickatText.innerHTML = skickatFore;
      if (knappKod && knappKod.firstChild) knappKod.firstChild.nodeValue = 'Logga in';
      synkaKonsol();
    }
    /* Lösenordets styrka: längd och variation (en enkel mätare – servern avgör) */
    function styrka() {
      const v = falt.nytt ? falt.nytt.value : ''; const text = $('[data-li-styrka-text]'); const stapel = $('[data-li-styrka-stapel]'); if (!text || !stapel) return;
      const sorter = [/[a-zåäö]/, /[A-ZÅÄÖ]/, /\d/, /[^\w\s]|\s/].filter((r) => r.test(v)).length;
      const p = v.length < minst ? Math.min(.35, v.length / minst * .35) : Math.min(1, .45 + (v.length - minst) * .04 + sorter * .1);
      stapel.style.transform = `scaleX(${p.toFixed(3)})`;
      const niva = v.length < minst ? 'kort' : p < .7 ? 'ok' : 'stark';
      $('[data-li-styrka]').dataset.niva = v ? niva : '';
      text.textContent = !v ? `Minst ${minst} tecken` : niva === 'kort' ? `${minst - v.length} tecken till` : niva === 'ok' ? 'Godkänt – längre är starkare' : 'Starkt lösenord';
    }
    if (falt.nytt) falt.nytt.addEventListener('input', styrka);
    async function loggaInLosen() {
      const varde = falt.epost.value.trim();
      if (!EPOST.test(varde)) { visaFel('Skriv en giltig e-postadress, t.ex. namn@foretag.se.'); falt.epost.setAttribute('aria-invalid', 'true'); falt.epost.focus(); return; }
      if (!falt.losen.value) { visaFel('Skriv ditt lösenord.'); falt.losen.focus(); return; }
      falt.epost.removeAttribute('aria-invalid');
      skickar = true; lasKnappar(true); visaFel('');
      const svar = await L.loggaInLosenord(varde, falt.losen.value);
      skickar = false; lasKnappar(false);
      if (!svar.ok) {
        if (svar.fel === 'inget-losenord') { satMetod('kod'); visaFel('Kontot har inget lösenord än – vi skickar en engångskod i stället.'); begar(varde); return; }
        visaFel(feltext(svar)); falt.losen.select(); return;
      }
      epost = varde; falt.losen.value = '';
      if (svar.byt) { bytBiljett = svar.biljett; minst = svar.minst || minst; epostKodKravs = !!svar.epostKod; visaSteg('nytt'); return; }
      if (svar.tvasteg) { visaSteg('kod'); visaTvasteg(svar.biljett); return; }
      if (svar.nyTvasteg) { visaNyTvasteg(svar.biljett); return; }
      klar(svar);
    }
    let epostKodKravs = false;
    async function sparaNytt() {
      const kod = falt.epostkod ? falt.epostkod.value.replace(/\s/g, '') : '';
      if (epostKodKravs && !/^\d{6}$/.test(kod)) { visaFel('Skriv koden vi skickade till din e-post – sex siffror.'); falt.epostkod.focus(); return; }
      const n = falt.nytt.value;
      if (n.length < minst) { visaFel(`Lösenordet behöver minst ${minst} tecken.`); falt.nytt.focus(); return; }
      if (n !== falt.upprepa.value) { visaFel('Lösenorden är inte likadana.'); falt.upprepa.focus(); falt.upprepa.select(); return; }
      skickar = true; lasKnappar(true); visaFel('');
      const svar = await L.nyttLosenord(bytBiljett, n, kod);
      skickar = false; lasKnappar(false);
      if (!svar.ok && svar.fel === 'biljett-utgangen') { bytBiljett = null; visaSteg('epost'); visaFel(svar.meddelande || 'Det tog för lång tid. Logga in igen.'); return; }
      if (!svar.ok && (svar.fel === 'fel-kod' || svar.fel === 'ogiltig-kod')) { visaFel(svar.fel === 'fel-kod' && Number.isFinite(svar.kvar) ? `Koden från e-posten stämmer inte – ${svar.kvar} försök kvar.` : (svar.meddelande || 'Koden stämmer inte.')); falt.epostkod.focus(); falt.epostkod.select(); return; }
      if (!svar.ok && svar.fel === 'kod-utgangen') { bytBiljett = null; visaSteg('epost'); visaFel('Koden har gått ut. Logga in igen så skickar vi en ny.'); return; }
      if (!svar.ok) { visaFel(feltext(svar)); falt.nytt.focus(); falt.nytt.select(); return; }
      bytBiljett = null; falt.nytt.value = ''; falt.upprepa.value = ''; if (falt.epostkod) falt.epostkod.value = '';
      toast('Ditt nya lösenord är sparat');
      if (svar.tvasteg) { visaSteg('kod'); visaTvasteg(svar.biljett); return; }
      if (svar.nyTvasteg) { visaNyTvasteg(svar.biljett); return; }
      klar(svar);
    }
    function klar(svar) {
      valt = true;
      const knapp = form.querySelector(steg === 'nytt' ? '[data-li-knapp-nytt]' : steg === 'reservkoder' ? '[data-li-knapp-reserv]' : '[data-li-knapp]'); if (knapp) knapp.setAttribute('data-klar', '');
      setTimeout(() => ganIn(svar.jag && svar.jag.roll), lugn ? 0 : 450);
    }
    /* Krav på tvåstegsverifiering (KRAV_TVASTEG): kontot saknar tvåsteg – hämta en hemlighet, visa QR-koden, bekräfta med en kod
       från appen och visa reservkoderna en gång innan man går in. Biljetten gäller några minuter. */
    let nyBiljett = null; let nySvar = null;
    async function visaNyTvasteg(b) {
      nyBiljett = b; nySvar = null; visaSteg('ny-tvasteg'); visaFel('');
      const qr = $('[data-li-qr]'); const hem = $('[data-li-hemlighet]');
      const svar = await L.tvastegNyStarta(b);
      if (!svar.ok) { if (svar.fel === 'biljett-utgangen') { nyBiljett = null; visaSteg('epost'); } visaFel(feltext(svar)); return; }
      if (qr) qr.innerHTML = window.UPQR ? window.UPQR.svg(svar.uri, { titel: 'QR-kod för autentiseringsappen' }) : '';
      if (hem) hem.textContent = String(svar.hemlighet || '').replace(/(.{4})/g, '$1 ').trim();
    }
    async function bekraftaNy() {
      const kod = (falt.nykod ? falt.nykod.value : '').replace(/\s/g, '');
      if (!/^\d{6}$/.test(kod)) { visaFel('Koden från appen består av 6 siffror.'); if (falt.nykod) falt.nykod.focus(); return; }
      skickar = true; lasKnappar(true); visaFel('');
      const svar = await L.tvastegNyBekrafta(nyBiljett, kod);
      skickar = false; lasKnappar(false);
      if (!svar.ok && svar.fel === 'biljett-utgangen') { nyBiljett = null; visaSteg('epost'); visaFel(svar.meddelande || 'Det tog för lång tid. Logga in igen.'); return; }
      if (!svar.ok) { visaFel(svar.fel === 'fel-kod' ? 'Koden stämmer inte. Kontrollera att klockan i telefonen går rätt och försök igen.' : feltext(svar)); if (falt.nykod) { falt.nykod.focus(); falt.nykod.select(); } return; }
      nyBiljett = null; nySvar = svar;
      const lista = $('[data-li-reservkoder]');
      if (lista) lista.innerHTML = (svar.reservkoder || []).map((k) => `<li>${String(k).replace(/(\d{4})(\d{4})/, '$1 $2')}</li>`).join('');
      visaSteg('reservkoder');
    }
    async function begar(varde = falt.epost.value.trim()) {
      if (!EPOST.test(varde)) { visaFel('Skriv en giltig e-postadress, t.ex. namn@foretag.se.'); falt.epost.setAttribute('aria-invalid', 'true'); falt.epost.focus(); return; }
      falt.epost.removeAttribute('aria-invalid');
      skickar = true; lasKnappar(true); visaFel('');
      const svar = await L.begarKod(varde);
      skickar = false; lasKnappar(false);
      if (!svar.ok) { visaFel(feltext(svar)); return; }
      epost = varde; visaSteg('kod'); startaNedrakning();
      toast(miljo === 'lokal' ? 'Koden finns i serverns konsol' : 'Koden är skickad – kolla din e-post');
    }
    async function verifiera() {
      const kod = falt.kod.value.replace(/\s/g, '');
      const langd = reserv ? 8 : 6;
      if (kod.length !== langd || /\D/.test(kod)) { visaFel(reserv ? 'Reservkoden består av 8 siffror.' : 'Koden består av 6 siffror.'); falt.kod.setAttribute('aria-invalid', 'true'); markeraFel(true); falt.kod.focus(); return; }
      falt.kod.removeAttribute('aria-invalid');
      skickar = true; lasKnappar(true); visaFel('');
      const svar = biljett ? await L.loggaInTvasteg(biljett, kod) : await L.loggaIn(epost, kod);
      // Tvåstegsverifiering: e-postkoden stämde – nu koden från autentiseringsappen (samma rutor, annan text)
      if (svar.ok && svar.tvasteg) { skickar = false; lasKnappar(false); visaTvasteg(svar.biljett); return; }
      if (svar.ok && svar.nyTvasteg) { skickar = false; lasKnappar(false); lamnaTvasteg(); visaNyTvasteg(svar.biljett); return; }
      if (!svar.ok && svar.fel === 'biljett-utgangen') { skickar = false; lasKnappar(false); lamnaTvasteg(); visaSteg('epost'); visaFel(svar.meddelande || 'Det tog för lång tid. Logga in igen.'); return; }
      if (!svar.ok) {
        skickar = false; lasKnappar(false); visaFel(feltext(svar));
        if (svar.fel === 'fel-kod') { falt.kod.focus(); falt.kod.select(); falt.kod.setAttribute('aria-invalid', 'true'); markeraFel(true); ritaKod(); }
        if (svar.fel === 'kod-utgangen' || (svar.fel === 'fel-kod' && svar.kvar === 0)) { kodSlut = true; markeraFel(true); tick(); }
        return;
      }
      valt = true; stoppaNedrakning(true);
      const knapp = $('[data-li-knapp-kod]'); knapp.setAttribute('data-klar', '');
      if (rutorEl) rutorEl.setAttribute('data-klar', '');
      { const m = form.querySelector('[data-li-steg="kod"] .li-stegmarke'); if (m && biljett) { m.setAttribute('data-ok', ''); m.textContent = ''; skrivText(m, 'Åtkomst beviljad'); } }
      setTimeout(() => ganIn(svar.jag && svar.jag.roll), biljett && !lugn ? 800 : 0); // efter steg två hinner slutanimationen synas
    }

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (skickar || valt) return;
      if (steg === 'epost') { if (metod === 'losenord') loggaInLosen(); else begar(); } else if (steg === 'nytt') sparaNytt(); else if (steg === 'ny-tvasteg') bekraftaNy(); else if (steg === 'reservkoder') { if (nySvar) klar(nySvar); } else verifiera();
    });
    // Sex siffror inskrivna (eller inklistrade, även "123 456") – logga in direkt
    falt.kod.addEventListener('input', () => {
      const langd = reserv ? 8 : 6;
      stoppaAvkodning(rutorEl);
      const ren = falt.kod.value.replace(/\D/g, '').slice(0, langd);
      if (ren !== falt.kod.value) falt.kod.value = ren;
      markeraFel(false); falt.kod.removeAttribute('aria-invalid');
      ritaKod();
      if (ren.length === langd && !skickar && !valt) verifiera();
    });
    form.addEventListener('click', (ev) => {
      const k = ev.target.closest('[data-li]'); if (!k || skickar) return;
      if (k.dataset.li === 'byt-epost') { visaFel(''); lamnaTvasteg(); bytBiljett = null; nyBiljett = null; visaSteg('epost'); falt.epost.select(); }
      if (k.dataset.li === 'metod') { visaFel(''); satMetod(metod === 'losenord' ? 'kod' : 'losenord'); (metod === 'losenord' ? falt.losen : falt.epost).focus(); }
      if (k.dataset.li === 'visa-losen') { const pa = falt.losen.type === 'password'; falt.losen.type = pa ? 'text' : 'password'; k.setAttribute('aria-pressed', String(pa)); k.setAttribute('aria-label', pa ? 'Dölj lösenordet' : 'Visa lösenordet'); falt.losen.focus(); }
      if (k.dataset.li === 'reserv') satReserv(!reserv);
      if (k.dataset.li === 'ny-kod' && !k.disabled) begar(epost);
    });
    satMetod('losenord');
    if (!matchMedia('(max-width: 640px)').matches) falt.epost.focus();
  }

  /* Exempeldatan i hjälten och på kontona ------------------------------------------------------------------------- */
  // Demo: samma data som CRM:et i den här webbläsaren (om versionen stämmer), annars ny exempeldata. Skarpt läge: bara
  // exempeldata – inloggningssidan läser aldrig riktiga kunder. Allt är dekor (aria-hidden) och märkt "bilden visar exempeldata".
  function exempel() {
    if (typeof skapaExempeldata !== 'function') return null;
    let ny = null; try { ny = skapaExempeldata(); } catch (err) { return null; }
    if (SKARP) return ny;
    try { const sparad = JSON.parse(localStorage.getItem('up-crm-v1') || 'null'); if (sparad && sparad.version === ny.version && Array.isArray(sparad.affarer)) return sparad; } catch (err) { /* privat läge */ }
    return ny;
  }
  const kr = (v) => v >= 995000 ? `${(v / 1e6).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} Mkr` : v >= 1000 ? `${Math.round(v / 1000).toLocaleString('sv-SE')} tkr` : `${Math.round(v).toLocaleString('sv-SE')} kr`;
  const plural = (n, en, flera) => `${n} ${n === 1 ? en : flera}`;
  const nar = (iso) => {
    const d = new Date(iso); if (Number.isNaN(+d)) return '';
    const dagar = Math.round((new Date().setHours(12, 0, 0, 0) - new Date(d).setHours(12, 0, 0, 0)) / 864e5);
    const kl = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    return dagar <= 0 ? `idag ${kl}` : dagar === 1 ? `igår ${kl}` : dagar < 7 ? `${dagar} dagar sedan` : d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  };
  // datumraden: veckodagen, datumet och veckan (ISO 8601)
  const datum = $('[data-li-datum]');
  if (datum) {
    const nu = new Date(); const t = new Date(Date.UTC(nu.getFullYear(), nu.getMonth(), nu.getDate())); const dn = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dn); const v = Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
    datum.innerHTML = `<b>${e(nu.toLocaleDateString('sv-SE', { weekday: 'long' }))}</b><span>${e(nu.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' }))}</span><em>V ${v}</em>`;
  }
  const db = exempel();
  if (db) {
    const anv = Object.fromEntries((db.anvandare || []).map((u) => [u.id, u]));
    const narv = Object.fromEntries((typeof NARVARO !== 'undefined' ? NARVARO : []).map((n) => [n.id, n]));
    // Närvaron på kontona (som i kontomenyn) – osynliga visas inte
    if (!SKARP) document.querySelectorAll('[data-li-status]').forEach((el) => {
      const u = anv[el.dataset.liStatus];
      // inaktiverat konto: knappen går inte att välja (samma regel som arAktiv i CRM:et)
      const knapp = el.closest('[data-roll]');
      if (u && (u.aktiv === false || u.aktiv === 0) && knapp) { knapp.disabled = true; knapp.setAttribute('data-inaktiv', ''); $('small', knapp).textContent = 'Inaktiverat konto'; return; }
      // statusen gäller till sluttiden (status.till) – sedan är man online igen, som narvaro() i ledning.js
      const giltig = u && u.status && (!u.status.till || Date.parse(u.status.till) > Date.now());
      const st = u && (giltig ? narv[u.status.kod] : narv.online);
      if (!st || ['osynlig', 'offline'].includes(st.id)) return;
      el.style.setProperty('--narv', st.farg);
      $('span', el).textContent = giltig && u.status.text ? `${st.namn} · ${u.status.text}` : st.namn;
      el.title = $('span', el).textContent; el.hidden = false;
    });
    const varde = (a) => { try { return prisaOffert(a.offert || {}).total || 0; } catch (err) { return 0; } };
    const affarer = db.affarer || [];
    const oppna = affarer.filter((a) => !['signerad', 'forlorad'].includes(a.steg));
    const signerade = affarer.filter((a) => a.steg === 'signerad');
    const summa = (lista) => lista.reduce((s, a) => s + varde(a), 0);
    const projekt = (db.projekt || []).filter((p) => p.steg !== 'klar');
    const klubbar = (db.kunder || []).filter((k) => k.klubbavtal); const viaKlubb = (db.kunder || []).filter((k) => k.viaKlubb);
    // Öppen pipeline: värdet och en stapel per steg (säljtavlans steg utom Order signerad)
    const pipe = summa(oppna); const pipeEl = $('[data-li-pipe]');
    if (pipeEl) { const [tal, enhet] = kr(pipe).split(' '); pipeEl.innerHTML = `${e(tal)}<small>${e(enhet)}</small>`; }
    const STEGF = { kontakt: '#5b8fd0', besok: '#3aa9c9', offert: '#5ad1c8', underlag: '#7ee0c3' };
    const KORT = { kontakt: 'Ny kontakt', besok: 'Kundbesök', offert: 'Offert', underlag: 'Underlag' };
    const steg = (typeof SALJSTEG !== 'undefined' ? SALJSTEG : []).filter((st) => STEGF[st.id]).map((st) => ({ ...st, v: summa(oppna.filter((a) => a.steg === st.id)), n: oppna.filter((a) => a.steg === st.id).length }));
    const max = Math.max(1, ...steg.map((st) => st.v)); const staplar = $('[data-li-staplar]');
    if (staplar && steg.length) {
      staplar.style.setProperty('--n', steg.length);
      staplar.innerHTML = steg.map((st, i) => `<span style="--hojd:${Math.round((st.v / max) * 100)}%;--i:${i};--f:${STEGF[st.id]}"><i></i><b>${e(st.v ? kr(st.v) : '–')}</b><small>${e(KORT[st.id] || st.namn)}</small></span>`).join('');
    }
    const chips = $('[data-li-chips]');
    if (chips) chips.innerHTML = `<span>${e(plural(oppna.length, 'öppen affär', 'öppna affärer'))}</span><span>${e(plural(projekt.length, 'projekt', 'projekt'))}</span>`;
    // Nyckeltalen
    const tal = $('[data-li-tal]');
    if (tal) {
      const rad = [[kr(pipe), plural(oppna.length, 'öppen affär', 'öppna affärer')], [kr(summa(signerade)), plural(signerade.length, 'signerad order', 'signerade ordrar')],
        [String(projekt.length), 'pågår hos testteamet'], [plural(klubbar.length, 'klubb', 'klubbar'), `${plural(viaKlubb.length, 'kund', 'kunder')} via klubbar`]];
      [...tal.children].forEach((g, i) => { const r = rad[i]; if (!r) return; $('strong', g).textContent = r[0]; $('small', g).textContent = r[1]; });
    }
    // Senaste meddelandet i chatten (bara text – exempeldata)
    const medd = ((db.chatt && db.chatt.meddelanden) || []).filter((m) => m && m.text && !m.borttagen && !m.system).sort((a, b) => String(b.tid).localeCompare(String(a.tid)))[0];
    // länkar i chattexten ([[kund:id]]/[[affar:id]]) visas som #Namn – som klartext() i chatt.js
    const klartext = (t) => String(t || '').replace(/\[\[(kund|affar):([\w-]+)\]\]/g, (m, typ, id) => { const x = ((typ === 'kund' ? db.kunder : db.affarer) || []).find((y) => y.id === id); return x ? `#${x.namn || x.titel}` : '#borttagen'; });
    const fran = medd && anv[medd.av];
    if (fran) {
      const av = $('[data-li-chatt-av]'); av.textContent = fran.initialer || fran.id.toUpperCase(); av.classList.toggle('li-avatar-test', fran.roll === 'test');
      $('[data-li-chatt-namn]').textContent = `${fran.namn} · ${nar(medd.tid)}`;
      const txt = klartext(medd.text);
      $('[data-li-chatt-text]').textContent = txt.length > 90 ? `${txt.slice(0, 88).trim()} …` : txt;
    }
    // Senaste aktiviteten: två händelser med kunden och när
    const TYP = { mote: ['mote', 'Möte'], samtal: ['prat', 'Samtal'], mejl: ['mejl', 'Mejl'], anteckning: ['dokument', 'Anteckning'], system: ['underlag', 'Händelse'] };
    const kunder = Object.fromEntries((db.kunder || []).map((k) => [k.id, k]));
    const akt = (db.aktiviteter || []).filter((x) => x && x.text && kunder[x.kundId]).sort((a, b) => String(b.tid).localeCompare(String(a.tid))).slice(0, 2);
    // rubriken = första satsen (före punkt, kolon eller tankstreck), kortad vid ett ord
    const kortText = (t) => { const f = String(t).split(/[.:!?]\s|\s[–—-]\s/)[0].replace(/[.:]$/, '').trim(); return f.length > 48 ? `${f.slice(0, 46).replace(/\s+\S*$/, '')} …` : f; };
    const flode = $('[data-li-flode]');
    if (flode && akt.length === 2) flode.innerHTML = akt.map((x, i) => { const [ik] = TYP[x.typ] || TYP.system; return `<li style="--r:${i}"><span class="li-ikon li-emo-ruta"><svg class="ikon" aria-hidden="true"><use href="#i-${ik}"/></svg></span><span><strong>${e(kortText(x.text))}</strong><small>${e(kunder[x.kundId].namn)} · ${e(nar(x.tid))}</small></span></li>`; }).join('');
  }

  // Scenen: framstegsringen och kort som följer muspekaren i djupled
  // Skarpt läge med hälsoformuläret avstängt: ringkortet visar kundunderlag i stället för hälsosvar
  // (det skarpa CRM:et hanterar kunddata, inte hälsodata)
  const utanHalsa = SKARP && !L.lage.halsoformular;
  const plats = $('[data-scen-ring]');
  if (plats && window.UPPortal) {
    plats.innerHTML = utanHalsa ? UPPortal.ring(80, { tal: 4, enhet: '/5', etikett: 'klara', aria: '4 av 5 klara' }) : UPPortal.ring(80, { tal: 4, enhet: '/5', etikett: 'svar', aria: '4 av 5 svar' });
    UPPortal.startaRing();
  }
  const ringEtikett = $('[data-scen-ring-etikett]');
  if (utanHalsa && ringEtikett) ringEtikett.innerHTML = '<svg class="ikon"><use href="#i-lank"/></svg>Kundunderlag';
  const scen = $('[data-scen]');
  if (scen && !lugn && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let ram = 0; let sista = null;
    addEventListener('pointermove', (ev) => {
      sista = ev; if (ram) return;
      ram = requestAnimationFrame(() => {
        ram = 0; const b = scen.getBoundingClientRect();
        scen.style.setProperty('--px', (((sista.clientX - b.left) / b.width) * 2 - 1).toFixed(3));
        scen.style.setProperty('--py', (((sista.clientY - b.top) / b.height) * 2 - 1).toFixed(3));
      });
    }, { passive: true });
  }

  // Det som rör sig hela tiden står still när fliken är dold eller scenen inte syns (≤1000 px är den dold)
  const vila = () => document.documentElement.toggleAttribute('data-li-vilar', document.hidden);
  document.addEventListener('visibilitychange', vila); vila();
  if (scen && 'IntersectionObserver' in window) {
    new IntersectionObserver(([p]) => scen.toggleAttribute('data-li-vilar', !p.isIntersecting)).observe(scen);
  }
})();
