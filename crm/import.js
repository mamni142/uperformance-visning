/* Uperformance CRM – Importera kunder (#/import, 2026-11-23). Användaren: "Import av befintliga kunddata … så jag kan lägga in kundens
   riktiga data sen när vi byggt klart crm".

   Fyra steg: 1 Välj fil (.xlsx eller CSV, mallen som CSV) → 2 Koppla kolumner (gissas ur rubrikerna, går att ändra) → 3 Granska (rader
   grupperas per företag, jämförs med registret; fel och varningar per rad) → 4 Klart (kvitto + Ångra importen).
   Läsningen sker helt i webbläsaren – inga bibliotek: CSV med gissad avgränsare och teckenkodning, .xlsx som zip (DecompressionStream)
   med delade strängar och första bladet. Inget skickas någonstans förrän man trycker Importera; då går allt den vanliga vägen (spara()
   → localStorage i demon, POST /api/andringar i skarpt läge, i omgångar om 200).
   Data: nya kunder får import: { id, fil, tid }, kontakter som läggs till får importId – det är vad Ångra tar bort. Ångra i skarpt läge
   kräver admin (bara admin får ta bort kunder på servern). Behörighet: sälj (även chefen) och admin – testteamet läser bara. */
window.UPImport = (K) => {
  'use strict';
  const { e, ik, toast, spara, rendera, logga, anv, sidhjalte, plural, nyId, $, idag } = K;
  const db = () => K.db;
  const MAX_RADER = 5000;
  const kan = () => { const u = anv(K.jag) || {}; return u.roll === 'salj' || u.roll === 'admin' || !!u.admin; };
  const kanAngra = () => { const u = anv(K.jag) || {}; return !K.SKARP ? kan() : u.roll === 'admin' || !!u.admin; };
  // Samma regler som i crm.js (namnNyckel rad ~8197, telOk ~7990) – kopierade hit eftersom de inte finns i BYGG
  const namnNyckel = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/[\s,.]+(ab|aktiebolag|hb|handelsbolag|kb|kommanditbolag)\.?(\s*\(publ\))?$/u, '').trim();
  const telOk = (t) => { const v = String(t || '').trim(); if (!v) return true; const n = v.replace(/\D/g, '').length; return /^[+\d\s()\-–]+$/.test(v) && n >= 7 && n <= 15; };
  const epostOk = (s) => (typeof EPOST_MONSTER !== 'undefined' ? EPOST_MONSTER : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/).test(s);
  const siffror = (s) => String(s || '').replace(/\D/g, '');

  /* Målfälten och rubrikerna som gissas fram (jämförs utan versaler, mellanslag och skiljetecken) */
  const FALT = [
    { id: 'namn', namn: 'Företag / klubb', krav: true, syn: ['foretag', 'företag', 'foretagsnamn', 'företagsnamn', 'kund', 'kundnamn', 'organisation', 'organisationsnamn', 'bolag', 'klubb', 'forening', 'förening', 'foreningsnamn', 'company', 'companyname', 'account', 'foretagklubb', 'företagklubb'] },
    { id: 'typ', namn: 'Typ (företag/klubb)', syn: ['typ', 'kundtyp', 'type', 'kategori'] },
    { id: 'orgnr', namn: 'Org.nr', syn: ['orgnr', 'organisationsnummer', 'orgnummer', 'organisationsnr', 'orgno'] },
    { id: 'stad', namn: 'Ort', syn: ['ort', 'stad', 'postort', 'city', 'kommun'] },
    { id: 'bransch', namn: 'Bransch / idrott', syn: ['bransch', 'idrott', 'verksamhet', 'sport', 'industry', 'branschidrott'] },
    { id: 'anstallda', namn: 'Anställda / medlemmar', syn: ['anstallda', 'anställda', 'antalanstallda', 'antalanställda', 'medlemmar', 'storlek', 'employees'] },
    { id: 'kontakt', namn: 'Kontaktperson', syn: ['kontaktperson', 'kontakt', 'kontaktnamn', 'contact', 'contactname', 'person', 'namn', 'name'] },
    { id: 'fornamn', namn: 'Förnamn', syn: ['fornamn', 'förnamn', 'firstname'] },
    { id: 'efternamn', namn: 'Efternamn', syn: ['efternamn', 'lastname', 'surname'] },
    { id: 'roll', namn: 'Roll', syn: ['roll', 'titel', 'befattning', 'title', 'role'] },
    { id: 'epost', namn: 'E-post', syn: ['epost', 'e-post', 'email', 'emailadress', 'epostadress', 'mail', 'mejl', 'mailadress'] },
    { id: 'tel', namn: 'Telefon', syn: ['telefon', 'tel', 'mobil', 'mobilnummer', 'telefonnummer', 'phone', 'mobile', 'telnr'] },
    { id: 'anteckning', namn: 'Anteckning', syn: ['anteckning', 'anteckningar', 'kommentar', 'notering', 'noteringar', 'ovrigt', 'övrigt', 'notes', 'note'] },
  ];
  const nyckelText = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/[\s._\-/()]+/g, '');
  const MALL = ['Företag/klubb', 'Typ', 'Org.nr', 'Ort', 'Bransch/idrott', 'Anställda', 'Kontaktperson', 'Roll', 'E-post', 'Telefon', 'Anteckning'];

  const ui = { steg: 1, fil: null, fel: '', laser: false, koppling: {}, befintlig: 'komplettera', senaste: null };

  /* ---------- Läsning ---------- */
  function avkoda(buf) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (err) { return new TextDecoder('windows-1252').decode(buf); }
  }
  function lasCsv(text) {
    text = text.replace(/^﻿/, '');
    const forsta = text.split(/\r?\n/, 1)[0] || '';
    const sep = [';', '\t', ','].map((s) => [s, forsta.split(s).length - 1]).sort((a, b) => b[1] - a[1])[0][0];
    const rader = []; let rad = [], falt = '', citat = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (citat) {
        if (c === '"') { if (text[i + 1] === '"') { falt += '"'; i++; } else citat = false; } else falt += c;
      } else if (c === '"' && falt === '') citat = true;
      else if (c === sep) { rad.push(falt); falt = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; rad.push(falt); rader.push(rad); rad = []; falt = ''; }
      else falt += c;
      if (rader.length > MAX_RADER + 50) break;
    }
    if (falt !== '' || rad.length) { rad.push(falt); rader.push(rad); }
    return rader;
  }
  // .xlsx = zip: läs centralkatalogen och packa upp med DecompressionStream('deflate-raw')
  function zipLasare(buf) {
    const dv = new DataView(buf); let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Filen går inte att läsa som Excel (.xlsx). Spara den som .xlsx eller CSV och försök igen.');
    const antal = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true); const filer = new Map();
    for (let i = 0; i < antal && dv.getUint32(p, true) === 0x02014b50; i++) {
      const metod = dv.getUint16(p + 10, true), komp = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), kl = dv.getUint16(p + 32, true), lok = dv.getUint32(p + 42, true);
      filer.set(new TextDecoder().decode(new Uint8Array(buf, p + 46, nl)), { metod, komp, lok }); p += 46 + nl + el + kl;
    }
    return async (namn) => {
      const f = filer.get(namn); if (!f) return null;
      const start = f.lok + 30 + dv.getUint16(f.lok + 26, true) + dv.getUint16(f.lok + 28, true);
      const data = new Uint8Array(buf, start, f.komp);
      if (f.metod === 0) return new TextDecoder().decode(data);
      if (f.metod !== 8 || typeof DecompressionStream === 'undefined') throw new Error('Webbläsaren kan inte packa upp filen – spara den som CSV och försök igen.');
      return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    };
  }
  const kolIndex = (ref) => { const m = /^([A-Z]+)/.exec(ref); let n = 0; for (const c of m ? m[1] : 'A') n = n * 26 + c.charCodeAt(0) - 64; return n - 1; };
  async function lasXlsx(buf) {
    const las = zipLasare(buf); const xml = (t) => (t ? new DOMParser().parseFromString(t, 'application/xml') : null);
    const ss = xml(await las('xl/sharedStrings.xml'));
    const delade = ss ? [...ss.getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')) : [];
    let blad = 'xl/worksheets/sheet1.xml';
    const wb = xml(await las('xl/workbook.xml')), rels = xml(await las('xl/_rels/workbook.xml.rels'));
    const forsta = wb && wb.getElementsByTagName('sheet')[0];
    if (forsta && rels) {
      const rid = forsta.getAttribute('r:id') || forsta.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      const rel = [...rels.getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === rid);
      if (rel) { const t = rel.getAttribute('Target'); blad = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''); }
    }
    const sh = xml(await las(blad)); if (!sh) throw new Error('Hittade inget kalkylblad i filen.');
    const rader = [];
    for (const row of sh.getElementsByTagName('row')) {
      const r = Number(row.getAttribute('r')) - 1; const ut = []; let auto = 0;
      for (const c of row.getElementsByTagName('c')) {
        const ref = c.getAttribute('r'); const col = ref ? kolIndex(ref) : auto; auto = col + 1;
        const typ = c.getAttribute('t'); const v = c.getElementsByTagName('v')[0]; const vt = v ? v.textContent : '';
        ut[col] = typ === 's' ? (delade[Number(vt)] ?? '') : typ === 'inlineStr' ? [...c.getElementsByTagName('t')].map((t) => t.textContent).join('') : typ === 'b' ? (vt === '1' ? 'Ja' : 'Nej') : vt;
      }
      rader[Number.isFinite(r) && r >= 0 ? r : rader.length] = Array.from(ut, (x) => x ?? '');
      if (rader.length > MAX_RADER + 50) break;
    }
    return Array.from(rader, (x) => x || []);
  }

  async function lasFil(fil) {
    ui.laser = true; ui.fel = ''; rendera();
    try {
      if (fil.size > 15 * 1024 * 1024) throw new Error('Filen är större än 15 MB – dela upp den.');
      const buf = await fil.arrayBuffer(); const u8 = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
      const arZip = u8[0] === 0x50 && u8[1] === 0x4b;
      if (/\.xls$/i.test(fil.name) && !arZip) throw new Error('Det gamla Excelformatet (.xls) går inte att läsa – spara som .xlsx eller CSV.');
      let rader = arZip ? await lasXlsx(buf) : lasCsv(avkoda(buf));
      rader = rader.map((r) => r.map((c) => String(c ?? '').replace(/\s+/g, ' ').trim()));
      const rubrik = rader.findIndex((r) => r.filter(Boolean).length >= 2);
      if (rubrik < 0) throw new Error('Hittade ingen rubrikrad – första raden ska ha kolumnernas namn (t.ex. Företag, E-post).');
      const data = rader.slice(rubrik + 1).filter((r) => r.some(Boolean));
      if (!data.length) throw new Error('Filen har rubriker men inga rader under dem.');
      if (data.length > MAX_RADER) throw new Error(`Filen har ${data.length} rader – högst ${MAX_RADER} åt gången. Dela upp den.`);
      const rubriker = rader[rubrik];
      ui.fil = { namn: fil.name, rubriker, rubrikRad: rubrik, rader: rader.slice(rubrik + 1) };
      ui.koppling = gissaKoppling(rubriker); ui.steg = 2;
    } catch (err) { ui.fel = err.message || 'Filen gick inte att läsa.'; }
    ui.laser = false; rendera();
  }

  function gissaKoppling(rubriker) {
    const ut = {}; const tagna = new Set();
    // exakta träffar först, i fältens ordning – "Namn" blir kontakt bara om inget annat fält tar den
    for (const f of FALT) {
      const i = rubriker.findIndex((r, j) => !tagna.has(j) && f.syn.includes(nyckelText(r)));
      if (i >= 0) { ut[i] = f.id; tagna.add(i); }
    }
    // delträffar ("Kontaktperson e-post", "Telefon arbete")
    rubriker.forEach((r, i) => {
      if (tagna.has(i) || !r) return; const n = nyckelText(r);
      const f = FALT.find((x) => !Object.values(ut).includes(x.id) && x.syn.some((s) => s.length >= 4 && n.includes(s)));
      if (f) { ut[i] = f.id; tagna.add(i); }
    });
    return ut;
  }

  /* ---------- Planen: rader → företag med kontakter, jämfört med registret ---------- */
  function tolkaTyp(s) { const n = nyckelText(s); if (!n) return ''; return /klubb|forening|förening|idrott|ik$|if$|ff$|bk$/.test(n) ? 'klubb' : 'foretag'; }
  function tolkaTel(s) { let v = String(s || '').trim(); if (/^\d{9}$/.test(v) && v[0] === '7') v = '0' + v; return v; }
  function plan() {
    const f = ui.fil; const kol = {}; Object.entries(ui.koppling).forEach(([i, id]) => { if (id) kol[id] = Number(i); });
    const v = (rad, id) => (kol[id] == null ? '' : String(rad[kol[id]] ?? '').trim());
    const grupper = new Map(); const fel = []; const varningar = []; let forra = null;
    f.rader.forEach((rad, i) => {
      const nr = f.rubrikRad + 2 + i;
      if (!rad.some(Boolean)) return;
      const kontaktNamn = v(rad, 'kontakt') || [v(rad, 'fornamn'), v(rad, 'efternamn')].filter(Boolean).join(' ');
      let namn = v(rad, 'namn');
      if (!namn) {
        if (forra && (kontaktNamn || v(rad, 'epost') || v(rad, 'tel'))) namn = forra.namn;
        else { fel.push({ nr, text: 'Saknar företagets eller klubbens namn' }); return; }
      }
      const orgnr = v(rad, 'orgnr');
      const nyckel = (namn === (forra && forra.namn) && !orgnr) ? forra.nyckel : (siffror(orgnr).length >= 10 ? 'o' + siffror(orgnr).slice(-10) : 'n' + namnNyckel(namn));
      let g = grupper.get(nyckel);
      if (!g) { g = { nyckel, namn, typ: '', orgnr: '', stad: '', bransch: '', anstallda: null, anteckningar: [], kontakter: [], rader: [] }; grupper.set(nyckel, g); }
      forra = { namn: g.namn, nyckel };
      g.rader.push(nr);
      if (!g.typ) g.typ = tolkaTyp(v(rad, 'typ'));
      if (!g.orgnr && orgnr) g.orgnr = orgnr;
      if (!g.stad) g.stad = v(rad, 'stad');
      if (!g.bransch) g.bransch = v(rad, 'bransch');
      if (g.anstallda == null && v(rad, 'anstallda')) { const n = parseInt(siffror(v(rad, 'anstallda')), 10); if (Number.isFinite(n)) g.anstallda = n; }
      if (v(rad, 'anteckning')) g.anteckningar.push(v(rad, 'anteckning'));
      let epost = v(rad, 'epost').toLowerCase(); let tel = tolkaTel(v(rad, 'tel'));
      if (epost && !epostOk(epost)) { varningar.push({ nr, text: `E-posten "${epost}" ser inte rätt ut – den hoppas över` }); epost = ''; }
      if (tel && !telOk(tel)) { varningar.push({ nr, text: `Telefonnumret "${tel}" ser inte rätt ut – det hoppas över` }); tel = ''; }
      if (kontaktNamn || epost || tel) {
        const kn = kontaktNamn || (epost ? epost.split('@')[0] : 'Kontaktperson');
        const finns = g.kontakter.find((c) => (epost && c.epost === epost) || namnNyckel(c.namn) === namnNyckel(kn));
        if (finns) { if (!finns.epost && epost) finns.epost = epost; if (!finns.tel && tel) finns.tel = tel; }
        else g.kontakter.push({ namn: kn, roll: v(rad, 'roll'), epost, tel, rad: nr });
      }
    });
    // Ingen typ i filen: namn som slutar på förening/klubb eller en vanlig klubbförkortning (IF, IK, BK, FF, SK …) blir klubb
    for (const g of grupper.values()) if (!g.typ) g.typ = /(förening|forening|klubb|\b(if|ik|bk|ff|sk|fk|hk|gif|aik|ois))$/i.test(g.namn.trim()) ? 'klubb' : 'foretag';
    const nya = [], befintliga = [];
    for (const g of grupper.values()) {
      const k = db().kunder.find((x) => (g.orgnr && siffror(x.orgnr).length >= 10 && siffror(x.orgnr).slice(-10) === siffror(g.orgnr).slice(-10)) || namnNyckel(x.namn) === namnNyckel(g.namn));
      if (!k) { nya.push(g); continue; }
      const nyaK = g.kontakter.filter((c) => !(k.kontakter || []).some((b) => (c.epost && b.epost && b.epost.toLowerCase() === c.epost) || namnNyckel(b.namn) === namnNyckel(c.namn)));
      befintliga.push({ g, k, nyaK });
    }
    const nyaKontakter = nya.reduce((s, g) => s + g.kontakter.length, 0) + (ui.befintlig === 'komplettera' ? befintliga.reduce((s, b) => s + b.nyaK.length, 0) : 0);
    return { nya, befintliga, fel, varningar, nyaKontakter };
  }

  /* ---------- Importen och Ångra ---------- */
  function importera() {
    if (!kan()) return;
    const p = plan(); const id = nyId('imp'); const tid = new Date().toISOString(); const fil = ui.fil.namn;
    const kunder = [], kontakter = [], aktiviteter = [];
    const nyAkt = (kundId, text) => { const x = { id: nyId('x'), kundId, typ: 'anteckning', text, av: K.jag, tid }; db().aktiviteter.push(x); aktiviteter.push(x.id); };
    for (const g of p.nya) {
      const k = { id: nyId('k'), namn: g.namn, typ: g.typ || 'foretag', bransch: g.bransch, stad: g.stad, orgnr: g.orgnr, anstallda: g.anstallda, viaKlubb: null, skapad: idag(),
        kontakter: g.kontakter.map((c) => ({ id: nyId('p'), namn: c.namn, roll: c.roll, epost: c.epost, tel: c.tel, importId: id })), import: { id, fil, tid } };
      if (k.typ === 'klubb') k.klubbavtal = { procent: Math.round((typeof KLUBBMOTORN !== 'undefined' ? KLUBBMOTORN.provision : 0.1) * 100), form: 'oklart', sedan: idag(), partners: 0 };
      db().kunder.push(k); kunder.push(k.id);
      logga(`Importerad från ${fil}${k.kontakter.length ? ` med ${plural(k.kontakter.length, 'kontaktperson', 'kontaktpersoner')}` : ''}.`, { kundId: k.id });
      g.anteckningar.forEach((t) => nyAkt(k.id, t));
    }
    if (ui.befintlig === 'komplettera') for (const { k, nyaK } of p.befintliga) {
      if (!nyaK.length) continue;
      if (!Array.isArray(k.kontakter)) k.kontakter = [];
      for (const c of nyaK) { const n = { id: nyId('p'), namn: c.namn, roll: c.roll, epost: c.epost, tel: c.tel, importId: id }; k.kontakter.push(n); kontakter.push([k.id, n.id]); }
      logga(`${plural(nyaK.length, 'kontaktperson importerad', 'kontaktpersoner importerade')} från ${fil}.`, { kundId: k.id });
    }
    ui.senaste = { id, fil, kunder, kontakter, aktiviteter, nyaKontakter: p.nyaKontakter, kompletterade: ui.befintlig === 'komplettera' ? p.befintliga.filter((b) => b.nyaK.length).length : 0, hoppade: p.fel.length, varningar: p.varningar.length };
    ui.steg = 4; spara(); rendera();
    toast(`${plural(kunder.length, 'kund importerad', 'kunder importerade')}${kontakter.length ? ` och ${plural(kontakter.length, 'kontakt', 'kontakter')} tillagda hos befintliga` : ''}`, { href: '#/kunder', text: 'Visa kunderna' }, 'kunder');
  }
  function angra() {
    const s = ui.senaste; if (!s || !kanAngra()) return;
    const d = db(); const ids = new Set(s.kunder);
    d.kunder = d.kunder.filter((k) => !ids.has(k.id));
    d.aktiviteter = d.aktiviteter.filter((a) => !ids.has(a.kundId) && !s.aktiviteter.includes(a.id));
    for (const [kundId, kid] of s.kontakter) { const k = d.kunder.find((x) => x.id === kundId); if (k) k.kontakter = (k.kontakter || []).filter((c) => c.id !== kid); }
    for (const [kundId] of s.kontakter) { const k = d.kunder.find((x) => x.id === kundId); if (k) logga(`Importen från ${s.fil} ångrades – kontaktpersonerna togs bort.`, { kundId }); }
    ui.senaste = null; ui.steg = 1; ui.fil = null; spara(); rendera();
    toast('Importen är ångrad', null, 'bock');
  }

  /* ---------- Vyn ---------- */
  const STEG = ['Välj fil', 'Koppla kolumner', 'Granska', 'Klart'];
  const stegrad = () => `<ol class="imp-steg" aria-label="Steg">${STEG.map((t, i) => `<li${i + 1 === ui.steg ? ' aria-current="step"' : ''}${i + 1 < ui.steg ? ' data-klar' : ''}><span>${i + 1 < ui.steg ? ik('bock') : i + 1}</span>${e(t)}</li>`).join('')}</ol>`;

  function stegFil() {
    return `<section class="kort imp-kort">
      <label class="imp-slapp" data-imp-slapp${ui.laser ? ' data-laser' : ''}>
        <input type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-imp-fil class="sr">
        <span class="imp-slapp-ikon">${ik('uppladdning')}</span>
        <strong>${ui.laser ? 'Läser filen …' : 'Släpp filen här eller klicka för att välja'}</strong>
        <small>Excel (.xlsx) eller CSV · högst ${MAX_RADER.toLocaleString('sv-SE')} rader · en rad per kontaktperson</small>
      </label>
      ${ui.fel ? `<p class="imp-fel" role="alert">${ik('varning')}<span>${e(ui.fel)}</span></p>` : ''}
      <div class="imp-hjalp">
        <div><h3>${ik('dokument')}Så ska filen se ut</h3>
          <p>Första raden är rubrikerna. En rad per kontaktperson – står samma företag på flera rader blir det ett företag med flera kontakter.
          Tomt företagsnamn räknas som samma företag som raden ovanför. Kolumnerna behöver inte heta exakt som i mallen – du kopplar dem i nästa steg.</p></div>
        <div><h3>${ik('info')}Det här händer inte</h3>
          <p>Inget sparas förrän du har granskat och tryckt Importera. Kunder som redan finns skapas inte en gång till – de jämförs på org.nr och namn.</p></div>
      </div>
      <div class="knapprad"><button class="knapp knapp-kontur" type="button" data-g="imp-mall">${ik('ladda-ner')}Ladda ner mallen (CSV)</button></div>
    </section>`;
  }

  function stegKoppla() {
    const f = ui.fil; const exempel = (i) => f.rader.map((r) => r[i]).filter(Boolean).slice(0, 2).join(' · ');
    const valt = Object.values(ui.koppling);
    const saknarNamn = !valt.includes('namn');
    return `<section class="kort imp-kort">
      <div class="imp-kort-huvud"><h3>${ik('dokument')}${e(f.namn)}</h3><span class="imp-diskret">${plural(f.rader.filter((r) => r.some(Boolean)).length, 'rad', 'rader')} · ${plural(f.rubriker.filter(Boolean).length, 'kolumn', 'kolumner')}</span></div>
      <p class="imp-diskret">Varje kolumn i filen hamnar i fältet till höger. Vi har gissat utifrån rubrikerna – ändra där det inte stämmer, eller välj Hoppa över.</p>
      <div class="imp-koppla" role="list">${f.rubriker.map((r, i) => r || exempel(i) ? `<div class="imp-koppla-rad" role="listitem">
          <div class="imp-koppla-fran"><strong>${e(r || `Kolumn ${i + 1}`)}</strong><small>${e(exempel(i) || 'tom')}</small></div>
          <span class="imp-koppla-pil" aria-hidden="true">${ik('pil')}</span>
          <div class="imp-koppla-val"><select class="falt" data-imp-koppla="${i}" aria-label="Fält för kolumnen ${e(r || i + 1)}">
            <option value="">Hoppa över</option>${FALT.map((x) => `<option value="${x.id}"${ui.koppling[i] === x.id ? ' selected' : ''}>${e(x.namn)}</option>`).join('')}
          </select></div></div>` : '').join('')}</div>
      ${saknarNamn ? `<p class="imp-fel" role="alert">${ik('varning')}<span>Välj vilken kolumn som har företagets eller klubbens namn – den behövs.</span></p>` : ''}
      <div class="knapprad imp-fot"><button class="knapp knapp-spok" type="button" data-g="imp-borja-om">Välj en annan fil</button>
        <button class="knapp knapp-accent" type="button" data-g="imp-granska"${saknarNamn ? ' disabled' : ''}>Granska ${ik('pil')}</button></div>
    </section>`;
  }

  function stegGranska() {
    const p = plan(); const komp = p.befintliga.filter((b) => b.nyaK.length);
    const rad = (g, status, ton, under) => `<li class="imp-rad"><span class="imp-rad-ikon" data-ton="${ton}">${ik(g.typ === 'klubb' ? 'klubb' : 'kunder')}</span>
      <div class="imp-rad-text"><strong>${e(g.namn)}</strong><small>${e([g.typ === 'klubb' ? 'Klubb' : 'Företag', g.orgnr, g.stad, g.bransch].filter(Boolean).join(' · '))}</small>${under ? `<small>${under}</small>` : ''}</div>
      <span class="imp-chip" data-ton="${ton}">${e(status)}</span></li>`;
    const visa = 40;
    return `<div class="imp-tal">
        <div class="imp-tal-kort" data-ton="mint"><b>${p.nya.length}</b><span>${p.nya.length === 1 ? 'ny kund' : 'nya kunder'}</span></div>
        <div class="imp-tal-kort" data-ton="is"><b>${p.nyaKontakter}</b><span>${p.nyaKontakter === 1 ? 'ny kontaktperson' : 'nya kontaktpersoner'}</span></div>
        <div class="imp-tal-kort" data-ton="gul"><b>${p.befintliga.length}</b><span>finns redan</span></div>
        <div class="imp-tal-kort" data-ton="${p.fel.length ? 'rod' : 'neutral'}"><b>${p.fel.length}</b><span>${p.fel.length === 1 ? 'rad hoppas över' : 'rader hoppas över'}</span></div>
      </div>
      ${p.befintliga.length ? `<section class="kort imp-kort"><div class="imp-kort-huvud"><h3>${ik('kunder')}Kunder som redan finns</h3></div>
        <p class="imp-diskret">${plural(p.befintliga.length, 'företag', 'företag')} i filen finns redan i registret (samma org.nr eller namn). Kunden skapas inte igen.</p>
        <div class="imp-val" role="group" aria-label="Kunder som redan finns">
          <button type="button" aria-pressed="${ui.befintlig === 'komplettera'}" data-g="imp-befintlig" data-val="komplettera">Lägg till nya kontakter${komp.length ? ` (${p.befintliga.reduce((s, b) => s + b.nyaK.length, 0)})` : ''}</button>
          <button type="button" aria-pressed="${ui.befintlig === 'hoppa'}" data-g="imp-befintlig" data-val="hoppa">Hoppa över dem</button></div>
        <ul class="imp-lista">${p.befintliga.slice(0, visa).map((b) => rad({ ...b.g, namn: b.k.namn, typ: b.k.typ, orgnr: b.k.orgnr || b.g.orgnr, stad: b.k.stad || b.g.stad, bransch: b.k.bransch || b.g.bransch },b.nyaK.length && ui.befintlig === 'komplettera' ? `+ ${plural(b.nyaK.length, 'kontakt', 'kontakter')}` : 'Inget nytt', 'gul', `Rad ${b.g.rader.join(', ')}`)).join('')}</ul></section>` : ''}
      <section class="kort imp-kort"><div class="imp-kort-huvud"><h3>${ik('plus')}Nya kunder</h3><span class="imp-diskret">${p.nya.length}</span></div>
        ${p.nya.length ? `<ul class="imp-lista">${p.nya.slice(0, visa).map((g) => rad(g, g.kontakter.length ? plural(g.kontakter.length, 'kontakt', 'kontakter') : 'Ingen kontakt', 'mint',
          e(g.kontakter.slice(0, 3).map((c) => [c.namn, c.epost].filter(Boolean).join(', ')).join(' · ')) + (g.kontakter.length > 3 ? ' …' : ''))).join('')}</ul>
          ${p.nya.length > visa ? `<p class="imp-diskret">+ ${p.nya.length - visa} till</p>` : ''}` : '<p class="imp-diskret">Alla företag i filen finns redan.</p>'}</section>
      ${p.fel.length || p.varningar.length ? `<section class="kort imp-kort"><div class="imp-kort-huvud"><h3>${ik('varning')}Fel och varningar</h3></div>
        <ul class="imp-problem">${[...p.fel.map((x) => ({ ...x, fel: true })), ...p.varningar].sort((a, b) => a.nr - b.nr).slice(0, 60).map((x) => `<li${x.fel ? ' data-fel' : ''}><span>Rad ${x.nr}</span>${e(x.text)}</li>`).join('')}</ul>
        <p class="imp-diskret">Rader med fel hoppas över, resten importeras. Rätta i filen och läs in den igen om du vill ha med dem.</p></section>` : ''}
      <div class="knapprad imp-fot"><button class="knapp knapp-spok" type="button" data-g="imp-tillbaka">Tillbaka till kolumnerna</button>
        <button class="knapp knapp-accent" type="button" data-g="imp-kor"${!p.nya.length && !(ui.befintlig === 'komplettera' && komp.length) ? ' disabled' : ''}>${ik('uppladdning')}Importera ${plural(p.nya.length, 'kund', 'kunder')}</button></div>`;
  }

  function stegKlart() {
    const s = ui.senaste;
    if (!s) return '';
    return `<section class="kort imp-kort imp-klart" role="status">
      <span class="imp-klart-ikon">${ik('bock')}</span>
      <h3>Importen är klar</h3>
      <p>${plural(s.kunder.length, 'ny kund', 'nya kunder')}${s.kontakter.length ? ` och ${plural(s.kontakter.length, 'kontaktperson', 'kontaktpersoner')} hos ${plural(s.kompletterade, 'befintlig kund', 'befintliga kunder')}` : ''} från ${e(s.fil)}.${s.hoppade ? ` ${plural(s.hoppade, 'rad', 'rader')} hoppades över.` : ''}</p>
      <p class="imp-diskret">Varje kund har fått raden "Importerad från ${e(s.fil)}" i tidslinjen. Importen går att ångra så länge du står kvar här.</p>
      <div class="knapprad"><a class="knapp knapp-accent" href="#/kunder">${ik('kunder')}Visa kunderna</a>
        <button class="knapp knapp-kontur" type="button" data-g="imp-borja-om">${ik('uppladdning')}Importera en fil till</button>
        ${kanAngra() ? `<button class="knapp knapp-spok" type="button" data-g="imp-angra">Ångra importen</button>` : ''}</div>
      ${!kanAngra() ? '<p class="imp-diskret">Bara en administratör kan ångra en import (det tar bort kunder).</p>' : ''}
    </section>`;
  }

  function visa() {
    if (!kan()) return `${sidhjalte({ ogon: 'Kundregistret', titel: 'Importera kunder', text: 'Import görs av sälj och administratören – testteamet läser kundregistret.' })}`;
    const innehall = ui.steg === 1 ? stegFil() : ui.steg === 2 ? stegKoppla() : ui.steg === 3 ? stegGranska() : stegKlart();
    return `${sidhjalte({ ogon: 'Kundregistret', titel: 'Importera', accent: 'kunder', klass: 'sidhjalte-import',
        text: 'Lägg in befintliga kunder och kontaktpersoner från Excel eller CSV. Du ser allt innan något sparas.',
        knappar: `<a class="knapp knapp-spok" href="#/kunder">${ik('kunder')}Till kunderna</a><button class="knapp knapp-spok" type="button" data-g="imp-mall">${ik('ladda-ner')}Mallen</button>` })}
      <div class="imp-rum">${stegrad()}${innehall}</div>`;
  }

  /* ---------- Händelser ---------- */
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.matches && t.matches('[data-imp-fil]') && t.files && t.files[0]) { lasFil(t.files[0]); t.value = ''; }
    if (t.matches && t.matches('[data-imp-koppla]')) {
      const i = t.dataset.impKoppla; const v = t.value;
      // ett fält kan bara komma från en kolumn – en annan kolumn med samma fält släpps
      if (v) for (const [j, id] of Object.entries(ui.koppling)) if (id === v && j !== i) delete ui.koppling[j];
      if (v) ui.koppling[i] = v; else delete ui.koppling[i];
      rendera();
    }
  });
  const iSlapp = (ev) => ev.target.closest && ev.target.closest('[data-imp-slapp]');
  document.addEventListener('dragover', (ev) => { const z = iSlapp(ev); if (!z) return; ev.preventDefault(); z.setAttribute('data-over', ''); });
  document.addEventListener('dragleave', (ev) => { const z = iSlapp(ev); if (z && !z.contains(ev.relatedTarget)) z.removeAttribute('data-over'); });
  document.addEventListener('drop', (ev) => {
    const z = iSlapp(ev); if (!z) return; ev.preventDefault(); z.removeAttribute('data-over');
    const fil = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]; if (fil) lasFil(fil);
  });

  const G = {
    'imp-mall': () => K.laddaNerCsv('Uperformance-importmall', [MALL,
      ['Exempelbolaget AB (exempel – ta bort raden)', 'Företag', '556000-0000', 'Göteborg', 'Bygg', '45', 'Anna Exempel', 'HR-chef', 'anna@exempel.se', '070-000 00 00', 'Träffades på mässan'],
      ['', '', '', '', '', '', 'Erik Exempel', 'VD', 'erik@exempel.se', '', ''],
      ['Exempelklubben IF (exempel)', 'Klubb', '', 'Borås', 'Fotboll', '120', 'Sara Exempel', 'Kansliansvarig', 'sara@exempelklubben.se', '', '']]),
    'imp-granska': () => { if (!Object.values(ui.koppling).includes('namn')) return; ui.steg = 3; rendera(); },
    'imp-tillbaka': () => { ui.steg = 2; rendera(); },
    'imp-borja-om': () => { ui.steg = 1; ui.fil = null; ui.fel = ''; ui.senaste = null; rendera(); },
    'imp-befintlig': (el) => { ui.befintlig = el.dataset.val === 'hoppa' ? 'hoppa' : 'komplettera'; rendera(); },
    'imp-kor': () => importera(),
    'imp-angra': () => K.bekrafta({ titel: 'Ångra importen?', text: `${plural(ui.senaste ? ui.senaste.kunder.length : 0, 'kund', 'kunder')} och de kontaktpersoner som lades till tas bort.`, knapp: 'Ångra importen', fara: true, g: 'imp-angra-ok' }),
    'imp-angra-ok': () => { K.stangArk(); angra(); },
  };

  return { vagar: [[/^#\/import$/, visa, 'kunder', 'Importera kunder']], G, FORM: {}, kan };
};
