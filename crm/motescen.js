/* Uperformance CRM – mötesscenen överst på #/mote.
   Med WebGL ritar scen-mote.js (three.js, laddas av scener.js) rummet i riktig 3D i [data-ms-rum]. Utan 3D (ingen WebGL2,
   3D avstängt eller scenen föll bort) står hjälten utan rum: texten, nyckeltalen och knapparna (motescen.css, "Utan 3D").
   Affärer som väntar på ett möte har en plats runt bordet. Platsetiketterna visas inte (användarens önskemål) – kunden väljs
   under "Planera mötet" – men platserna finns kvar i DOM:en: 3D-scenen ger vald kunds plats strålkastaren och skrivplattan.
   Egen fil: sätts in när vyn ritas (crm.js behöver inte ändras) och läser data via window.UPCRM. */
(() => {
  'use strict';
  const lugn = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const forsta = (namn) => String(namn || '').replace(/\s+(AB|HB|KB|IF|BK)$/i, '').split(/\s+/).slice(0, 2).join(' ');
  const initialer = (namn) => String(namn || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((d) => d[0]).join('').toUpperCase();
  const STEG = { kontakt: 'Ny kontakt', besok: 'Kundbesök', offert: 'Offert skickad', underlag: 'Underlag', signerad: 'Signerad' };
  const VANTAR = ['kontakt', 'besok', 'offert'];
  const crm = () => window.UPCRM;
  const knappObs = new WeakMap(); // scen → IntersectionObserver för hjältens startknappar (se bind)
  const valdKund = () => document.querySelector('[data-mote-kund]')?.value || '';
  const valdAffar = () => document.querySelector('[data-mote-affar]')?.value || '';

  // Samma urval som korten under "Planera mötet" (moteVantar i crm.js): bara företag, inga klubbar
  // Alla affärer som väntar på möte (hjältens tal räknar alla) – platserna vid bordet tar de sex första (platsAffarer)
  function vantandeAffarer() {
    const c = crm(); if (!c) return [];
    const rang = { besok: 0, kontakt: 1, offert: 2 };
    return (c.db.affarer || []).filter((a) => { const k = VANTAR.includes(a.steg) ? c.kund(a.kundId) : null; return !!k && k.typ !== 'klubb'; })
      .sort((x, y) => (rang[x.steg] - rang[y.steg]) || String(y.stegAndrad || '').localeCompare(String(x.stegAndrad || '')));
  }
  const platsAffarer = () => vantandeAffarer().slice(0, 6);

  function ordHtml() {
    const c = crm(); const db = c ? c.db : { aktiviteter: [], affarer: [] };
    const kId = valdKund();
    const k = kId && c ? c.kund(kId) : null;
    // Ett möte = en kund och en dag: kalkylens Spara och inspelningen loggar också mötesaktiviteter, men räknas inte som fler möten
    const motenAlla = (db.aktiviteter || []).filter((x) => x.typ === 'mote').sort((a, b) => (a.tid < b.tid ? 1 : -1))
      .filter((x, i, l) => l.findIndex((y) => y.kundId === x.kundId && String(y.tid).slice(0, 10) === String(x.tid).slice(0, 10)) === i);
    const moten = motenAlla.length;
    const vantar = vantandeAffarer(); const vantarVarde = c && c.affarVarde ? vantar.reduce((s, a) => s + (a.offert ? c.affarVarde(a) : 0), 0) : 0;
    const dgr = (t) => Math.max(0, Math.round((Date.now() - new Date(t)) / 864e5)); const sedan = (t) => { const d = dgr(t); return d === 0 ? 'idag' : d === 1 ? 'igår' : `${d} d sedan`; };
    const kAff = k && c ? (db.affarer || []).filter((a) => a.kundId === k.id && a.steg !== 'signerad' && a.steg !== 'forlorad').sort((a, b) => String(b.stegAndrad || '').localeCompare(String(a.stegAndrad || '')))[0] : null;
    const kMoten = k ? motenAlla.filter((x) => x.kundId === k.id) : [];
    // Varje kort (2026-10-23, "snyggare och bättre"): etiketten med ikon, talet stort med ett piller bredvid (belopp eller hur länge sedan)
    // och en rad längst ned med vem det gäller – kundens initialer, en liten rubrik och namnet (två rader om det behövs, aldrig …).
    // Allt som kommer ur datan går genom e() här och ingen annanstans.
    const datum = (t) => new Date(t).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
    const kundNamn = (id) => { const x = c && c.kund(id); return x ? x.namn : ''; };
    const tal = ({ ikonNamn, ton, etikett, varde, piller, rubrik, namn, vem }) => `<span class="ms-tal" data-ton="${ton}">
        <span class="ms-tal-topp"><i aria-hidden="true">${ikon(ikonNamn)}</i><small>${e(etikett)}</small></span>
        <span class="ms-tal-varde"><b>${e(varde)}</b>${piller ? `<span class="ms-tal-piller">${e(piller)}</span>` : ''}</span>
        <span class="ms-tal-vem">${vem ? `<i aria-hidden="true">${e(initialer(vem))}</i>` : '<i class="ms-tal-tom" aria-hidden="true"></i>'}<span><small>${e(rubrik)}</small><em>${e(namn)}</em></span></span>
      </span>`;
    const forstaVantar = vantar[0] ? kundNamn(vantar[0].kundId) : '', senastKund = motenAlla[0] ? kundNamn(motenAlla[0].kundId) : '';
    const talRad = k
      ? [tal({ ikonNamn: 'affar', ton: 'is', etikett: 'Öppen affär', varde: kAff && kAff.offert && c ? c.krKort(c.affarVarde(kAff)) : '–', piller: kAff ? STEG[kAff.steg] || '' : '',
          rubrik: kAff ? 'Affären' : 'Ingen öppen affär', namn: kAff ? kAff.titel : 'Kalkylen sparas som ny affär', vem: k.namn }),
        tal({ ikonNamn: 'mote', ton: 'mint', etikett: 'Möten med kunden', varde: kMoten.length, piller: kMoten[0] ? sedan(kMoten[0].tid) : 'första mötet',
          rubrik: kMoten[0] ? 'Senaste mötet' : 'Inga möten ännu', namn: kMoten[0] ? datum(kMoten[0].tid) : 'Det här blir det första', vem: kMoten[0] ? k.namn : '' })].join('')
      : [tal({ ikonNamn: 'affar', ton: 'is', etikett: 'Väntar på möte', varde: vantar.length, piller: vantarVarde && c ? c.krKort(vantarVarde) : '',
          rubrik: forstaVantar ? 'Närmast på tur' : 'Inga just nu', namn: forstaVantar ? forsta(forstaVantar) : 'Alla affärer har haft möte', vem: forstaVantar }),
        tal({ ikonNamn: 'mote', ton: 'mint', etikett: 'Möten hållna', varde: moten, piller: motenAlla[0] ? sedan(motenAlla[0].tid) : '',
          rubrik: senastKund ? 'Senaste mötet' : 'Inga möten ännu', namn: senastKund ? forsta(senastKund) : 'Starta presentationen nedan', vem: senastKund })].join('');
    const rubrik = k ? `Nästa möte med<br><em>${e(forsta(k.namn))}.</em>` : 'Redo att<br><em>presentera.</em>';
    // Antalet bilder, affärerna som väntar på möte och – med vald kund – affären, värdet och vem du träffar står i
    // "Planera mötet" under hjälten (korten, dossiern). Här bara det som inte syns där: med vald kund räcker rubriken.
    // Rubriken är vyns h1 (vyns eget sidhuvud döljs när scenen finns, motescen.css) – som sidhjältarna.
    return `<p class="ms-etikett">Kundmöte</p>
      <h1 class="ms-rubrik">${rubrik}</h1>
      ${k ? '' : '<p class="ms-text">Presentera Uperformance och räkna fram upplägget live – för en särskild kund eller helt generellt.</p>'}
      <div class="ms-talrad">${talRad}</div>
      <div class="ms-knappar">
        <button type="button" class="ms-knapp ms-knapp-mint" data-ms="starta">${ikon('play')}Starta presentation</button>
        <button type="button" class="ms-knapp ms-knapp-glas" data-ms="kalkyl">${ikon('kalkyl')}Öppna kalkylen</button>
        ${window.UPVideomote && !(window.UP_SKARPT) ? `<button type="button" class="ms-knapp ms-knapp-glas" data-g="vm-nytt">${ikon('video')}Videomöte</button>` : ''}
        ${window.UPFilm ? `<button type="button" class="ms-knapp ms-knapp-glas ms-knapp-film" data-film title="Spela filmen – utan ljud"><span class="ms-film-bild" aria-hidden="true">${ikon('play')}</span>Filmen<small>${e(UPFilm.tid(UPFilm.LANGD))}</small></button>` : ''}
      </div>
      <p class="ms-not"><button type="button" class="ms-planera" data-ms="planera">Planera mötet – välj kund och bilder<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button></p>
      <p class="ms-pris"><svg class="ikon" data-i="las" aria-hidden="true"><use href="#i-las"/></svg>Priserna och kalkylen syns bara här i CRM:et – aldrig på webbplatsen.</p>`;
  }
  function ikon(namn) {
    const linje = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    if (namn === 'affar') return linje('<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>');
    if (namn === 'mote') return linje('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>');
    if (namn === 'video') return linje('<rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5l6-3.5v10l-6-3.5"/>');
    if (namn === 'play') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h1.5M12 12h1.5M15.5 12h.01M8.5 16h1.5M12 16h1.5M15.5 16h.01"/></svg>';
  }

  // Vald plats: den med vald affär – annars kundens första plats (affärer med deltagarlista o.d. finns inte i affärslistan)
  function valdPlatsAffar(aff) {
    const aId = valdAffar(), kId = valdKund();
    if (aId && aff.some((a) => a.id === aId)) return aId;
    const forsta = kId ? aff.find((a) => a.kundId === kId) : null;
    return forsta ? forsta.id : '';
  }

  function platserHtml() {
    const c = crm(); if (!c) return '';
    const aff = platsAffarer(); const aId = valdPlatsAffar(aff);
    return aff.map((a, n, arr) => {
      const k = c.kund(a.kundId); if (!k) return '';
      // Platserna längs bordets främre kant, som en publik i en båge.
      const v = ((arr.length === 1 ? 90 : 24 + n * (132 / (arr.length - 1))) * Math.PI) / 180;
      const left = 50 + Math.cos(v) * 44, top = 66 + Math.sin(v) * 22;
      return `<button type="button" class="ms-plats${a.id === aId ? ' vald' : ''}" style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;--n:${n}" data-ms="plats" data-kund="${e(k.id)}" data-affar="${e(a.id)}" title="${e(k.namn)} · ${e(a.titel)}">
        <span class="ms-avatar">${e(initialer(k.namn))}</span><span class="ms-namn">${e(forsta(k.namn))}</span><span class="ms-steg ms-steg-${e(a.steg)}">${e(STEG[a.steg] || a.steg)}</span></button>`;
    }).join('');
  }

  const html = () => `<section class="motescen" data-motescen>
      <div class="ms-ord" data-ms-ord>${ordHtml()}</div>
      <div class="ms-rum" data-ms-rum><div class="ms-platser" data-ms-platser aria-hidden="true">${platserHtml()}</div></div>
    </section>`;

  /* ---- paus utanför bild och hjältens startknappar ---------------------------------------------- */
  function bind(sek) {
    // Paus utanför bild
    new IntersectionObserver(([p]) => sek.toggleAttribute('data-vilar', !p.isIntersecting)).observe(sek);
    // Startknapparna: medan hjältens knappar syns vilar dockan med samma knappar under "Planera mötet" (sidor.css 09) –
    // aldrig två startknappar i bild. Första läget sätts direkt i sattIn (ingen blinkning vid omritning).
    // Knapparna ritas om med texten (uppdateraOrd) – observatören flyttas då till de nya (knappObs)
    const knappar = sek.querySelector('.ms-knappar');
    const obs = new IntersectionObserver((poster) => { const p = poster[poster.length - 1]; if (p.target.isConnected) sek.toggleAttribute('data-knappar-synliga', p.isIntersecting); });
    knappObs.set(sek, obs);
    if (knappar) obs.observe(knappar);
  }

  function uppdateraOrd() {
    const sek = document.querySelector('[data-motescen]'); if (!sek) return;
    sek.querySelector('[data-ms-ord]').innerHTML = ordHtml();
    const obs = knappObs.get(sek); const kn = sek.querySelector('.ms-knappar');
    if (obs && kn) { obs.disconnect(); obs.observe(kn); }
    // Platserna syns inte, men 3D-scenen läser .vald för strålkastaren och skrivplattan vid vald kund
    const aId = valdPlatsAffar(platsAffarer());
    sek.querySelectorAll('.ms-plats').forEach((p) => p.classList.toggle('vald', !!aId && p.dataset.affar === aId));
  }

  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-ms]'); if (!t || !t.closest('[data-motescen]')) return;
    const vad = t.dataset.ms;
    if (vad === 'starta') { const f = document.querySelector('[data-form="starta-mote"]'); if (f) (f.requestSubmit ? f.requestSubmit() : f.submit()); return; }
    if (vad === 'kalkyl') { document.querySelector('[data-g="starta-mote-kalkyl"]')?.click(); return; }
    if (vad === 'planera') {
      const mal = document.getElementById('mote-plan'); if (!mal) return;
      mal.scrollIntoView({ behavior: lugn ? 'auto' : 'smooth', block: 'start' });
      document.getElementById('mk-h')?.focus({ preventScroll: true });
    }
  });
  document.addEventListener('change', (ev) => { if (ev.target.matches('[data-mote-kund], [data-mote-affar]')) setTimeout(uppdateraOrd, 0); });

  // Sätt in scenen när mötesvyn ritas (och igen om vyn ritas om)
  function sattIn() {
    if (location.hash !== '#/mote' || !window.UPCRM) return;
    const start = document.querySelector('.mote-start');
    if (!start || start.previousElementSibling?.matches('[data-motescen]')) return;
    document.querySelectorAll('[data-motescen]').forEach((s) => s.remove());
    start.insertAdjacentHTML('beforebegin', html());
    const sek = start.previousElementSibling;
    const kn = sek.querySelector('.ms-knappar');
    if (kn) { const r = kn.getBoundingClientRect(); sek.toggleAttribute('data-knappar-synliga', r.bottom > 0 && r.top < innerHeight); }
    bind(sek);
  }
  new MutationObserver(sattIn).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('hashchange', sattIn);
  sattIn();
})();
