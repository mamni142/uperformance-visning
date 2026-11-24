/* Uperformance CRM – videomöten (2026-11-02): data, bokning, inbjudan och sidan #/videomote[/id], samma funktion som Legohus CRM.
   Själva mötet (kamera, väntrum, skärmdelning, bakgrund) sköts av samtal.js (motorn) och samtal-ui.js (lagret .vm); den här filen
   kopplar dem till kunder, affärer, Att göra och tidslinjen. Inbjudan: länk till gästsidan mote-gast.html (allt efter # skickas aldrig
   till servern), mejl via mailto (inget skickas automatiskt) och kalenderfil (.ics).
   Prototyp: mötet går direkt mellan webbläsarna (P2P, högst fyra personer). Signaleringen bakom UPV.samtal.signal går via
   BroadcastChannel, alltså mellan flikar i samma webbläsare – mellan datorer behövs en liten signalväxel och TURN (se FLYTT.md).
   Data: db.videomoten (bara demoläget, skarpt läge kräver växeln först). */
window.UPVideomote = (K, LED) => {
  'use strict';
  const { e, ik, oppnaArk, arkHuvud, toast, spara, rendera, logga, nyId, anv, arAktiv, kund, affar, initialer, sidhjalte, stangArk, SKARP, $ } = K;
  const UPV = window.UPV = window.UPV || {};
  const ARLIG = 'Prototyp – videomötet fungerar mellan flikar i den här webbläsaren.';
  // Står i inbjudningstexten och kalenderfilen: mottagaren ska inte tro att länken fungerar från en annan dator ännu
  const ARLIG_LANK = 'Obs: testversion – länken fungerar just nu bara i samma webbläsare som mötet bokades i.';
  const LANGDER = [15, 30, 45, 60];
  const MAX = 4; // direktsamtal: varje deltagare skickar till alla andra
  const db = () => K.db;
  const mig = () => anv(K.jag);
  const lista = () => { const d = db(); if (!Array.isArray(d.videomoten)) d.videomoten = []; return d.videomoten; };
  const BOKSTAVER = 'abcdefghjkmnpqrstuvwxyz';
  function rumskod() {
    const b = crypto.getRandomValues(new Uint8Array(10));
    const s = Array.from(b, (x) => BOKSTAVER.charAt(x % BOKSTAVER.length)).join('');
    return `${s.slice(0, 3)}-${s.slice(3, 7)}-${s.slice(7)}`;
  }
  const hamta = (id) => (id ? lista().find((v) => v.id === id || v.rum === id) || null : null);
  const slut = (v) => new Date(new Date(v.start).getTime() + (v.langd || 30) * 6e4);
  const kl = (d) => d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  const kortDag = (d) => d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const langDag = (d) => d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
  const narText = (v) => { const s = new Date(v.start); return `${kortDag(s)} kl. ${kl(s)}–${kl(slut(v))}`; };
  const fornamn = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  const vardNamn = (v) => { const u = anv(v.vard); return u ? u.namn : 'Uperformance'; };
  const deltagarNamn = (d) => { if (d.typ === 'kollega') { const u = anv(d.id); return u ? u.namn : 'Kollega'; } return d.namn || 'Gäst'; };
  const dagStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const kundKontakt = (k) => (window.UPCRM && UPCRM.primarKontakt && k ? UPCRM.primarKontakt(k) : null);
  // Pågår: från 10 minuter före start till längden efter (eller tills någon avslutat det)
  function lage(v) {
    if (v.status === 'avslutat') return 'avslutat';
    const nu = Date.now(); const s = new Date(v.start).getTime();
    if (v.status === 'pagar' && nu < slut(v).getTime() + 2 * 36e5) return 'pagar';
    if (nu >= s - 10 * 6e4 && nu <= slut(v).getTime()) return 'nu';
    return nu > slut(v).getTime() ? 'passerat' : 'kommande';
  }
  // Nästa möte som inte är slut, för kunden eller affären (knapparna i hjältarna)
  const nasta = ({ kundId, affarId }) => lista().filter((v) => v.status !== 'utkast' && (affarId ? v.affarId === affarId : v.kundId === kundId) && !['avslutat', 'passerat'].includes(lage(v))).sort((a, b) => (a.start < b.start ? -1 : 1))[0] || null;
  function skapa(opt) {
    const start = new Date(opt.start || Date.now());
    const v = { id: nyId('v'), rum: rumskod(), titel: String(opt.titel || 'Videomöte').slice(0, 120), start: start.toISOString(), langd: LANGDER.includes(+opt.langd) ? +opt.langd : 30, vard: opt.vard || K.jag,
      kundId: opt.kundId || null, affarId: opt.affarId || null, kanal: opt.kanal || null, deltagare: (opt.deltagare || []).slice(0, 8), vantrum: opt.vantrum !== false, direkt: opt.direkt === 'jag' ? 'jag' : 'foretag',
      status: opt.utkast ? 'utkast' : 'bokat', borjade: null, slutade: null, minuter: 0, narvarande: [], chatt: [], anteckning: '', skapad: new Date().toISOString() };
    if (start > new Date() && !opt.utanPaminnelse) db().todos.push({ id: nyId('t'), text: `Möte: ${v.titel}`, datum: dagStr(start), klar: false, ...(v.kundId ? { kundId: v.kundId } : {}), ...(v.affarId ? { affarId: v.affarId } : {}), ansvarig: v.vard, videomote: v.id });
    lista().push(v);
    return v;
  }
  function skapaDirekt({ titel, kollegor = [], kanal = null }) {
    const namn = kollegor.filter((id) => id !== K.jag).map((id) => fornamn((anv(id) || {}).namn)).filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' och $1');
    return skapa({ titel: titel || (namn ? `Videomöte med ${namn}` : 'Videomöte'), start: new Date(), langd: 30, kanal, vantrum: true, utanPaminnelse: true, deltagare: kollegor.filter((id) => id !== K.jag).map((id) => ({ typ: 'kollega', id })) });
  }

  /* --- Länkar och inbjudan --------------------------------------------------------------- */
  function lank(id, gast) {
    const v = hamta(id); if (!v) return '';
    if (!gast) return new URL(`index.html#/videomote/${encodeURIComponent(v.id)}`, location.href).href;
    const p = [['m', v.rum], ['n', gast.namn || ''], ['t', v.titel], ['v', vardNamn(v)], ['s', v.start], ['l', String(v.langd)]].filter((x) => x[1]).map((x) => `${x[0]}=${encodeURIComponent(String(x[1]).slice(0, 120))}`).join('&');
    return new URL(`mote-gast.html#${p}`, location.href).href;
  }
  const gastLank = (v) => lank(v.id, { namn: '' });
  function inbjudningstext(id, d = { typ: 'gast', namn: '' }) {
    const v = hamta(id); if (!v) return '';
    const s = new Date(v.start); const kollega = d.typ === 'kollega'; const namn = fornamn(deltagarNamn(d));
    const rader = [`Hej${namn && namn !== 'Gäst' ? ` ${namn}` : ''}!`, '', kollega ? `Välkommen till videomötet ${v.titel}.` : 'Välkommen till vårt videomöte.', '',
      `När: ${langDag(s)} kl. ${kl(s)}–${kl(slut(v))}`, `Länk: ${kollega ? lank(v.id) : lank(v.id, { namn: d.namn || '' })}`, ''];
    if (kollega) rader.push('Öppna länken när det är dags – du går direkt in i mötet.');
    else rader.push('Så går det till:', '1. Öppna länken i Chrome, Edge eller Safari, på dator eller mobil. Du behöver inget konto eller program.', '2. Skriv ditt namn och prova kamera och mikrofon.', v.vantrum ? '3. Klicka på Be att få gå med – jag släpper in dig.' : '3. Klicka på Gå med.');
    rader.push('', kollega ? 'Vi ses!' : 'Hör av dig om tiden inte passar.', '', 'Hälsningar', vardNamn(v), 'Uperformance', '', ARLIG_LANK);
    return rader.join('\r\n');
  }
  const amne = (v) => { const s = new Date(v.start); return `Videomöte med Uperformance – ${kortDag(s)} kl. ${kl(s)}`; };
  function mailto(id, d) {
    const v = hamta(id); if (!v) return 'mailto:';
    const till = d && d.typ !== 'kollega' && d.epost ? d.epost : '';
    return `mailto:${encodeURIComponent(till).replace(/%40/g, '@')}?subject=${encodeURIComponent(d && d.typ === 'kollega' ? `Videomöte: ${v.titel}` : amne(v))}&body=${encodeURIComponent(inbjudningstext(id, d))}`;
  }
  function ics(id) {
    const v = hamta(id); if (!v) return;
    const p2 = (x) => String(x).padStart(2, '0');
    const f = (d) => `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}00Z`;
    const esc = (t) => String(t || '').replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r\n|\r|\n/g, '\\n');
    const vik = (r) => { const ut = []; let s = r; while (s.length > 74) { ut.push(s.slice(0, 74)); s = ` ${s.slice(74)}`; } ut.push(s); return ut.join('\r\n'); };
    const l = gastLank(v);
    const rader = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Uperformance//CRM//SV', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${v.rum}@uperformance-crm`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(new Date(v.start))}`, `DTEND:${f(slut(v))}`,
      `SUMMARY:${esc(v.titel)}`, `LOCATION:${esc(`Videomöte – ${l}`)}`, `URL:${l}`, `DESCRIPTION:${esc(`Videomöte med ${vardNamn(v)}, Uperformance.\n\nLänk: ${l}\n\nÖppna länken i Chrome, Edge eller Safari. Du behöver inget konto eller program.\n\n${ARLIG_LANK}`)}`];
    v.deltagare.forEach((d) => { if (d.typ === 'gast' && d.epost && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.epost)) rader.push(`ATTENDEE;CN=${esc(d.namn || d.epost)};RSVP=TRUE:mailto:${d.epost}`); });
    rader.push('BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(v.titel)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR');
    const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([rader.map(vik).join('\r\n')], { type: 'text/calendar' }));
    a.href = url; a.download = `videomote-${dagStr(new Date(v.start))}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function kopiera(text, rubrik) {
    const klar = () => toast(rubrik);
    const reserv = () => {
      const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; } t.remove();
      if (ok) klar(); else toast('Det gick inte att kopiera – markera texten och kopiera den själv', undefined, 'varning');
    };
    try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(klar, reserv); else reserv(); } catch (err) { reserv(); }
  }

  function motesInfo(id) {
    const v = hamta(id); if (!v) return null;
    const k = v.kundId && kund(v.kundId);
    return { id: v.id, rum: v.rum, titel: v.titel, start: v.start, langd: v.langd, vardNamn: vardNamn(v), vard: v.vard, vantrum: v.vantrum, direkt: v.direkt, deltagare: v.deltagare.map((d) => ({ namn: deltagarNamn(d), typ: d.typ })),
      kund: k ? { id: k.id, namn: k.namn } : null, lank: gastLank(v) };
  }
  function markeraPagar(id) {
    const v = hamta(id); if (!v || v.status === 'avslutat') return;
    // Starta nu: mötet blir på riktigt först när man går in (utkastet loggas på kunden här, inte när arket skickades)
    if (v.status === 'utkast' && v.startLogg) { logga(v.startLogg, { kundId: v.kundId, affarId: v.affarId || undefined }); delete v.startLogg; }
    if (v.status !== 'pagar') { v.status = 'pagar'; v.borjade = v.borjade || new Date().toISOString(); spara(); ritaChatt(); }
  }
  // Ett "Starta nu" som avbröts i förhandsvisningen (eller en omladdning mitt i den) lämnar inget spökmöte efter sig
  function stadaUtkast() {
    const l = lista(); const fore = l.length;
    for (let i = l.length - 1; i >= 0; i--) if (l[i] && l[i].status === 'utkast') l.splice(i, 1);
    if (l.length !== fore) { spara(); rendera(); }
  }
  const ritaChatt = () => document.dispatchEvent(new CustomEvent('up-chatt-andrad'));
  function sparaSammanfattning(v, s) {
    if (!s) return;
    if (s.borjade && (!v.borjade || s.borjade < v.borjade)) v.borjade = s.borjade;
    if (s.slutade) v.slutade = s.slutade;
    if (+s.minuter > (v.minuter || 0)) v.minuter = Math.round(+s.minuter);
    (s.narvarande || []).forEach((n) => { if (n && n.namn && !v.narvarande.some((x) => x.namn === n.namn)) v.narvarande.push({ namn: String(n.namn).slice(0, 60), roll: String(n.roll || '').slice(0, 20) }); });
  }
  const klarPaminnelse = (v) => db().todos.forEach((t) => { if (t.videomote === v.id && !t.klar) { t.klar = true; t.klarTid = new Date().toISOString(); } });
  // Ett hållet möte (minst en till var med) syns på kunden även om anteckningen hoppas över – sparaAvslut skriver in anteckningen på samma rad
  function loggaHallet(v) {
    if (!v.kundId || v.aktivitet || v.narvarande.length < 2) return;
    const a = logga(`Videomöte (${Math.max(1, v.minuter || 1)} min) – ${v.titel}`.slice(0, 2000), { kundId: v.kundId, affarId: v.affarId || undefined, typ: 'mote' });
    v.aktivitet = a ? a.id : null;
  }
  // Efter mötet: anteckningen hamnar i kundens tidslinje som ett hållet möte, nästa steg blir en uppgift
  function sparaAvslut(id, d = {}) {
    const v = hamta(id); if (!v) return;
    const s = d.sammanfattning || {};
    sparaSammanfattning(v, s);
    v.status = 'avslutat'; v.slutade = v.slutade || new Date().toISOString();
    const min = Math.max(1, v.minuter || Math.round((new Date(v.slutade) - new Date(v.borjade || v.start)) / 6e4) || 1);
    v.minuter = min; v.anteckning = String(d.anteckning || '').trim().slice(0, 2000);
    if (d.sparaChatt && Array.isArray(s.chatt)) v.chatt = s.chatt.slice(-200).map((m) => ({ namn: String(m.namn || '').slice(0, 60), text: String(m.text || '').slice(0, 2000), tid: m.tid || null }));
    const rad = `Videomöte (${min} min)${v.anteckning ? `: ${v.anteckning}` : ` – ${v.titel}`}`.slice(0, 2000);
    const akt = v.aktivitet && (db().aktiviteter || []).find((a) => a.id === v.aktivitet);
    if (akt) akt.text = rad;
    else if (v.kundId) { const a = logga(rad, { kundId: v.kundId, affarId: v.affarId || undefined, typ: 'mote' }); v.aktivitet = a ? a.id : null; }
    klarPaminnelse(v);
    let ny = null;
    if (d.uppgift && String(d.uppgift.text || '').trim()) {
      const dag = d.uppgift.datum && /^\d{4}-\d{2}-\d{2}$/.test(d.uppgift.datum) ? d.uppgift.datum : dagStr(new Date(Date.now() + 2 * 864e5));
      ny = { id: nyId('t'), text: String(d.uppgift.text).trim().slice(0, 120), datum: dag, klar: false, ...(v.kundId ? { kundId: v.kundId } : {}), ...(v.affarId ? { affarId: v.affarId } : {}), ansvarig: K.jag };
      db().todos.push(ny);
    }
    spara(); rendera();
    const k = v.kundId && kund(v.kundId);
    toast(`Mötet är sparat – ${k ? k.namn : v.titel}${ny ? ` · nästa steg: ${ny.text}` : ''}`, k ? { href: `#/kund/${k.id}`, text: 'Visa kunden' } : undefined);
  }

  /* --- Starta mötet ------------------------------------------------------------------------ */
  const jagInfo = () => { const u = mig(); return { id: u.id, namn: u.namn, initialer: initialer(u.namn) }; };
  function anslut(id) {
    const v = hamta(id);
    if (!v) { toast('Videomötet finns inte längre', undefined, 'varning'); return; }
    if (v.status === 'avslutat') { toast(`Mötet är redan avslutat – ${v.titel}`); return; }
    if (!inbjuden(v)) { toast(`Du är inte inbjuden till mötet – be ${fornamn(vardNamn(v))} bjuda in dig`, undefined, 'varning'); return; }
    if (!UPV.samtalUi || !UPV.samtalUi.oppna) { toast('Videomötet kunde inte startas – ladda om sidan', undefined, 'varning'); return; }
    stangArk();
    UPV.samtalUi.oppna({ mote: motesInfo(v.id), roll: v.vard === K.jag ? 'vard' : 'kollega', jag: jagInfo() });
  }
  // Mötet tar slut: det som hänt sparas på mötet även om man hoppar över anteckningen
  function kopplaUi() {
    if (!UPV.samtalUi || !UPV.samtalUi.vidSlut || kopplaUi.klar) return;
    kopplaUi.klar = true;
    UPV.samtalUi.vidSlut((s, mote) => {
      const v = mote && hamta(mote.id); if (!v) return;
      sparaSammanfattning(v, s);
      if (v.vard === K.jag || (s && /avslut|alla/.test(String(s.orsak || '')))) {
        v.status = 'avslutat'; v.slutade = v.slutade || (s && s.slutade) || new Date().toISOString();
        klarPaminnelse(v);
        loggaHallet(v);
      }
      spara(); rendera(); ritaChatt();
    });
  }
  kopplaUi();
  document.addEventListener('up-videomote', (ev) => { const d = ev.detail || {}; kopplaUi(); if (d.fas === 'mote' && d.id) markeraPagar(d.id); });
  // Mötets lager stängs (data-vm-oppen försvinner): utkast som aldrig blev ett möte tas bort
  new MutationObserver(() => { if (!document.documentElement.hasAttribute('data-vm-oppen')) stadaUtkast(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-vm-oppen'] });
  setTimeout(stadaUtkast, 0);

  /* --- Boka-arket ------------------------------------------------------------------------- */
  const gastRad = (namn = '', epost = '', med = true) => `<div class="vm-boka__gast"><label class="vm-boka__med" title="Bjud in"><input type="checkbox" data-vm-med ${med ? 'checked' : ''} aria-label="Bjud in"></label>
    <label class="vm-falt"><span>Namn</span><input class="falt" data-vm-gnamn maxlength="60" value="${e(namn)}" placeholder="Förnamn Efternamn" autocomplete="off"></label>
    <label class="vm-falt"><span>E-post (valfritt)</span><input class="falt" data-vm-gepost type="email" maxlength="120" value="${e(epost)}" placeholder="namn@exempel.se" autocomplete="off"></label>
    <button type="button" class="ikonknapp vm-boka__bort" data-g="vm-gast-bort" title="Ta bort gästen" aria-label="Ta bort gästen">${ik('stang')}</button></div>`;
  function bokaArk(opt = {}) {
    if (SKARP) { toast('Videomöten finns bara i demoläget tills signalväxeln är på plats'); return; }
    const a = opt.affarId && affar(opt.affarId); const k = (opt.kundId && kund(opt.kundId)) || (a && kund(a.kundId)) || null;
    const imorgon = new Date(); imorgon.setDate(imorgon.getDate() + 1);
    const kollegor = (db().anvandare || []).filter((u) => u.id !== K.jag && u.roll !== 'admin' && arAktiv(u));
    const pk = kundKontakt(k);
    oppnaArk(`${arkHuvud(opt.startaNu ? 'Nytt videomöte' : 'Boka videomöte', opt.startaNu ? 'Starta direkt eller boka en tid. Gäster får en länk – inget konto eller program behövs.' : 'Gästen får en länk – inget konto eller program behövs.', 'video')}
      <form id="vm-boka-form" class="ark-kropp vm-boka" data-vm-boka ${k ? `data-kund="${e(k.id)}"` : ''} ${a ? `data-affar="${e(a.id)}"` : ''} novalidate>
        <label class="vm-falt"><span>Vad</span><input class="falt" name="titel" required maxlength="120" value="${e(`Videomöte${k ? ` – ${k.namn}` : ''}`)}"></label>
        <div class="vm-rad"><label class="vm-falt"><span>Dag</span><input class="falt" name="datum" type="date" required value="${e(opt.dag || dagStr(imorgon))}"></label>
          <label class="vm-falt"><span>Tid</span><input class="falt" name="tid" type="time" required value="${e(opt.tid || '10:00')}"></label></div>
        <p class="vm-boka__rub" id="vm-langd-rub">Längd</p><div class="vm-langd" role="radiogroup" aria-labelledby="vm-langd-rub">${LANGDER.map((m) => `<label><input type="radio" name="langd" value="${m}" ${m === 45 ? 'checked' : ''}><span>${m} min</span></label>`).join('')}</div>
        <p class="vm-boka__rub">Gäster <small>Får en länk – inget konto eller program behövs</small></p>
        <div class="vm-boka__gaster" data-vm-gaster>${k ? gastRad(pk ? pk.namn : '', pk ? pk.epost || '' : '') : ''}</div>
        <button type="button" class="knapp knapp-kontur knapp-liten vm-boka__ny" data-g="vm-gast-ny">${ik('plus')}Lägg till gäst</button>
        ${kollegor.length ? `<p class="vm-boka__rub">Kollegor <small>Går direkt in i mötet</small></p><div class="vm-kollegor">${kollegor.map((u) => `<label><input type="checkbox" name="kollega" value="${e(u.id)}"><span class="avatar" aria-hidden="true">${e(initialer(u.namn))}</span><span><b>${e(u.namn)}</b><small>${e(u.titel || '')}</small></span></label>`).join('')}</div>` : ''}
        <details class="vm-boka__mer"><summary>${ik('chevron')}Mötesinställningar</summary>
          <label class="vm-vaxel"><input type="checkbox" name="vantrum" checked><span>Gäster väntar i väntrummet</span><small>Du släpper in dem när du är redo.</small></label>
          <fieldset class="vm-boka__direkt"><legend>Vem går direkt in?</legend><label><input type="radio" name="direkt" value="foretag" checked><span>Alla i företaget</span></label><label><input type="radio" name="direkt" value="jag"><span>Bara jag</span></label></fieldset></details>
        <p class="vm-boka__fel" data-vm-fel role="alert" hidden></p>
        <p class="vm-arlig">${ik('info')}${e(ARLIG)}</p></form>
      <div class="ark-fot"><button class="knapp knapp-spok" type="button" data-g="stang-ark">Avbryt</button>${opt.startaNu ? `<button class="knapp knapp-kontur" type="submit" form="vm-boka-form" data-vm-nu title="Mötet börjar nu – bjud in fler inifrån mötet">${ik('blixt')}Starta nu</button>` : ''}<button class="knapp knapp-accent" type="submit" form="vm-boka-form">${ik('video')}Boka och bjud in</button></div>`);
  }
  document.addEventListener('submit', (ev) => {
    const t = ev.target; if (!t.matches || !t.matches('[data-vm-boka]')) return;
    ev.preventDefault();
    // Felraden rullas i bild (på mobil låg den under arkets fot) och fältet får fokus utan att rulla bort den
    const fel = (txt, falt) => { const p = t.querySelector('[data-vm-fel]'); if (falt) falt.focus({ preventScroll: true }); if (p) { p.textContent = txt; p.hidden = false; requestAnimationFrame(() => p.scrollIntoView({ block: 'nearest', behavior: 'smooth' })); } };
    const nu = !!(ev.submitter && ev.submitter.hasAttribute('data-vm-nu'));
    const titel = t.titel.value.trim();
    if (!titel) { fel('Skriv vad mötet gäller.', t.titel); return; }
    if (!nu && !t.datum.value) { fel('Välj en dag.', t.datum); return; }
    const start = nu ? new Date() : new Date(`${t.datum.value}T${t.tid.value || '10:00'}:00`);
    if (Number.isNaN(start.getTime())) { fel('Dagen eller tiden går inte att läsa.', t.datum); return; }
    const deltagare = []; let felFalt = null;
    t.querySelectorAll('.vm-boka__gast').forEach((r) => {
      const med = r.querySelector('[data-vm-med]'); const n = r.querySelector('[data-vm-gnamn]'); const ep = r.querySelector('[data-vm-gepost]');
      const namn = n.value.trim().slice(0, 60); const epost = ep.value.trim().slice(0, 120);
      if (!med.checked || (!namn && !epost)) return;
      if (epost && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost)) { felFalt = felFalt || ep; return; }
      deltagare.push({ typ: 'gast', namn: namn || epost.split('@')[0], epost });
    });
    if (felFalt) { fel('E-postadressen ser inte ut att stämma – rätta den eller lämna fältet tomt.', felFalt); return; }
    t.querySelectorAll('input[name=kollega]:checked').forEach((c) => deltagare.push({ typ: 'kollega', id: c.value }));
    if (deltagare.length > MAX - 1) { fel(`Ett videomöte rymmer ${MAX} personer – du och ${MAX - 1} till. Ta bort någon.`); return; }
    if (!deltagare.length && !nu) { fel('Bjud in minst en gäst eller kollega.', t.querySelector('[data-vm-gnamn]') || t.querySelector('[data-g="vm-gast-ny"]')); return; }
    const langd = +(t.querySelector('input[name=langd]:checked') || { value: 45 }).value;
    // Starta nu utan inbjudan per e-post: ett utkast tills man är inne i mötet (stadaUtkast tar bort det vid Avbryt)
    const utkast = nu && !deltagare.some((d) => d.typ === 'gast' && d.epost);
    const v = skapa({ titel, start, langd, kundId: t.getAttribute('data-kund') || null, affarId: t.getAttribute('data-affar') || null, deltagare, vantrum: t.vantrum.checked, direkt: (t.querySelector('input[name=direkt]:checked') || { value: 'foretag' }).value, utanPaminnelse: nu, utkast });
    const startText = `${nu ? 'Videomöte startat' : 'Videomöte bokat'}: ${v.titel} ${narText(v)}`;
    if (v.kundId) { if (utkast) v.startLogg = startText; else logga(startText, { kundId: v.kundId, affarId: v.affarId || undefined }); }
    spara(); rendera();
    // Starta nu: rakt in i mötet – utom när gäster med e-post ska få inbjudan först (Anslut nu finns i arket)
    if (nu && !deltagare.some((d) => d.typ === 'gast' && d.epost)) { anslut(v.id); return; }
    inbjudanArk(v.id, !nu);
  });

  /* --- Inbjudan-arket --------------------------------------------------------------------- */
  function inbjudanHtml(v) {
    const l = gastLank(v);
    return `<div class="vm-inbjudan">
      <label class="vm-falt vm-inbjudan__lank"><span>Möteslänk</span><span class="vm-inbjudan__rad"><input class="falt" readonly value="${e(l)}" aria-label="Möteslänk"><button type="button" class="knapp knapp-kontur knapp-liten" data-g="vm-kopiera-lank" data-id="${e(v.id)}">${ik('lank')}Kopiera länk</button></span></label>
      ${v.deltagare.length ? `<ul class="vm-inbjudan__lista">${v.deltagare.map((d, n) => { const namn = deltagarNamn(d); return `<li><span class="avatar" aria-hidden="true">${e(initialer(namn))}</span><span class="vm-inbjudan__vem"><b>${e(namn)}</b><small>${d.typ === 'kollega' ? 'Kollega · går direkt in' : `Gäst${d.epost ? ` · ${e(d.epost)}` : ''}`}</small></span><button type="button" class="knapp knapp-kontur knapp-liten" data-g="vm-mejla" data-id="${e(v.id)}" data-vem="${n}">${ik('mejl')}Skicka inbjudan</button></li>`; }).join('')}</ul>` : '<p class="vm-inbjudan__tom">Ingen är inbjuden än – kopiera länken och skicka den själv.</p>'}
      <div class="vm-inbjudan__knappar"><button type="button" class="knapp knapp-kontur knapp-liten" data-g="vm-ics" data-id="${e(v.id)}">${ik('kalender')}Ladda ner kalenderfil</button><button type="button" class="knapp knapp-kontur knapp-liten" data-g="vm-kopiera-text" data-id="${e(v.id)}">${ik('lank')}Kopiera inbjudningstext</button></div>
      <p class="vm-arlig">${ik('info')}${e(ARLIG)}</p></div>`;
  }
  function inbjudanArk(id, ny) {
    const v = hamta(id); if (!v) return;
    oppnaArk(`${arkHuvud(ny ? 'Inbjudan är klar' : 'Inbjudan', `Videomöte · ${narText(v)}`, 'video')}<div class="ark-kropp">${inbjudanHtml(v)}</div>
      <div class="ark-fot"><button class="knapp knapp-spok" type="button" data-g="stang-ark">Klar</button><button class="knapp knapp-accent" type="button" data-g="vm-anslut" data-id="${e(v.id)}">${ik('video')}Anslut nu</button></div>`);
    if (ny) toast(`Videomötet är bokat – ${v.titel}, ${narText(v)}`);
  }

  /* --- Klick ------------------------------------------------------------------------------ */
  function nytt() {
    if (mig().roll === 'admin') { toast('Videomöten startas från ett säljkonto – administratörskontot har inga kund- eller kollegamöten'); return; }
    // På Kundmöte: den kund och affär som är vald under Vem träffar du? (samma väg som inspelningen)
    const f = document.querySelector('form[data-form="starta-mote"]');
    bokaArk({ startaNu: true, kundId: f && f.kundId ? f.kundId.value : null, affarId: f && f.affarId ? f.affarId.value : null });
  }
  const G = {
    'vm-nytt': () => nytt(),
    'vm-boka': (el) => bokaArk({ kundId: el.dataset.kund, affarId: el.dataset.affar, dag: el.dataset.dag }),
    'vm-anslut': (el) => anslut(el.dataset.id),
    'vm-inbjudan': (el) => inbjudanArk(el.dataset.id),
    'vm-gast-ny': (el) => {
      const f = el.closest('form'); const yta = f && f.querySelector('[data-vm-gaster]'); if (!yta) return;
      if (yta.children.length >= MAX - 1) { toast(`Ett videomöte rymmer ${MAX} personer – du och ${MAX - 1} till`); return; }
      yta.insertAdjacentHTML('beforeend', gastRad());
      const n = yta.lastElementChild.querySelector('[data-vm-gnamn]'); if (n) n.focus();
    },
    'vm-gast-bort': (el) => { const r = el.closest('.vm-boka__gast'); const f = el.closest('form'); if (!r) return; r.remove(); const nasta = f && (f.querySelector('[data-vm-gnamn]') || f.querySelector('[data-g="vm-gast-ny"]')); if (nasta) nasta.focus(); },
    'vm-kopiera-lank': (el) => { const v = hamta(el.dataset.id); if (v) kopiera(gastLank(v), 'Länken är kopierad'); },
    'vm-kopiera-text': (el) => { const v = hamta(el.dataset.id); if (v) kopiera(inbjudningstext(v.id), 'Inbjudningstexten är kopierad'); },
    'vm-mejla': (el) => { const v = hamta(el.dataset.id); if (!v) return; const d = v.deltagare[+el.dataset.vem]; if (!d) return; location.href = mailto(v.id, d); toast('Mejlet är öppnat i ditt mejlprogram – inget skickas förrän du klickar på Skicka där'); },
    'vm-ics': (el) => { const v = hamta(el.dataset.id); if (!v) return; ics(v.id); toast('Kalenderfilen är nedladdad – öppna den för att lägga mötet i din kalender'); },
    // Kameraknappen i chatten: mötet startar direkt med alla i samtalet och ett kort läggs i tråden
    'vm-chatt-starta': (el) => {
      if (SKARP) { toast('Videomöten finns bara i demoläget tills signalväxeln är på plats'); return; }
      const c = db().chatt; const kid = el.dataset.kanal; const k = c && (c.kanaler || []).find((x) => x.id === kid); if (!k) return;
      const v = skapaDirekt({ kanal: kid, kollegor: k.medlemmar || [], titel: k.typ === 'grupp' && k.namn ? `Videomöte – ${k.namn}` : '' });
      c.meddelanden.push({ id: nyId('m'), kanal: kid, av: K.jag, tid: new Date().toISOString(), text: 'Startade ett videomöte', videomote: v.id });
      spara(); document.dispatchEvent(new CustomEvent('up-chatt-andrad')); anslut(v.id);
    },
  };

  /* --- Sidan #/videomote[/id] -------------------------------------------------------------- */
  const LAGE_TEXT = { pagar: 'Pågår', nu: 'Börjar snart', kommande: 'Bokat', passerat: 'Tiden har passerat', avslutat: 'Avslutat' };
  function rad(v) {
    const s = new Date(v.start); const k = v.kundId && kund(v.kundId); const l = lage(v);
    return `<li class="vm-lista__rad" data-lage="${l}"><span class="vm-lista__datum"><b>${s.getDate()}</b><small>${e(s.toLocaleDateString('sv-SE', { month: 'short' }).replace(/\./g, ''))}</small></span>
      <a class="vm-lista__text" href="#/videomote/${e(v.id)}"><b>${e(v.titel)}</b><small>${e(`${kl(s)}\u2060–\u2060${kl(slut(v))}`)}${k ? ` · ${e(k.namn)}` : ''} · ${e(LAGE_TEXT[l])}${l === 'avslutat' && v.minuter ? ` · ${v.minuter} min` : ''}</small></a>
      ${l === 'avslutat' || l === 'passerat' || !inbjuden(v) ? '' : `<button type="button" class="knapp ${l === 'nu' || l === 'pagar' ? 'knapp-accent' : 'knapp-kontur'} knapp-liten" data-g="vm-anslut" data-id="${e(v.id)}">${ik('video')}Anslut</button>`}</li>`;
  }
  // Anslut bara för värden och de inbjudna kollegorna (som kalendern) – chefen och admin ser mötet men kliver inte in i det
  const inbjuden = (v) => !!v && (v.vard === K.jag || (v.deltagare || []).some((d) => d.typ === 'kollega' && d.id === K.jag));
  const synligFor = (v) => { const j = mig(); return j.roll === 'admin' || j.chef || v.vard === j.id || v.deltagare.some((d) => d.typ === 'kollega' && d.id === j.id); };
  const hjalte = (titel, text, knappar = '') => sidhjalte({ ogon: 'Videomöten', titel, text, knappar });
  // Skarpt läge: ingen signalväxel än – samma låsta hjälte som chatten i stället för en sida utan väg vidare
  const lastSkarpt = () => hjalte('Videomöten kommer i den skarpa versionen', 'Videomöten finns i demoläget. Den skarpa versionen behöver en signalväxel och en TURN-server så att kunden och säljaren når varandra mellan olika datorer – tills dess håller du mötet i ert vanliga verktyg.', `<a class="knapp knapp-accent" href="#/mote">${ik('presentation')}Kundmöte</a><a class="knapp knapp-kontur" href="#/">${ik('hem')}Till översikten</a>`);
  function visaLista() {
    if (SKARP) return lastSkarpt();
    const alla = lista().filter((v) => v.status !== 'utkast' && synligFor(v));
    const kommande = alla.filter((v) => !['avslutat', 'passerat'].includes(lage(v))).sort((a, b) => (a.start < b.start ? -1 : 1));
    const senaste = alla.filter((v) => ['avslutat', 'passerat'].includes(lage(v))).sort((a, b) => (a.start < b.start ? 1 : -1)).slice(0, 10);
    const kan = mig().roll !== 'admin' && !SKARP;
    // Så går det till: tre steg under listan (samma form som på Enkäter) – listan står i sin egen höjd, ingen stor tom yta under den
    const saGarDet = `<section class="kort vm-sa"><div class="kort-huvud"><h2>${ik('kompass')}Så går det till</h2></div><ol class="enk-sa-steg">
      <li><span class="enk-nr" aria-hidden="true">1</span><span><b>Boka eller starta</b><small>Här, på kundsidan, affären, i Kundmöte eller från chatten.</small></span></li>
      <li><span class="enk-nr" aria-hidden="true">2</span><span><b>Bjud in</b><small>Kopiera länken, mejla den eller lägg mötet i kalendern – kunden behöver inget konto eller program.</small></span></li>
      <li><span class="enk-nr" aria-hidden="true">3</span><span><b>Efter mötet</b><small>Ett hållet möte hamnar i kundens tidslinje – anteckningen på samma rad, nästa steg som en uppgift.</small></span></li></ol></section>`;
    return `${hjalte('Videomöten', 'Möten med kunder och kollegor via länk, direkt i CRM:et. Kunden behöver inget konto eller program.', kan ? `<button type="button" class="knapp knapp-accent" data-g="vm-nytt">${ik('video')}Nytt videomöte</button>` : '')}
      <div class="vm-sida-rum">${alla.length ? `<section class="kort"><div class="kort-huvud"><h2>${ik('kalender')}Kommande</h2></div>${kommande.length ? `<ul class="vm-lista">${kommande.map(rad).join('')}</ul>` : '<p class="vm-inbjudan__tom">Inga bokade videomöten.</p>'}</section>
        ${senaste.length ? `<section class="kort"><div class="kort-huvud"><h2>${ik('klocka')}Senaste</h2></div><ul class="vm-lista">${senaste.map(rad).join('')}</ul></section>` : ''}${saGarDet}`
        : `<section class="kort vm-tomt">${ik('video')}<p>${kan ? 'Inga videomöten än. Starta ett här, från kundsidan eller från chatten.' : 'Inga videomöten än. Säljarna bokar dem från kundsidan, affären eller chatten.'}</p>${kan ? `<button type="button" class="knapp knapp-accent" data-g="vm-nytt">${ik('video')}Nytt videomöte</button>` : ''}</section>`}
      <p class="vm-arlig">${ik('info')}${e(SKARP ? 'Videomöten finns bara i demoläget tills signalväxeln är på plats.' : ARLIG)}</p></div>`;
  }
  let forstaAdress = location.hash; let autoStartad = false;
  function visaMote(id) {
    if (SKARP) return lastSkarpt();
    const v = hamta(id);
    if (!v) return `${hjalte('Videomöten', 'Videomötet finns inte – det kan ha tagits bort.')}`;
    const k = v.kundId && kund(v.kundId); const a = v.affarId && affar(v.affarId); const l = lage(v); const u = anv(v.vard); const s = new Date(v.start);
    const fakta = `<dl class="vm-fakta"><div><dt>När</dt><dd>${e(`${langDag(s).replace(/^./, (c) => c.toUpperCase())} kl. ${kl(s)}\u2060–\u2060${kl(slut(v))}`)}</dd></div><div><dt>Värd</dt><dd>${e(u ? u.namn : '–')}</dd></div>
      ${k ? `<div><dt>Kund</dt><dd><a href="#/kund/${e(k.id)}">${e(k.namn)}</a></dd></div>` : ''}${a ? `<div><dt>Affär</dt><dd><a href="#/affar/${e(a.id)}">${e(a.titel)}</a></dd></div>` : ''}
      <div><dt>Väntrum</dt><dd>${v.vantrum ? 'Gäster väntar tills du släpper in dem' : 'Av – gäster går direkt in'}</dd></div><div><dt>Läge</dt><dd>${e(LAGE_TEXT[l])}${v.minuter ? ` · ${v.minuter} min` : ''}</dd></div></dl>`;
    const efter = l === 'avslutat' ? `<section class="kort vm-sida__efter"><div class="kort-huvud"><h2>${ik('anteckning')}Efter mötet</h2></div>${v.narvarande.length ? `<p class="vm-sida__narv"><b>Med i mötet:</b> ${e(v.narvarande.map((n) => n.namn + (n.roll === 'gast' ? ' (gäst)' : '')).join(', '))}</p>` : ''}${v.anteckning ? `<p class="vm-sida__ant">${e(v.anteckning)}</p>` : '<p class="vm-inbjudan__tom">Ingen anteckning sparades.</p>'}</section>` : '';
    // Länken till en kollega startar förhandsvisningen direkt – bara när sidan öppnades med den
    if (!autoStartad && location.hash === forstaAdress && l !== 'avslutat' && !SKARP && inbjuden(v)) { autoStartad = true; setTimeout(() => { if (location.hash === forstaAdress) anslut(v.id); }, 500); }
    return `${hjalte(v.titel, `Videomöte · ${LAGE_TEXT[l]}`, l === 'avslutat' || !inbjuden(v) ? `<a class="knapp knapp-kontur" href="#/videomote">${ik('pil-v')}Alla videomöten</a>` : `<button type="button" class="knapp knapp-accent" data-g="vm-anslut" data-id="${e(v.id)}">${ik('video')}Anslut</button><a class="knapp knapp-kontur" href="#/videomote">${ik('pil-v')}Alla videomöten</a>`)}
      <div class="vm-sida-rum"><section class="kort vm-sida">${fakta}${l === 'avslutat' ? '' : inbjudanHtml(v)}</section>${efter}</div>`;
  }
  // Kortet i chatten
  function kort(id) {
    const v = hamta(id);
    if (!v) return `<div class="ch-vmkort" data-lage="borta">${ik('video')}<span><b>Videomöte</b><small>Mötet finns inte längre</small></span></div>`;
    const l = lage(v);
    return `<div class="ch-vmkort" data-lage="${l}">${ik('video')}<span><b>Videomöte</b><small>${e(LAGE_TEXT[l])}${l === 'avslutat' && v.minuter ? ` · ${v.minuter} min` : ''}</small></span>${l === 'avslutat' || l === 'passerat' || !inbjuden(v) ? '' : `<button type="button" class="knapp knapp-accent knapp-liten" data-g="vm-anslut" data-id="${e(v.id)}">Anslut</button>`}</div>`;
  }

  UPV.e = e;
  UPV.rita = () => rendera();
  UPV.toast = (rubrik, text, ikon) => toast(text ? `${rubrik} – ${text}` : rubrik, undefined, ikon === 'varning' ? 'varning' : undefined);
  UPV.videomote = { skapa, skapaDirekt, hamta, nasta, lank, mailto, inbjudningstext, ics, bokaArk, inbjudanArk, motesInfo, markeraPagar, sparaAvslut, anslut, inbjuden, lage, narText, nytt, kort, ARLIG };
  void $; void LED;
  const vagar = [
    [/^#\/videomote$/, visaLista, 'videomote', 'Videomöten'],
    [/^#\/videomote\/([\w-]+)$/, visaMote, 'videomote', 'Videomöte'],
  ];
  return { vagar, G, FORM: {} };
};
