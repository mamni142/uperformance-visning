/* Uperformance – logiken för anonyma enkäter (2026-11-03). Delas av CRM:et (enkater.js), svarssidan (enkat.html)
   och kundens resultatsida (enkat-resultat.html) – ändra här, inte på flera ställen.

   Anonymt på riktigt: ett svar sparas som { enkat, dag, svar } – ingen tid på dagen, inget namn, ingen e-post, ingen
   webbläsar-id. Resultatet visas först när minst GRANS (5) har svarat, och en enskild frågas fördelning bara när minst
   GRANS har svarat på just den frågan (valfria frågor kan ha färre svar). Fritextsvaren visas sorterade i bokstavsordning,
   aldrig i den ordning de kom in, och bara sammanställt. Exporten (CSV) är sammanställningen – aldrig en rad per person.

   Datan: db.enkater[svarsnyckel] = { kundId, affarId, titel, intro, mall, fragor, mottagare, sista, skapad, skapadAv, andrad,
   stangd, resultat (kundens resultatnyckel), resultatSparrad, delad }; db.enkatsvar[id] = { enkat, dag, svar }.
   Filen kräver ingen DOM (samma regel som data.js och kundlogik.js). */
const ENKATLOGIK = (() => {
  'use strict';
  const GRANS = 5;
  const TYPER = { skala: 'Skala 1–5', janej: 'Ja eller nej', flerval: 'Flerval', fritext: 'Fritext' };
  const MAX = { fragor: 40, fraga: 240, alternativ: 10, alt: 80, etikett: 40, titel: 120, intro: 600, fritext: 1000, mottagare: 10000, dagar: 180 };
  const DAG = /^\d{4}-\d{2}-\d{2}$/;
  const rad = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  // Fritext: radbrytningar får stå kvar (högst två i rad), andra styrtecken och dolda riktningstecken tas bort
  const fritext = (s) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f​-‏‪-‮⁦-⁩]/g, ' ')
    .split('\n').map((x) => x.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX.fritext);
  const lista = (v) => (Array.isArray(v) ? v : []);
  const heltal = (v) => (typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? +v : NaN);

  /* Frågorna och enkäten som säljaren sparar -------------------------------------------------- */
  function rensaFraga(f, i) {
    const typ = TYPER[f && f.typ] ? f.typ : 'skala';
    const ut = { id: /^[a-z0-9]{1,12}$/i.test(String((f && f.id) || '')) ? String(f.id) : `f${i + 1}`, typ, text: rad(f && f.text, MAX.fraga), kravs: !!(f && f.kravs) };
    if (typ === 'skala') { const et = lista(f && f.etiketter); ut.etiketter = [rad(et[0], MAX.etikett) || 'Instämmer inte alls', rad(et[1], MAX.etikett) || 'Instämmer helt']; }
    if (typ === 'flerval') { ut.alternativ = lista(f && f.alternativ).map((x) => rad(x, MAX.alt)).filter(Boolean).slice(0, MAX.alternativ); ut.flera = !!(f && f.flera); }
    return ut;
  }
  /* Kontroll innan enkäten sparas: { ok, fel: [{ falt, fraga?, text }], enkat } */
  function kontrolleraEnkat(in_, idag) {
    const fel = [];
    const titel = rad(in_ && in_.titel, MAX.titel); if (!titel) fel.push({ falt: 'titel', text: 'Ge enkäten ett namn.' });
    const fragor = lista(in_ && in_.fragor).slice(0, MAX.fragor).map(rensaFraga);
    // Unika id:n (en flyttad eller kopierad fråga behåller sitt) – dubbletter får nya
    const sedda = new Set(); fragor.forEach((f, i) => { if (sedda.has(f.id)) { let n = i + 1; while (sedda.has(`f${n}`)) n++; f.id = `f${n}`; } sedda.add(f.id); });
    if (!fragor.length) fel.push({ falt: 'fragor', text: 'Lägg till minst en fråga.' });
    fragor.forEach((f, i) => {
      if (!f.text) fel.push({ falt: 'fraga', fraga: i, text: `Fråga ${i + 1} saknar text.` });
      if (f.typ === 'flerval' && f.alternativ.length < 2) fel.push({ falt: 'alternativ', fraga: i, text: `Fråga ${i + 1} behöver minst två svarsalternativ.` });
    });
    // Flerval: för många alternativ kapades förut tyst när enkäten sparades, och dubbletter godtogs – nu säger kontrollen det
    lista(in_ && in_.fragor).slice(0, MAX.fragor).forEach((f, i) => {
      if (!f || f.typ !== 'flerval') return;
      const alt = lista(f.alternativ).map((x) => rad(x, MAX.alt)).filter(Boolean);
      if (alt.length > MAX.alternativ) fel.push({ falt: 'alternativ', fraga: i, text: `Fråga ${i + 1} har ${alt.length} svarsalternativ – högst ${MAX.alternativ}.` });
      else if (new Set(alt.map((x) => x.toLocaleLowerCase('sv'))).size < alt.length) fel.push({ falt: 'alternativ', fraga: i, text: `Fråga ${i + 1} har två likadana svarsalternativ.` });
    });
    const m = heltal(in_ && in_.mottagare); const mRa = String((in_ && in_.mottagare) ?? '').trim().replace(',', '.');
    if (!(m >= 1 && m <= MAX.mottagare)) fel.push({ falt: 'mottagare', text: mRa && Number.isFinite(+mRa) && !Number.isInteger(+mRa) ? 'Skriv antalet mottagare som ett heltal, t.ex. 50.'
      : mRa && Number.isFinite(+mRa) ? `Antalet mottagare ska vara mellan 1 och ${MAX.mottagare.toLocaleString('sv-SE')}.` : 'Ange ungefär hur många som får länken.' });
    const sista = String((in_ && in_.sista) || '');
    if (!DAG.test(sista)) fel.push({ falt: 'sista', text: 'Välj sista svarsdag.' });
    else if (idag && sista < idag) fel.push({ falt: 'sista', text: 'Sista svarsdag kan inte ha passerat.' });
    else if (idag && sista > plusDagar(idag, MAX.dagar)) fel.push({ falt: 'sista', text: `Sista svarsdag kan ligga högst ${MAX.dagar} dagar fram.` });
    return { ok: !fel.length, fel, enkat: { titel, intro: rad(in_ && in_.intro, MAX.intro), fragor, mottagare: m >= 1 ? Math.min(MAX.mottagare, m) : null, sista } };
  }
  function plusDagar(iso, n) { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

  /* Läget ----------------------------------------------------------------------------------- */
  // oppen | stangd (säljaren stängde den) | utgangen (sista svarsdagen har passerat)
  const lage = (enk, idag) => (!enk ? 'saknas' : enk.stangd ? 'stangd' : idag && enk.sista && enk.sista < idag ? 'utgangen' : 'oppen');
  const hitta = (db, n) => (n && db && db.enkater && Object.prototype.hasOwnProperty.call(db.enkater, n) ? db.enkater[n] : null);
  const hittaResultat = (db, r) => { if (!r || !db || !db.enkater) return null; const e = Object.entries(db.enkater).find(([, x]) => x && x.resultat === r); return e ? { nyckel: e[0], enkat: e[1] } : null; };
  const svarFor = (db, n) => Object.values((db && db.enkatsvar) || {}).filter((s) => s && s.enkat === n);
  const kundNamn = (db, enk) => { const k = lista(db && db.kunder).find((x) => x.id === enk.kundId); return k ? k.namn : ''; };
  const saljNamn = (db, enk) => { const u = lista(db && db.anvandare).find((x) => x.id === enk.skapadAv); return u ? u.namn : ''; };

  /* Svarssidan ------------------------------------------------------------------------------- */
  const OGILTIG = { saknas: 404, stangd: 410, utgangen: 410 };
  function vySvar(db, n, idag) {
    const enk = hitta(db, n); const l = lage(enk, idag);
    if (l !== 'oppen') return { ok: false, fel: l, status: OGILTIG[l], meddelande: l, ...(enk ? { titel: enk.titel, foretag: kundNamn(db, enk), sista: enk.sista } : {}) };
    // Bara det som behövs för att svara – inget om svaren, mottagarna eller affären
    return { ok: true, vy: { titel: enk.titel, intro: enk.intro || '', foretag: kundNamn(db, enk), saljare: saljNamn(db, enk), sista: enk.sista,
      fragor: lista(enk.fragor).map((f, i) => rensaFraga(f, i)), exempel: !!enk.exempel } };
  }
  /* Ett svar: { ok, fel: { fragaId: text }, rent } – bara kända frågor, bara giltiga värden */
  function kontrolleraSvar(enk, svar) {
    const fel = {}; const rent = {}; const s = svar && typeof svar === 'object' ? svar : {};
    lista(enk && enk.fragor).forEach((f) => {
      const v = s[f.id]; let ok = null;
      if (f.typ === 'skala') { const x = heltal(v); if (x >= 1 && x <= 5) ok = x; }
      else if (f.typ === 'janej') { if (v === 'ja' || v === 'nej') ok = v; }
      else if (f.typ === 'flerval') {
        const n = lista(f.alternativ).length;
        const val = [...new Set((Array.isArray(v) ? v : v == null || v === '' ? [] : [v]).map(heltal).filter((x) => x >= 0 && x < n))].sort((a, b) => a - b);
        if (val.length && !f.flera && val.length > 1) fel[f.id] = 'Välj ett alternativ.';
        else if (val.length) ok = val;
      } else if (f.typ === 'fritext') { const t = fritext(v); if (t) ok = t; }
      if (ok != null) rent[f.id] = ok;
      else if (f.kravs && !fel[f.id]) fel[f.id] = f.typ === 'fritext' ? 'Skriv ett svar.' : 'Välj ett svar.';
    });
    if (!Object.keys(rent).length && !Object.keys(fel).length) fel._ = 'Svara på minst en fråga.';
    return { ok: !Object.keys(fel).length, fel, rent };
  }
  function taEmotSvar(db, n, svar, idag, id) {
    const enk = hitta(db, n); const l = lage(enk, idag);
    if (l !== 'oppen') return { ok: false, fel: l, status: OGILTIG[l], meddelande: l };
    const k = kontrolleraSvar(enk, svar);
    if (!k.ok) return { ok: false, fel: 'ogiltigt', status: 400, falt: k.fel, meddelande: 'Några svar saknas.' };
    db.enkatsvar = db.enkatsvar || {};
    db.enkatsvar[id] = { enkat: n, dag: idag, svar: k.rent };
    return { ok: true };
  }

  /* Sammanställningen ------------------------------------------------------------------------ */
  const decimal = (x) => (Math.round(x * 10) / 10).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function sammanstall(enk, svarLista) {
    const alla = lista(svarLista); const antal = alla.length; const mottagare = Math.max(1, +enk.mottagare || 1);
    // Resultatet räknas i omgångar om GRANS svar (2026-11-04, fynd sanna-A1): förut ritades det om efter varje nytt svar, och den som
    // visste vem som just svarade kunde jämföra före och efter och se exakt hens svar. Nu tas bara de första 5, 10, 15 … svaren med
    // (i den ordning de kom, dag först) – skillnaden mellan två uppdateringar är alltid minst fem personer. Antalet som svarat är live.
    const raknade = Math.floor(antal / GRANS) * GRANS;
    const urval = alla.map((s, i) => [s, i]).sort((a, b) => { const x = String(a[0].dag || ''); const y = String(b[0].dag || ''); return x < y ? -1 : x > y ? 1 : a[1] - b[1]; })
      .slice(0, raknade).map(([s]) => s);
    const visas = raknade >= GRANS;
    const fragor = lista(enk.fragor).map((f) => {
      const v = urval.map((s) => (s.svar || {})[f.id]).filter((x) => x != null && x !== '' && !(Array.isArray(x) && !x.length));
      const ut = { id: f.id, typ: f.typ, text: f.text, antal: v.length, visas: visas && v.length >= GRANS };
      if (!ut.visas) return ut;
      const del = (n, av) => ({ antal: n, andel: av ? n / av : 0 });
      if (f.typ === 'skala') {
        ut.etiketter = f.etiketter || ['', ''];
        ut.fordelning = [1, 2, 3, 4, 5].map((x) => ({ varde: x, etikett: String(x), ...del(v.filter((y) => +y === x).length, v.length) }));
        ut.medel = v.reduce((s2, y) => s2 + +y, 0) / v.length; ut.medelText = decimal(ut.medel);
        // Andelen som svarat 4 eller 5 – det man oftast vill veta ("hur många instämmer")
        ut.hog = v.filter((y) => +y >= 4).length / v.length;
      } else if (f.typ === 'janej') {
        ut.fordelning = [['ja', 'Ja'], ['nej', 'Nej']].map(([x, t]) => ({ varde: x, etikett: t, ...del(v.filter((y) => y === x).length, v.length) }));
      } else if (f.typ === 'flerval') {
        ut.flera = !!f.flera;
        ut.fordelning = lista(f.alternativ).map((t, i) => ({ varde: i, etikett: t, ...del(v.filter((y) => lista(y).includes(i)).length, v.length) }));
        if (ut.flera) ut.fordelning.sort((a, b) => b.antal - a.antal || a.varde - b.varde);
      } else if (f.typ === 'fritext') {
        ut.svar = v.map(String).sort((a, b) => a.localeCompare(b, 'sv'));
      }
      return ut;
    });
    // Inget datum för senaste svaret (fynd magnus-M12): när få har svarat kunde ett nytt svar kopplas till en viss dag
    return { antal, mottagare, andel: Math.min(1, antal / mottagare), visas, grans: GRANS, fragor, raknade, vantar: antal - raknade, nasta: raknade + GRANS };
  }
  /* Raden om omgångarna (CRM:et, utskriften och kundens sida): "Resultatet bygger på 20 av 23 svar …" – tom när alla räknas */
  function omgangText(sm, { stangd = false } = {}) {
    if (!sm || !sm.visas || !sm.vantar) return '';
    const n = sm.vantar;
    // "De sista 1 svar … de är för få" lät fel – ett svar har egen form
    return stangd ? `Resultatet bygger på ${sm.raknade} av ${sm.antal} svar. ${n === 1 ? 'Det sista svaret räknas inte in – ett enskilt svar kan inte visas utan att någon kan pekas ut.' : `De sista ${n} svaren räknas inte in – de är för få för att visas utan att någon kan pekas ut.`}`
      : `Resultatet bygger på ${sm.raknade} av ${sm.antal} svar och uppdateras i omgångar om ${GRANS}, så att ingen kan räkna ut vad den senaste svarade. ${n === 1 ? 'Ett nytt svar väntar' : `${n} nya svar väntar`} – nästa uppdatering vid ${sm.nasta} svar.`;
  }
  /* Kundens resultatlänk: under gränsen följer bara antalet med – inga frågeresultat lämnar sammanställningen */
  function vyResultat(db, r, idag) {
    const h = hittaResultat(db, r);
    if (!h) return { ok: false, fel: 'saknas', status: 404, meddelande: 'saknas' };
    const enk = h.enkat;
    if (enk.resultatSparrad) return { ok: false, fel: 'sparrad', status: 410, meddelande: 'sparrad', titel: enk.titel, foretag: kundNamn(db, enk) };
    const sm = sammanstall(enk, svarFor(db, h.nyckel));
    if (!sm.visas) sm.fragor = sm.fragor.map((f) => ({ id: f.id, typ: f.typ, text: f.text, antal: 0, visas: false }));
    // En dold fråga (färre än GRANS svar på just den) får inget antal på kundens sida (2026-11-04): "3 hittills" sa hur många som
    // hoppat över en valfri fråga och kunde kopplas till personer – kunden ser bara att den visas vid GRANS svar
    else sm.fragor = sm.fragor.map((f) => (f.visas ? f : { id: f.id, typ: f.typ, text: f.text, antal: null, visas: false }));
    return { ok: true, vy: { titel: enk.titel, foretag: kundNamn(db, enk), saljare: saljNamn(db, enk), sista: enk.sista, lage: lage(enk, idag), stangd: enk.stangd ? String(enk.stangd).slice(0, 10) : null, skapad: String(enk.skapad || '').slice(0, 10), exempel: !!enk.exempel, sm } };
  }

  /* CSV: sammanställningen per fråga och svarsalternativ (aldrig en rad per person) ------------- */
  function csvRader(enk, sm, foretag) {
    const pct = (x) => `${Math.round(x * 100)} %`;
    const ut = [['Enkät', enk.titel], ['Kund', foretag || ''], ['Svar', `${sm.antal} av cirka ${sm.mottagare}`], ...(sm.vantar ? [['Svar i resultatet', `${sm.raknade} (räknas i omgångar om ${GRANS})`]] : []), ['Anonymitetsgräns', `Resultat visas från ${GRANS} svar per fråga`], [],
      ['Nr', 'Fråga', 'Typ', 'Antal svar', 'Svarsalternativ', 'Antal', 'Andel', 'Medelvärde (1–5)']];
    sm.fragor.forEach((f, i) => {
      const bas = [String(i + 1), f.text, TYPER[f.typ] || f.typ, f.antal == null ? `färre än ${GRANS}` : String(f.antal)];
      if (!f.visas) { ut.push([...bas, `Visas inte – färre än ${GRANS} svar`, '', '', '']); return; }
      if (f.typ === 'fritext') { f.svar.forEach((t, j) => ut.push([...(j ? ['', '', '', ''] : bas), t, '', '', ''])); return; }
      f.fordelning.forEach((x, j) => ut.push([...(j ? ['', '', '', ''] : bas), f.typ === 'skala' ? `${x.etikett}${x.varde === 1 ? ` (${f.etiketter[0]})` : x.varde === 5 ? ` (${f.etiketter[1]})` : ''}` : x.etikett, String(x.antal), pct(x.andel), j === 0 && f.typ === 'skala' ? f.medelText : '']));
    });
    return ut;
  }

  /* Andel positiva (2026-11-04, kundens resultatsida): skalfrågan i tre delar som de stora verktygen – negativt = 1–2, neutralt = 3,
     positivt = 4–5 – och ett säkerhetsband för medelvärdet (medel ± t·s/√n, t för 95 % efter antalet svar). Bara på det som redan är
     sammanställt (omgångarna, gränsen per fråga) – inga korsningar mellan frågor, inga nya tal om enskilda svar. */
  const T95 = [12.71, 4.3, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.2, 2.18, 2.16, 2.14, 2.13, 2.12, 2.11, 2.1, 2.09, 2.09, 2.08, 2.07, 2.07, 2.06, 2.06, 2.06, 2.05, 2.05, 2.05];
  function delar(f) {
    if (!f || f.typ !== 'skala' || !f.visas || !f.antal) return null;
    const a = (v) => (lista(f.fordelning).find((x) => x.varde === v) || { antal: 0 }).antal;
    const n = f.antal; const neg = a(1) + a(2); const neu = a(3); const pos = a(4) + a(5);
    const s2 = n > 1 ? lista(f.fordelning).reduce((s, x) => s + x.antal * (x.varde - f.medel) ** 2, 0) / (n - 1) : 0;
    const m = (n - 1 <= T95.length ? T95[n - 2] || 1.96 : 1.96) * Math.sqrt(s2 / n);
    const lo = Math.max(1, f.medel - m); const hi = Math.min(5, f.medel + m);
    return { n, neg: neg / n, neu: neu / n, pos: pos / n, antal: { neg, neu, pos }, band: [lo, hi], bandText: `${decimal(lo)}–${decimal(hi)}`, oenighet: Math.min(neg, pos) / n };
  }
  /* Sammanfattningen med regler (ingen AI): andel positiva över alla skalfrågor, de starkaste och de att titta på (högst tre var,
     aldrig samma fråga i båda) och den mest delade frågan (minst 20 % både positiva och negativa). */
  function analys(sm) {
    const skala = lista(sm && sm.fragor).map((f, i) => { const d = delar(f); return d && { i, id: f.id, text: f.text, medelText: f.medelText, ...d }; }).filter(Boolean);
    const sum = skala.reduce((s, x) => ({ pos: s.pos + x.antal.pos, neg: s.neg + x.antal.neg, neu: s.neu + x.antal.neu, n: s.n + x.n }), { pos: 0, neg: 0, neu: 0, n: 0 });
    const total = sum.n ? { pos: sum.pos / sum.n, neg: sum.neg / sum.n, neu: sum.neu / sum.n, n: sum.n } : null;
    const ned = [...skala].sort((a, b) => b.pos - a.pos || a.neg - b.neg || a.i - b.i);
    const k = Math.min(3, Math.floor(skala.length / 2));
    const lika = skala.length > 1 && ned[0].pos === ned[ned.length - 1].pos;
    const starkast = lika ? [] : ned.slice(0, k); const attTitta = lika ? [] : ned.slice(ned.length - k).reverse();
    const delad = [...skala].filter((x) => x.oenighet >= 0.2).sort((a, b) => b.oenighet - a.oenighet || a.i - b.i)[0] || null;
    return { skala, total, starkast, attTitta, delad, lika, faSvar: !!(sm && sm.raknade < 10) };
  }
  /* Tredelad stapel (negativt | neutralt | positivt) – procenten står i delen när den ryms, annars i förklaringen under */
  function treStapel(d, { klass = '' } = {}) {
    const pct = (x) => `${Math.round(x * 100)} %`;
    const del = (k, v) => (v > 0 ? `<i data-del="${k}" style="flex-grow:${v.toFixed(4)}">${v >= 0.12 ? `<span>${pct(v)}</span>` : ''}</i>` : '');
    return `<span class="er-tre-stapel${klass ? ' ' + klass : ''}" role="img" aria-label="Negativt ${pct(d.neg)}, neutralt ${pct(d.neu)}, positivt ${pct(d.pos)}">${del('neg', d.neg)}${del('neu', d.neu)}${del('pos', d.pos)}</span>`;
  }

  /* Rapporten som HTML: CRM:ets resultatvy, utskriften och kundens resultatsida ritar samma sak (klasser er-*, enkat-rapport.css).
     esc = escape-funktionen (sidans e()); ik = ikonfunktionen eller null.
     Kundens sida (2026-11-04): tredelad = andel positiva + tredelad stapel + medel med säkerhetsband överst i skalfrågan, utan = typer
     som ritas på annat ställe (fritexten har ett eget avsnitt – numreringen följer ändå enkäten), id = prefix för frågornas id (hopp). */
  function fragorHtml(sm, { esc, ik = () => '', tredelad = false, utan = [], id = '' }) {
    const pct = (x) => `${Math.round(x * 100)} %`;
    // Rutnätet har två spalter på breda ytor: flerval och fritext tar hela raden, och en halv fråga som blir ensam på sin rad
    // (udda antal i följd) får också hela raden – inga hål i rutnätet
    // Ja/nej tar också hela raden (fynd ux-G13): bredvid en skalfråga sträcktes den till skalans höjd och blev halvtom
    const bred = (f) => f.visas && (f.typ === 'fritext' || f.typ === 'flerval' || f.typ === 'janej');
    const ensam = new Set(); let foljd = [];
    const med = (f) => !utan.includes(f.typ);
    sm.fragor.concat([{ typ: 'fritext', visas: true }]).forEach((f, i) => { if (i < sm.fragor.length && !med(f)) return; if (bred(f)) { if (foljd.length % 2) ensam.add(foljd[foljd.length - 1]); foljd = []; } else foljd.push(i); });
    return sm.fragor.map((f, i) => {
      if (!med(f)) return '';
      const d = tredelad ? delar(f) : null;
      const antalText = f.antal == null ? `färre än ${GRANS} svar` : `${f.antal} svar`;
      const hoger = f.visas && f.typ === 'skala' ? (d ? `<span class="er-medel er-medel-pos" title="Andel som svarat 4 eller 5"><b>${pct(d.pos)}</b><small>positiva</small></span>` : `<span class="er-medel" title="Medelvärde på skalan 1–5"><b>${esc(f.medelText)}</b><small>medel</small></span>`) : '';
      const huvud = `<header class="er-fraga-huvud"><span class="er-nr">${i + 1}</span><div><h3>${esc(f.text)}</h3><small>${esc(TYPER[f.typ] || '')} · ${antalText}</small></div>${hoger}</header>`;
      const attr = `${id ? ` id="${esc(id + f.id)}" tabindex="-1"` : ''}${d ? ' data-tre' : ''}`;
      if (!f.visas) return `<section class="er-fraga" data-typ="${esc(f.typ)}" data-dold${ensam.has(i) ? ' data-bred' : ''}${attr}>${huvud}<p class="er-dold">${ik('las')}Visas när minst ${GRANS} har svarat på frågan${f.antal ? ` (${f.antal} hittills)` : ''} – så att ingen kan pekas ut.</p></section>`;
      let kropp = '';
      if (d) {
        kropp = `<div class="er-tre">${treStapel(d)}<div class="er-tre-tecken"><span data-del="neg">Negativt (1–2) <b>${pct(d.neg)}</b></span><span data-del="neu">Neutralt (3) <b>${pct(d.neu)}</b></span><span data-del="pos">Positivt (4–5) <b>${pct(d.pos)}</b></span></div>
          <div class="er-band" title="Bandet visar hur säkert medelvärdet är: med fler svar blir det smalare."><span class="er-band-text">Medel <b>${esc(f.medelText)}</b> · troligen mellan ${esc(d.bandText)}</span><span class="er-band-spar" aria-hidden="true"><i class="er-band-yta" style="--fran:${((d.band[0] - 1) / 4).toFixed(3)};--till:${((d.band[1] - 1) / 4).toFixed(3)}"></i><i class="er-band-prick" style="--x:${((f.medel - 1) / 4).toFixed(3)}"></i></span><span class="er-band-skala" aria-hidden="true"><span>1</span><span>3</span><span>5</span></span></div></div>`;
      }
      if (f.typ === 'skala') {
        // Stapelns höjd = andelen av svaren (spåret är 100 %) – förut mot den största stapeln, och 30 % såg ut som en full stapel (fynd ux-G4)
        kropp += `${d ? '<p class="er-skala-rubrik">Fördelning 1–5</p>' : ''}<div class="er-skala" role="img" aria-label="${esc(`Fördelning: ${f.fordelning.map((x) => `${x.etikett}: ${x.antal} svar`).join(', ')}${f.typ === 'skala' && f.medelText ? `. Medelvärde ${f.medelText}` : ''}`)}">${f.fordelning.map((x) => `<div class="er-skala-del" data-v="${x.varde}"><span class="er-skala-tal">${pct(x.andel)}</span><span class="er-skala-stapel"><i style="--er-h:${x.andel.toFixed(3)}"></i></span><b>${x.varde}</b><small>${x.antal}</small></div>`).join('')}</div>
          <div class="er-skala-ander"><span>1 · ${esc(f.etiketter[0])}</span><span>5 · ${esc(f.etiketter[1])}</span></div>
          ${d ? '' : `<p class="er-sammanfatt">${pct(f.hog)} svarade 4 eller 5.</p>`}`;
      } else if (f.typ === 'janej' || f.typ === 'flerval') {
        kropp = `<ul class="er-staplar">${f.fordelning.map((x) => `<li data-v="${esc(x.varde)}"><span class="er-stapel-text"><b>${esc(x.etikett)}</b><small>${x.antal}</small></span><span class="er-stapel"><i style="--er-w:${x.andel.toFixed(3)}"></i></span><span class="er-stapel-pct">${pct(x.andel)}</span></li>`).join('')}</ul>${f.typ === 'flerval' && f.flera ? '<p class="er-sammanfatt">Flera svar var möjliga – andelen räknas av dem som svarade på frågan.</p>' : ''}`;
      } else if (f.typ === 'fritext') {
        kropp = `<ul class="er-fritext">${f.svar.map((t) => `<li>${esc(t).replace(/\n/g, '<br>')}</li>`).join('')}</ul><p class="er-sammanfatt">Visas i bokstavsordning, inte i den ordning svaren kom in.</p>`;
      }
      return `<section class="er-fraga" data-typ="${esc(f.typ)}"${ensam.has(i) ? ' data-bred' : ''}${attr}>${huvud}${kropp}</section>`;
    }).join('');
  }

  return Object.freeze({ GRANS, TYPER, MAX, lage, hitta, hittaResultat, svarFor, kundNamn, rensaFraga, kontrolleraEnkat, plusDagar,
    vySvar, kontrolleraSvar, taEmotSvar, sammanstall, omgangText, vyResultat, csvRader, delar, analys, treStapel, fragorHtml });
})();
if (typeof window !== 'undefined') window.ENKATLOGIK = ENKATLOGIK;
