/* Uperformance CRM – Abonnemang och bindningstid (2026-11-23). Användarens önskemål: "bygg en smart sektion i crm där man kan följa
   och tracka hur lång bindningstid kunderna har på sina abonnemang".

   Ett abonnemang = något kunden betalar löpande (UPerformance App per person och månad, Team Insights per år – priserna ur PRISER i
   data.js – eller något annat som skrivs in för hand). Säljaren anger startdatum, bindningstid, uppsägningstid och vad som händer
   efter bindningen (förnyas automatiskt, löper tills vidare eller slutar). Resten RÄKNAS: när bindningen går ut, sista dag att säga
   upp, hur långt in i perioden kunden är, månadsvärdet och det bundna värdet som återstår – och sidan säger vad som behöver göras.

   Data: db.abonnemang = [{ id, kundId, affarId?, produkt: app | insights | annat, namn, antal, pris (kr per enhet och period),
   period: manad | ar, start (ÅÅÅÅ-MM-DD), bindning (mån), uppsagning (mån), fornyelse: auto | lopande | slutar, forlangning (mån),
   status: aktivt | uppsagt, uppsagd, slutar, ansvarig, notering, skapad }]. Bindningsvillkoren kommer från avtalet med kunden –
   CRM:et hittar inte på några; exempeldatan är påhittad som resten av demon.

   Sidan #/abonnemang (gjord om helt 2026-11-23, se "vyn" nedan): Plånboken i hjälten, Nästa beslut, Intäkt + Portfölj och listan. (Förut: en tidslinje med en rad per
   abonnemang: bindningen som stapel, sista uppsägningsdag som markör), och alla abonnemang med filter. Kortet Abonnemang på kundsidan.
   Skapa/ändra: säljare (även chefen) och administratören. Testteamet läser. */
