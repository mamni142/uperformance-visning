/* Uperformance – kundens resultatsida för en anonym enkät (enkat-resultat.html#r=<nyckel>, 2026-11-03, omgjord 2026-11-04).
   Användaren: "och då ska sanna få typ statistik på vad dem 50 har svarat på anonymt" – och sedan "mycket bättre, modernare …
   animeringar, grafiken, layout … 3d och texterna och verktyg". Ritningen: team/forskning-enkatresultat.md (åtta avsnitt):
   1 hjälten "I korthet" (svarsfrekvensringen, andel positiva, tre insikter räknade med regler – ENKATLOGIK.analys, ingen AI),
   2 faktaremsan, 3 Starkast / Att titta på, 4 verktygsraden (Översikt / Fråga för fråga / Tabell, sortering, procent/antal,
   skriv ut, CSV, kopiera länk), 5 vyerna, 6 "Med egna ord" (citatkort, lokal sökning och ordchips för ord i minst tre svar),
   7 "Så skyddas svaren", 8 sidfoten.
   ANONYMITETEN: bara det som ENKATLOGIK.vyResultat ger – gränsen 5 per enkät och per fråga, omgångar om 5 (ett nytt svar ändrar
   inget förrän fem nya kommit), inga klockslag, inget antal på dolda frågor, ingen filtrering eller korsning mellan frågor,
   fritext i bokstavsordning. Rörelse en gång (räkneverk, ring, staplar – bara transform/opacity/stroke-dashoffset), djup med
   glaslager och en lätt lutning efter musen (bara fin pekare), allt av vid reducerad rörelse. Skriv ut = A4, oberoende av vald vy.
   Säljaren kan stänga länken i CRM:et – då säger sidan det. Kundens sidor är alltid temat Original. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ik = (namn) => `<svg class="ikon" aria-hidden="true"><use href="#i-${namn}"/></svg>`;
  const portal = $('#portal');
  const L = window.UPLager; const E = window.ENKATLOGIK; const P = window.UPPortal || {};
  const skarp = !!(L && L.skarp);
  const lugn = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finMus = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const nyckel = (location.hash.match(/r=([A-Za-z0-9]+)/) || [])[1] || '';
  // En ny nyckel i samma flik (inklistrad länk) – sidan läste förut bara nyckeln vid laddningen och visade den gamla enkäten
  addEventListener('hashchange', () => location.reload());
  const datum = (iso, ar) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', ...(ar ? { year: 'numeric' } : {}) }) : '');
  const idagIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dagarMellan = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5);
  const pct = (x) => `${Math.round(x * 100)} %`;
  const svar = (n) => `${n} svar`;
  const EP = 'e‑post'; // hårt bindestreck – "e-/post" bröts på 320 px
  const tillStart = `<div class="knapprad"><a class="knapp knapp-kontur" href="../">${ik('hem')}Till hemsidan</a></div>`;
  const OGILTIG = {
    saknas: skarp ? ['Länken hittades inte', 'Kontrollera att hela adressen kom med. Fungerar den ändå inte, kontakta din kontaktperson på Uperformance.', 'las']
      // Demoläget: enkäten finns bara i webbläsaren där den skapades – en annan dator eller ett privat fönster hittar den inte (fynd sanna-A3)
      : ['Resultatet finns inte i den här webbläsaren', 'Testversion: enkäten och svaren sparas i webbläsaren där enkäten skapades, så länken fungerar bara där. Öppna den på samma dator och i samma webbläsare – eller kontrollera att hela adressen kom med.', 'info'],
    sparrad: ['Resultatlänken är stängd', 'Uperformance har stängt den här länken. Kontakta din kontaktperson om du behöver resultatet igen.', 'las'],
    'inte-aktiverat': ['Enkäter är inte aktiverade', 'Anonyma enkäter finns bara i demoversionen av Uperformance än.', 'info'],
    natverk: ['Kunde inte hämta resultatet', 'Kontrollera internetanslutningen och försök igen.', 'varning'],
  };
  function visaOgiltig(r) {
    const [rubrik, text, ikon] = OGILTIG[r && r.fel] || (r && r.status === 0 ? OGILTIG.natverk : OGILTIG.saknas);
    portal.removeAttribute('data-anim');
    portal.innerHTML = `<section class="kort ogiltig" role="alert"><span class="ogiltig-ikon">${ik(ikon)}</span>${r && r.titel ? `<span class="etikett-liten">${e(r.titel)}${r.foretag ? ` · ${e(r.foretag)}` : ''}</span>` : ''}<h1>${e(rubrik)}</h1><p>${e(text)}</p>
      ${r && r.status === 0 ? '<div class="knapprad"><button class="knapp knapp-accent" type="button" data-forsok>Försök igen</button></div>' : tillStart}</section>`;
    document.title = `${rubrik} · Uperformance`;
    const vt = $('[data-verktyg-plats]'); if (vt) vt.hidden = true;
  }

  /* Läget i sidan: vald vy, sortering, procent/antal, fritextens sökningar. Vyn minns per resultatlänk (bara en bekvämlighet). */
  const MINNE = `up-enkat-res-vy:${nyckel}`;
  const VYER = [['oversikt', 'Översikt', 'stapel'], ['fraga', 'Fråga för fråga', 'kort'], ['tabell', 'Tabell', 'tabell']];
  const SORT = [['ordning', 'Frågeordning'], ['pos', 'Mest positiv'], ['neg', 'Minst positiv'], ['oenig', 'Mest delade åsikter']];
  const ui = { vy: 'oversikt', sort: 'ordning', som: 'pct', sok: {}, alla: {} };
  try { const v = localStorage.getItem(MINNE); if (VYER.some(([k]) => k === v)) ui.vy = v; } catch (err) { /* privat fönster */ }

  /* Byggstenar ---------------------------------------------------------------------------------------------------------- */
  const talet = (d, del) => (ui.som === 'antal' ? `${d.antal[del]}` : pct(d[del]));
  // Divergerande stapel: negativt åt vänster om mittlinjen, positivt åt höger, neutralt för sig (bricka bredvid)
  function divHtml(d, { liten = false } = {}) {
    const aria = `Negativt ${pct(d.neg)}, neutralt ${pct(d.neu)}, positivt ${pct(d.pos)}`;
    return `<span class="rk-div${liten ? ' rk-div-liten' : ''}" role="img" aria-label="${e(aria)}">
      <span class="rk-div-tal" data-del="neg">${talet(d, 'neg')}</span>
      <span class="rk-div-spar"><span class="rk-div-sida" data-del="neg"><i class="rk-vaxa" style="--w:${d.neg.toFixed(4)}"></i></span><span class="rk-div-mitt" aria-hidden="true"></span><span class="rk-div-sida" data-del="pos"><i class="rk-vaxa" style="--w:${d.pos.toFixed(4)}"></i></span></span>
      <span class="rk-div-tal" data-del="pos">${talet(d, 'pos')}</span></span>`;
  }
  const forklaring = (extra = '') => `<p class="rk-forklaring"><span><i data-del="neg"></i>Negativt (1–2)</span><span><i data-del="neu"></i>Neutralt (3)</span><span><i data-del="pos"></i>Positivt (4–5)</span>${extra}</p>`;
  // Svarsfrekvensen som ring: en båge (pathLength 100) som ritas fram en gång, 60 gradstreck och ett streck vid gränsen 5
  function ringHtml(s) {
    const p = Math.round(s.andel * 100);
    const streck = Array.from({ length: 60 }, (_, i) => { const v = (i / 60) * Math.PI * 2 - Math.PI / 2; const a = i % 5 ? 57.2 : 56; return `<line x1="${(60 + Math.cos(v) * a).toFixed(2)}" y1="${(60 + Math.sin(v) * a).toFixed(2)}" x2="${(60 + Math.cos(v) * 59).toFixed(2)}" y2="${(60 + Math.sin(v) * 59).toFixed(2)}"/>`; }).join('');
    const g = Math.min(1, E.GRANS / s.mottagare) * Math.PI * 2 - Math.PI / 2;
    const mal = s.mottagare > E.GRANS ? `<line class="rk-ring-mal" x1="${(60 + Math.cos(g) * 40).toFixed(2)}" y1="${(60 + Math.sin(g) * 40).toFixed(2)}" x2="${(60 + Math.cos(g) * 53).toFixed(2)}" y2="${(60 + Math.sin(g) * 53).toFixed(2)}"/>` : '';
    return `<div class="rk-ring" data-in${s.visas ? '' : ' data-under'} role="img" aria-label="${e(`${s.antal} av ungefär ${s.mottagare} har svarat (${p} %)`)}">
      <svg viewBox="0 0 120 120" aria-hidden="true"><g class="rk-ring-streck">${streck}</g><circle class="rk-ring-spar" cx="60" cy="60" r="46.5"/>
      <circle class="rk-ring-bage" cx="60" cy="60" r="46.5" pathLength="100" transform="rotate(-90 60 60)" style="--p:${Math.max(p, p ? 1 : 0)}"/>${mal}</svg>
      <span class="rk-ring-mitt" aria-hidden="true"><b><span data-rakna="${p}">${p}</span><small>%</small></b><em>har svarat</em></span></div>`;
  }
  const insiktKort = (typ, ikon, rubrik, text, under, id) => `<li class="rk-insikt" data-in data-typ="${typ}">
    ${id ? `<button class="rk-insikt-knapp" type="button" data-visa-fraga="${e(id)}" aria-label="${e(`${rubrik}: ${text}. ${under}. Visa frågan`)}"></button>` : ''}
    <span class="rk-insikt-ikon" aria-hidden="true">${ik(ikon)}</span><span class="rk-insikt-rubrik">${e(rubrik)}</span>
    <strong>${e(text)}</strong><small>${e(under)}</small></li>`;
  function insikterHtml(a) {
    if (!a.skala.length) return `<li class="rk-insikt rk-insikt-tom" data-in><span class="rk-insikt-ikon" aria-hidden="true">${ik('info')}</span><strong>Enkäten har inga skalfrågor som visas än</strong><small>Svaren på de andra frågorna står längre ned.</small></li>`;
    if (a.skala.length === 1) { const x = a.skala[0]; return insiktKort('hog', 'medalj', 'Skalfrågan', x.text, `${pct(x.pos)} positiva · ${pct(x.neg)} negativa`, x.id); }
    if (a.lika) return insiktKort('hog', 'vag', 'Lika över hela linjen', 'Alla skalfrågor har samma andel positiva', `${pct(a.skala[0].pos)} positiva på varje fråga`, '');
    const h = a.starkast[0]; const l = a.attTitta[0]; const d = a.delad;
    return insiktKort('hog', 'medalj', 'Starkast', h.text, `${pct(h.pos)} positiva`, h.id)
      + insiktKort('lag', 'kompass', 'Att titta på', l.text, `${pct(l.pos)} positiva · ${pct(l.neg)} negativa`, l.id)
      + (d ? insiktKort('delad', 'vag', 'Mest delade åsikter', d.text, `${pct(d.pos)} positiva, ${pct(d.neg)} negativa`, d.id)
        : insiktKort('delad', 'vag', 'Ingen fråga delar gruppen', 'Ingen skalfråga har minst 20 % både positiva och negativa', 'Åsikterna går åt samma håll', ''));
  }

  function hjalteHtml(vy, s, a) {
    const pagar = vy.lage === 'oppen';
    // Läget (Pågår till … / Avslutad) står i ögonraden och i faktaremsan – som chip stod det tre gånger och "Så skyddas svaren"
    // hamnade ensam på en andra rad (1440) eller en tredje (320)
    const chips = [`${ik('las')}Anonymt – inga namn eller ${EP}`];
    const ingress = s.visas ? `${s.antal} av ungefär ${s.mottagare} har svarat. Så här tycker gruppen – sammanställt och anonymt.`
      : `${s.antal ? `${s.antal} av ungefär ${s.mottagare} har svarat.` : 'Ingen har svarat än.'} Resultatet visas när minst ${E.GRANS} har svarat – före det går det inte att visa något utan att en enskild persons svar kan räknas ut.`;
    const huvud = s.visas && a.total ? `<div class="rk-huvudtal"><span class="rk-etikett">I korthet</span><b><span data-rakna="${Math.round(a.total.pos * 100)}">${Math.round(a.total.pos * 100)}</span><small>%</small></b>
        <span class="rk-huvudtal-text">positiva svar</span><small>andel som svarat 4 eller 5 på skalfrågorna</small>
        ${E.treStapel(a.total, { klass: 'rk-vaxa-x' })}<p class="rk-tre-tal"><span data-del="neg">${pct(a.total.neg)} negativa</span><span data-del="neu">${pct(a.total.neu)} neutrala</span><span data-del="pos">${pct(a.total.pos)} positiva</span></p></div>`
      : s.visas ? `<div class="rk-huvudtal"><span class="rk-etikett">I korthet</span><b>${s.fragor.filter((f) => f.visas).length}<small> av ${s.fragor.length}</small></b><span class="rk-huvudtal-text">frågor visas</span><small>andel positiva räknas på skalfrågor</small></div>`
        : `<div class="rk-huvudtal rk-huvudtal-under"><span class="rk-etikett">Väntar på svar</span><div class="rk-prickar" role="img" aria-label="${e(`${Math.min(s.antal, E.GRANS)} av ${E.GRANS} svar`)}">${Array.from({ length: E.GRANS }, (_, i) => `<i ${i < s.antal ? 'data-pa' : ''}></i>`).join('')}</div>
          <span class="rk-huvudtal-text">${s.antal >= E.GRANS ? 'Gränsen är nådd' : `${E.GRANS - s.antal} svar till`}</span><small>sedan visas resultatet</small></div>`;
    return `<section class="rk-hjalte" data-hjalte aria-labelledby="rk-titel">
      <span class="rk-hjalte-ljus" aria-hidden="true"><i></i><i></i></span>
      <div class="rk-hjalte-text" data-in>
        <span class="rk-ogonrad">${[`Enkätresultat`, ...(vy.foretag ? [e(vy.foretag)] : []), pagar ? `Pågår till ${e(datum(vy.sista))}` : 'Avslutad'].map((t, i, a) => `<span class="enk-hel">${t}${i < a.length - 1 ? ' ·' : ''}</span>`).join(' ')}</span>
        <h1 id="rk-titel" tabindex="-1">${e(vy.titel)}</h1>
        <p>${e(ingress)}</p>
        <div class="rk-chips">${chips.map((c) => `<span>${c}</span>`).join('')}<a href="#skydd" data-hopp="skydd">${ik('skold')}Så skyddas svaren</a></div>
      </div>
      <div class="rk-glas" data-luta data-in>${ringHtml(s)}${huvud}</div>
      ${s.visas ? `<ul class="rk-insikter" aria-label="Tre saker att veta">${insikterHtml(a)}</ul>` : ''}
    </section>`;
  }

  function faktaHtml(vy, s) {
    const pagar = vy.lage === 'oppen';
    const slut = vy.lage === 'stangd' && vy.stangd ? vy.stangd : vy.sista;
    const kvar = pagar ? Math.max(0, dagarMellan(idagIso(), vy.sista)) : 0;
    const visas = s.fragor.filter((f) => f.visas).length;
    const period = vy.skapad ? Math.max(1, dagarMellan(vy.skapad, pagar ? vy.sista : slut) + 1) : null;
    const tal = [
      ['anvandare', 'Har svarat', `${s.antal}`, `av ungefär ${s.mottagare} (${pct(s.andel)})`],
      ['enkat', 'Frågor som visas', s.visas ? `${visas} av ${s.fragor.length}` : `0 av ${s.fragor.length}`, s.visas ? (visas === s.fragor.length ? 'alla frågor visas' : `resten vid ${E.GRANS} svar på frågan`) : `visas vid ${E.GRANS} svar`],
      ['kalender', pagar ? 'Pågår till' : 'Avslutad', e(datum(pagar ? vy.sista : slut)), pagar ? (kvar ? `${kvar} ${kvar === 1 ? 'dag' : 'dagar'} kvar` : 'sista dagen idag') : 'tar inte emot fler svar'],
      ['klocka', 'Svarstid', period ? `${period} ${period === 1 ? 'dag' : 'dagar'}` : '–', vy.skapad ? `${pagar ? 'öppen' : 'var öppen'} ${e(datum(vy.skapad))} – ${e(datum(pagar ? vy.sista : slut))}` : ''],
    ];
    return `<dl class="rk-fakta" data-in>${tal.map(([ikon, t, v, u]) => `<div><dt>${ik(ikon)}${e(t)}</dt><dd><b>${v}</b><small>${u}</small></dd></div>`).join('')}</dl>`;
  }

  function rangHtml(a) {
    if (!a.starkast.length) return '';
    const rad = (x) => `<li><button class="rk-rang-rad" type="button" data-visa-fraga="${e(x.id)}"><span class="rk-rang-text"><b>${e(x.text)}</b><small>${svar(x.n)} · medel ${e(x.medelText)}</small></span>${divHtml(x, { liten: true })}<span class="rk-rang-pos"><b>${pct(x.pos)}</b><small>positiva</small></span><span class="rk-rang-pil" aria-hidden="true">${ik('pil')}</span></button></li>`;
    return `<section class="rk-rang" aria-label="Starkast och att titta på">
      <div class="rk-rang-kort" data-in data-ton="hog"><h2>${ik('medalj')}Starkast</h2><p class="rk-under">Högst andel positiva svar.</p><ol>${a.starkast.map(rad).join('')}</ol></div>
      <div class="rk-rang-kort" data-in data-ton="lag"><h2>${ik('kompass')}Att titta på</h2><p class="rk-under">Lägst andel positiva – bra att prata om i gruppen.</p><ol>${a.attTitta.map(rad).join('')}</ol></div>
    </section>`;
  }

  function verktygHtml() {
    return `<div class="rk-verktyg" role="toolbar" aria-label="Visa och exportera resultatet">
      <div class="rk-seg" role="group" aria-label="Vy">${VYER.map(([k, t, i], n) => `<button type="button" data-vy="${k}" aria-pressed="${ui.vy === k}" aria-keyshortcuts="${n + 1}">${ik(i)}<span>${t}</span></button>`).join('')}</div>
      <label class="rk-sortera" data-bara-vy="oversikt"${ui.vy === 'oversikt' ? '' : ' hidden'}><span>Sortera</span><select data-sort>${SORT.map(([k, t]) => `<option value="${k}"${ui.sort === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="rk-seg rk-seg-liten" role="group" aria-label="Visa som"><button type="button" data-som="pct" aria-pressed="${ui.som === 'pct'}">Procent</button><button type="button" data-som="antal" aria-pressed="${ui.som === 'antal'}">Antal</button></div>
      <div class="rk-export"><button class="rk-knapp" type="button" data-skriv>${ik('skrivare')}<span>Skriv ut</span></button><button class="rk-knapp" type="button" data-csv>${ik('ladda-ner')}<span>CSV</span></button><button class="rk-knapp" type="button" data-kopiera title="Kopiera länken till resultatet">${ik('lank')}<span>Kopiera<span class="rk-lang"> länk</span></span></button></div>
    </div>`;
  }

  function sorterade(a) {
    const r = [...a.skala];
    if (ui.sort === 'pos') r.sort((x, y) => y.pos - x.pos || x.i - y.i);
    if (ui.sort === 'neg') r.sort((x, y) => x.pos - y.pos || y.neg - x.neg || x.i - y.i);
    if (ui.sort === 'oenig') r.sort((x, y) => y.oenighet - x.oenighet || x.i - y.i);
    return r;
  }
  function oversiktHtml(s, a) {
    const dolda = s.fragor.map((f, i) => ({ f, i })).filter(({ f }) => f.typ === 'skala' && !f.visas);
    const rader = sorterade(a).map((x, n) => `<li class="rk-rad" data-in style="--d:${Math.min(n, 10)}"><span class="rk-nr">${x.i + 1}</span>
        <span class="rk-rad-text"><b>${e(x.text)}</b><small>${svar(x.n)} · medel ${e(x.medelText)}${x.n < 10 ? ' · få svar – tolka försiktigt' : ''}</small></span>
        ${divHtml(x)}<span class="rk-neutral" title="Neutralt (3)">${talet(x, 'neu')} neutralt</span>
        <span class="rk-rad-pos"><b>${talet(x, 'pos')}</b><small>positiva</small></span></li>`).join('')
      + dolda.map(({ f, i }) => `<li class="rk-rad rk-rad-dold" data-in><span class="rk-nr">${i + 1}</span><span class="rk-rad-text"><b>${e(f.text)}</b></span><span class="rk-las">${ik('las')}Visas när minst ${E.GRANS} har svarat på frågan.</span></li>`).join('');
    const ovriga = s.fragor.map((f, i) => ({ f, i })).filter(({ f }) => f.typ === 'janej' || f.typ === 'flerval');
    const ovrigt = ovriga.map(({ f, i }) => {
      const huvud = `<header><span class="rk-nr">${i + 1}</span><span class="rk-rad-text"><b>${e(f.text)}</b><small>${e(E.TYPER[f.typ])} · ${f.antal == null ? `färre än ${E.GRANS} svar` : svar(f.antal)}${f.flera ? ' · flera svar möjliga' : ''}</small></span></header>`;
      if (!f.visas) return `<li class="rk-ovrig rk-rad-dold" data-in>${huvud}<span class="rk-las">${ik('las')}Visas när minst ${E.GRANS} har svarat på frågan.</span></li>`;
      if (f.typ === 'janej') {
        const [ja, nej] = f.fordelning; const t = (x) => (ui.som === 'antal' ? `${x.antal}` : pct(x.andel));
        return `<li class="rk-ovrig" data-in>${huvud}<span class="rk-janej" role="img" aria-label="${e(`Ja ${pct(ja.andel)}, nej ${pct(nej.andel)}`)}">${ja.andel > 0 ? `<i class="rk-vaxa-x" data-v="ja" style="flex-grow:${ja.andel.toFixed(4)}"><span>Ja ${t(ja)}</span></i>` : ''}${nej.andel > 0 ? `<i class="rk-vaxa-x" data-v="nej" style="flex-grow:${nej.andel.toFixed(4)}"><span>Nej ${t(nej)}</span></i>` : ''}</span>${ja.andel < 0.18 || nej.andel < 0.18 ? `<small class="rk-janej-tal">Ja ${t(ja)} · Nej ${t(nej)}</small>` : ''}</li>`;
      }
      const alt = [...f.fordelning].sort((x, y) => y.antal - x.antal || x.varde - y.varde);
      return `<li class="rk-ovrig" data-in>${huvud}<ul class="rk-alt">${alt.map((x) => `<li><span class="rk-alt-text">${e(x.etikett)}</span><span class="rk-alt-spar"><i class="rk-vaxa-x" style="--w:${x.andel.toFixed(4)}"></i></span><b>${ui.som === 'antal' ? x.antal : pct(x.andel)}</b></li>`).join('')}</ul></li>`;
    }).join('');
    return `${rader ? `<section class="rk-block" aria-labelledby="rk-alla"><div class="rk-block-huvud"><h2 id="rk-alla">Alla skalfrågor</h2>${forklaring()}</div>
        <ol class="rk-rader">${rader}</ol></section>` : ''}
      ${ovrigt ? `<section class="rk-block" aria-labelledby="rk-ovr"><div class="rk-block-huvud"><h2 id="rk-ovr">Ja/nej och flerval</h2><p class="rk-under">${ovriga.some(({ f }) => f.flera) ? 'Vid flera möjliga svar räknas andelen av dem som svarade på frågan.' : 'Andelen av dem som svarade på frågan.'}</p></div><ol class="rk-ovriga">${ovrigt}</ol></section>` : ''}`;
  }
  function tabellHtml(s) {
    const skala = s.fragor.map((f, i) => ({ f, i })).filter(({ f }) => f.typ === 'skala');
    const ovr = s.fragor.map((f, i) => ({ f, i })).filter(({ f }) => f.typ === 'janej' || f.typ === 'flerval');
    const cell = (n, andel) => `${n} <small>(${pct(andel)})</small>`;
    const t1 = skala.length ? `<div class="rk-tabell-ram" tabindex="0" role="region" aria-labelledby="rk-t1"><table class="rk-tabell"><caption id="rk-t1">Skalfrågor – antal svar per steg (andel)</caption>
      <thead><tr><th scope="col">Fråga</th><th scope="col">Svar</th>${[1, 2, 3, 4, 5].map((v) => `<th scope="col">${v}</th>`).join('')}<th scope="col">Positiva (4–5)</th><th scope="col">Medel</th></tr></thead><tbody>
      ${skala.map(({ f, i }) => { const d = E.delar(f); return `<tr><th scope="row"><span class="rk-nr">${i + 1}</span>${e(f.text)}</th>${d ? `<td>${f.antal}</td>${f.fordelning.map((x) => `<td>${cell(x.antal, x.andel)}</td>`).join('')}<td><b>${pct(d.pos)}</b></td><td>${e(f.medelText)} <small>(${e(d.bandText)})</small></td>` : `<td colspan="8">Visas när minst ${E.GRANS} har svarat på frågan.</td>`}</tr>`; }).join('')}
      </tbody></table></div>` : '';
    const t2 = ovr.length ? `<div class="rk-tabell-ram" tabindex="0" role="region" aria-labelledby="rk-t2"><table class="rk-tabell rk-tabell-ovr"><caption id="rk-t2">Ja/nej och flerval</caption>
      <thead><tr><th scope="col">Fråga</th><th scope="col">Svarsalternativ</th><th scope="col">Antal</th><th scope="col">Andel</th></tr></thead><tbody>
      ${ovr.map(({ f, i }) => (f.visas ? f.fordelning.map((x, j) => `<tr>${j ? '' : `<th scope="rowgroup" rowspan="${f.fordelning.length}"><span class="rk-nr">${i + 1}</span>${e(f.text)}${f.flera ? '<small> · flera svar möjliga</small>' : ''}</th>`}<td class="rk-td-alt">${e(x.etikett)}</td><td>${x.antal}</td><td>${pct(x.andel)}</td></tr>`).join('')
        : `<tr><th scope="row"><span class="rk-nr">${i + 1}</span>${e(f.text)}</th><td colspan="3">Visas när minst ${E.GRANS} har svarat på frågan.</td></tr>`)).join('')}
      </tbody></table></div>` : '';
    return `<section class="rk-block" aria-label="Tabell"><div class="rk-block-huvud"><h2>Tabell</h2><p class="rk-under">Samma sammanställning som diagrammen. Fritexten står under Med egna ord.</p></div>${t1}${t2}</section>`;
  }

  /* Med egna ord: citatkort, sök och ordchips (ord som står i minst tre olika svar – ett ovanligt ord kan peka ut någon) */
  const STOPP = new Set('alla allt andra annan annat att bara blev blir bli borde bättre de dem den denna deras dess det detta din dina ditt dom du där efter eftersom ej eller en ett från får för före ganska genom gör göra hade han har hela hon hur här i icke inga inget inom inte jag kan kommer kunde man med mellan men mer mest mig min mina mitt mot mycket många ni nog när någon något några och också om oss på samma sedan sig sin sina sitt själv ska skall skulle som så sådan till tror under upp ut utan vad var vara varit vars vem vi vid vill blir hos lite känns kanske även ännu också'.split(' '));
  const ord = (t) => [...new Set((String(t).toLocaleLowerCase('sv').match(/[a-zåäöéü]{4,}/g) || []).filter((w) => !STOPP.has(w)))];
  function chips(lista) {
    const n = new Map(); lista.forEach((t) => ord(t).forEach((w) => n.set(w, (n.get(w) || 0) + 1)));
    return [...n].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'sv')).slice(0, 8);
  }
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function citatHtml(f) {
    const q = (ui.sok[f.id] || '').trim();
    const traff = q ? f.svar.filter((t) => t.toLocaleLowerCase('sv').includes(q.toLocaleLowerCase('sv'))) : f.svar;
    const visa = q || ui.alla[f.id] ? traff : traff.slice(0, 8);
    const markera = (t) => { const h = e(t).replace(/\n/g, '<br>'); return q ? h.replace(new RegExp(reEsc(e(q)), 'gi'), (m) => `<mark>${m}</mark>`) : h; };
    if (!traff.length) return `<p class="rk-tomt" role="status">Inget svar innehåller ”${e(q)}”.</p>`;
    return `<p class="rk-sok-status" role="status">${q ? `${traff.length} av ${f.svar.length} svar innehåller ”${e(q)}”` : `${f.svar.length} svar i bokstavsordning`}</p>
      <ul class="rk-citat">${visa.map((t) => `<li><blockquote>${markera(t)}</blockquote></li>`).join('')}</ul>
      ${visa.length < traff.length ? `<button class="rk-knapp rk-fler" type="button" data-alla="${e(f.id)}">Visa alla ${traff.length} svar</button>` : ''}`;
  }
  function fritextHtml(s) {
    const fr = s.fragor.map((f, i) => ({ f, i })).filter(({ f }) => f.typ === 'fritext');
    if (!fr.length) return '';
    return `<section class="rk-block rk-egna" aria-labelledby="rk-egna"><div class="rk-block-huvud"><h2 id="rk-egna">Med egna ord</h2>
      <p class="rk-under">Svaren visas som de skrevs. Den som svarade kan ändå ha nämnt något som pekar ut hen – läs med respekt och citera inte vidare.</p></div>
      ${fr.map(({ f, i }) => {
        const huvud = `<header class="rk-egna-huvud"><span class="rk-nr">${i + 1}</span><span class="rk-rad-text"><b>${e(f.text)}</b><small>Fritext · ${f.antal == null ? `färre än ${E.GRANS} svar` : svar(f.antal)}</small></span></header>`;
        if (!f.visas) return `<article class="rk-egna-kort" data-in>${huvud}<p class="rk-las">${ik('las')}Visas när minst ${E.GRANS} har svarat på frågan.</p></article>`;
        if (!f.svar.length) return `<article class="rk-egna-kort" data-in>${huvud}<p class="rk-tomt">Ingen har skrivit något här än.</p></article>`;
        const ch = chips(f.svar);
        return `<article class="rk-egna-kort" data-in>${huvud}
          <div class="rk-sok"><label class="rk-sokfalt">${ik('sok')}<span class="rk-dold-text">Sök i svaren på fråga ${i + 1}</span><input type="search" data-sok="${e(f.id)}" value="${e(ui.sok[f.id] || '')}" placeholder="Sök i svaren" autocomplete="off" aria-keyshortcuts="/"></label>
          ${ch.length ? `<div class="rk-ordchips" role="group" aria-label="Vanliga ord (i minst tre svar)">${ch.map(([w, c]) => `<button type="button" data-ord="${e(w)}" data-for="${e(f.id)}" aria-pressed="${(ui.sok[f.id] || '') === w}">${e(w)} <small>${c}</small></button>`).join('')}</div>` : ''}</div>
          <div data-citat="${e(f.id)}">${citatHtml(f)}</div></article>`;
      }).join('')}</section>`;
  }
  function skyddHtml(s) {
    const rader = [
      ['las', `Inga namn, ${EP}adresser eller klockslag sparas med svaren.`],
      ['enkat', `En fråga visas först när minst ${E.GRANS} har svarat på den – och hela resultatet först vid ${E.GRANS} svar.`],
      ['aterstall', `Resultatet uppdateras i omgångar om ${E.GRANS} svar, så att ingen kan jämföra före och efter ett enskilt svar.`],
      ['anvandare', 'Fritextsvar visas i bokstavsordning – inte i den ordning de kom in.'],
      ['skold', 'Du ser samma sammanställning som Uperformance – ingen kan se vem som svarat vad.'],
    ];
    return `<section class="rk-skydd" id="skydd" tabindex="-1" data-in aria-labelledby="rk-skydd"><div class="rk-skydd-huvud"><span class="rk-skydd-ikon" aria-hidden="true">${ik('skold')}</span><div><h2 id="rk-skydd">Så skyddas svaren</h2><p>Gränsen är ${E.GRANS} svar per fråga. ${s.vantar && s.visas ? `Just nu räknas ${s.raknade} av ${s.antal} svar.` : ''}</p></div></div>
      <ul>${rader.map(([i, t]) => `<li>${ik(i)}<span>${e(t)}</span></li>`).join('')}</ul></section>`;
  }

  /* Ritningen ----------------------------------------------------------------------------------------------------------- */
  let forsta = true; let nu = null; let senastRaknade = null;
  function rita(vy) {
    const fore = nu; nu = vy;
    const s = vy.sm; const pagar = vy.lage === 'oppen';
    const a = E.analys(s);
    const omgang = E.omgangText ? E.omgangText(s, { stangd: !pagar }) : '';
    // Fokus i en sökruta överlever en omritning (nya svar i en annan flik)
    const akt = document.activeElement; const sokFokus = akt && akt.matches && akt.matches('[data-sok]') ? { id: akt.dataset.sok, pos: akt.selectionStart } : null;
    const anim = forsta && !lugn && 'IntersectionObserver' in window;
    portal.toggleAttribute('data-anim', anim);
    const vyer = s.visas ? `<div class="rk-vyer">
        <div data-vypanel="oversikt"${ui.vy === 'oversikt' ? '' : ' hidden'}>${oversiktHtml(s, a)}</div>
        <div data-vypanel="fraga"${ui.vy === 'fraga' ? '' : ' hidden'}><section class="rk-block enk-res" aria-label="Fråga för fråga"><div class="er-fragor">${E.fragorHtml(s, { esc: e, ik, tredelad: true, utan: ['fritext'], id: 'q-' })}</div></section></div>
        <div data-vypanel="tabell"${ui.vy === 'tabell' ? '' : ' hidden'}>${tabellHtml(s)}</div></div>` : '';
    const vanta = `<section class="kort enk-grans-kort rk-vanta" data-in><span class="ogiltig-ikon">${ik('las')}</span><h2>Resultatet visas när minst ${E.GRANS} har svarat</h2>
      <p>${s.antal ? `${s.antal} ${s.antal === 1 ? 'person har' : 'personer har'} svarat hittills.` : 'Ingen har svarat än.'} Med färre svar skulle man kunna lista ut vad en enskild person tyckte – därför visas inget förrän gränsen är nådd.<span class="enk-skarm"> Sidan uppdateras när fler svarar.</span></p></section>`;
    portal.innerHTML = `${!skarp ? `<p class="prototypvarning prototypvarning-lugn">${ik('info')}<span><strong>Prototyp.</strong> Resultatet räknas ur svaren i den här webbläsaren.${vy.exempel ? ' Exempeldata – svaren är påhittade.' : ''}</span></p>` : ''}
      ${hjalteHtml(vy, s, a)}
      ${faktaHtml(vy, s)}
      ${omgang || (s.visas && a.faSvar) ? `<p class="rk-omgang">${ik('info')}<span>${e(omgang)}${s.visas && a.faSvar ? `${omgang ? ' ' : ''}Få svar – tolka procenten försiktigt: med ${s.raknade} svar är varje person ${pct(1 / s.raknade)}.` : ''}</span></p>` : ''}
      ${s.visas ? `${rangHtml(a)}<div class="rk-verktyg-plats" data-verktyg-plats>${verktygHtml()}</div>${vyer}${fritextHtml(s)}` : vanta}
      ${skyddHtml(s)}
      <footer class="portal-fot rk-fot"><span>Sammanställt av Uperformance${vy.saljare ? ` – ${e(vy.saljare)} är er kontaktperson` : ''}.</span><span class="enk-skarm">Sidan hämtad ${e(datum(idagIso(), true))} · uppdateras när fler svarar.</span><span class="enk-utskrift">Anonym sammanställning · utskrivet ${e(datum(idagIso(), true))} · ${s.antal} svar av ungefär ${s.mottagare} (${pct(s.andel)})${s.vantar && s.visas ? ` · ${s.raknade} svar i resultatet` : ''} · gräns ${E.GRANS} svar per fråga${pagar ? ` · pågår till ${e(datum(vy.sista, true))}` : ' · avslutad'}</span></footer>`;
    document.title = `${vy.titel} – resultat · Uperformance`;
    $('[data-saker]').hidden = false; const st = $('[data-saker-text]'); if (st) st.textContent = 'Resultat – sammanställt';
    if (sokFokus) { const i = $(`[data-sok="${CSS.escape(sokFokus.id)}"]`); if (i) { i.focus(); try { i.setSelectionRange(sokFokus.pos, sokFokus.pos); } catch (err) { /* ok */ } } }
    // Ny omgång (inte varje nytt svar – det skulle säga när en viss person svarade): pillret "Uppdaterad nyss" i två sekunder
    if (fore && senastRaknade != null && s.raknade !== senastRaknade) pill();
    senastRaknade = s.raknade;
    entre(anim); topphojd();
    if (forsta && P.forstaVisning) P.forstaVisning(); forsta = false;
  }
  function pill() {
    const p = $('[data-uppdaterad]'); if (!p) return;
    p.hidden = false; p.removeAttribute('data-ut'); clearTimeout(pill.t); clearTimeout(pill.t2);
    pill.t = setTimeout(() => p.setAttribute('data-ut', ''), 2000); pill.t2 = setTimeout(() => { p.hidden = true; }, 2400);
  }
  // Entréerna: varje [data-in] får data-syns första gången den syns (en gång), talen räknas upp då
  let obs = null;
  function entre(anim) {
    if (obs) obs.disconnect();
    if (!anim) return;
    $$('[data-rakna]', portal).forEach((el) => { el.dataset.varde = '0'; el.textContent = '0'; });
    obs = new IntersectionObserver((poster) => poster.forEach((p) => {
      if (!p.isIntersecting) return; const el = p.target; obs.unobserve(el); el.setAttribute('data-syns', '');
      $$('[data-rakna]:not([data-raknad])', el).forEach((t) => (t.setAttribute('data-raknad', ''), P.rakna ?P.rakna(t, +t.dataset.rakna, { tid: 800 }) : (t.textContent = t.dataset.rakna)));
    }), { rootMargin: '0px 0px -6% 0px' });
    $$('[data-in]', portal).forEach((el) => obs.observe(el));
  }
  const topphojd = () => { const t = $('.portal-topp'); if (t) document.documentElement.style.setProperty('--rk-topp', `${t.offsetHeight}px`); };
  addEventListener('resize', topphojd);

  /* Vyerna och verktygen ------------------------------------------------------------------------------------------------ */
  function valjVy(k, { fokus = false, direkt = false } = {}) {
    if (!VYER.some(([x]) => x === k)) return;
    ui.vy = k; try { localStorage.setItem(MINNE, k); } catch (err) { /* ok */ }
    const byt = () => {
      $$('[data-vypanel]').forEach((p) => { p.hidden = p.dataset.vypanel !== k; });
      $$('[data-vy]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vy === k)));
      $$('[data-bara-vy]').forEach((x) => { x.hidden = x.dataset.baraVy !== k; });
    };
    if (document.startViewTransition && !lugn && !fokus && !direkt) document.startViewTransition(byt); else byt();
    if (fokus) { const b = $(`[data-vy="${k}"]`); if (b) b.focus(); }
  }
  function visaFraga(id) {
    valjVy('fraga', { direkt: true }); // direkt: frågan ska kunna få fokus i samma bildruta
    requestAnimationFrame(() => {
      const el = document.getElementById(`q-${id}`); if (!el) return;
      el.scrollIntoView({ behavior: lugn ? 'auto' : 'smooth', block: 'center' }); el.focus({ preventScroll: true });
      if (P.markera) P.markera(el);
    });
  }
  function ritaOm() { if (nu) { const y = scrollY; rita(nu); scrollTo(0, y); } }
  function kopieraLank() {
    const klar = () => P.toast && P.toast('Länken är kopierad', { under: 'Alla som har länken kan se resultatet – dela den bara med dem som ska se det.' });
    const reserv = () => { const t = document.createElement('textarea'); t.value = location.href; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (err) { /* ok */ } t.remove(); if (ok) klar(); else if (P.toast) P.toast('Kunde inte kopiera – markera adressen i adressfältet', { typ: 'varning' }); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(location.href).then(klar, reserv); else reserv();
  }
  // CSV: samma sammanställning som CRM:ets export (ENKATLOGIK.csvRader) – aldrig en rad per person; formler skyddas som i CRM:et
  const csvCell = (x) => { const t = String(x ?? ''); return `"${(/^[=+\-@\t\r]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"`; };
  function laddaNerCsv() {
    if (!nu || !nu.sm || !nu.sm.visas) return;
    const rader = E.csvRader({ titel: nu.titel }, nu.sm, nu.foretag);
    const text = '﻿' + rader.map((r) => r.map(csvCell).join(';')).join('\r\n');
    const namn = String(nu.titel || 'enkat').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'enkat';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `enkat-${namn}-${idagIso()}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (P.toast) P.toast('Sammanställningen är nedladdad (CSV)', { under: 'En rad per fråga och svarsalternativ – aldrig en rad per person.' });
  }
  portal.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-skriv]')) print();
    else if (t.closest('[data-csv]')) laddaNerCsv();
    else if (t.closest('[data-kopiera]')) kopieraLank();
    else if (t.closest('[data-forsok]')) starta();
    else if (t.closest('[data-vy]')) valjVy(t.closest('[data-vy]').dataset.vy);
    else if (t.closest('[data-som]')) { ui.som = t.closest('[data-som]').dataset.som; ritaOm(); const b = $(`[data-som="${ui.som}"]`); if (b) b.focus(); }
    else if (t.closest('[data-visa-fraga]')) visaFraga(t.closest('[data-visa-fraga]').dataset.visaFraga);
    else if (t.closest('[data-alla]')) { const id = t.closest('[data-alla]').dataset.alla; ui.alla[id] = true; ritaCitat(id); }
    else if (t.closest('[data-ord]')) {
      const b = t.closest('[data-ord]'); const id = b.dataset.for; ui.sok[id] = ui.sok[id] === b.dataset.ord ? '' : b.dataset.ord;
      const i = $(`[data-sok="${CSS.escape(id)}"]`); if (i) i.value = ui.sok[id];
      $$(`[data-ord][data-for="${CSS.escape(id)}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ord === ui.sok[id])));
      ritaCitat(id);
    } else if (t.closest('[data-hopp]')) { ev.preventDefault(); const m = document.getElementById(t.closest('[data-hopp]').dataset.hopp); if (m) { m.scrollIntoView({ behavior: lugn ? 'auto' : 'smooth', block: 'start' }); m.focus({ preventScroll: true }); } }
  });
  function ritaCitat(id) {
    const f = nu && nu.sm.fragor.find((x) => x.id === id); const lada = $(`[data-citat="${CSS.escape(id)}"]`);
    if (f && lada) lada.innerHTML = citatHtml(f);
  }
  portal.addEventListener('input', (ev) => {
    const i = ev.target.closest('[data-sok]'); if (!i) return;
    ui.sok[i.dataset.sok] = i.value; ritaCitat(i.dataset.sok);
    $$(`[data-ord][data-for="${CSS.escape(i.dataset.sok)}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ord === i.value.trim())));
  });
  portal.addEventListener('change', (ev) => { const s = ev.target.closest('[data-sort]'); if (s) { ui.sort = s.value; ritaOm(); const n = $('[data-sort]'); if (n) n.focus(); } });
  // Tangenter: 1/2/3 byter vy, / söker i fritexten, Esc lämnar sökrutan
  addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || !nu || !nu.sm.visas) return;
    const iFalt = ev.target.closest && ev.target.closest('input, select, textarea, [contenteditable]');
    if (iFalt) { if (ev.key === 'Escape' && ev.target.matches('[data-sok]')) ev.target.blur(); return; }
    if (['1', '2', '3'].includes(ev.key)) { valjVy(VYER[+ev.key - 1][0], { fokus: true }); ev.preventDefault(); }
    else if (ev.key === '/') { const i = $('[data-sok]'); if (i) { ev.preventDefault(); i.scrollIntoView({ block: 'center', behavior: lugn ? 'auto' : 'smooth' }); i.focus({ preventScroll: true }); } }
  });

  /* Djup: glaspanelen lutar lite efter musen (högst 3°, 6 px) och ljuset bakom glider åt andra hållet – bara transform,
     bara fin pekare, dämpad och stilla när musen står still. Inget på pekskärm eller vid reducerad rörelse. */
  if (finMus && !lugn) {
    const mal = { x: 0, y: 0 }; const nuL = { x: 0, y: 0 }; let ram = 0;
    const steg = () => {
      nuL.x += (mal.x - nuL.x) * 0.08; nuL.y += (mal.y - nuL.y) * 0.08;
      const h = $('[data-hjalte]');
      if (h) { h.style.setProperty('--lx', nuL.x.toFixed(4)); h.style.setProperty('--ly', nuL.y.toFixed(4)); }
      ram = Math.abs(mal.x - nuL.x) + Math.abs(mal.y - nuL.y) > 0.001 ? requestAnimationFrame(steg) : 0;
    };
    portal.addEventListener('pointermove', (ev) => {
      const h = ev.target.closest && ev.target.closest('[data-hjalte]'); if (!h) return;
      const b = h.getBoundingClientRect(); mal.x = (ev.clientX - b.left) / b.width - 0.5; mal.y = (ev.clientY - b.top) / b.height - 0.5;
      if (!ram) ram = requestAnimationFrame(steg);
    });
    portal.addEventListener('pointerout', (ev) => { const h = ev.target.closest && ev.target.closest('[data-hjalte]'); if (h && !h.contains(ev.relatedTarget)) { mal.x = 0; mal.y = 0; if (!ram) ram = requestAnimationFrame(steg); } });
  }

  let slutaLyssna = null;
  async function starta() {
    if (!L || !E) { visaOgiltig({ fel: 'saknas' }); return; }
    const r = await (async () => { try { return await L.enkat.resultat(nyckel); } catch (err) { return { ok: false, status: 0 }; } })();
    if (!r || !r.ok) { visaOgiltig(r); return; }
    rita(r.vy);
    if (!slutaLyssna) slutaLyssna = L.enkat.lyssna(nyckel, (h) => { if (h.ogiltig) visaOgiltig(h.fel); else if (h.vy) { const y = scrollY; rita(h.vy); scrollTo(0, y); } }, true);
  }
  if (!nyckel) visaOgiltig({ fel: 'saknas' }); else starta();
})();
