/* ============================================================
   Uperformance CRM – dela innehåll i videomötet (2026-11-02), samma upplägg som Legohus CRM.
   Som "Dela innehåll" i Teams: säljaren visar presentationen, kalkylen, filmen, offerten
   eller kundens bilder. Det delade visas stort och videorutorna i en remsa vid sidan.
   Allt går som ren data över UPV.samtal.signal (händelserna innehall, innehall-forslag och
   innehall-fil) – ingen HTML och ingen skärmbild. Mottagaren escapar varje text och godtar bara
   bild-URL:er under bilder/ och film/. Gästsidan läser aldrig CRM:ets data och har inga priser i
   sin kod: gästen får bara det som visas just nu.
   Presentationens texter är samma som bildHtml i mote.js – ändras de där, ändra här också.
   Laddas efter samtal.js och samtal-ui.js (index.html och mote-gast.html).
   ============================================================ */
(function () {
  'use strict';
  var UPV = window.UPV = window.UPV || {};
  var D = document;
  var GAST = D.documentElement.hasAttribute('data-vm-gast');
  var lugnMq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function e(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max || 300) : typeof v === 'number' && isFinite(v) ? String(v) : ''; }
  function tal(v, min, max) { var n = Number(v); if (!isFinite(n)) n = 0; return Math.max(min, Math.min(max, n)); }
  var URL_RE = /^(bilder|film)\/[A-Za-z0-9_\/.-]+\.(webp|jpe?g|png)$/;
  function sakerUrl(u) { u = str(u, 200); return URL_RE.test(u) && u.indexOf('..') < 0 && u.indexOf('//') < 0 ? u : ''; }
  function kr(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' kr'; }
  function fornamn(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function M() { return UPV.samtal || null; }
  function tillst() { var m = M(); try { return m && m.tillstand ? m.tillstand() : null; } catch (x) { return null; } }
  function C() { return window.UPCRM || null; }
  function toast(rubrik, text, ikon) { if (UPV.toast && !GAST) UPV.toast(rubrik, text, ikon); }

  /* ---------- Ikoner (egen sprite, så att gästsidan har dem) ---------- */
  var IKONER = {
    'vmd-pres': '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M7 8.5h6M7 11.5h4"/>',
    'vmd-kalk': '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/>',
    'vmd-film': '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
    'vmd-offert': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    'vmd-dok': '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
    'vmd-v': '<path d="M15 18l-6-6 6-6"/>',
    'vmd-h': '<path d="M9 18l6-6-6-6"/>',
    'vmd-stopp': '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
    'vmd-styr': '<path d="M5 3l13 6.5-5.5 1.8L10.7 17z"/><path d="M13 13l5 5"/>',
    'vmd-bock': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'vmd-las': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    'vmd-anteckning': '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    'vmd-spela': '<path d="M8 5.5v13l11-6.5z"/>',
    'vmd-paus': '<path d="M9 5.5v13M15 5.5v13"/>'
  };
  function ik(namn, klass) {
    return '<svg class="vm-ik vmd-ik' + (klass ? ' ' + klass : '') + '" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="#' + namn + '"/></svg>';
  }
  function laggSprite() {
    if (D.getElementById('vmd-sprite')) return;
    var s = D.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('id', 'vmd-sprite'); s.setAttribute('class', 'vmd-sprite'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = Object.keys(IKONER).map(function (k) { return '<symbol id="' + k + '" viewBox="0 0 24 24">' + IKONER[k] + '</symbol>'; }).join('');
    (D.body || D.documentElement).appendChild(s);
  }

  var TYPER = {
    presentation: { namn: 'Presentationen', ikon: 'vmd-pres', bestamd: 'presentationen' },
    kalkyl: { namn: 'Kalkylen', ikon: 'vmd-kalk', bestamd: 'kalkylen' },
    film: { namn: 'Filmen', ikon: 'vmd-film', bestamd: 'filmen' },
    offert: { namn: 'Offerten', ikon: 'vmd-offert', bestamd: 'offerten' },
    dokument: { namn: 'Bilder', ikon: 'vmd-dok', bestamd: 'bilderna' }
  };

  /* ---------- Tillstånd ---------- */
  // A = det som visas just nu (eget eller någon annans). H = säljarens eget arbetsläge (bara den som delar).
  var A = null, H = null, avLyss = null, valdAffar = null;
  var filer = {}; // id → {delar:[], antal, url}

  function sig() { var m = M(); return m && m.signal || null; }
  function iMote() { var t = tillst(); return !!(t && t.fas === 'mote'); }
  function jag() { var t = tillst(); return t && t.jag || null; }
  function kanVisa() { var j = jag(); return !GAST && iMote() && !!j && j.roll !== 'gast' && !!C(); }
  function deltagare(peer) { var t = tillst(); return t && (t.deltagare || []).filter(function (d) { return d.peer === peer; })[0] || null; }
  function vm() { return D.getElementById('vm'); }

  /* ---------- Signalen ---------- */
  function koppla() {
    if (avLyss) { try { avLyss(); } catch (x) { /* */ } avLyss = null; }
    var s = sig(); if (!s || typeof s.lyssna !== 'function') return;
    avLyss = s.lyssna(taEmot);
  }
  function skicka(till, typ, data) { var s = sig(); if (s) try { s.skicka(till || '*', typ, data); } catch (x) { /* */ } }
  function sandTillstand(till) {
    if (!A || !A.egen) return;
    skicka(till || '*', 'innehall', { typ: A.typ, v: A.v, data: A.data, styr: A.styr });
  }
  function sandSlut() { skicka('*', 'innehall', { typ: null, v: Date.now() }); }

  function taEmot(m) {
    if (!m || !m.data) return;
    var d = m.data;
    if (m.typ === 'innehall') {
      var dl = deltagare(m.fran);
      if (!dl || dl.roll === 'gast') return; // bara värd och kollegor visar innehåll
      if (d.typ === null || !TYPER[d.typ]) {
        if (A && !A.egen && A.peer === m.fran) { A = null; rensaFiler(); rita(); live(fornamn(dl.namn) + ' slutade visa.'); }
        return;
      }
      if (A && A.egen) { stoppaEgen(false); live(fornamn(dl.namn) + ' tog över visningen.'); }
      var ny = !A || A.peer !== m.fran || A.typ !== d.typ;
      if (!ny && tal(d.v, 0, 9e15) < A.v) return;
      A = { typ: d.typ, egen: false, peer: m.fran, namn: dl.namn, v: tal(d.v, 0, 9e15), data: d.data && typeof d.data === 'object' ? d.data : {}, styr: d.styr && typeof d.styr === 'object' ? d.styr : {} };
      if (ny) live(fornamn(dl.namn) + ' visar ' + TYPER[d.typ].bestamd + '.');
      rita();
    } else if (m.typ === 'innehall-forslag') {
      if (!A || !A.egen || !H) return;
      var fran = deltagare(m.fran); if (!fran) return;
      forslag(d, fran);
    } else if (m.typ === 'innehall-fil') {
      if (!A || A.egen || A.peer !== m.fran) return;
      taEmotFil(d);
    }
  }

  // Den som går med sent får det som visas
  var kanda = {};
  function nyaDeltagare(lista) {
    var nu = {};
    (lista || []).forEach(function (d) { nu[d.peer] = 1; if (!kanda[d.peer] && A && A.egen) { if (A.typ === 'film') bygg(); else sandTillstand(d.peer); if (A.typ === 'dokument') sandFil(d.peer); } });
    kanda = nu;
  }

  /* ---------- Säljarens källor ---------- */
  function motetsVideomote() {
    var t = tillst(), id = t && t.mote && t.mote.id;
    return id && UPV.videomote && UPV.videomote.hamta ? UPV.videomote.hamta(id) : null;
  }
  function affarerFor(kundId) {
    var c = C(); if (!c || !kundId) return [];
    var oppen = function (a) { return a.steg !== 'forlorad' && a.steg !== 'signerad'; };
    return c.db.affarer.filter(function (a) { return a.kundId === kundId; })
      .sort(function (a, b) { var ao = oppen(a), bo = oppen(b); if (ao !== bo) return ao ? -1 : 1; return String(b.stegAndrad || b.skapad || '') < String(a.stegAndrad || a.skapad || '') ? -1 : 1; });
  }
  function kalla() {
    var c = C(); if (!c) return { affar: null, kund: null, affarer: [] };
    var v = motetsVideomote();
    var affar = valdAffar && c.affar(valdAffar) || (v && v.affarId && c.affar(v.affarId)) || null;
    var kundId = affar ? affar.kundId : v && v.kundId || null;
    var lista = affarerFor(kundId);
    if (!affar && lista.length) affar = lista[0];
    return { affar: affar, kund: kundId ? c.kund(kundId) : null, affarer: lista };
  }
  function bilderValda() { return (window.UPMote && UPMote.BILDER || []).map(function (b) { return b.id; }); }
  function bildDokument(kund) {
    var c = C(); if (!kund || !c || !Array.isArray(c.db.dokument)) return [];
    var bild = function (d) { return /^image\/(png|jpeg|webp|gif)$/.test(String(d.typ || '')) || /\.(png|jpe?g|webp|gif)$/i.test(String(d.namn || '')); };
    return c.db.dokument.filter(function (d) { return d.kundId === kund.id && bild(d); }).slice(-24).reverse();
  }
  function offertFor(affarId) {
    var c = C(); if (!c || !affarId) return null;
    return Object.keys(c.db.offerter || {}).map(function (t) { return c.db.offerter[t]; })
      .filter(function (d) { return d.affarId === affarId && (d.typ || 'offert') === 'offert' && d.status !== 'ersatt' && !d.makulerad; })
      .sort(function (a, b) { return String(a.skapad) < String(b.skapad) ? 1 : -1; })[0] || null;
  }
  function startKalkyl(a, kund) {
    var o = a && a.offert, n = o ? parseInt(o.antal, 10) || (o.deltagare ? o.deltagare.length : 0) : 0;
    return { paket: o && PRISER.paket[o.paket] ? o.paket : 'basplus', antal: Math.max(1, Math.min(5000, n || (kund && parseInt(kund.anstallda, 10)) || 25)), tillval: o && o.tillval ? o.tillval.slice() : [], app: o ? !!o.app : true, insights: !!(o && o.insights), uppfoljning: !!(o && o.uppfoljning) };
  }
  function lasFor(a) {
    var c = C();
    if (!a) return 'Mötet har ingen affär – kalkylen går att visa men inte spara.';
    if (!c.kanRaknaLive(a)) return 'Den här affären räknas i offertkortet – kalkylen här sparas inte.';
    return '';
  }

  /* ---------- Starta och stoppa en egen visning ---------- */
  function visa(typ, opt) {
    opt = opt || {};
    if (!TYPER[typ]) return;
    if (!kanVisa()) { toast('Inget videomöte pågår', 'Visa innehåll när du är med i ett videomöte.', 'varning'); return; }
    var t = tillst(), j = t.jag;
    // Skärmdelningen och innehållet tar samma plats – bara en sak visas åt gången
    if (j.delar) { var m = M(); try { m.slutaDela(); } catch (x) { /* */ } }
    var annan = (t.deltagare || []).filter(function (d) { return d.delar; })[0];
    if (annan) { live(fornamn(annan.namn) + ' delar sin skärm – vänta tills den är klar.'); toast(fornamn(annan.namn) + ' delar sin skärm', 'Du kan visa innehåll när delningen är slut.', 'varning'); return; }
    if (opt.affar) valdAffar = opt.affar;
    var k = kalla();
    if (typ === 'offert' && !k.affar) { toast('Ingen affär', 'Mötet har ingen affär med en offert.', 'varning'); return; }
    var forra = H, affarId = k.affar ? k.affar.id : null, sammaAffar = !!(forra && forra.affar === affarId);
    // Kalkylen och anteckningarna följer med när man byter mellan presentationen och kalkylen
    H = { typ: typ, affar: affarId, kund: k.kund ? k.kund.id : null, bilder: opt.bilder && opt.bilder.length ? opt.bilder : bilderValda(), nu: 0, anteckning: forra ? forra.anteckning : '',
      kalkyl: sammaAffar && forra.kalkyl ? forra.kalkyl : startKalkyl(k.affar, k.kund), sparad: sammaAffar ? forra.sparad : false, offertNr: sammaAffar ? forra.offertNr : '',
      film: { spelar: opt.spela !== false, tid: tal(opt.tid, 0, 600), kvar: tal(opt.tid, 0, 600), vid: Date.now() }, dok: null, kundKan: false };
    if (typ === 'presentation' && opt.start) H.nu = Math.max(0, H.bilder.indexOf(opt.start));
    if (typ === 'dokument') { var l = bildDokument(k.kund); H.dok = l[0] ? l[0].id : null; }
    A = { typ: typ, egen: true, peer: j.peer, namn: j.namn, v: Date.now(), data: {}, styr: {} };
    bygg();
    rita();
    if (typ === 'dokument') sandFil('*');
    if (typ === 'film') filmPuls();
    live('Du visar ' + TYPER[typ].bestamd + '.');
    // Minimerat möte (t.ex. från Kundmöte-sidan): öppna mötet så att man ser vad kunden ser
    var ui = UPV.samtalUi && UPV.samtalUi.tillstand && UPV.samtalUi.tillstand();
    if (ui && ui.mini && UPV.samtalUi.minimera) try { UPV.samtalUi.minimera(false); } catch (x) { /* */ }
  }
  function stoppaEgen(meddela) {
    if (!A || !A.egen) return;
    A = null;
    if (meddela !== false) sandSlut();
    rita();
  }
  function stoppa() { if (A && A.egen) { stoppaEgen(true); live('Du slutade visa.'); } }

  // Bygger datan som skickas av säljarens arbetsläge och skickar den
  function bygg() {
    if (!A || !A.egen || !H) return;
    var d = {};
    A.styr = { kund: !!H.kundKan };
    if (A.typ === 'presentation') {
      var id = H.bilder[H.nu];
      d = { nu: H.nu, antal: H.bilder.length, bild: bildData(id) || { id: id, namn: id } };
      if (id === 'kalkyl' || id === 'nasta') d.kalkyl = kalkylData();
    } else if (A.typ === 'kalkyl') {
      d = kalkylData();
    } else if (A.typ === 'film') {
      d = filmData();
    } else if (A.typ === 'offert') {
      d = offertData();
    } else if (A.typ === 'dokument') {
      var l = bildDokument(C().kund(H.kund));
      d = { lista: l.map(function (x) { return { id: x.id, namn: str(x.namn, 120) }; }), vald: H.dok };
    }
    A.data = d;
    A.v = Math.max(A.v + 1, Date.now());
    sandTillstand('*');
  }
  function kalkylData() {
    var c = C(), a = H.affar ? c.affar(H.affar) : null, k = H.kalkyl;
    var pr = prisaOffert(k), rader = offertRader(k), del = fakturaDelar(pr.total), ingar = prisaDeltagare(k.paket, k.tillval).ingar;
    return {
      paket: k.paket, antal: k.antal, namn: PRISER.paket[k.paket].namn,
      paketLista: ['bas', 'basplus', 'basplusplus'].map(function (id) { return { id: id, namn: PRISER.paket[id].namn, pris: PRISER.paket[id].pris }; }),
      tillvalLista: Object.keys(PRISER.tillval).map(function (id) { var tv = PRISER.tillval[id], inne = ingar.has(id); return { id: id, namn: tv.namn, pris: tv.pris, ingar: inne, vald: k.tillval.indexOf(id) >= 0 && !inne }; }),
      program: [
        { id: 'app', namn: 'UPerformance App', pris: kr(PRISER.appManad) + '/mån', pa: !!k.app },
        { id: 'uppfoljning', namn: 'Uppföljning & coaching', pris: kr(PRISER.uppfoljning) + '/pers', pa: !!k.uppfoljning },
        { id: 'insights', namn: 'Team Insights', pris: kr(PRISER.insightsAr) + '/år', pa: !!k.insights }
      ],
      rader: rader.map(function (r) { return { text: str(r.text, 160), antal: r.antal, summa: r.summa }; }),
      summa: pr.total, perPerson: k.antal ? pr.total / k.antal : 0, forskott: del.forskott, slut: del.slut, offert: !!pr.offert,
      las: lasFor(a), sparad: !!H.sparad, offertNr: H.offertNr || '', affar: a ? a.titel : ''
    };
  }
  function offertData() {
    var c = C(), o = offertFor(H.affar), a = H.affar ? c.affar(H.affar) : null;
    if (!o) return { tom: true, affar: a ? a.titel : '' };
    var pr = prisaOffert(o.offert), del = fakturaDelar(pr.total);
    return { nummer: o.nummer, status: o.status, skapad: o.skapad, giltigTill: o.giltigTill, kund: o.kund ? o.kund.namn : '', affar: o.titel,
      rader: offertRader(o.offert).slice(0, 40).map(function (r) { return { text: str(r.text, 160), antal: r.antal, apris: r.apris, summa: r.summa }; }),
      summa: pr.total, forskott: del.forskott, slut: del.slut, offertpris: !!pr.offert };
  }
  function filmData() {
    var f = H.film, film = window.UPFilm;
    return { spelar: !!f.spelar, tid: +filmTid().toFixed(2), stampel: Date.now(), langd: film ? film.LANGD : 62.6,
      kapitel: film ? film.KAPITEL.map(function (k) { return { namn: k.namn, t: k.t }; }) : [] };
  }

  /* Presentationen som data – samma texter som bildHtml i mote.js */
  function bildData(id) {
    var c = C(), kund = H.kund ? c.kund(H.kund) : null, kn = kund ? kund.namn : '';
    var b = (window.UPMote && UPMote.BILDER || []).filter(function (x) { return x.id === id; })[0], namn = b ? b.namn : id;
    var k = H.kalkyl, pr = prisaOffert(k);
    switch (id) {
      case 'titel': return { id: id, namn: namn, etikett: 'Uperformance', titel: ['Hälsa med', 'elitstandard.'], bild: 'bilder/film-poster.jpg', for: kn,
        text: 'Elitidrottens testmetodik – för hela arbetsplatsen. Vi visar var riskerna finns innan de blir skador, sjukskrivningar och produktionsbortfall.' };
      case 'film': return { id: id, namn: namn, etikett: 'Filmen', titel: ['Hälsa med elitstandard –', 'på en minut.'], text: 'Från elitidrottens testmetodik till hela arbetsplatsen.', bild: 'film/uperformance-film.jpg',
        kapitel: window.UPFilm ? UPFilm.KAPITEL.map(function (x) { return x.namn; }) : [] };
      case 'citat': return { id: id, namn: namn, etikett: 'Vår mission', bild: 'bilder/gustav-skog-gra.jpg', citat: 'Vi hjälper företag att minska sjukfrånvaro och öka produktiviteten genom förebyggande hälsoarbete.', vem: 'Gustav Svensson', roll: 'Vd, Uperformance · f.d. landslagsspelare och lagkapten i IFK Göteborg' };
      case 'varfor': return { id: id, namn: namn, etikett: 'Varför kartlägga hälsan?', titel: 'Sjukfrånvaro kostar mer än de flesta räknar med.', tal: [
        ['4,2 Mkr', 'Total kostnad för sjukfrånvaro under ett år för ett företag med 30 anställda, 40 000 kr i månadslön och 5 sjukdagar per person.', 'Källa: if.se'],
        ['25 %', 'uppger besvär kopplade till arbetet – trötthet, smärta, rygg och nacke, oro och utmattning.', 'Källa: Arbetsmiljöverket'],
        ['×3', 'Stressade medarbetare är tre gånger mer benägna att byta jobb.', 'Källa: Harvard Business Review']] };
      case 'metod': return { id: id, namn: namn, etikett: 'Metoden', titel: 'Hälsokartläggning som medarbetarna uppskattar.', steg: [
        ['Personlig hälsoanalys', 'Varje medarbetares värden analyseras av vårt team, som bedömer hälsoläget och identifierar risker.'],
        ['Personlig återkoppling', 'En personlig digital journal med resultat, trender och praktiska hälsoråd.'],
        ['Insikter för företaget', 'Sammanställd hälsodata, trender och rekommenderade åtgärder på organisationsnivå.']] };
      case 'paket': return { id: id, namn: namn, etikett: 'Paketen', titel: 'Tre nivåer – alla bygger på Bas.', paket: ['bas', 'basplus', 'basplusplus'].map(function (p, i) {
        return { niva: ['Grundpaket', 'Utökat', 'Komplett'][i], namn: PRISER.paket[p].namn, pris: PRISER.paket[p].pris, lista: PAKET_INNEHALL[p].lista.slice(0, 8) }; }) };
      case 'kalkyl': return { id: id, namn: namn, etikett: 'Räkna på ert upplägg', titel: 'Så här skulle det se ut för ' + (kn || 'er') + '.' };
      case 'resa': return { id: id, namn: namn, etikett: 'Så går det till', titel: 'Från första möte till uppföljning.', steg: [
        ['Offert', 'Ni får offerten och godkänner digitalt.'], ['Underlag', 'Deltagarlista via säker länk, PUB-avtal och samtycke.'], ['Order', 'Ordern signeras, 25 % i förskott.'],
        ['Testdag', 'Vårt testteam kommer till er och onboardar alla i appen.'], ['Resultat', 'Riskprofil till varje medarbetare, rapport till er.'], ['Uppföljning', 'Uppföljningsmöte efter ungefär två månader.']] };
      case 'plattform': return { id: id, namn: namn, etikett: 'UPerformance App & plattform', titel: ['All data.', 'Ett ställe.'], bild: 'bilder/app.png', punkter: ['Personlig digital journal med resultat och trender', 'Anpassat träningsprogram och påminnelser mellan testerna', 'Följ utvecklingen över tid', 'Sammanställd rapport på organisationsnivå'] };
      case 'team': return { id: id, namn: namn, etikett: 'Sprungna ur idrotten', titel: 'Ett team i världsklass.', personer: [
        { namn: 'Gustav Svensson', roll: 'Vd', text: 'Landslagsspelare 2009–2021, f.d. lagkapten i IFK Göteborg.', bild: 'bilder/gustav.jpg', x: 74 },
        { namn: 'Dale Reese', roll: 'Testansvarig', text: '25+ år inom internationell elitsport, tidigare i Svenska Fotbollförbundet.', bild: 'bilder/dale.jpg', x: 64 },
        { namn: 'Roger Mellin', roll: 'Medgrundare', text: '20+ år inom svensk läkemedels- och medtechindustri.', bild: 'bilder/roger.jpg', x: 66 }] };
      case 'fortroende': return { id: id, namn: namn, etikett: 'Förtroende', titel: 'Används av organisationer med högt ställda krav.', loggor: [['bp', 'Brommapojkarna'], ['dif', 'Djurgården Hockey'], ['hammarby', 'Hammarby'], ['varnamo', 'IFK Värnamo']].map(function (x) { return { bild: 'bilder/loggor/' + x[0] + '.png', namn: x[1] }; }) };
      case 'nasta': {
        var extra = k.tillval.filter(function (t) { return !pr.ingar.has(t) && !(pr.offert && PRISER.tillval[t].pris == null); }).map(function (t) { return PRISER.tillval[t].namn.toLowerCase(); });
        return { id: id, namn: namn, etikett: 'Nästa steg', titel: 'Redo att sätta igång?',
          text: PRISER.paket[k.paket].namn + ' för ' + k.antal + ' medarbetare' + (extra.length ? ' med ' + extra.join(', ') : '') + (pr.offert ? ' (hjärt-/kärlpaket enligt offert)' : '') + ' – ' + kr(pr.total) + ' exkl. moms första året.',
          steg: [['Idag', 'Ni får offerten i en säker länk.'], ['Inom en vecka', 'Deltagarlista och samtycke via länk.'], ['Testdag', 'Vi bokar en dag som passar er verksamhet.']] };
      }
      default: return null;
    }
  }

  /* ---------- Ändringar (säljaren direkt, kunden som förslag) ---------- */
  function andra(a) {
    if (!A) return;
    if (A.egen) { tillampa(a); return; }
    if (!A.styr || !A.styr.kund) return;
    skicka(A.peer, 'innehall-forslag', { typ: A.typ, andring: a });
  }
  function forslag(d, fran) {
    if (!d || d.typ !== A.typ || !H.kundKan) return;
    var a = d.andring && typeof d.andring === 'object' ? d.andring : {};
    // Kunden får bara ändra det som styrs: bild och kalkylens val
    var ok = {};
    if (A.typ === 'presentation' && a.nu != null) ok.nu = a.nu;
    if (A.typ === 'kalkyl') ['paket', 'tillval', 'program', 'antal'].forEach(function (k) { if (a[k] != null) ok[k] = a[k]; });
    if (Object.keys(ok).length) { tillampa(ok); if (A.typ === 'kalkyl' && !ok.antal) live(fornamn(fran.namn) + ' ändrade kalkylen.'); }
  }
  function tillampa(a) {
    if (!H) return;
    var k = H.kalkyl, andrad = false;
    if (a.nu != null) H.nu = Math.max(0, Math.min(H.bilder.length - 1, Math.round(tal(a.nu, 0, 99))));
    if (a.paket && PRISER.paket[a.paket]) { k.paket = a.paket; andrad = true; }
    if (a.tillval) {
      var tv = str(a.tillval, 30);
      if (PRISER.tillval[tv] && !prisaDeltagare(k.paket, k.tillval).ingar.has(tv)) { var i = k.tillval.indexOf(tv); if (i >= 0) k.tillval.splice(i, 1); else k.tillval.push(tv); andrad = true; }
    }
    if (a.program && ['app', 'uppfoljning', 'insights'].indexOf(a.program) >= 0) { k[a.program] = !k[a.program]; andrad = true; }
    if (a.antal != null) { k.antal = Math.round(tal(a.antal, 1, 5000)); andrad = true; }
    if (andrad) H.sparad = false;
    if (a.dok) { var finns = bildDokument(C().kund(H.kund)).some(function (x) { return x.id === a.dok; }); if (finns) { H.dok = a.dok; bygg(); rita(); sandFil('*'); return; } }
    if (a.kundKan != null) H.kundKan = !!a.kundKan;
    bygg();
    rita();
  }
  // Spara på affären och skapa offerten: samma väg som presentationen (mote.js), men utan att logga ett möte – det gör videomötet självt
  function sparaKalkyl() {
    var c = C(), a = H && H.affar ? c.affar(H.affar) : null;
    if (!a || lasFor(a)) return false;
    var k = H.kalkyl;
    a.offert = { paket: k.paket, antal: k.antal, tillval: k.tillval.slice(), app: !!k.app, insights: !!k.insights, uppfoljning: !!k.uppfoljning };
    c.logga('Upplägget räknades fram i videomötet: ' + PRISER.paket[k.paket].namn + ' för ' + k.antal + ' medarbetare, ' + c.kr(c.affarVarde(a)) + '.', { kundId: a.kundId, affarId: a.id });
    H.sparad = true; H.offertNr = '';
    c.spara();
    toast('Kalkylen är sparad på ' + a.titel);
    bygg(); rita();
    return true;
  }
  function skapaOffert() {
    var c = C(), a = H && H.affar ? c.affar(H.affar) : null;
    if (!a || lasFor(a)) return;
    if (!H.sparad && !sparaKalkyl()) return;
    var token = c.skapaDokument(a.id, 'offert');
    H.offertNr = c.db.offerter[token].nummer;
    c.spara();
    toast('Offerten är skapad – ' + H.offertNr, 'Visa den i mötet med Visa offerten.');
    bygg(); rita();
  }

  /* ---------- Filmen: samma fil hos alla, tiden följer den som visar ---------- */
  var FILM = { stor: 'film/uperformance-film.mp4', liten: 'film/uperformance-film-720.mp4', poster: 'film/uperformance-film.jpg' };
  var filmBlob = null, filmTimer = null;
  function filmVideo() { var v = vm(); return v && v.querySelector('.vmd-film video'); }
  // Dold flik: webbläsaren kan pausa filmen. Tiden räknas då vidare på klockan, annars hoppar de andra tillbaka
  function filmTid() {
    var v = filmVideo(), f = H.film;
    if (v && !D.hidden && v.readyState >= 1) { f.kvar = v.currentTime; f.vid = Date.now(); return v.currentTime; }
    return Math.min((f.kvar || 0) + (f.spelar ? (Date.now() - (f.vid || Date.now())) / 1000 : 0), window.UPFilm ? UPFilm.LANGD : 62.6);
  }
  function filmKalla() { var spar = navigator.connection && navigator.connection.saveData; return spar || (matchMedia('(max-width: 700px) and (pointer: coarse)').matches) ? FILM.liten : FILM.stor; }
  function tidText(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function laddaFilm(v) {
    if (filmBlob) { v.src = filmBlob; return; }
    var url = filmKalla();
    v.src = url;
    // Utan Range (python på 3120) går det inte att söka i filmen: då hämtas hela filmen en gång
    try {
      fetch(url, { headers: { Range: 'bytes=0-1' } }).then(function (r) { return r.status === 206 ? null : r.blob(); }).then(function (b) {
        if (!b) return;
        filmBlob = URL.createObjectURL(b);
        var nu = filmVideo(); if (!nu) return;
        var t = nu.currentTime, spelar = !nu.paused;
        nu.src = filmBlob;
        nu.addEventListener('loadedmetadata', function () { try { nu.currentTime = t; } catch (x) { /* */ } if (spelar) spela(nu); }, { once: true });
      }).catch(function () { /* filmen spelar ändå */ });
    } catch (x) { /* */ }
  }
  function spela(v) { var p = v.play(); if (p && p.catch) p.catch(function () { /* webbläsaren väntar på ett klick */ }); }
  function filmPuls() {
    if (filmTimer) return;
    filmTimer = setInterval(function () {
      if (!A || !A.egen || A.typ !== 'film' || !H) { clearInterval(filmTimer); filmTimer = null; return; }
      if (!H.film.spelar) return;
      if (D.hidden && window.UPFilm && filmTid() >= UPFilm.LANGD) { H.film.spelar = false; H.film.kvar = 0; }
      bygg();
    }, 4000);
  }
  function kapitelVid(k, t) { var n = 0; k.forEach(function (x, i) { if (t >= tal(x && x.t, 0, 9999) - 0.4) n = i; }); return n; }
  function filmHtml(d) {
    var k = Array.isArray(d.kapitel) ? d.kapitel.slice(0, 12) : [], egen = A.egen;
    return '<div class="vmd-film' + (egen ? '' : ' vmd-film--gast') + '"><div class="vmd-film__yta"><video playsinline muted preload="auto" poster="' + e(FILM.poster) + '" disablepictureinpicture></video></div>' +
      '<div class="vmd-film__rad">' + (egen ? '<button type="button" class="vmd-knapp vmd-knapp--ikon" data-vmd="film-spela" aria-label="Spela eller pausa filmen"></button>' +
        '<input type="range" class="vmd-reglage" min="0" max="' + Math.ceil(tal(d.langd, 1, 600)) + '" step="0.1" value="0" aria-label="Tid i filmen" data-vmd-filmtid>' : '<span class="vmd-film__spar" aria-hidden="true"><i></i></span>') +
        '<span class="vmd-film__tid" data-vmd-film-tid>0:00</span></div>' +
      (egen ? '<ol class="vmd-film__kapitel" aria-label="Kapitel">' + k.map(function (x, i) {
        return '<li><button type="button" data-vmd-kap="' + i + '"><small>' + String(i + 1).padStart(2, '0') + '</small><span>' + e(str(x && x.namn, 60)) + '</span></button></li>';
      }).join('') + '</ol>' : '<p class="vmd-film__nu" data-vmd-film-nu></p>') + '</div>';
  }
  // Knappar, mätare och kapitel hålls i takt med bilden utan att videon ritas om
  function filmLage() {
    var v = filmVideo(); if (!v || !A) return;
    var d = A.data || {}, rot = v.closest('.vmd-film'), k = Array.isArray(d.kapitel) ? d.kapitel : [], langd = tal(d.langd, 1, 600), t = v.currentTime || 0;
    var ti = rot.querySelector('[data-vmd-film-tid]'); if (ti) ti.textContent = tidText(t) + ' / ' + tidText(langd);
    var r = rot.querySelector('[data-vmd-filmtid]'); if (r && !filmDrar) r.value = t;
    var s = rot.querySelector('.vmd-film__spar i'); if (s) s.style.transform = 'scaleX(' + Math.min(1, t / langd).toFixed(3) + ')';
    var n = kapitelVid(k, t);
    rot.querySelectorAll('[data-vmd-kap]').forEach(function (b, i) { b.toggleAttribute('data-nu', i === n); });
    var nu = rot.querySelector('[data-vmd-film-nu]'); if (nu && k[n]) nu.textContent = str(k[n].namn, 60);
    var kn = rot.querySelector('[data-vmd="film-spela"]');
    if (kn) { var sp = A.egen && H ? H.film.spelar : !v.paused; var ny = sp ? 'vmd-paus' : 'vmd-spela'; if (kn.getAttribute('data-ik') !== ny) { kn.setAttribute('data-ik', ny); kn.innerHTML = ik(ny); kn.setAttribute('aria-label', sp ? 'Pausa filmen' : 'Spela filmen'); } }
  }
  var filmDrar = false;
  function kopplaFilm(v) {
    v.addEventListener('timeupdate', filmLage);
    v.addEventListener('loadedmetadata', filmLage);
    if (!A || !A.egen) return;
    v.addEventListener('ended', function () { if (A && A.egen && A.typ === 'film' && H) { H.film.spelar = false; H.film.tid = 0; bygg(); filmLage(); } });
  }
  function synkaFilm(v) {
    var d = A.data || {};
    if (A.egen && H) {
      if (H.film.tid && Math.abs(v.currentTime - H.film.tid) > 0.3) { try { v.currentTime = H.film.tid; } catch (x) { /* */ } }
      H.film.tid = 0;
      if (H.film.spelar && v.paused) spela(v); else if (!H.film.spelar && !v.paused) v.pause();
    } else {
      // Tiden räknas fram från stämpeln, men klockor kan gå olika på två datorer – därför högst två sekunder framåt
      var mal = tal(d.tid, 0, 600) + (d.spelar ? tal((Date.now() - tal(d.stampel, 0, 9e15)) / 1000, 0, 2) : 0);
      if (Math.abs((v.currentTime || 0) - mal) > 0.8) { try { v.currentTime = mal; } catch (x) { /* */ } }
      if (d.spelar && v.paused) spela(v); else if (!d.spelar && !v.paused) v.pause();
    }
    filmLage();
  }
  function filmSok(t) {
    if (!A || !A.egen || !H) return;
    H.film.tid = 0; H.film.kvar = t; H.film.vid = Date.now();
    var v = filmVideo(); if (v) { try { v.currentTime = t; } catch (x) { /* */ } }
    bygg(); filmLage();
  }

  // Tillbaka i fliken: filmen hoppar till där den är nu, hos den som visar och hos de andra
  D.addEventListener('visibilitychange', function () {
    if (D.hidden || !A || A.typ !== 'film') return;
    var v = filmVideo(); if (!v) return;
    if (A.egen && H) { H.film.tid = filmTid(); synkaFilm(v); bygg(); } else synkaFilm(v);
  });

  /* ---------- Bilder (dokument) skickas i bitar ---------- */
  var BIT = 1800;
  function sandFil(till) {
    if (!A || !A.egen || A.typ !== 'dokument' || !H || !H.dok) return;
    var id = H.dok;
    hamtaBild(id).then(function (url) {
      if (!A || !A.egen || A.typ !== 'dokument' || H.dok !== id) return;
      if (!url) {
        // I demon finns uppladdade filer bara kvar under sessionen – säg det i stället för att snurra
        filer[id] = { fel: true }; rita();
        skicka(till, 'innehall-fil', { id: id, fel: true });
        return;
      }
      filer[id] = { url: url, klar: true };
      rita();
      var b64 = url.slice(url.indexOf(',') + 1), antal = Math.ceil(b64.length / BIT), del = 0;
      (function skickaNasta() {
        if (!A || !A.egen || H.dok !== id) return;
        for (var n = 0; n < 40 && del < antal; n++, del++) skicka(till, 'innehall-fil', { id: id, del: del, antal: antal, typ: 'image/jpeg', bit: b64.slice(del * BIT, (del + 1) * BIT) });
        if (del < antal) setTimeout(skickaNasta, 16);
      })();
    });
  }
  // Bilden skalas om till högst 1600 px och kodas som JPEG – mindre att skicka och inga dolda metadata följer med
  function hamtaBild(id) {
    if (filer[id] && filer[id].url) return Promise.resolve(filer[id].url);
    return new Promise(function (ok) {
      var c = C(), u = c && c.filUrl ? c.filUrl(id) : null;
      if (!u) { ok(null); return; }
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), can = D.createElement('canvas');
        can.width = Math.max(1, Math.round(img.naturalWidth * s)); can.height = Math.max(1, Math.round(img.naturalHeight * s));
        var x = can.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, can.width, can.height); x.drawImage(img, 0, 0, can.width, can.height);
        try { ok(can.toDataURL('image/jpeg', 0.86)); } catch (err) { ok(null); }
      };
      img.onerror = function () { ok(null); };
      img.src = u;
    });
  }
  function taEmotFil(d) {
    var id = str(d.id, 40), del = Math.round(tal(d.del, 0, 20000)), antal = Math.round(tal(d.antal, 1, 20000));
    if (id && d.fel === true) { filer[id] = { fel: true }; rita(); return; }
    if (!id || typeof d.bit !== 'string' || !/^[A-Za-z0-9+/=]*$/.test(d.bit)) return;
    var f = filer[id];
    if (!f || f.antal !== antal) f = filer[id] = { delar: [], antal: antal, fatt: 0, url: '' };
    if (f.url) return;
    if (f.delar[del] == null) { f.delar[del] = d.bit; f.fatt++; }
    if (f.fatt >= antal) { f.url = 'data:image/jpeg;base64,' + f.delar.join(''); f.delar = []; rita(); }
    else if (f.fatt % 25 === 0) ritaFilProcent(id);
  }
  function rensaFiler() { filer = {}; }

  /* ---------- Rita ---------- */
  function live(text) {
    var v = vm(), l = v && v.querySelector('.vm-live');
    if (l) { l.textContent = ''; setTimeout(function () { l.textContent = text; }, 30); }
  }
  function titelRader(t) {
    var r = Array.isArray(t) ? t.slice(0, 3).map(function (x) { return str(x, 80); }) : [str(t, 160)];
    return r.map(function (x, n) { return n === r.length - 1 && r.length > 1 ? '<em>' + e(x) + '</em>' : e(x); }).join('<br>');
  }
  function lista(v, max) { return Array.isArray(v) ? v.slice(0, max) : []; }
  function bildHtml(b, d) {
    b = b && typeof b === 'object' ? b : {};
    var id = str(b.id, 20), bild = sakerUrl(b.bild);
    var text = '<p class="vmd-b__etikett">' + e(str(b.etikett, 120)) + '</p>' + (b.titel ? '<h2 class="vmd-b__titel">' + titelRader(b.titel) + '</h2>' : '');
    var brod = b.text ? '<p class="vmd-b__brod">' + e(str(b.text, 400)) + '</p>' : '';
    var h = '';
    if (id === 'titel') {
      h = (bild ? '<img class="vmd-b__bak" src="' + bild + '" alt="">' : '') + '<div class="vmd-b__slojan"></div><div class="vmd-b__text vmd-b__text--over">' + text + brod +
        (b.for ? '<p class="vmd-b__for"><span>Förslag för</span><b>' + e(str(b.for, 80)) + '</b></p>' : '') + '</div>';
    } else if (id === 'film') {
      h = '<div class="vmd-b__delad"><div class="vmd-b__text">' + text + brod +
        (A && A.egen ? '<button type="button" class="vmd-knapp vmd-knapp--accent vmd-b__spela" data-vmd="visa-film">' + ik('vmd-spela') + '<span>Spela filmen för alla</span></button>' : '') + '</div>' +
        (bild ? '<div class="vmd-b__bildkol"><figure class="vmd-b__foto vmd-b__foto--bred"><img src="' + bild + '" alt=""></figure></div>' : '') + '</div>';
    } else if (id === 'citat') {
      h = '<div class="vmd-b__delad vmd-b__delad--citat">' + (bild ? '<div class="vmd-b__bildkol"><figure class="vmd-b__foto"><img src="' + bild + '" alt="' + e(str(b.vem, 60)) + '"></figure></div>' : '') +
        '<div class="vmd-b__text">' + text + '<blockquote class="vmd-b__citat"><p>' + e(str(b.citat, 600)) + '</p><cite><b>' + e(str(b.vem, 60)) + '</b>' + e(str(b.roll, 160)) + '</cite></blockquote></div></div>';
    } else if (id === 'varfor') {
      h = '<div class="vmd-b__text">' + text + '</div><div class="vmd-b__kort">' + lista(b.tal, 3).map(function (x) {
        x = Array.isArray(x) ? x : [];
        return '<div><strong>' + e(str(x[0], 20)) + '</strong><p>' + e(str(x[1], 220)) + '</p><small>' + e(str(x[2], 60)) + '</small></div>';
      }).join('') + '</div>';
    } else if (id === 'metod' || id === 'nasta' || id === 'resa') {
      var sex = id === 'resa';
      h = '<div class="vmd-b__text">' + text + brod + '</div><ol class="vmd-b__steg' + (sex ? ' vmd-b__steg--sex' : '') + '">' + lista(b.steg, 6).map(function (s, n) {
        s = Array.isArray(s) ? s : [];
        return '<li><span class="vmd-b__nr">' + (n + 1) + '</span><b>' + e(str(s[0], 40)) + '</b><p>' + e(str(s[1], 200)) + '</p></li>';
      }).join('') + '</ol>';
    } else if (id === 'paket') {
      h = '<div class="vmd-b__text">' + text + '</div><div class="vmd-b__paket">' + lista(b.paket, 3).map(function (p, n) {
        p = p || {};
        return '<div' + (n ? ' class="vmd-b__paket-plus"' : '') + '><small>' + e(str(p.niva, 30)) + '</small><b>' + e(str(p.namn, 20)) + '</b><p class="vmd-b__pris">' + kr(tal(p.pris, 0, 1e7)).replace(/ kr$/, '') + '<span>kr / medarbetare</span></p><ul>' + lista(p.lista, 8).map(function (x) {
          return '<li>' + ik('vmd-bock') + e(str(x, 90)) + '</li>';
        }).join('') + '</ul></div>';
      }).join('') + '</div>';
    } else if (id === 'kalkyl') {
      h = '<div class="vmd-b__delad"><div class="vmd-b__text">' + text + '</div><div class="vmd-b__bildkol">' + kvittoHtml(d && d.kalkyl, false) + '</div></div>';
    } else if (id === 'plattform') {
      h = '<div class="vmd-b__delad">' + (bild ? '<div class="vmd-b__bildkol"><img class="vmd-b__app" src="' + bild + '" alt=""></div>' : '') + '<div class="vmd-b__text">' + text +
        '<ul class="vmd-b__punkter">' + lista(b.punkter, 6).map(function (x) { return '<li>' + ik('vmd-bock') + e(str(x, 120)) + '</li>'; }).join('') + '</ul></div></div>';
    } else if (id === 'team') {
      h = '<div class="vmd-b__text">' + text + '</div><div class="vmd-b__team">' + lista(b.personer, 3).map(function (p) {
        p = p || {}; var u = sakerUrl(p.bild);
        return '<div>' + (u ? '<img src="' + u + '" alt="' + e(str(p.namn, 60)) + '" style="object-position:' + Math.round(tal(p.x, 0, 100)) + '% 30%">' : '') + '<span><small>' + e(str(p.roll, 40)) + '</small><b>' + e(str(p.namn, 60)) + '</b><em>' + e(str(p.text, 160)) + '</em></span></div>';
      }).join('') + '</div>';
    } else if (id === 'fortroende') {
      h = '<div class="vmd-b__text vmd-b__text--mitt">' + text + '</div><div class="vmd-b__loggor">' + lista(b.loggor, 4).map(function (l) {
        l = l || {}; var u = sakerUrl(l.bild);
        return '<figure>' + (u ? '<img src="' + u + '" alt="">' : '') + '<figcaption>' + e(str(l.namn, 40)) + '</figcaption></figure>';
      }).join('') + '</div>';
    } else {
      h = '<div class="vmd-b__text">' + text + brod + '</div>';
    }
    return '<article class="vmd-bild vmd-bild--' + e(id) + '" aria-label="' + e(str(b.namn, 60)) + '">' + h + '</article>';
  }

  function kvittoHtml(k, verktyg) {
    if (!k || typeof k !== 'object') return '';
    var rader = lista(k.rader, 30), egen = A && A.egen, knapp = '';
    if (verktyg && egen) {
      if (k.las) knapp = '<p class="vmd-kvitto__las">' + ik('vmd-las') + e(str(k.las, 160)) + '</p>';
      else if (k.offertNr) knapp = '<p class="vmd-kvitto__sparad">' + ik('vmd-bock') + 'Offert ' + e(str(k.offertNr, 30)) + ' är skapad</p><button type="button" class="vmd-knapp vmd-knapp--accent" data-vmd="visa-offert">' + ik('vmd-offert') + '<span>Visa offerten</span></button>';
      else if (k.sparad) knapp = '<p class="vmd-kvitto__sparad">' + ik('vmd-bock') + 'Sparat på ' + e(str(k.affar, 80)) + '</p><button type="button" class="vmd-knapp vmd-knapp--accent" data-vmd="skapa-offert">' + ik('vmd-offert') + '<span>Skapa offert nu</span></button>';
      else knapp = '<button type="button" class="vmd-knapp vmd-knapp--accent" data-vmd="spara-kalkyl">' + ik('vmd-bock') + '<span>Spara på ' + e(str(k.affar, 80)) + '</span></button>';
    } else if (verktyg && k.sparad) knapp = '<p class="vmd-kvitto__sparad">' + ik('vmd-bock') + 'Sparat på affären</p>';
    return '<div class="vmd-kvitto">' +
      '<div class="vmd-kvitto__huvud"><span><small>Ordervärde första året · exkl. moms</small><b>' + e(str(k.namn, 20)) + ' för ' + Math.round(tal(k.antal, 0, 5000)) + ' medarbetare</b><em>≈ ' + kr(k.perPerson) + ' per medarbetare</em></span></div>' +
      '<ul class="vmd-kvitto__rader">' + rader.map(function (r) {
        r = r || {}; var antal = Math.round(tal(r.antal, 0, 5000));
        return '<li><span>' + e(str(r.text, 160)) + (antal > 1 ? ' · ' + antal + ' st' : '') + '</span><b>' + (r.summa == null ? 'Offert' : kr(tal(r.summa, -1e9, 1e9))) + '</b></li>';
      }).join('') + '</ul>' +
      '<div class="vmd-kvitto__summa"><span>Totalt</span><b>' + kr(tal(k.summa, -1e10, 1e10)) + '</b></div>' +
      '<div class="vmd-kvitto__betal"><span>Förskott 25 %<b>' + kr(k.forskott) + '</b></span><span>Efter testdagen 75 %<b>' + kr(k.slut) + '</b></span></div>' +
      '<p class="vmd-kvitto__not">Vägledande pris enligt prislistan. Slutligt pris bekräftas i offerten.' + (k.offert ? ' Hjärt-/kärlpaketet offereras separat och ingår inte i summan.' : '') + '</p>' + knapp + '</div>';
  }

  function kalkylHtml(k) {
    var kan = A.egen || (A.styr && A.styr.kund), dis = kan ? '' : ' disabled', n = Math.round(tal(k.antal, 1, 5000));
    return '<div class="vmd-kalkyl">' +
      '<div class="vmd-kalkyl__val"><div class="vmd-styrplats"></div>' +
        '<p class="vmd-rubrik">Paket per medarbetare</p><div class="vmd-kalkyl__modeller">' + lista(k.paketLista, 3).map(function (x) {
          x = x || {}; var pa = x.id === k.paket;
          return '<button type="button" class="vmd-modell' + (pa ? ' vald' : '') + '" data-vmd-paket="' + e(str(x.id, 20)) + '" aria-pressed="' + pa + '"' + dis + '><b>' + e(str(x.namn, 20)) + '</b><small>' + kr(tal(x.pris, 0, 1e7)) + '</small></button>';
        }).join('') + '</div>' +
        '<p class="vmd-rubrik" id="vmd-antal-rubrik">Antal medarbetare</p><div class="vmd-kalkyl__antal"><input type="range" class="vmd-reglage" min="5" max="500" value="' + Math.min(500, Math.max(5, n)) + '" aria-labelledby="vmd-antal-rubrik" data-vmd-reglage' + dis + '><span class="vmd-chip vald" data-vmd-antal-text aria-live="polite">' + n + ' pers</span></div>' +
        '<p class="vmd-rubrik">Tillval</p><div class="vmd-kalkyl__tillval">' + lista(k.tillvalLista, 12).map(function (p) {
          p = p || {};
          return '<button type="button" class="vmd-chip' + (p.vald || p.ingar ? ' vald' : '') + '" data-vmd-tillval="' + e(str(p.id, 20)) + '" aria-pressed="' + !!p.vald + '"' + (p.ingar ? ' disabled' : dis) + '>' + ik('vmd-bock') + e(str(p.namn, 60)) + ' · ' + (p.ingar ? 'ingår' : p.pris == null ? 'offert' : kr(tal(p.pris, 0, 1e7))) + '</button>';
        }).join('') + '</div>' +
        '<p class="vmd-rubrik">Mellan testerna</p><div class="vmd-kalkyl__tillval">' + lista(k.program, 3).map(function (p) {
          p = p || {};
          return '<button type="button" class="vmd-chip' + (p.pa ? ' vald' : '') + '" data-vmd-program="' + e(str(p.id, 20)) + '" aria-pressed="' + !!p.pa + '"' + dis + '>' + ik('vmd-bock') + e(str(p.namn, 60)) + ' · ' + e(str(p.pris, 30)) + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="vmd-kalkyl__kvitto">' + kvittoHtml(k, true) + '</div></div>';
  }

  function offertHtml(o) {
    if (!o || o.tom) return '<div class="vmd-tomt">' + ik('vmd-offert') + '<b>Ingen offert än</b><p>' + (o && o.affar ? 'Affären ' + e(str(o.affar, 80)) + ' har ingen offert. Räkna i kalkylen och skapa den där.' : 'Mötet har ingen affär.') + '</p></div>';
    var STATUS = { skickad: 'Skickad', oppnad: 'Öppnad', godkand: 'Godkänd', signerad: 'Signerad' };
    var dag = function (x) { var d = new Date(str(x, 40)); return isNaN(d) ? '–' : d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' }); };
    var rader = lista(o.rader, 40);
    return '<article class="vmd-offert"><header class="vmd-offert__huvud"><div><p class="vmd-rubrik">Offert</p><h2>' + e(str(o.nummer, 30)) + '</h2><p>' + e(str(o.kund, 80)) + ' · ' + e(str(o.affar, 80)) + '</p></div>' +
      '<dl><div><dt>Status</dt><dd>' + e(STATUS[o.status] || 'Skickad') + '</dd></div><div><dt>Datum</dt><dd>' + e(dag(o.skapad)) + '</dd></div><div><dt>Giltig till</dt><dd>' + e(dag(o.giltigTill)) + '</dd></div></dl></header>' +
      '<table class="vmd-offert__rader"><thead><tr><th scope="col">Post</th><th scope="col">Antal</th><th scope="col">Pris</th><th scope="col">Summa</th></tr></thead><tbody>' + rader.map(function (r) {
        r = r || {}; var a = Math.round(tal(r.antal, 0, 5000));
        return '<tr><td>' + e(str(r.text, 160)) + '</td><td>' + a + '</td><td>' + (r.apris == null ? 'Offert' : kr(tal(r.apris, -1e9, 1e9))) + '</td><td>' + (r.summa == null ? 'Offert' : kr(tal(r.summa, -1e9, 1e9))) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><th scope="row" colspan="3">Totalt exkl. moms</th><td>' + kr(tal(o.summa, -1e10, 1e10)) + '</td></tr></tfoot></table>' +
      '<p class="vmd-kvitto__not">Moms tillkommer enligt gällande regler. Förskott ' + kr(o.forskott) + ', efter testdagen ' + kr(o.slut) + '.' + (o.offertpris ? ' Hjärt-/kärlpaketet offereras separat och ingår inte i summan.' : '') + '</p></article>';
  }

  function dokumentHtml(d) {
    var l = lista(d.lista, 24), vald = str(d.vald, 40), f = vald && filer[vald];
    var stor = !vald ? '<div class="vmd-tomt">' + ik('vmd-dok') + '<b>Inga bilder hos kunden</b><p>Bilder som laddats upp under Dokument visas här. PDF:er och andra filer visar du med Dela skärm.</p></div>'
      : f && f.fel ? '<div class="vmd-tomt">' + ik('vmd-dok') + '<b>Bilden kunde inte visas</b><p>' + (A.egen ? 'Uppladdade filer finns bara kvar under sessionen i demon. Ladda upp bilden igen eller visa den med Dela skärm.' : 'Den som visar får välja en annan bild.') + '</p></div>'
      : f && f.url ? '<figure class="vmd-dok__bild"><img src="' + e(f.url) + '" alt="' + e(namnFor(l, vald)) + '"><figcaption>' + e(namnFor(l, vald)) + '</figcaption></figure>'
      : '<div class="vmd-tomt" data-vmd-fil="' + e(vald) + '"><span class="vmd-laddar" aria-hidden="true"></span><b>Bilden laddas …</b><p class="vmd-procent">' + procent(vald) + '</p></div>';
    var sida = A.egen && l.length > 1 ? '<ul class="vmd-dok__lista" aria-label="Kundens bilder">' + l.map(function (x) {
      return '<li><button type="button" data-vmd-dok="' + e(str(x.id, 40)) + '" aria-pressed="' + (x.id === vald) + '"' + (x.id === vald ? ' class="vald"' : '') + '>' + ik('vmd-dok') + '<span>' + e(str(x.namn, 120)) + '</span></button></li>';
    }).join('') + '</ul>' : '';
    return '<div class="vmd-dok' + (sida ? ' vmd-dok--lista' : '') + '">' + sida + '<div class="vmd-dok__yta">' + stor + '</div></div>';
  }
  function namnFor(l, id) { var x = l.filter(function (y) { return y && y.id === id; })[0]; return x ? str(x.namn, 120) : 'Bild'; }
  function procent(id) { var f = filer[id]; return f && f.antal ? Math.round(f.fatt / f.antal * 100) + ' %' : ''; }
  function ritaFilProcent(id) { var v = vm(), p = v && v.querySelector('[data-vmd-fil="' + id + '"] .vmd-procent'); if (p) p.textContent = procent(id); }

  // "Låt kunden ändra" hos säljaren, "Du kan ändra" / "Gustav styr" hos de andra. Mötets banderoll (.vm-delar) visar vem som visar vad.
  var STYR = { presentation: ['Kunden kan bläddra', 'Du kan bläddra', 'Kunden kan byta bild själv'], kalkyl: ['Låt kunden ändra', 'Du kan ändra kalkylen', 'Kunden kan välja paket, antal och tillval'] };
  function styrHtml() {
    var s = STYR[A.typ]; if (!s) return '';
    if (A.egen) return '<label class="vmd-brytare" title="' + e(s[2]) + '"><input type="checkbox" data-vmd-kund' + (A.styr && A.styr.kund ? ' checked' : '') + '><span class="vmd-brytare__spar" aria-hidden="true"></span><span>' + e(s[0]) + '</span></label>';
    return '<p class="vmd-styr' + (A.styr && A.styr.kund ? ' vmd-styr--pa' : '') + '">' + ik(A.styr && A.styr.kund ? 'vmd-styr' : 'vmd-las') + '<span>' + e(A.styr && A.styr.kund ? s[1] : fornamn(A.namn) + ' styr') + '</span></p>';
  }
  function ritaStyr(rot) {
    rot.querySelectorAll('.vmd-styrplats').forEach(function (p) {
      var f = p.contains(D.activeElement);
      p.innerHTML = styrHtml();
      if (f) { var i = p.querySelector('input'); if (i) i.focus({ preventScroll: true }); }
    });
  }

  // Presentatörsvyn: nästa bild, anteckningar och bildlistan (bara säljaren)
  function namnPa(id) { var b = (window.UPMote && UPMote.BILDER || []).filter(function (x) { return x.id === id; })[0]; return b ? b.namn : id; }
  function presentatorHtml() {
    var nasta = H.bilder[H.nu + 1];
    return '<aside class="vmd-pres" aria-label="Presentatörsvy">' +
      '<div class="vmd-styrplats"></div><div class="vmd-pres__nav"><button type="button" class="vmd-knapp vmd-knapp--ikon" data-vmd="bak" aria-label="Föregående bild"' + (H.nu === 0 ? ' disabled' : '') + '>' + ik('vmd-v') + '</button>' +
        '<span class="vmd-pres__nr"><b>' + (H.nu + 1) + '</b> / ' + H.bilder.length + '</span>' +
        '<button type="button" class="vmd-knapp vmd-knapp--ikon" data-vmd="fram" aria-label="Nästa bild"' + (H.nu >= H.bilder.length - 1 ? ' disabled' : '') + '>' + ik('vmd-h') + '</button></div>' +
      '<p class="vmd-rubrik">Nästa bild</p>' +
      (nasta ? '<button type="button" class="vmd-pres__nasta" data-vmd="fram"><span>' + e(namnPa(nasta)) + '</span></button>' : '<p class="vmd-pres__slut">Det här är sista bilden.</p>') +
      '<label class="vmd-pres__ant"><span class="vmd-rubrik">' + ik('vmd-anteckning') + 'Anteckningar <small>bara du ser dem</small></span><textarea data-vmd-anteckning rows="5" maxlength="4000" placeholder="Frågor att återkomma om, nästa steg …">' + e(H.anteckning || '') + '</textarea></label>' +
      '<p class="vmd-rubrik">Bilder</p><ol class="vmd-pres__lista">' + H.bilder.map(function (id, n) {
        return '<li><button type="button" data-vmd-till="' + n + '"' + (n === H.nu ? ' aria-current="step" class="nu"' : '') + '><span>' + (n + 1) + '</span>' + e(namnPa(id)) + '</button></li>';
      }).join('') + '</ol></aside>';
  }

  var ritadNyckel = '', reglageDras = false;
  function rita() {
    var v = vm(); if (!v) return;
    var yta = v.querySelector('.vm-yta');
    var visas = !!(A && iMote() && yta);
    var rot = yta && yta.querySelector(':scope > .vmd-yta');
    if (!visas) {
      meddela();
      if (rot) { var gammal = rot; gammal.classList.add('vmd-yta--ut'); setTimeout(function () { gammal.remove(); }, lugnMq.matches ? 0 : 180); }
      v.removeAttribute('data-vmd'); v.removeAttribute('data-vmd-egen');
      ritadNyckel = '';
      return;
    }
    laggSprite();
    v.setAttribute('data-vmd', A.typ);
    v.toggleAttribute('data-vmd-egen', !!A.egen);
    if (!rot || rot.classList.contains('vmd-yta--ut')) {
      rot = D.createElement('div'); rot.className = 'vmd-yta'; rot.setAttribute('role', 'region');
      rot.innerHTML = '<div class="vmd-huvud"><div class="vmd-kropp" tabindex="-1"></div></div>';
      yta.insertBefore(rot, yta.firstChild);
    }
    rot.setAttribute('aria-label', TYPER[A.typ].namn);
    rot.setAttribute('data-typ', A.typ);
    var kropp = rot.querySelector('.vmd-kropp'), d = A.data || {};
    var nyckel = A.typ + '|' + A.peer;
    var huvud = rot.querySelector('.vmd-huvud');
    if (A.typ === 'presentation') {
      var bnyckel = nyckel + '|' + str(d.bild && d.bild.id, 20) + '|' + Math.round(tal(d.nu, 0, 99));
      var html = bildHtml(d.bild, d);
      // Kunden med kontroll får egna pilar; säljaren bläddrar i presentatörsvyn
      var gastNav = !A.egen ? '<div class="vmd-gastnav"><div class="vmd-styrplats"></div>' + (A.styr && A.styr.kund ? '<button type="button" class="vmd-knapp vmd-knapp--ikon" data-vmd="bak" aria-label="Föregående bild"' + (tal(d.nu, 0, 99) <= 0 ? ' disabled' : '') + '>' + ik('vmd-v') + '</button><span class="vmd-pres__nr"><b>' + (Math.round(tal(d.nu, 0, 99)) + 1) + '</b> / ' + Math.round(tal(d.antal, 1, 99)) + '</span><button type="button" class="vmd-knapp vmd-knapp--ikon" data-vmd="fram" aria-label="Nästa bild"' + (tal(d.nu, 0, 99) >= tal(d.antal, 1, 99) - 1 ? ' disabled' : '') + '>' + ik('vmd-h') + '</button>' : '') + '</div>' : '';
      if (bnyckel !== ritadNyckel) {
        var fram = ritadNyckel.split('|')[0] === 'presentation' && tal(d.nu, 0, 99) < Number(ritadNyckel.split('|')[3] || 0) ? 'vmd-in-v' : 'vmd-in-h';
        kropp.innerHTML = '<div class="vmd-scenbild ' + fram + '">' + html + '</div>' + gastNav;
      } else {
        var sb = kropp.querySelector('.vmd-scenbild'); if (sb) sb.innerHTML = html;
        var gn = kropp.querySelector('.vmd-gastnav'); if (gn) gn.outerHTML = gastNav; else if (gastNav) kropp.insertAdjacentHTML('beforeend', gastNav);
      }
      ritadNyckel = bnyckel;
      var pres = huvud.querySelector('.vmd-pres');
      if (A.egen && H) {
        var ta = pres && pres.querySelector('textarea'), fokus = ta && D.activeElement === ta, val = ta ? ta.value : H.anteckning, sel = ta ? [ta.selectionStart, ta.selectionEnd] : null;
        var tmp = D.createElement('div'); tmp.innerHTML = presentatorHtml();
        var ny = tmp.firstChild;
        if (pres) pres.replaceWith(ny); else huvud.appendChild(ny);
        var nyTa = ny.querySelector('textarea'); nyTa.value = val || '';
        if (fokus) { nyTa.focus({ preventScroll: true }); try { nyTa.setSelectionRange(sel[0], sel[1]); } catch (x) { /* */ } }
        var nu = ny.querySelector('.vmd-pres__lista .nu'), l = ny.querySelector('.vmd-pres__lista');
        if (nu && l) { var lr = l.getBoundingClientRect(), nr = nu.getBoundingClientRect(); l.scrollTop = Math.max(0, l.scrollTop + nr.top - lr.top - (l.clientHeight - nr.height) / 2); }
      } else if (pres) pres.remove();
    } else {
      var p2 = huvud.querySelector('.vmd-pres'); if (p2) p2.remove();
      if (A.typ === 'film') {
        if (ritadNyckel !== nyckel) { kropp.innerHTML = filmHtml(d); var fv = kropp.querySelector('video'); kopplaFilm(fv); laddaFilm(fv); kropp.classList.remove('vmd-kropp--in'); void kropp.offsetWidth; kropp.classList.add('vmd-kropp--in'); }
        ritadNyckel = nyckel;
        synkaFilm(kropp.querySelector('video'));
      } else if (A.typ === 'kalkyl' && reglageDras && kropp.querySelector('.vmd-kalkyl__kvitto')) {
        // Aldrig reglaget medan det dras – bara summan och antalet
        kropp.querySelector('.vmd-kalkyl__kvitto').innerHTML = kvittoHtml(d, true);
        var at = kropp.querySelector('[data-vmd-antal-text]'); if (at) at.textContent = Math.round(tal(d.antal, 1, 5000)) + ' pers';
        meddela();
        return;
      } else {
        var fokusAttr = null, ae = D.activeElement;
        if (ae && kropp.contains(ae)) { fokusAttr = ['data-vmd-paket', 'data-vmd-tillval', 'data-vmd-program', 'data-vmd-dok', 'data-vmd'].filter(function (x) { return ae.hasAttribute(x); }).map(function (x) { return '[' + x + '="' + ae.getAttribute(x) + '"]'; })[0]; if (!fokusAttr && ae.hasAttribute('data-vmd-reglage')) fokusAttr = '[data-vmd-reglage]'; }
        kropp.innerHTML = A.typ === 'kalkyl' ? kalkylHtml(d) : A.typ === 'offert' ? offertHtml(d) : dokumentHtml(d);
        if (ritadNyckel !== nyckel) { kropp.classList.remove('vmd-kropp--in'); void kropp.offsetWidth; kropp.classList.add('vmd-kropp--in'); }
        ritadNyckel = nyckel;
        if (fokusAttr) { var f = kropp.querySelector(fokusAttr); if (f) f.focus({ preventScroll: true }); }
      }
    }
    ritaStyr(rot);
    meddela();
  }
  // Lagret (samtal-ui.js) ritar om knappen Dela/Sluta visa, banderollen och minirutan
  var forraMeddelat = '';
  function meddela() {
    var a = aktuellt(), k = JSON.stringify(a);
    if (k === forraMeddelat) return;
    forraMeddelat = k;
    try { D.dispatchEvent(new CustomEvent('up-videomote-innehall', { detail: a })); } catch (x) { /* */ }
  }
  function aktuellt() {
    if (!A || !iMote()) return { pa: false };
    var d = A.data || {}, steg = A.typ === 'presentation' && d.antal ? 'bild ' + (Math.round(tal(d.nu, 0, 99)) + 1) + ' av ' + Math.round(tal(d.antal, 1, 99)) : '';
    return { pa: true, egen: !!A.egen, typ: A.typ, titel: TYPER[A.typ].namn, namn: A.namn || '', steg: steg, kund: !!(A.styr && A.styr.kund) };
  }

  /* ---------- Facket i Dela-menyn ---------- */
  function fackHtml() {
    var c = C(), k = kalla(), t = tillst(), annan = t && (t.deltagare || []).filter(function (d) { return d.delar; })[0];
    var n = bilderValda().length, off = k.affar ? offertFor(k.affar.id) : null, dok = bildDokument(k.kund), film = window.UPFilm;
    var kort = [
      ['presentation', 'Presentationen', n + ' bilder, med anteckningar', true],
      ['kalkyl', 'Kalkylen', k.affar ? c.krKort(c.affarVarde(k.affar)) : 'Räkna utan affär', true],
      ['film', 'Filmen', film ? film.tid(film.LANGD) + ', utan ljud' : 'Utan ljud', !!film],
      ['offert', 'Offerten', off ? off.nummer : k.affar ? 'Ingen offert än' : 'Ingen affär', !!k.affar],
      ['dokument', 'Bilder', dok.length ? dok.length + (dok.length === 1 ? ' bild' : ' bilder') + ' i arkivet' : 'Inga bilder än', dok.length > 0]
    ];
    var affarRad = k.affarer.length > 1
      ? '<label class="vmd-fack__affar"><span class="sr-only">Affär</span><select data-vmd-affar data-nativ>' + k.affarer.map(function (a) { return '<option value="' + e(a.id) + '"' + (k.affar && a.id === k.affar.id ? ' selected' : '') + '>' + e(a.titel) + '</option>'; }).join('') + '</select></label>'
      : '<p class="vmd-fack__affar">' + (k.affar ? e(k.affar.titel) + (k.kund ? ' · ' + e(k.kund.namn) : '') : k.kund ? e(k.kund.namn) + ' · ingen affär' : 'Mötet har ingen kund') + '</p>';
    var stopp = A && A.egen ? '<button type="button" role="menuitem" class="vm-meny__rad vm-meny__rad--fara" data-vmd="stoppa">' + ik('vmd-stopp') + '<span class="vm-meny__text">Sluta visa ' + e(TYPER[A.typ].bestamd) + '</span></button><hr>' : '';
    return '<div class="vmd-fack">' + stopp + '<p class="vm-meny__rubrik">Från affären</p>' + affarRad +
      (annan ? '<p class="vmd-fack__info">' + e(fornamn(annan.namn)) + ' delar sin skärm – du kan visa innehåll när delningen är slut.</p>' : '') +
      '<div class="vmd-fack__kort">' + kort.map(function (x) {
        var pa = A && A.egen && A.typ === x[0];
        return '<button type="button" role="menuitem" class="vmd-kort' + (pa ? ' vald' : '') + '" data-vmd-visa="' + x[0] + '"' + (x[3] && !annan ? '' : ' disabled') + '>' +
          '<span class="vmd-kort__ikon">' + ik(TYPER[x[0]].ikon) + '</span><b>' + e(x[1]) + '</b><small>' + e(x[2]) + '</small></button>';
      }).join('') + '</div><hr></div>';
  }
  function fyllPlats(plats) {
    if (GAST || !plats) return;
    if (!kanVisa()) { plats.innerHTML = ''; plats.hidden = true; return; }
    plats.hidden = false;
    laggSprite();
    plats.innerHTML = fackHtml();
  }
  D.addEventListener('up-videomote-dela-meny', function (ev) { fyllPlats(ev.detail && ev.detail.el); });

  function stangMeny() {
    if (UPV.samtalUi && typeof UPV.samtalUi.stangMeny === 'function') { UPV.samtalUi.stangMeny(); return; }
    var v = vm(), m = v && v.querySelector('.vm-meny'); if (!m || m.hidden) return;
    var typ = m.getAttribute('data-typ');
    var k = v.querySelector('.vm-kontroller [data-vm="' + (typ === 'mer' ? 'mer' : 'dela') + '"]');
    if (k) k.click(); else m.hidden = true;
  }

  /* ---------- Klick och tangenter ---------- */
  D.addEventListener('click', function (ev) {
    var t = ev.target; if (!t || !t.closest) return;
    var v = vm(); if (!v || !v.contains(t)) return;
    var b = t.closest('[data-vmd-visa],[data-vmd],[data-vmd-paket],[data-vmd-tillval],[data-vmd-program],[data-vmd-till],[data-vmd-dok],[data-vmd-kap]');
    if (!b || b.disabled) return;
    if (b.hasAttribute('data-vmd-visa')) { var typ = b.getAttribute('data-vmd-visa'); stangMeny(); visa(typ); return; }
    if (b.hasAttribute('data-vmd-paket')) { andra({ paket: b.getAttribute('data-vmd-paket') }); return; }
    if (b.hasAttribute('data-vmd-tillval')) { andra({ tillval: b.getAttribute('data-vmd-tillval') }); return; }
    if (b.hasAttribute('data-vmd-program')) { andra({ program: b.getAttribute('data-vmd-program') }); return; }
    if (b.hasAttribute('data-vmd-till')) { if (A && A.egen) andra({ nu: Number(b.getAttribute('data-vmd-till')) }); return; }
    if (b.hasAttribute('data-vmd-dok')) { if (A && A.egen) andra({ dok: b.getAttribute('data-vmd-dok') }); return; }
    if (b.hasAttribute('data-vmd-kap')) { var ka = A && A.data && A.data.kapitel && A.data.kapitel[Number(b.getAttribute('data-vmd-kap'))]; if (ka) filmSok(tal(ka.t, 0, 600)); return; }
    var g = b.getAttribute('data-vmd');
    if (g === 'stoppa') { stangMeny(); stoppa(); }
    else if (g === 'fram') bladdra(1);
    else if (g === 'bak') bladdra(-1);
    else if (g === 'spara-kalkyl') sparaKalkyl();
    else if (g === 'skapa-offert') skapaOffert();
    else if (g === 'visa-offert') visa('offert');
    else if (g === 'visa-film') visa('film');
    else if (g === 'film-spela' && A && A.egen && H) { H.film.spelar = !H.film.spelar; var fv = filmVideo(); if (fv) { H.film.kvar = fv.currentTime; H.film.vid = Date.now(); if (H.film.spelar) spela(fv); else fv.pause(); } bygg(); filmLage(); }
  });
  function bladdra(steg) {
    if (!A || A.typ !== 'presentation') return;
    if (A.egen && H) { andra({ nu: H.nu + steg }); return; }
    if (A.styr && A.styr.kund) andra({ nu: Math.round(tal(A.data.nu, 0, 99)) + steg });
  }
  D.addEventListener('change', function (ev) {
    var t = ev.target; if (!t || !t.matches) return;
    if (t.matches('[data-vmd-kund]') && A && A.egen) { andra({ kundKan: t.checked }); live(t.checked ? 'Kunden kan styra.' : 'Bara du styr.'); }
    else if (t.matches('[data-vmd-affar]')) {
      valdAffar = t.value;
      var m = t.closest('.vm-meny'), f = m && m.querySelector('.vmd-fack');
      var plats = m && m.querySelector('[data-vm-plats="affar"]');
      if (f && plats) { fyllPlats(plats); var s = plats.querySelector('[data-vmd-affar]'); if (s) s.focus(); }
      if (A && A.egen && A.typ !== 'film') visa(A.typ, { affar: valdAffar });
    } else if (t.matches('[data-vmd-filmtid]')) { filmDrar = false; filmSok(tal(t.value, 0, 600)); }
  });
  D.addEventListener('input', function (ev) {
    var t = ev.target; if (!t || !t.matches) return;
    if (t.matches('[data-vmd-anteckning]') && H) H.anteckning = t.value.slice(0, 4000);
    else if (t.matches('[data-vmd-reglage]')) andra({ antal: Number(t.value) });
    else if (t.matches('[data-vmd-filmtid]')) { filmDrar = true; var ti = t.closest('.vmd-film').querySelector('[data-vmd-film-tid]'); if (ti) ti.textContent = tidText(t.value) + ' / ' + tidText(A && A.data && A.data.langd); }
  });
  // Antalsreglaget ritas aldrig om medan det dras (summan följer med)
  D.addEventListener('pointerdown', function (ev) { if (ev.target && ev.target.matches && ev.target.matches('[data-vmd-reglage]')) reglageDras = true; });
  ['pointerup', 'pointercancel'].forEach(function (h) { D.addEventListener(h, function () { if (reglageDras) { reglageDras = false; rita(); } }); });
  // ← och → bläddrar när fokus är i det delade (inte i textfält) – krockar inte med kundmötets tangenter, som bara gäller dess eget lager
  D.addEventListener('keydown', function (ev) {
    if (!A || A.typ !== 'presentation' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var t = ev.target, rot = t && t.closest && t.closest('.vmd-yta');
    if (!rot || t.closest('textarea, input, select')) return;
    if (ev.key === 'ArrowRight' || ev.key === 'PageDown') { ev.preventDefault(); bladdra(1); }
    else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') { ev.preventDefault(); bladdra(-1); }
  });

  /* ---------- Koppla in mot motorn och lagret ---------- */
  var observ = null, sedd = null;
  function bevaka() {
    var v = vm();
    if (!v || v === sedd) return;
    sedd = v;
    if (observ) observ.disconnect();
    observ = new MutationObserver(function (poster) {
      poster.forEach(function (r) {
        // Slutskärmen: anteckningarna från presentatörsvyn följer med till mötets anteckning
        var s = r.target && r.target.classList && r.target.classList.contains('vm-slut') ? r.target : null;
        if (s && !s.hidden && H && H.anteckning) { var ta = s.querySelector('textarea[name="anteckning"]'); if (ta && !ta.value) ta.value = H.anteckning; }
      });
      // Lagret ritades om (t.ex. rutorna) – se till att ytan finns kvar
      if (A && iMote()) { var yta = v.querySelector('.vm-yta'); if (yta && !yta.querySelector(':scope > .vmd-yta')) { ritadNyckel = ''; rita(); } }
    });
    observ.observe(v, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'data-typ'] });
  }

  function startaLyssning() {
    var m = M(); if (!m || typeof m.pa !== 'function') return false;
    m.pa('fas', function (d) {
      koppla();
      bevaka();
      if (d.fas !== 'mote' && A) { A = null; rensaFiler(); }
      ritadNyckel = '';
      rita();
    });
    m.pa('deltagare', function (l) { nyaDeltagare(l); if (A && !A.egen && !deltagare(A.peer)) { A = null; rensaFiler(); rita(); } });
    m.pa('delning', function (d) {
      // Skärmdelning tar över platsen
      if (d && d.pa && A) { if (A.egen) stoppaEgen(true); }
    });
    koppla();
    return true;
  }

  if (!startaLyssning()) D.addEventListener('DOMContentLoaded', startaLyssning);
  D.addEventListener('up-videomote', function () { bevaka(); });
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', bevaka); else bevaka();

  UPV.samtalDela = {
    kanVisa: kanVisa,
    visa: visa,
    stoppa: stoppa,
    sluta: stoppa,
    aktuellt: aktuellt,
    // för testerna
    _data: function () { return A ? JSON.parse(JSON.stringify({ typ: A.typ, data: A.data, styr: A.styr })) : null; }
  };
})();