window.UPAbonnemang = (K) => {
  'use strict';
  const { e, ik, emo, oppnaArk, arkHuvud, bekrafta, toast, spara, rendera, logga, kund, anv, sidhjalte, datumText, idag, plural, kr, krKort, nyId, $ } = K;
  const P = window.PRISER || (typeof PRISER !== 'undefined' ? PRISER : {}); // eslint-disable-line no-undef
  const db = () => K.db;
  const lista = () => { const d = db(); if (!Array.isArray(d.abonnemang)) d.abonnemang = []; return d.abonnemang; };
  const hamta = (id) => lista().find((x) => x.id === id) || null;
  const mig = () => anv(K.jag) || {};
  const kan = () => { const u = mig(); return u.roll === 'salj' || u.roll === 'admin' || !!u.admin; };
  // ta bort: i skarpt läge bara administratören – servern godtar raderad: true bara från admin (api-crm.js), som i forfragningar.js
  const kanRadera = () => { const u = mig(); return !K.SKARP ? kan() : u.roll === 'admin' || !!u.admin; };
  const PRODUKT = {
    app: { namn: 'UPerformance App', pris: P.appManad || 49, period: 'manad', enhet: 'användare', ikon: 'mobil', ton: 'mint' },
    insights: { namn: 'Team Insights', pris: P.insightsAr || 4995, period: 'ar', enhet: 'licens', ikon: 'trend', ton: 'is' },
    annat: { namn: '', pris: 0, period: 'manad', enhet: 'st', ikon: 'omtest', ton: 'gul' },
  };
  const FORNYELSE = { auto: 'Förnyas automatiskt', lopande: 'Löper tills vidare', slutar: 'Slutar när bindningen går ut' };
  const LAGE = {
    agera: ['Agera nu', 'chip-atgard', 'rod'], snart: ['Snart', 'chip-folj', 'gul'], bunden: ['Bunden', 'chip-ok', 'mint'],
    forlangs: ['Förlängs', 'chip-folj', 'gul'], tillsvidare: ['Tills vidare', 'chip-neutral', 'is'], uppsagt: ['Uppsagt', 'chip-neutral', 'rod'], avslutat: ['Avslutat', 'chip-neutral', ''],
  };
  const ui = { filter: 'alla', tlSpann: 12, tlProdukt: 'alla', tlVald: null, tlPlats: 'beslut', tlNytt: false, tlDetaljNy: false, sok: '' };

  /* ---- datum (kalenderdatum, oberoende av tidszon) ---- */
  const dat = (iso) => new Date(`${iso}T12:00:00Z`);
  const iso = (d) => d.toISOString().slice(0, 10);
  // + n månader; sista dagen i månaden hålls (31 jan + 1 mån = 28/29 feb)
  function plusMan(isoDag, n) {
    const d = dat(isoDag); const dag = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
    const sista = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)).getUTCDate();
    d.setUTCDate(Math.min(dag, sista)); return iso(d);
  }
  const dagarMellan = (a, b) => Math.round((dat(b) - dat(a)) / 864e5);
  const manaderMellan = (a, b) => Math.max(0, dagarMellan(a, b) / 30.4375);
  const giltigt = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(dat(s).getTime()) && iso(dat(s)) === s;
  const dagText = (n) => (n === 0 ? 'idag' : n === 1 ? 'i morgon' : n < 0 ? `för ${plural(-n, 'dag', 'dagar')} sedan` : n < 61 ? `om ${plural(n, 'dag', 'dagar')}` : `om ${Math.round(n / 30.4375)} mån`);

  /* ---- det som räknas: läget för ett abonnemang ---- */
  function lage(x, nu = idag()) {
    const bind = Math.max(0, Number(x.bindning) || 0); const upps = Math.max(0, Number(x.uppsagning) || 0); const forl = Math.max(1, Number(x.forlangning) || 12);
    const manad = (Number(x.antal) || 0) * (Number(x.pris) || 0) / (x.period === 'ar' ? 12 : 1);
    const ut = { id: 'bunden', manad, periodStart: x.start, periodSlut: null, sista: null, dagarSlut: null, dagarSista: null, andel: 0, fornyad: 0, bundet: 0, skal: '' };
    if (!giltigt(x.start)) { ut.id = 'avslutat'; ut.skal = 'Startdatum saknas.'; return ut; }
    if (dagarMellan(nu, x.start) > 0) ut.kommande = true;
    let slut = plusMan(x.start, bind); let start = x.start;
    if (x.status === 'uppsagt' && giltigt(x.slutar)) {
      ut.periodSlut = x.slutar; ut.dagarSlut = dagarMellan(nu, x.slutar);
      ut.id = ut.dagarSlut < 0 ? 'avslutat' : 'uppsagt';
      ut.bundet = ut.dagarSlut > 0 ? manad * manaderMellan(nu, x.slutar) : 0;
      ut.andel = Math.min(1, Math.max(0, dagarMellan(x.start, nu) / Math.max(1, dagarMellan(x.start, x.slutar))));
      ut.skal = ut.id === 'avslutat' ? `Avslutades ${datumText(x.slutar)}.` : `Uppsagt – sista dag ${datumText(x.slutar)} (${dagText(ut.dagarSlut)}).`;
      return ut;
    }
    if (x.fornyelse === 'auto') while (dagarMellan(nu, slut) <= 0 && ut.fornyad < 200) { start = slut; slut = plusMan(slut, forl); ut.fornyad++; }
    const passerad = dagarMellan(nu, slut) <= 0;
    if (passerad && x.fornyelse === 'slutar') { ut.id = 'avslutat'; ut.periodSlut = slut; ut.dagarSlut = dagarMellan(nu, slut); ut.skal = `Bindningen gick ut ${datumText(slut)} och abonnemanget slutade då.`; return ut; }
    if (passerad) { // löper tills vidare: kan sägas upp med uppsägningstiden
      ut.id = 'tillsvidare'; ut.periodSlut = null; ut.sista = null; ut.bundet = manad * upps; ut.andel = 1;
      ut.skal = `Bindningen gick ut ${datumText(slut)}. Löper tills vidare${upps ? ` med ${upps} mån uppsägningstid` : ''} – kunden kan säga upp när som helst.`;
      return ut;
    }
    ut.periodStart = start; ut.periodSlut = slut; ut.dagarSlut = dagarMellan(nu, slut);
    ut.sista = upps ? plusMan(slut, -upps) : slut; ut.dagarSista = dagarMellan(nu, ut.sista);
    ut.andel = Math.min(1, Math.max(0, dagarMellan(start, nu) / Math.max(1, dagarMellan(start, slut))));
    ut.bundet = manad * manaderMellan(nu, slut);
    const efter = x.fornyelse === 'auto' ? `förnyas den automatiskt med ${forl} mån` : x.fornyelse === 'lopande' ? 'löper den tills vidare' : 'slutar abonnemanget';
    if (ut.dagarSista < 0) {
      // sista uppsägningsdagen har passerat: perioden är låst, och med automatisk förnyelse är nästa period redan avgjord
      ut.id = x.fornyelse === 'auto' ? 'forlangs' : ut.dagarSlut <= 30 ? 'agera' : 'snart';
      ut.skal = x.fornyelse === 'auto' ? `Sista uppsägningsdag var ${datumText(ut.sista)} – förnyas automatiskt ${datumText(slut)} med ${forl} mån.` : `Bindningen går ut ${datumText(slut)} (${dagText(ut.dagarSlut)}) – sedan ${efter}.`;
    } else if (ut.dagarSista <= 30) { ut.id = 'agera'; ut.skal = `Sista dag att säga upp är ${datumText(ut.sista)} (${dagText(ut.dagarSista)}). Bindningen går ut ${datumText(slut)} – sedan ${efter}.`; }
    else if (ut.dagarSista <= 90) { ut.id = 'snart'; ut.skal = `Sista dag att säga upp är ${datumText(ut.sista)} (${dagText(ut.dagarSista)}). Bindningen går ut ${datumText(slut)} – sedan ${efter}.`; }
    else { ut.id = 'bunden'; ut.skal = `Bunden till ${datumText(slut)} (${dagText(ut.dagarSlut)}). Sista dag att säga upp: ${datumText(ut.sista)}.`; }
    return ut;
  }
  const namnPa = (x) => (x.produkt === 'annat' ? x.namn || 'Abonnemang' : (PRODUKT[x.produkt] || PRODUKT.annat).namn);
  const prisText = (x) => `${plural(Number(x.antal) || 0, PRODUKT[x.produkt] ? PRODUKT[x.produkt].enhet : 'st', PRODUKT[x.produkt] ? (PRODUKT[x.produkt].enhet === 'licens' ? 'licenser' : PRODUKT[x.produkt].enhet) : 'st')} × ${kr(Number(x.pris) || 0)}/${x.period === 'ar' ? 'år' : 'mån'}`;
  const medLage = (lst = lista()) => lst.map((x) => ({ x, l: lage(x), k: kund(x.kundId) })).filter((r) => r.k);
  const aktiva = (rader) => rader.filter((r) => r.l.id !== 'avslutat');
  const ORDNING = { agera: 0, snart: 1, forlangs: 2, uppsagt: 3, bunden: 4, tillsvidare: 5, avslutat: 6 };
  const sortera = (rader) => [...rader].sort((a, b) => (ORDNING[a.l.id] - ORDNING[b.l.id]) || ((a.l.dagarSista ?? a.l.dagarSlut ?? 9e9) - (b.l.dagarSista ?? b.l.dagarSlut ?? 9e9)) || a.k.namn.localeCompare(b.k.namn, 'sv'));
  // menyns räknare: det som kräver något nu
  const attAgera = () => medLage().filter((r) => r.l.id === 'agera').length;

  /* ---- vyn (hela sidan gjord om 2026-11-23, användaren: "gör om hela sidan – kom på något nytt, stilrent, proffsigt, coolt,
     animeringar, 3D-effekt och design som passar Apple"; Gantt-schemat och golvet med pinnar avvisades – gå inte tillbaka) ----
     1. Hjälten: texten och fyra tal till vänster, Plånboken till höger – abonnemangen som pass i Apple Wallet, staplade i 3D med det
        som avgörs först längst fram. Stapeln lutar efter pekaren (--px/--py), passen lyfts vid hovring, klick visar detaljerna.
     2. Nästa beslut: en glasbana med en pärla per beslut vid sitt datum och under den ett glaskort per beslut med en ring som i
        Fitness (hur mycket av bindningsperioden som har gått). Pärla och kort lyser upp tillsammans (data-bk-id → data-hl).
     3. Intäkt framåt (staplar per månad) bredvid Portföljen (ring per produkt och tre nyckeltal).
     4. Alla abonnemang: en inset-lista med sök direkt i listan och filter som segment; klick fäller ut detaljerna under raden.
     Detaljerna (detaljHtml) är desamma överallt. Entréerna körs vid första visningen och när man själv bytt period/produkt (ui.tlNytt). */
  const chip = (l) => `<span class="chip ${LAGE[l.id][1]}">${e(LAGE[l.id][0])}</span>`;
  const matare = (l) => `<span class="ab-matare" role="img" aria-label="${Math.round(l.andel * 100)} procent av bindningstiden har gått" data-lage="${e(l.id)}"><i style="--p:${l.andel.toFixed(3)}"></i></span>`;
  const knappar = (r, kort) => {
    if (!kan()) return '';
    const { x, l } = r; const ut = [];
    if (l.id === 'agera' || l.id === 'snart') ut.push(`<button class="knapp knapp-accent knapp-liten" type="button" data-g="ab-uppgift" data-id="${e(x.id)}">${ik('todo')}Skapa uppgift</button>`);
    if (l.id !== 'avslutat' && x.status !== 'uppsagt' && !kort) ut.push(`<button class="knapp knapp-kontur knapp-liten" type="button" data-g="ab-forlang" data-id="${e(x.id)}">${ik('omtest')}Ny bindning</button>`);
    if (x.status === 'uppsagt' && l.id !== 'avslutat') ut.push(`<button class="knapp knapp-kontur knapp-liten" type="button" data-g="ab-angra" data-id="${e(x.id)}">Ångra uppsägningen</button>`);
    else if (l.id !== 'avslutat' && !kort) ut.push(`<button class="knapp knapp-kontur knapp-liten" type="button" data-g="ab-uppsag" data-id="${e(x.id)}">Säg upp …</button>`);
    ut.push(`<button class="knapp knapp-kontur knapp-liten ab-ikonknapp" type="button" data-g="ab-andra" data-id="${e(x.id)}" aria-label="Ändra ${e(namnPa(x))}">${ik('redigera')}${kort ? '' : '<span>Ändra</span>'}</button>`);
    return ut.join('');
  };
  const MAN = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const kortTid = (n) => (n < 61 ? `${n} d` : `${Math.round(n / 30.4375)} mån`);
  const tlKr = (n) => (n >= 10000 ? `${Math.round(n / 1000)} tkr` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} tkr` : `${Math.round(n)} kr`);
  const datumKort = (d) => `${Number(d.slice(8, 10))} ${MAN[Number(d.slice(5, 7)) - 1]}${d.slice(0, 4) !== idag().slice(0, 4) ? ` ${d.slice(2, 4)}` : ''}`;
  const BESLUT_TEXT = { sista: 'Sista uppsägningsdag', slutar: 'Slutar', overgar: 'Blir tills vidare' };
  const BESLUT_KORT = { sista: 'till sista dag', slutar: 'tills det slutar', overgar: 'till tills vidare' };
  const PRODUKT_KORT = { app: 'App', insights: 'Insights' };
  const BESLUT_ETIKETT = { sista: 'Uppsägning', slutar: 'Slutar', overgar: 'Tills vidare' };
  const PRODUKT_FARG = { app: 'var(--accent-text, #0f6e57)', insights: 'color-mix(in srgb, var(--is, #a7d2ff) 72%, var(--navy, #183653))', annat: 'var(--gul, #f0b545)' };
  // Nästa dag då något avgörs för abonnemanget (null = löper tills vidare utan datum)
  function nastaBeslut(r) {
    const { x, l } = r; const upps = Math.max(0, Number(x.uppsagning) || 0); const forl = Math.max(1, Number(x.forlangning) || 12);
    if (l.id === 'avslutat' || l.id === 'tillsvidare' || !l.periodSlut) return null;
    if (l.id === 'uppsagt' || x.fornyelse === 'slutar') return { d: l.periodSlut, typ: 'slutar' };
    if (l.sista && l.dagarSista >= 0) return { d: l.sista, typ: 'sista' };
    if (x.fornyelse === 'auto') { const n = plusMan(l.periodSlut, forl); return { d: upps ? plusMan(n, -upps) : n, typ: 'sista', nasta: true }; }
    return { d: l.periodSlut, typ: 'overgar' };
  }
  // Intäkten månad för månad: varje aktivt abonnemang hamnar i en av fyra hinkar (mitten av månaden avgör)
  function intaktFramat(rader, spann) {
    const forsta = idag().slice(0, 8) + '01';
    return Array.from({ length: spann }, (_, i) => {
      const m = plusMan(forsta, i); const mitt = m.slice(0, 8) + '15'; const o = { m, saker: 0, fornyas: 0, tillsvidare: 0, slutar: 0 };
      for (const { x, l } of rader) {
        if (l.id === 'avslutat' || x.start > mitt) continue;
        const v = l.manad;
        if (l.id === 'tillsvidare' || !l.periodSlut) o.tillsvidare += v;
        else if (l.id === 'uppsagt' || x.fornyelse === 'slutar') { if (mitt < l.periodSlut) o.saker += v; else o.slutar += v; }
        else if (mitt < l.periodSlut) o.saker += v;
        else if (x.fornyelse === 'auto') o.fornyas += v;
        else o.tillsvidare += v;
      }
      return o;
    });
  }
  const tlFakta = (r) => { const { x, l } = r; return [
    ['Period', l.periodSlut ? `${datumText(l.periodStart || x.start)} – ${datumText(l.periodSlut)}` : `Från ${datumText(x.start)}`],
    ['Sista uppsägningsdag', l.id === 'uppsagt' ? `Uppsagt${x.uppsagd ? ` ${datumText(x.uppsagd)}` : ''}` : l.sista ? `${datumText(l.sista)} · ${dagText(l.dagarSista)}` : `${Number(x.uppsagning) || 0} mån uppsägningstid`],
    ['Efter bindningen', l.id === 'uppsagt' ? `Slutar ${datumText(l.periodSlut)}` : x.fornyelse === 'auto' ? `Förnyas ${Number(x.forlangning) || 12} mån i taget` : FORNYELSE[x.fornyelse] || '–'],
    ['Per månad', `${kr(Math.round(l.manad))} · ${prisText(x)}`],
  ]; };
  // ringen (som Fitness): andel 0–1, ritas fram en gång
  const ring = (andel, r = 21, b = 6.5) => { const o = 2 * Math.PI * r; const s = (r + b) * 2; const a = Math.max(0, Math.min(1, andel || 0));
    return `<svg class="ab-ring" viewBox="0 0 ${s} ${s}" aria-hidden="true"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" class="ab-ring-spar" style="stroke-width:${b}"/><circle cx="${s / 2}" cy="${s / 2}" r="${r}" class="ab-ring-del" style="stroke-width:${b};stroke-dasharray:${o.toFixed(1)};--o:${o.toFixed(1)};--slut:${(o * (1 - a)).toFixed(1)}"/></svg>`; };
  const seg = (namn, val, lst, etikett) => `<div class="ab-seg" role="group" aria-label="${e(etikett)}">${lst.map(([v, t]) => `<button type="button" data-g="ab-tl" data-${namn}="${e(String(v))}" aria-pressed="${String(val) === String(v)}">${e(t)}</button>`).join('')}</div>`;
  function detaljHtml(r, b) {
    const { x, l, k } = r;
    const ringDag = b && b.typ === 'sista' ? iso(new Date(dat(b.d).getTime() - 14 * 864e5)) : null;
    const rad = [
      b ? `<li>${ik('kalender')}<span><strong>${e(BESLUT_TEXT[b.typ])} ${e(datumText(b.d))}</strong><small>${e(dagText(dagarMellan(idag(), b.d)))}${b.nasta ? ' · i nästa period, den här är redan förnyad' : ''}</small></span></li>` : `<li>${ik('kalender')}<span><strong>Löper tills vidare</strong><small>${Number(x.uppsagning) || 0} månaders uppsägningstid</small></span></li>`,
      l.id !== 'uppsagt' && x.fornyelse !== 'slutar' ? `<li>${ik('trend')}<span><strong>Om kunden säger upp: −${e(kr(Math.round(l.manad)))} per månad</strong><small>${e(krKort(Math.round(l.manad * 12)))} per år</small></span></li>` : `<li>${ik('trend')}<span><strong>Intäkten upphör: −${e(kr(Math.round(l.manad)))} per månad</strong><small>efter ${e(datumText(l.periodSlut))} – förläng innan dess om kunden vill fortsätta</small></span></li>`,
      ringDag && ringDag > idag() ? `<li>${ik('samtal')}<span><strong>Förslag: hör av dig senast ${e(datumText(ringDag))}</strong><small>två veckor före sista uppsägningsdagen</small></span></li>` : '',
    ].join('');
    return `<div class="ab-tl-detalj" data-lage="${e(l.id)}"${ui.tlDetaljNy ? ' data-nytt' : ''}>
        <div class="ab-dt-topp"><span><strong>${e(k.namn)}</strong><small>${e(namnPa(x))}</small></span>${chip(l)}<button type="button" class="ab-dt-stang" data-g="ab-tl-valj" data-id="${e(x.id)}" data-plats="${e(ui.tlPlats)}" aria-label="Stäng detaljerna">${ik('stang')}</button></div>
        <ul class="ab-dt-insikt">${rad}</ul>
        <dl class="ab-fakta">${tlFakta(r).map(([a, c]) => `<div><dt>${e(a)}</dt><dd>${e(c)}</dd></div>`).join('')}</dl>
        <div class="ab-knappar">${knappar(r)}<a class="knapp knapp-kontur knapp-liten" href="#/kund/${e(k.id)}">Öppna kunden</a></div></div>`;
  }

  /* 1. Plånboken i hjälten */
  function planbokHtml(akt) {
    const pass = akt.map((r) => ({ r, b: nastaBeslut(r) })).sort((a, b) => (a.b ? a.b.d : '9999').localeCompare(b.b ? b.b.d : '9999') || b.r.l.manad - a.r.l.manad);
    if (!pass.length) return '';
    const visas = pass.slice(0, 5).reverse(); const fler = pass.length - visas.length; const nu = idag();
    return `<div class="ab-planbok" data-ab-planbok>
        <div class="ab-pb-stack" style="--n:${visas.length}">${visas.map((p, i) => { const { r, b } = p; const dagar = b ? dagarMellan(nu, b.d) : null; const pr = PRODUKT[r.x.produkt] || PRODUKT.annat; const bak = visas.length - 1 - i;
          return `<button type="button" class="ab-pass" data-g="ab-tl-valj" data-plats="beslut" data-id="${e(r.x.id)}" data-lage="${e(r.l.id)}" style="--i:${i};--bak:${bak}"${bak === 0 ? ' data-fram' : ''}
              aria-label="${e(`${r.k.namn}, ${namnPa(r.x)}: ${b ? `${BESLUT_TEXT[b.typ]} ${datumText(b.d)}, ${dagText(dagar)}` : 'löper tills vidare'}. Visa detaljer.`)}">
              <span class="ab-pass-glans" aria-hidden="true"></span>
              <span class="ab-pass-topp"><span class="ab-pass-ikon">${ik(pr.ikon)}</span><span class="ab-pass-namn"><strong>${e(r.k.namn)}</strong><small>${e(namnPa(r.x))}</small></span>
                <span class="ab-pass-dag"><b>${dagar == null ? 'Löpande' : e(kortTid(dagar))}</b><small>${b ? e(BESLUT_KORT[b.typ]) : 'tills vidare'}</small></span></span>
              <span class="ab-pass-botten"><span><small>${b ? e(BESLUT_TEXT[b.typ]) : 'Uppsägningstid'}</small><b>${b ? e(datumText(b.d)) : `${Number(r.x.uppsagning) || 0} mån`}</b></span>
                <span><small>Per månad</small><b>${e(kr(Math.round(r.l.manad)))}</b></span>${ring(r.l.id === 'tillsvidare' ? 1 : r.l.andel, 15, 5)}</span>
            </button>`; }).join('')}</div>
        <span class="ab-pb-fot">${fler > 0 ? `+${fler} till – ` : ''}det som avgörs först ligger längst fram</span>
      </div>`;
  }

  /* 2. Nästa beslut: glasbanan och korten */
  function beslutHtml(rader, alla) {
    const nu = idag(); const spann = ui.tlSpann; const till = plusMan(nu, spann); const hela = Math.max(1, dagarMellan(nu, till));
    const produkter = [...new Set(alla.map((r) => r.x.produkt))];
    const punkter = rader.map((r) => ({ r, b: nastaBeslut(r) })).filter((p) => p.b).sort((a, b) => a.b.d.localeCompare(b.b.d) || b.r.l.manad - a.r.l.manad);
    const inom = punkter.filter((p) => p.b.d >= nu && p.b.d <= till); const senare = punkter.filter((p) => p.b.d > till);
    const tillsvidare = rader.filter((r) => !nastaBeslut(r));
    const xpAv = (d) => 2 + dagarMellan(nu, d) / hela * 96;
    const manader = []; for (let m = plusMan(nu.slice(0, 8) + '01', 1); m <= till; m = plusMan(m, 1)) manader.push(m);
    const glest = spann >= 24 ? 3 : 1;
    /* Banan (gjord om 2026-11-23, användaren: "ser buggad ut" – pärlor staplades på varandra). Nu: en tunn glasskena med en prick vid varje
       beslutsdatum, och en etikett i glas ("16 d · Bergmark") ovanför eller under skenan, ansluten med en tunn linje. Etiketterna läggs i
       fyra fack (ovan, under, högre ovan, längre under) och mäts mot vyns bredd (vyBredd) så att de aldrig krockar; den som inte ryms visas
       bara som prick. Etiketterna hålls inom banan (--dx). Hovring på prick/etikett/kort tänder alla tre. */
    const vyBredd = Math.max(280, ((document.querySelector('#vy') || {}).clientWidth || 1000) - 96);
    const smal = vyBredd < 560;
    const etikettPx = smal ? 64 : 150;
    const behov = (etikettPx + 10) / vyBredd * 100; const halv = etikettPx / 2 / vyBredd * 100;
    const FACK = [-1, 1, -2, 2]; const sistaI = {}; const lappar = [];
    inom.forEach((p, i) => {
      const xp = xpAv(p.b.d); const fack = FACK.find((f) => sistaI[f] == null || xp - sistaI[f] >= behov);
      if (fack != null) sistaI[fack] = xp;
      const cx = Math.min(Math.max(xp, halv + .5), 100 - halv - .5);
      lappar.push({ ...p, xp, fack, dx: cx - xp, i, namn: p.r.k.namn.split(' ')[0] });
    });
    const uppe = Math.max(0, ...lappar.filter((l) => l.fack < 0).map((l) => -l.fack)); const nere = Math.max(0, ...lappar.filter((l) => l.fack > 0).map((l) => l.fack));
    const bana = `<div class="ab-bana" style="--uppe:${uppe};--nere:${nere}"${smal ? ' data-smal' : ''}>
        <div class="ab-bana-yta">
          ${manader.map((m, i) => `<i class="ab-bana-man" style="left:${xpAv(m).toFixed(2)}%"${m.slice(5, 7) === '01' ? ' data-ar' : ''}>${(i % glest === 0 || m.slice(5, 7) === '01') && xpAv(m) > 7 ? `<span${i % 2 ? ' data-udda' : ''}>${MAN[Number(m.slice(5, 7)) - 1]}${m.slice(5, 7) === '01' ? ` ${m.slice(2, 4)}` : ''}</span>` : ''}</i>`).join('')}
          <div class="ab-bana-spar"><i class="ab-bana-fyll" style="--p:${inom.length ? ((xpAv(inom[inom.length - 1].b.d) - 2) / 96).toFixed(3) : 0}"></i></div>
          <i class="ab-bana-idag"><span>Idag</span></i>
          ${lappar.map((l) => `<span class="ab-mark" data-bk-id="${e(l.r.x.id)}" data-lage="${e(l.r.l.id)}" data-fack="${l.fack == null ? 0 : l.fack}" style="left:${l.xp.toFixed(2)}%;--i:${l.i};--dx:${l.dx.toFixed(2)}cqw">
              <i class="ab-mark-prick" data-ab-tips="${e(l.r.x.id)}"></i>${l.fack != null ? `<i class="ab-mark-linje"></i><span class="ab-mark-lapp" data-ab-tips="${e(l.r.x.id)}"><b>${e(kortTid(dagarMellan(nu, l.b.d)))}</b>${smal ? '' : `<span>${e(l.namn)}</span>`}</span>` : ''}</span>`).join('')}
        </div></div>`;
    const kort = inom.map((p, i) => { const { r, b } = p; const dagar = dagarMellan(nu, b.d); const andel = r.l.id === 'uppsagt' ? 1 : r.l.andel;
      return `<button type="button" class="ab-bkort" data-g="ab-tl-valj" data-plats="beslut" data-id="${e(r.x.id)}" data-bk-id="${e(r.x.id)}" data-lage="${e(r.l.id)}" aria-expanded="${ui.tlVald === r.x.id && ui.tlPlats === 'beslut'}" style="--i:${i}"
          aria-label="${e(`${r.k.namn}, ${namnPa(r.x)}: ${BESLUT_TEXT[b.typ]} ${datumText(b.d)}, ${dagText(dagar)}. Visa detaljer.`)}">
          <span class="ab-bkort-topp"><span class="ab-bkort-datum">${e(datumKort(b.d))}</span><span class="ab-bkort-typ">${e(BESLUT_ETIKETT[b.typ])}</span></span>
          <span class="ab-bkort-mitt">${ring(andel)}<span class="ab-bkort-tal"><b>${e(kortTid(dagar))}</b><small>${e(BESLUT_KORT[b.typ])}</small></span></span>
          <span class="ab-bkort-namn"><strong>${e(r.k.namn)}</strong><small>${e(PRODUKT_KORT[r.x.produkt] || namnPa(r.x))} · ${e(tlKr(r.l.manad))}/mån</small></span>
        </button>`; }).join('');
    const noter = [
      senare.length ? `${plural(senare.length, 'beslut', 'beslut')} längre fram än ${spann} mån${spann < 24 ? ' – välj en längre period' : ''}` : '',
      tillsvidare.length ? `${plural(tillsvidare.length, 'abonnemang löper', 'abonnemang löper')} tills vidare utan datum: ${tillsvidare.map((r) => r.k.namn).join(', ')}` : '',
    ].filter(Boolean);
    const vald = ui.tlPlats === 'beslut' && ui.tlVald ? rader.find((r) => r.x.id === ui.tlVald) : null;
    return `<section class="kort ab-beslut" aria-labelledby="ab-beslut-rubrik">
        <div class="kort-huvud"><h2 id="ab-beslut-rubrik">${emo('kalender', { ruta: 'm', ton: 'is' })}Nästa beslut</h2>
          <div class="ab-tl-verktyg">${seg('spann', spann, [[3, '3 mån'], [6, '6 mån'], [12, '12 mån'], [24, '24 mån']], 'Hur långt fram')}${produkter.length > 1 ? seg('produkt', ui.tlProdukt, [['alla', 'Alla'], ...produkter.map((q) => [q, PRODUKT_KORT[q] || 'Övrigt'])], 'Produkt') : ''}</div></div>
        <div class="kort-inre"><p class="ab-forklaring">Dagen då något avgörs för varje abonnemang – oftast kundens sista dag att säga upp. Närmast först; ringen visar hur mycket av bindningsperioden som har gått.</p>
          <div class="ab-ft-vy"${ui.tlNytt ? ' data-nytt' : ''}>${inom.length ? `${bana}<div class="ab-bkort-rad">${kort}</div>`
            : `<p class="ab-bk-tomt">${ik('bock')}Inga beslut de närmaste ${spann} månaderna${senare.length ? ` – nästa är ${e(datumText(senare[0].b.d))} (${e(senare[0].r.k.namn)})` : ''}.</p>`}</div>
          ${noter.length ? `<ul class="ab-bk-noter">${noter.map((n) => `<li>${ik('info')}${e(n)}</li>`).join('')}</ul>` : ''}
          ${vald ? detaljHtml(vald, nastaBeslut(vald)) : ''}</div></section>`;
  }

  /* 3a. Intäkt framåt */
  function intaktHtml(rader) {
    const spann = ui.tlSpann; const man = intaktFramat(rader, spann);
    const sakrat = man.reduce((s, o) => s + o.saker, 0); const osakert = man.reduce((s, o) => s + o.fornyas + o.tillsvidare, 0); const forlorat = man.reduce((s, o) => s + o.slutar, 0);
    const topp = Math.max(1, ...man.map((o) => o.saker + o.fornyas + o.tillsvidare + o.slutar));
    const steg = [500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000].find((s) => topp / s <= 4) || 500000; const tak = Math.ceil(topp / steg) * steg;
    const hojd = (v) => `${(v / tak * 100).toFixed(2)}%`;
    return `<section class="kort ab-intakt" aria-labelledby="ab-intakt-rubrik">
        <div class="kort-huvud"><h2 id="ab-intakt-rubrik">${emo('trend', { ruta: 'm', ton: 'mint' })}Intäkt framåt</h2><span class="ab-intakt-spann">${spann} mån</span></div>
        <div class="kort-inre">
          <div class="ab-intakt-tal"><span data-k="saker"><small>Säkrat</small><b>${e(krKort(Math.round(sakrat)))}</b></span><span data-k="fornyas"><small>Hänger på kunderna</small><b>${e(krKort(Math.round(osakert)))}</b></span>${forlorat ? `<span data-k="slutar"><small>Slutar</small><b>−${e(krKort(Math.round(forlorat)))}</b></span>` : ''}</div>
          <div class="ab-ft-vy"${ui.tlNytt ? ' data-nytt' : ''}><div class="ab-ik" style="--n:${spann}" role="img" aria-label="${e(`Intäkt per månad ${spann} månader framåt: ${krKort(Math.round(sakrat))} säkrat, ${krKort(Math.round(osakert))} hänger på förnyelser eller tills vidare.`)}">
            <div class="ab-ik-axel" aria-hidden="true">${Array.from({ length: Math.round(tak / steg) + 1 }, (_, i) => `<span style="bottom:${(i * steg / tak * 100).toFixed(2)}%"><b>${e(tlKr(i * steg))}</b></span>`).join('')}</div>
            <div class="ab-ik-staplar">${man.map((o, i) => { const sum = o.saker + o.fornyas + o.tillsvidare; const sida = i < spann / 3 ? 'v' : i >= spann * 2 / 3 ? 'h' : 'm';
              return `<div class="ab-ik-kol" tabindex="0" style="--i:${i}" data-sida="${sida}" aria-label="${e(`${MAN[Number(o.m.slice(5, 7)) - 1]} ${o.m.slice(0, 4)}: ${kr(Math.round(sum))} per månad`)}">
                <span class="ab-ik-stapel">${o.saker ? `<i data-k="saker" style="height:${hojd(o.saker)}"></i>` : ''}${o.fornyas ? `<i data-k="fornyas" style="height:${hojd(o.fornyas)}"></i>` : ''}${o.tillsvidare ? `<i data-k="tillsvidare" style="height:${hojd(o.tillsvidare)}"></i>` : ''}${o.slutar ? `<i data-k="slutar" style="height:${hojd(o.slutar)}"></i>` : ''}</span>
                <span class="ab-ik-man"${o.m.slice(5, 7) === '01' ? ' data-ar' : ''}>${MAN[Number(o.m.slice(5, 7)) - 1]}${o.m.slice(5, 7) === '01' ? ` ${o.m.slice(2, 4)}` : ''}</span>
                <span class="ab-ik-info" role="presentation"><strong>${MAN[Number(o.m.slice(5, 7)) - 1]} ${o.m.slice(0, 4)} · ${e(kr(Math.round(sum)))}</strong>
                  <span><i data-k="saker"></i>Säkrat<b>${e(kr(Math.round(o.saker)))}</b></span><span><i data-k="fornyas"></i>Förnyas<b>${e(kr(Math.round(o.fornyas)))}</b></span>
                  <span><i data-k="tillsvidare"></i>Tills vidare<b>${e(kr(Math.round(o.tillsvidare)))}</b></span>${o.slutar ? `<span><i data-k="slutar"></i>Har slutat<b>−${e(kr(Math.round(o.slutar)))}</b></span>` : ''}</span>
              </div>`; }).join('')}</div>
          </div></div>
          <div class="ab-ft-fot"><span class="ab-ft-forklaring"><i data-k="saker"></i>Säkrat – inom bindningen<i data-k="fornyas"></i>Förnyas om ingen säger upp<i data-k="tillsvidare"></i>Tills vidare<i data-k="slutar"></i>Slutar</span></div>
        </div></section>`;
  }

  /* 3b. Portföljen: ring per produkt och tre nyckeltal */
  function portfoljHtml(rader) {
    const mrr = rader.reduce((s, r) => s + r.l.manad, 0) || 0;
    const perProdukt = {}; for (const r of rader) perProdukt[r.x.produkt] = (perProdukt[r.x.produkt] || 0) + r.l.manad;
    const delar = Object.entries(perProdukt).sort((a, b) => b[1] - a[1]);
    const R = 54; const O = 2 * Math.PI * R; let start = 0;
    const bagar = delar.map(([p, v], i) => { const a = mrr ? v / mrr : 0; const len = Math.max(0, a * O - (delar.length > 1 ? 4 : 0)); const s = `<circle cx="70" cy="70" r="${R}" class="ab-pf-bage" style="stroke:${PRODUKT_FARG[p] || PRODUKT_FARG.annat};stroke-dasharray:${len.toFixed(1)} ${O.toFixed(1)};stroke-dashoffset:${(-start).toFixed(1)};--i:${i}"/>`; start += a * O; return s; }).join('');
    const bundna = rader.filter((r) => r.l.periodSlut && r.l.id !== 'tillsvidare' && r.l.dagarSlut > 0);
    const snittKvar = bundna.length ? bundna.reduce((s, r) => s + r.l.dagarSlut, 0) / bundna.length / 30.4375 : 0;
    const autoAndel = mrr ? rader.filter((r) => r.x.fornyelse === 'auto' && r.l.id !== 'uppsagt').reduce((s, r) => s + r.l.manad, 0) / mrr : 0;
    const perKund = {}; for (const r of rader) perKund[r.k.id] = { k: r.k, v: ((perKund[r.k.id] || {}).v || 0) + r.l.manad };
    const storst = Object.values(perKund).sort((a, b) => b.v - a.v)[0];
    return `<section class="kort ab-portfolj" aria-labelledby="ab-pf-rubrik">
        <div class="kort-huvud"><h2 id="ab-pf-rubrik">${emo('stapel', { ruta: 'm', ton: 'is' })}Portföljen</h2></div>
        <div class="kort-inre"><div class="ab-pf">
          <div class="ab-pf-ring"><svg viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="${R}" class="ab-pf-spar"/>${bagar}</svg>
            <span class="ab-pf-mitt"><b>${e(krKort(Math.round(mrr)))}</b><small>per månad</small></span></div>
          <ul class="ab-pf-lista">${delar.map(([p, v]) => `<li><i style="background:${PRODUKT_FARG[p] || PRODUKT_FARG.annat}"></i><span>${e(p === 'annat' ? 'Övrigt' : (PRODUKT[p] || PRODUKT.annat).namn)}</span><b>${e(Math.round(mrr ? v / mrr * 100 : 0))} %</b></li>`).join('')}</ul>
        </div>
        <dl class="ab-pf-fakta">
          <div><dt>Snitt kvar av bindningen</dt><dd>${bundna.length ? `${e(snittKvar.toFixed(1).replace('.', ','))} mån` : '–'}</dd></div>
          <div><dt>Förnyas automatiskt</dt><dd>${e(Math.round(autoAndel * 100))} % av värdet</dd></div>
          <div><dt>Största kunden</dt><dd>${storst ? `${e(storst.k.namn)} · ${e(Math.round(mrr ? storst.v / mrr * 100 : 0))} %` : '–'}</dd></div>
        </dl></div></section>`;
  }

  /* 4. Alla abonnemang – inset-listan */
  const FILTER = [['alla', 'Alla'], ['agera', 'Agera nu'], ['snart', 'Snart'], ['bunden', 'Bundna'], ['tillsvidare', 'Tills vidare'], ['uppsagt', 'Uppsagda'], ['avslutat', 'Avslutade']];
  const iFilter = (r, f) => f === 'alla' ? r.l.id !== 'avslutat' : f === 'snart' ? (r.l.id === 'snart' || r.l.id === 'forlangs') : r.l.id === f;
  const sokText = (r) => `${r.k.namn} ${namnPa(r.x)} ${r.x.notering || ''}`.toLowerCase();
  function listaHtml(alla) {
    const visade = alla.filter((r) => iFilter(r, ui.filter)); const antal = (f) => alla.filter((r) => iFilter(r, f)).length; const sok = (ui.sok || '').trim().toLowerCase();
    const rad = (r) => { const { x, l, k } = r; const pr = PRODUKT[x.produkt] || PRODUKT.annat; const vald = ui.tlPlats === 'lista' && ui.tlVald === x.id;
      const bind = l.id === 'tillsvidare' ? 'Löper tills vidare' : l.periodSlut ? `${l.id === 'uppsagt' || l.id === 'avslutat' ? 'Slutar' : 'Bunden till'} ${datumKort(l.periodSlut)}` : '–';
      return `<li class="ab-lst-rad" data-lage="${e(l.id)}" data-sok="${e(sokText(r))}"${sok && !sokText(r).includes(sok) ? ' hidden' : ''}${vald ? ' data-vald' : ''}>
          <button type="button" class="ab-lst-knapp" data-g="ab-tl-valj" data-plats="lista" data-id="${e(x.id)}" aria-expanded="${vald}">
            ${emo(pr.ikon, { ruta: 'm', ton: pr.ton })}
            <span class="ab-lst-namn"><strong>${e(k.namn)}</strong><small>${e(namnPa(x))} · ${e(prisText(x))}</small></span>
            <span class="ab-lst-bind">${l.id === 'tillsvidare' ? '' : matare(l)}<small>${e(bind)}${l.id === 'tillsvidare' ? '' : ` · ${Math.round(l.andel * 100)} %`}</small></span>
            <span class="ab-lst-man"><b>${e(kr(Math.round(l.manad)))}</b><small>per månad</small></span>
            ${chip(l)}<span class="ab-lst-pil" aria-hidden="true">${ik('chevron')}</span>
          </button>${vald ? detaljHtml(r, nastaBeslut(r)) : ''}</li>`; };
    return `<section class="kort ab-alla" aria-labelledby="ab-alla-rubrik">
        <div class="kort-huvud"><h2 id="ab-alla-rubrik">${emo('omtest', { ruta: 'm', ton: 'mint' })}Alla abonnemang</h2>
          <label class="ab-sok">${ik('sok')}<input type="search" data-ab-sok value="${e(ui.sok || '')}" placeholder="Sök kund eller produkt" aria-label="Sök bland abonnemangen" autocomplete="off"></label></div>
        <div class="kort-inre">
          <div class="ab-filter" role="group" aria-label="Visa">${FILTER.filter(([f]) => f === 'alla' || antal(f)).map(([f, n]) => `<button type="button" class="ab-filterknapp" data-g="ab-filter" data-filter="${f}" aria-pressed="${ui.filter === f}">${e(n)}<span>${antal(f)}</span></button>`).join('')}</div>
          ${visade.length ? `<ul class="ab-lst">${visade.map(rad).join('')}<li class="ab-lst-tom" data-ab-sok-tom${sok && visade.some((r) => sokText(r).includes(sok)) || !sok ? ' hidden' : ''}>Inga träffar på ”${e(ui.sok || '')}”.</li></ul>` : '<p class="ab-forklaring">Inga abonnemang i det här läget.</p>'}
        </div></section>`;
  }

  /* Kortet vid hovring/fokus på en pärla (i stället för title). Ett enda element under body, flyttas med transform. */
  let tips = null; let tipsFor = null;
  const tipsBort = () => { if (tips) tips.hidden = true; tipsFor = null; };
  function tipsVisa(el, x0) {
    if (tipsFor !== el) {
      const r = medLage().find((q) => q.x.id === el.dataset.abTips); if (!r) return tipsBort();
      if (!tips) { tips = document.createElement('div'); tips.className = 'ab-tips'; tips.setAttribute('role', 'tooltip'); document.body.appendChild(tips); }
      tips.dataset.lage = r.l.id;
      tips.innerHTML = `<div class="ab-tips-topp"><span><strong>${e(r.k.namn)}</strong><small>${e(namnPa(r.x))}</small></span>${chip(r.l)}</div>
        <dl>${tlFakta(r).map(([a, b]) => `<div><dt>${e(a)}</dt><dd>${e(b)}</dd></div>`).join('')}</dl>`;
      tipsFor = el;
    }
    tips.hidden = false;
    const ruta = el.getBoundingClientRect(); const b = tips.offsetWidth; const h = tips.offsetHeight;
    const x = Math.min(window.innerWidth - b - 12, Math.max(12, (x0 == null ? ruta.left + ruta.width / 2 : x0) - b / 2));
    const y = ruta.top - h - 12 > 8 ? ruta.top - h - 12 : ruta.bottom + 12;
    tips.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }
  if (!window.UPAbTips) { window.UPAbTips = true;
    const traff = (ev) => (ev.target && ev.target.closest ? ev.target.closest('[data-ab-tips]') : null);
    let hl = null; let pb = null;
    const satHl = (id) => {
      if (hl === id) return; hl = id;
      document.querySelectorAll('.ab-beslut [data-hl]').forEach((n) => n.removeAttribute('data-hl'));
      if (!id) return; const vy = document.querySelector('.ab-beslut .ab-ft-vy'); if (!vy) return;
      vy.setAttribute('data-hl', ''); vy.querySelectorAll(`[data-bk-id="${CSS.escape(id)}"]`).forEach((n) => n.setAttribute('data-hl', ''));
    };
    document.addEventListener('pointermove', (ev) => {
      const t = ev.target && ev.target.closest ? ev.target : null;
      const bk = t && t.closest('[data-bk-id]'); satHl(bk ? bk.dataset.bkId : null);
      const p = t && t.closest('[data-ab-planbok]');
      if (p && ev.pointerType === 'mouse') { const q = p.getBoundingClientRect(); p.style.setProperty('--px', (((ev.clientX - q.left) / q.width) * 2 - 1).toFixed(3)); p.style.setProperty('--py', (((ev.clientY - q.top) / q.height) * 2 - 1).toFixed(3)); pb = p; }
      else if (pb) { pb.style.removeProperty('--px'); pb.style.removeProperty('--py'); pb = null; }
      if (ev.pointerType !== 'mouse') return; const el = traff(ev); if (el) tipsVisa(el, ev.clientX); else if (tipsFor) tipsBort();
    }, { passive: true });
    document.addEventListener('focusin', (ev) => { const bk = ev.target.closest && ev.target.closest('[data-bk-id]'); satHl(bk ? bk.dataset.bkId : null); });
    for (const h of ['pointerdown', 'scroll', 'keydown']) document.addEventListener(h, (ev) => { if (tipsFor && !(h === 'keydown' && ev.key === 'Tab')) tipsBort(); }, { capture: true, passive: true });
    window.addEventListener('hashchange', () => { tipsBort(); hl = null; }); window.addEventListener('blur', tipsBort);
    // sök direkt i listan – raderna döljs, inget ritas om (fokus och markör står kvar)
    document.addEventListener('input', (ev) => {
      const f = ev.target; if (!f.matches || !f.matches('[data-ab-sok]')) return;
      ui.sok = f.value; const q = f.value.trim().toLowerCase(); let n = 0;
      document.querySelectorAll('.ab-lst-rad').forEach((li) => { const ja = !q || li.dataset.sok.includes(q); li.hidden = !ja; if (ja) n++; });
      const tom = document.querySelector('[data-ab-sok-tom]'); if (tom) { tom.hidden = n > 0; tom.textContent = `Inga träffar på ”${f.value}”.`; }
    });
  }

  function visa() {
    const alla = sortera(medLage()); const akt = aktiva(alla);
    const produkter = [...new Set(akt.map((r) => r.x.produkt))]; if (ui.tlProdukt !== 'alla' && !produkter.includes(ui.tlProdukt)) ui.tlProdukt = 'alla';
    const urval = akt.filter((r) => ui.tlProdukt === 'alla' || r.x.produkt === ui.tlProdukt);
    if (ui.tlVald && !alla.some((r) => r.x.id === ui.tlVald)) ui.tlVald = null;
    const mrr = akt.reduce((s, r) => s + r.l.manad, 0); const bundet = akt.reduce((s, r) => s + r.l.bundet, 0);
    const agera = alla.filter((r) => r.l.id === 'agera').length;
    const forst = akt.map((r) => ({ r, b: nastaBeslut(r) })).filter((p) => p.b && p.b.d >= idag()).sort((a, b) => a.b.d.localeCompare(b.b.d))[0];
    const tal = `<div class="ab-hj-tal">
        <span><small>Aktiva</small><b>${akt.length}</b><em>${plural(new Set(akt.map((r) => r.k.id)).size, 'kund', 'kunder')}</em></span>
        <span><small>Per månad</small><b>${e(krKort(Math.round(mrr)))}</b><em>${e(krKort(Math.round(mrr * 12)))} per år</em></span>
        <span><small>Bundet kvar</small><b>${e(krKort(Math.round(bundet)))}</b><em>i bindningarna</em></span>
        <span${agera ? ' data-varm' : ''}><small>Nästa beslut</small><b>${forst ? e(datumKort(forst.b.d)) : '–'}</b><em>${forst ? e(forst.r.k.namn) : 'inget med datum'}</em></span>
      </div>`;
    const hjalte = sidhjalte({
      klass: 'sidhjalte-ab', ogon: 'Abonnemang', titel: 'Bindningstid', accent: 'och förnyelser',
      text: 'Varje abonnemang som ett pass – det som avgörs först ligger längst fram. Allt räknas ur startdatum, bindningstid och uppsägningstid.',
      under: alla.length ? tal : '',
      knappar: kan() ? `<button class="knapp knapp-accent" type="button" data-g="ab-ny">${ik('plus')}Nytt abonnemang</button>` : '',
      extra: planbokHtml(akt),
    });
    if (!alla.length) return hjalte + `<section class="kort ab-tomt"><div class="kort-inre">${emo('omtest', { ruta: 'l', ton: 'mint' })}<h2>Inga abonnemang än</h2><p>Lägg in kundens abonnemang med startdatum, bindningstid och uppsägningstid – så räknar sidan ut resten och säger till i god tid.</p>${kan() ? `<button class="knapp knapp-accent" type="button" data-g="ab-ny">${ik('plus')}Nytt abonnemang</button>` : ''}</div></section>`;
    const html = hjalte + `<div class="ab-rum">
      ${akt.length ? beslutHtml(urval, akt) : ''}
      ${akt.length ? `<div class="ab-par">${intaktHtml(urval)}${portfoljHtml(akt)}</div>` : ''}
      ${listaHtml(alla)}</div>`;
    ui.tlNytt = false; ui.tlDetaljNy = false; // entréerna bara vid första visningen och när man själv bytt period/produkt eller valt ett kort
    return html;
  }

  /* ---- kortet på kundsidan ---- */
  function kortHtml(kundId, attr = '') {
    const rader = sortera(medLage(lista().filter((x) => x.kundId === kundId)));
    if (!rader.length && !kan()) return '';
    const inne = rader.length ? `<ul class="ab-kd-lista">${rader.map((r) => `<li data-lage="${e(r.l.id)}"><span class="ab-kd-text"><strong>${e(namnPa(r.x))}</strong><small>${e(r.l.id === 'tillsvidare' ? 'Löper tills vidare' : r.l.periodSlut ? `${r.l.id === 'uppsagt' || r.l.id === 'avslutat' ? 'Sista dag' : 'Bunden till'} ${datumText(r.l.periodSlut)}` : '')} · ${e(kr(Math.round(r.l.manad)))}/mån</small>${matare(r.l)}</span>${chip(r.l)}</li>`).join('')}</ul>`
      : `<button class="ab-kd-tom" type="button" data-g="ab-ny" data-kund="${e(kundId)}">${emo('omtest', { ruta: 's', ton: 'mint' })}<span><strong>Inget abonnemang</strong><small>Lägg till app eller Team Insights med bindningstid</small></span>${ik('plus')}</button>`;
    return `<section class="kort kd-abonnemang" ${attr}><div class="kort-huvud"><h3>${ik('omtest')}Abonnemang</h3><span class="kd-dok-hoger">${rader.length && kan() ? `<button class="knapp knapp-spok knapp-liten" type="button" data-g="ab-ny" data-kund="${e(kundId)}">${ik('plus')}Nytt</button>` : ''}<a class="textlank" href="#/abonnemang">Alla →</a></span></div>${inne}</section>`;
  }

  /* ---- arket: nytt / ändra ---- */
  const val = (lst, vald, text) => lst.map((v) => `<option value="${e(v)}" ${String(v) === String(vald) ? 'selected' : ''}>${e(text(v))}</option>`).join('');
  function arkForm(x, ny) {
    const kunder = [...db().kunder].sort((a, b) => a.namn.localeCompare(b.namn, 'sv'));
    const saljare = (db().anvandare || []).filter((u) => u.roll === 'salj' && u.aktiv !== false);
    oppnaArk(`${arkHuvud(ny ? 'Nytt abonnemang' : 'Ändra abonnemang', 'Startdatum, bindningstid och uppsägningstid ur avtalet – resten räknas ut.', 'omtest')}
      <form class="ark-kropp ab-form" data-form="ab-spara" data-id="${e(ny ? '' : x.id)}" novalidate>
        <label><span class="etikett">Kund <span class="krav">*</span></span><select class="falt" name="kundId">${x.kundId ? '' : '<option value="">Välj kund</option>'}${kunder.map((k) => `<option value="${e(k.id)}" ${k.id === x.kundId ? 'selected' : ''}>${e(k.namn)}</option>`).join('')}</select></label>
        <div class="ab-form-rad">
          <label><span class="etikett">Vad gäller det? <span class="krav">*</span></span><select class="falt" name="produkt" data-ab-produkt><option value="app" ${x.produkt === 'app' ? 'selected' : ''}>UPerformance App · ${e(kr(PRODUKT.app.pris))} per användare och månad</option><option value="insights" ${x.produkt === 'insights' ? 'selected' : ''}>Team Insights · ${e(kr(PRODUKT.insights.pris))} per år</option><option value="annat" ${x.produkt === 'annat' ? 'selected' : ''}>Annat · skriv själv</option></select></label>
          <label data-ab-namn ${x.produkt === 'annat' ? '' : 'hidden'}><span class="etikett">Namn <span class="krav">*</span></span><input class="falt" name="namn" maxlength="80" value="${e(x.namn || '')}" placeholder="T.ex. Förvaltning"></label>
        </div>
        <div class="ab-form-rad ab-form-tre">
          <label><span class="etikett">Antal <span class="krav">*</span></span><input class="falt" name="antal" type="number" min="1" max="100000" step="1" value="${e(x.antal)}"></label>
          <label><span class="etikett">Pris per enhet (kr) <span class="krav">*</span></span><input class="falt" name="pris" type="number" min="0" max="10000000" step="1" value="${e(x.pris)}"></label>
          <label><span class="etikett">Betalas per</span><select class="falt" name="period"><option value="manad" ${x.period !== 'ar' ? 'selected' : ''}>Månad</option><option value="ar" ${x.period === 'ar' ? 'selected' : ''}>År</option></select></label>
        </div>
        <div class="ab-form-rad ab-form-tre">
          <label><span class="etikett">Startdatum <span class="krav">*</span></span><input class="falt" name="start" type="date" value="${e(x.start)}"></label>
          <label><span class="etikett">Bindningstid</span><select class="falt" name="bindning">${val([0, 3, 6, 12, 24, 36], x.bindning, (v) => (v ? `${v} månader` : 'Ingen bindning'))}</select></label>
          <label><span class="etikett">Uppsägningstid</span><select class="falt" name="uppsagning">${val([0, 1, 2, 3, 6], x.uppsagning, (v) => (v ? `${v} ${v === 1 ? 'månad' : 'månader'}` : 'Ingen'))}</select></label>
        </div>
        <div class="ab-form-rad">
          <label><span class="etikett">Efter bindningstiden</span><select class="falt" name="fornyelse" data-ab-fornyelse>${val(['auto', 'lopande', 'slutar'], x.fornyelse, (v) => FORNYELSE[v])}</select></label>
          <label data-ab-forl ${x.fornyelse === 'auto' ? '' : 'hidden'}><span class="etikett">Förnyas med</span><select class="falt" name="forlangning">${val([1, 3, 6, 12, 24], x.forlangning || 12, (v) => `${v} ${v === 1 ? 'månad' : 'månader'} i taget`)}</select></label>
        </div>
        <div class="ab-form-rad">
          <label><span class="etikett">Ansvarig säljare</span><select class="falt" name="ansvarig">${saljare.map((u) => `<option value="${e(u.id)}" ${u.id === x.ansvarig ? 'selected' : ''}>${e(u.namn)}</option>`).join('')}</select></label>
          <label><span class="etikett">Anteckning <em>– valfritt</em></span><input class="falt" name="notering" maxlength="200" value="${e(x.notering || '')}" placeholder="T.ex. villkor ur avtalet"></label>
        </div>
        <div class="ab-summa" data-ab-summa aria-live="polite"></div>
        <p class="ark-fel" data-ab-fel role="alert" hidden></p>
      </form>
      <div class="ark-fot">${ny || !kanRadera() ? '' : `<button class="knapp knapp-spok ab-radera" type="button" data-g="ab-radera" data-id="${e(x.id)}">Ta bort</button>`}<button class="knapp knapp-spok" type="button" data-g="stang-ark">Avbryt</button><button class="knapp knapp-accent" type="button" data-g="skicka-ark">${ik('bock')}${ny ? 'Lägg till' : 'Spara'}</button></div>`, { bred: true });
    const f = $('form[data-form="ab-spara"]'); if (f) { f.addEventListener('input', () => summa(f)); f.addEventListener('change', (ev) => vidByte(f, ev)); summa(f); }
  }
  const lasForm = (f) => { const d = Object.fromEntries(new FormData(f).entries());
    return { kundId: d.kundId || '', produkt: PRODUKT[d.produkt] ? d.produkt : 'annat', namn: String(d.namn || '').trim(), antal: Number(d.antal), pris: Number(d.pris), period: d.period === 'ar' ? 'ar' : 'manad', start: d.start || '',
      bindning: Number(d.bindning) || 0, uppsagning: Number(d.uppsagning) || 0, fornyelse: FORNYELSE[d.fornyelse] ? d.fornyelse : 'lopande', forlangning: Number(d.forlangning) || 12, ansvarig: d.ansvarig || K.jag, notering: String(d.notering || '').trim() }; };
  function vidByte(f, ev) {
    const n = ev.target && ev.target.name;
    if (n === 'produkt') { // förvalt pris och period för produkten
      const p = PRODUKT[ev.target.value] || PRODUKT.annat;
      $('[data-ab-namn]', f).hidden = ev.target.value !== 'annat';
      if (ev.target.value !== 'annat') { f.elements.pris.value = p.pris; f.elements.period.value = p.period; f.elements.period.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    if (n === 'fornyelse') $('[data-ab-forl]', f).hidden = ev.target.value !== 'auto';
    summa(f);
  }
  // sammanfattningen i arket: det sidan kommer att räkna ut
  function summa(f) {
    const ruta = $('[data-ab-summa]', f); if (!ruta) return; const x = lasForm(f);
    if (!giltigt(x.start) || !(x.antal > 0) || !(x.pris >= 0)) { ruta.innerHTML = '<p>Fyll i antal, pris och startdatum så visas bindningen här.</p>'; return; }
    const l = lage({ ...x, status: 'aktivt' });
    const forstaSlut = plusMan(x.start, x.bindning);
    ruta.innerHTML = `<dl><div><dt>Bunden till</dt><dd>${x.bindning ? e(datumText(forstaSlut)) : 'Ingen bindning'}</dd></div>
      <div><dt>Sista uppsägningsdag</dt><dd>${x.bindning ? e(datumText(x.uppsagning ? plusMan(forstaSlut, -x.uppsagning) : forstaSlut)) : '–'}</dd></div>
      <div><dt>Per månad</dt><dd>${e(kr(Math.round(l.manad)))}</dd></div>
      <div><dt>Hela bindningen</dt><dd>${e(kr(Math.round(l.manad * x.bindning)))}</dd></div></dl><p>${e(l.skal)}</p>`;
  }
  const visaFel = (f, t) => { const r = $('[data-ab-fel]', f); if (r) { r.textContent = t; r.hidden = !t; } };

  const G = {
    'ab-tl': (el) => { const d = el.dataset; if (d.spann) ui.tlSpann = [3, 6, 12, 24].includes(Number(d.spann)) ? Number(d.spann) : 12; if (d.produkt) ui.tlProdukt = d.produkt; ui.tlNytt = true; tipsBort(); rendera(); },
    'ab-tl-valj': (el) => { const id = el.dataset.id; const plats = el.dataset.plats === 'lista' ? 'lista' : 'beslut';
      if (ui.tlVald === id && ui.tlPlats === plats) ui.tlVald = null; else { ui.tlVald = id; ui.tlPlats = plats; }
      ui.tlDetaljNy = !!ui.tlVald; tipsBort(); rendera();
      // från Plånboken i hjälten: visa detaljerna där de ritas (under Nästa beslut)
      if (ui.tlVald && el.classList.contains('ab-pass')) setTimeout(() => { const d = document.querySelector('.ab-beslut .ab-tl-detalj'); if (d) d.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); }, 40); },
    'ab-filter': (el) => { ui.filter = el.dataset.filter || 'alla'; rendera(); },
    'ab-ny': (el) => { if (!kan()) return; arkForm({ kundId: el.dataset.kund || '', produkt: 'app', namn: '', antal: 10, pris: PRODUKT.app.pris, period: 'manad', start: idag(), bindning: 12, uppsagning: 3, fornyelse: 'auto', forlangning: 12, ansvarig: K.jag, notering: '' }, true); },
    'ab-andra': (el) => { const x = hamta(el.dataset.id); if (x && kan()) arkForm(x, false); },
    'ab-radera': (el) => { const x = hamta(el.dataset.id); if (!x || !kanRadera()) return; const k = kund(x.kundId) || {};
      bekrafta({ titel: 'Ta bort abonnemanget?', sym: 'varning', fara: true, text: `${namnPa(x)} hos ${k.namn || 'kunden'} tas bort ur bevakningen. Det går inte att ångra.`, knapp: 'Ta bort', g: 'ab-radera-ok', data: { id: x.id } }); },
    'ab-radera-ok': (el) => { const x = hamta(el.dataset.id); if (!x || !kanRadera()) return; const d = db(); d.abonnemang = lista().filter((y) => y.id !== x.id);
      logga(`Abonnemanget ${namnPa(x)} togs bort ur bevakningen.`, { kundId: x.kundId }); K.stangArk(); spara(); rendera(); toast('Abonnemanget är borttaget'); },
    // Uppsägning: sista dagen är bindningens slut – eller idag + uppsägningstiden när bindningen redan har gått ut
    'ab-uppsag': (el) => { const x = hamta(el.dataset.id); if (!x || !kan()) return; const l = lage(x); const k = kund(x.kundId) || {};
      const efterUpps = plusMan(idag(), Number(x.uppsagning) || 0);
      // sista uppsägningsdagen passerad på ett abonnemang som förnyas automatiskt: nästa period är redan bunden – sista dag = slutet på den
      const slutar = l.periodSlut && x.fornyelse === 'auto' && l.dagarSista != null && l.dagarSista < 0 ? plusMan(l.periodSlut, Math.max(1, Number(x.forlangning) || 12))
        : l.periodSlut ? (l.periodSlut > efterUpps ? l.periodSlut : efterUpps) : efterUpps;
      bekrafta({ titel: 'Registrera uppsägning?', sym: 'klocka', text: `${k.namn || 'Kunden'} säger upp ${namnPa(x)}. Sista dag blir ${datumText(slutar)} (bindningstid och uppsägningstid räknade). Du kan ångra uppsägningen.`, knapp: 'Registrera uppsägningen', g: 'ab-uppsag-ok', data: { id: x.id, slutar } }); },
    'ab-uppsag-ok': (el) => { const x = hamta(el.dataset.id); if (!x || !kan() || !giltigt(el.dataset.slutar)) return;
      x.status = 'uppsagt'; x.uppsagd = idag(); x.slutar = el.dataset.slutar;
      logga(`Abonnemanget ${namnPa(x)} är uppsagt – sista dag ${datumText(x.slutar)}.`, { kundId: x.kundId }); K.stangArk(); spara(); rendera(); toast(`Uppsägningen är registrerad – sista dag ${datumText(x.slutar)}`); },
    'ab-angra': (el) => { const x = hamta(el.dataset.id); if (!x || !kan()) return; x.status = 'aktivt'; delete x.uppsagd; delete x.slutar;
      logga(`Uppsägningen av ${namnPa(x)} ångrades – abonnemanget fortsätter.`, { kundId: x.kundId }); spara(); rendera(); toast('Uppsägningen är ångrad'); },
    // Ny bindning: en ny period börjar när den nuvarande går ut (eller idag om den löper tills vidare)
    'ab-forlang': (el) => { const x = hamta(el.dataset.id); if (!x || !kan()) return; const l = lage(x); const k = kund(x.kundId) || {};
      const fran = l.periodSlut && l.dagarSlut > 0 ? l.periodSlut : idag(); const man = Number(x.forlangning) || 12;
      bekrafta({ titel: 'Ny bindningsperiod?', sym: 'omtest', text: `${k.namn || 'Kunden'} binder ${namnPa(x)} i ${man} månader till – från ${datumText(fran)} till ${datumText(plusMan(fran, man))}.`, knapp: `Bind ${man} månader till`, g: 'ab-forlang-ok', data: { id: x.id, fran, man: String(man) } }); },
    'ab-forlang-ok': (el) => { const x = hamta(el.dataset.id); if (!x || !kan() || !giltigt(el.dataset.fran)) return; const man = Number(el.dataset.man) || 12;
      const nySlut = plusMan(el.dataset.fran, man);
      // bindningen räknas från startdatumet: förläng så att den slutar på det nya datumet
      x.bindning = Math.round(manaderMellan(x.start, nySlut)); x.status = 'aktivt'; delete x.uppsagd; delete x.slutar;
      logga(`Ny bindningsperiod för ${namnPa(x)}: ${man} månader, till ${datumText(nySlut)}.`, { kundId: x.kundId }); K.stangArk(); spara(); rendera(); toast(`Bunden till ${datumText(nySlut)}`); },
    'ab-uppgift': (el) => { const x = hamta(el.dataset.id); if (!x || !kan()) return; const l = lage(x); const k = kund(x.kundId) || {};
      const d = db(); if (!Array.isArray(d.todos)) d.todos = [];
      const nyckel = `ab:${x.id}:${l.periodSlut || ''}`;
      if (d.todos.some((t) => !t.klar && t.forslag === nyckel)) { toast('Det finns redan en öppen uppgift om det här', '#/att-gora'); return; }
      // två veckor före sista uppsägningsdagen – men aldrig bakåt i tiden
      const mal = l.sista ? iso(new Date(dat(l.sista).getTime() - 14 * 864e5)) : idag();
      d.todos.push({ id: nyId('t'), text: `Ring ${k.namn || 'kunden'} om ${namnPa(x)} – sista uppsägningsdag ${l.sista ? datumText(l.sista) : 'närmar sig'}`, kundId: x.kundId, ansvarig: x.ansvarig || K.jag, datum: mal < idag() ? idag() : mal, klar: false, forslag: nyckel });
      spara(); rendera(); toast('Uppgiften ligger i Att göra', '#/att-gora'); },
  };
  const FORM = {
    'ab-spara': (f) => {
      if (!kan()) return; const x = lasForm(f); const id = f.dataset.id;
      if (!x.kundId || !kund(x.kundId)) return visaFel(f, 'Välj en kund.');
      if (x.produkt === 'annat' && !x.namn) return visaFel(f, 'Skriv vad abonnemanget heter.');
      if (!Number.isInteger(x.antal) || x.antal < 1 || x.antal > 100000) return visaFel(f, 'Antal ska vara ett heltal, minst 1.');
      if (!(x.pris >= 0) || x.pris > 10000000) return visaFel(f, 'Skriv priset per enhet i kronor.');
      if (!giltigt(x.start)) return visaFel(f, 'Välj ett startdatum.');
      if (x.uppsagning > x.bindning && x.bindning > 0) return visaFel(f, 'Uppsägningstiden kan inte vara längre än bindningstiden.');
      if (x.produkt !== 'annat') x.namn = '';
      const gammal = id ? hamta(id) : null;
      if (gammal) { Object.assign(gammal, x); logga(`Abonnemanget ${namnPa(gammal)} ändrades – bunden till ${datumText(plusMan(x.start, x.bindning))}.`, { kundId: x.kundId }); }
      else { lista().push({ id: nyId('ab'), ...x, status: 'aktivt', skapad: new Date().toISOString() }); logga(`Abonnemanget ${namnPa(x)} lades in – ${x.bindning ? `bundet till ${datumText(plusMan(x.start, x.bindning))}` : 'utan bindningstid'}.`, { kundId: x.kundId }); }
      K.stangArk(); spara(); rendera(); toast(gammal ? 'Abonnemanget är sparat' : 'Abonnemanget är tillagt');
    },
  };
  return { vagar: [[/^#\/abonnemang$/, visa, 'abonnemang', 'Abonnemang']], G, FORM, kortHtml, lage, attAgera, plusMan };
};
