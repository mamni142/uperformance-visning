/* Uperformance CRM – anonyma enkäter (2026-11-03). Användarens önskemål: "Magnus proposed an anonymous workplace survey for Sanna,
   sent to 50 employees with summarized results" – "han vill att man ska kunna skicka en länk där folk kan svara på formulär"
   – "och då ska sanna få typ statistik på vad dem 50 har svarat på anonymt".

   Säljaren skapar enkäten på kunden eller affären (arket Ny enkät: mall, frågor som kan läggas till, ändras, flyttas och tas bort,
   ungefärligt antal mottagare, sista svarsdag). Det ger EN gemensam anonym svarslänk (enkat.html#e=<nyckel>) som kunden skickar
   vidare till medarbetarna, och en egen resultatlänk för kunden (enkat-resultat.html#r=<nyckel>) med bara sammanställd statistik.
   Resultatet i CRM:et: #/enkat/<nyckel> (svarsfrekvens, per fråga, fritext utan koppling till person, anonymitetsgränsen 5, utskrift,
   CSV) och #/enkater (alla). Logiken (gränsen, sammanställningen, kontrollerna) ligger i enkatlogik.js – delad med kundens sidor.
   Data: db.enkater och db.enkatsvar. Bara demoläget: skarpt läge har inget serverstöd för enkäter än (se CLAUDE.md).

   2026-11-04 (rättningarna efter testarna, team/enkat-rattat.md): enkätens gång som steg överst (Skapad → Svarslänken skickad →
   5 svar → Delad med kunden → Avslutad), Svarslänken som Nästa steg medan färre än fem har svarat, Andel med ring, Frågorna
   ihopfällda när resultatet visas, ankarrad på mobilen; arket: numrerade avsnitt, Enter hoppar till nästa fält (Ctrl+Enter skapar),
   utkast även för Ändra enkät, mallbyte tar tillbaka dina frågor, kundval sätter mottagarna, låsta frågor som läslista. */
window.UPEnkater = (K) => {
  'use strict';
  const { e, sel, ik, emo, oppnaArk, arkHuvud, bekrafta, toast, spara, rendera, logga, kund, affar, anv, sidhjalte, datumText, dagarTill, idag, omDagar, plural, $, $$, SKARP } = K;
  const E = window.ENKATLOGIK; const QR = window.UPQR;
  if (!E) return null;
  const db = () => K.db;
  const enkater = () => { const d = db(); if (!d.enkater || typeof d.enkater !== 'object' || Array.isArray(d.enkater)) d.enkater = {}; return d.enkater; };
  const svarFor = (n) => E.svarFor(db(), n);
  const hamta = (n) => (n && Object.prototype.hasOwnProperty.call(enkater(), n) ? enkater()[n] : null);
  const lage = (x) => E.lage(x, idag());
  const mig = () => anv(K.jag);
  // Skapa och ändra: säljare (och chefen). Testteamet och administratören ser enkäterna men skapar dem inte.
  const kan = () => !SKARP && mig().roll === 'salj';
  const LAGE = { oppen: ['Pågår', 'chip-ok'], stangd: ['Stängd', 'chip'], utgangen: ['Sista svarsdagen har passerat', 'chip-gul'] };
  // Står i mejlen: mottagaren ska inte tro att länken fungerar från en annan dator ännu (samma ärlighet som videomötets inbjudan)
  const ARLIG = 'Prototyp – enkäten sparas i den här webbläsaren, så länken fungerar bara här tills enkäter finns i den skarpa versionen.';
  const ARLIG_LANK = 'Obs: testversion – länken fungerar just nu bara i samma webbläsare som enkäten skapades i.';
  const nyNyckel = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); const t = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(a, (b) => t[b % t.length]).join('').slice(0, 24); };
  const lank = (n) => new URL(`enkat.html#e=${encodeURIComponent(n)}`, location.href).href;
  const resLank = (x) => new URL(`enkat-resultat.html#r=${encodeURIComponent(x.resultat)}`, location.href).href;
  const fornamn = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  const dagTill = (iso) => datumText(iso, { ar: 'auto', gemen: true });
  // Papper och mejl läses en annan dag: alltid det riktiga datumet ("4 november 2026"), aldrig "idag"/"imorgon" (verifieringen 2026-11-04)
  const fastDatum = (iso) => { if (!iso) return ''; const d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); return isNaN(d) ? String(iso) : d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const dagIso = (t) => String(t || '').slice(0, 10);
  const sm = (n) => E.sammanstall(hamta(n), svarFor(n));
  const kundensKontakt = (x) => K.primarKontakt(kund(x.kundId));
  const lista = ({ kundId, affarId } = {}) => Object.entries(enkater()).filter(([, x]) => x && (!kundId || x.kundId === kundId) && (!affarId || x.affarId === affarId))
    .sort(([, a], [, b]) => (String(a.skapad) < String(b.skapad) ? 1 : -1));
  const lageChip = (x) => { const l = lage(x); return `<span class="chip ${LAGE[l][1]}">${e(LAGE[l][0])}</span>`; };
  const andelText = (s) => `${s.antal} av ${s.mottagare}`;
  // Mätaren: andelen som svarat, strecket = anonymitetsgränsen (5 svar). Raden under säger vad strecket betyder (fynd ux-G7, sanna-A8f).
  const matare = (s) => `<span class="enk-matare" aria-hidden="true" title="Andelen som svarat. Strecket är anonymitetsgränsen – resultatet visas först vid ${E.GRANS} svar"><i style="--w:${s.andel.toFixed(3)}"></i><b style="--x:${Math.min(1, E.GRANS / s.mottagare).toFixed(3)}"></b></span>`;
  const gransRad = (s) => (s.visas ? '' : `<small class="enk-grans-rad">${ik('las')}${E.GRANS - s.antal === 1 ? '1 svar till' : `${E.GRANS - s.antal} svar till`} – sedan visas resultatet</small>`);

  /* --- Kortet på kundsidan och affären ------------------------------------------------------ */
  // Bara när kunden (affären) har enkäter – annars knappen Enkät i hjälten (inga tomma lådor)
  // tom: kundsidan visar kortet med en tom rad för företag (vägen till Ny enkät) – affären bara när den har enkäter
  const radHtml = ([n, x], { medKund = false } = {}) => {
    const s = sm(n); const k = kund(x.kundId);
    return `<a class="enk-kort-rad" href="#/enkat/${e(n)}"><span class="enk-kort-text"><span class="enk-rad-titel"><strong>${e(x.titel)}</strong>${lageChip(x)}</span><small>${medKund && k ? `${e(k.namn)} · ` : ''}${e(andelText(s))} har svarat · ${lage(x) === 'oppen' ? `sista dag ${e(dagTill(x.sista))}` : e(LAGE[lage(x)][0].toLowerCase())}</small>${matare(s)}${lage(x) === 'oppen' ? gransRad(s) : ''}</span>${ik('pil')}</a>`;
  };
  function kortHtml({ kundId, affarId, tom = false }, attr = '') {
    if (SKARP) return '';
    const rader = lista({ kundId, affarId });
    if (!rader.length && tom && kan()) {
      return `<section class="kort enk-kort" ${attr}><div class="kort-huvud"><h3>${ik('enkat')}Enkäter</h3></div><button class="kd-tomrad" type="button" data-ton="mint" data-g="enk-ny" data-kund="${e(kundId)}" aria-label="Ny anonym enkät till medarbetarna"><span class="kd-tomrad-ikon" aria-hidden="true">${ik('enkat')}</span><span class="kd-rad-text" aria-hidden="true"><strong>Ingen enkät än</strong><small>En anonym länk till medarbetarna – resultatet sammanställt</small></span><span class="kd-tomrad-knapp" aria-hidden="true">${ik('plus')}<span>Ny</span></span></button></section>`;
    }
    if (!rader.length) return '';
    return `<section class="kort enk-kort" ${attr}><div class="kort-huvud"><h3>${ik('enkat')}Enkäter</h3>${kan() ? `<button class="knapp knapp-spok knapp-liten" type="button" data-g="enk-ny" data-kund="${e(kundId)}"${affarId ? ` data-affar="${e(affarId)}"` : ''}>${ik('plus')}Ny</button>` : `<span class="rakna">${rader.length}</span>`}</div>
      <div class="enk-kort-lista">${rader.slice(0, 4).map((r) => radHtml(r)).join('')}</div>
      ${rader.length > 4 ? `<a class="kortlank enk-kort-alla" href="#/enkater">Alla ${rader.length} enkäter${ik('pil')}</a>` : ''}</section>`;
  }
  // Ikonknappen i kundens och affärens hjälte (som Videomöte)
  const knappHtml = (kundId, affarId) => (kan() && kundId ? `<button class="knapp knapp-kontur detalj-ikonknapp" type="button" data-g="enk-ny" data-kund="${e(kundId)}"${affarId ? ` data-affar="${e(affarId)}"` : ''} aria-label="Ny anonym enkät till kundens medarbetare" title="Ny enkät – en anonym länk till medarbetarna">${ik('enkat')}<span class="detalj-ikon-text" aria-hidden="true">Enkät</span></button>` : '');

  /* --- Arket: ny och ändra ------------------------------------------------------------------ */
  let ed = null; // { nyckel, kundId, affarId, mall, titel, intro, mottagare, sista, fragor, last, bas, start, perMall, mottagareRord, kopiaAv }
  const utkast = new Map(); // osparade ark per kund/affär eller enkät – "Fortsätt där du var"
  const edNyckel = (x) => x.nyckel || `ny:${x.kundId || ''}:${x.affarId || ''}`;
  const kopiaFragor = (fr) => JSON.parse(JSON.stringify(fr || [])).map((f, i) => ({ ...f, id: f.id || `f${i + 1}` }));
  // Det som räknas som en ändring (utkastet sparas bara då för en befintlig enkät)
  const avtryck = (x) => JSON.stringify([x.titel, x.intro, String(x.mottagare), x.sista, x.kundId, x.fragor]);
  let fragaNr = 0;
  const nyFragaId = () => { const tagna = new Set(ed.fragor.map((f) => f.id)); let i = ed.fragor.length + 1 + fragaNr++; while (tagna.has(`f${i}`)) i++; return `f${i}`; };
  function fraanMall(id) {
    const m = ENKATMALLAR.find((x) => x.id === id) || ENKATMALLAR[0];
    return { mall: m.id, titel: m.id === 'egen' ? '' : m.namn, intro: m.intro, fragor: kopiaFragor(m.fragor) };
  }
  function oppna({ kundId, affarId, nyckel, kopiaAv } = {}) {
    if (SKARP) { toast('Enkäter finns bara i demoläget tills servern har stöd för dem', null, 'varning'); return; }
    if (!kan()) { toast('Säljarna skapar enkäter', null, 'varning'); return; }
    const x = nyckel && hamta(nyckel); const kopia = kopiaAv && hamta(kopiaAv);
    const a = affarId && affar(affarId);
    const k = kund((x && x.kundId) || (kopia && kopia.kundId) || kundId || (a && a.kundId));
    if (x) {
      const last = svarFor(nyckel).length > 0;
      const orig = { nyckel, kundId: x.kundId, affarId: x.affarId || null, mall: x.mall, titel: x.titel, intro: x.intro || '', mottagare: x.mottagare, sista: x.sista, fragor: kopiaFragor(x.fragor), last };
      // Ändra enkät har också utkast (fynd magnus-M4) – har någon svarat sedan dess gäller de sparade frågorna
      const sparat = utkast.get(nyckel);
      ed = sparat ? { ...sparat, last, fragor: last ? orig.fragor : sparat.fragor, aterupptaget: true } : orig;
      ed.bas = avtryck(orig);
    } else {
      const bas = { nyckel: null, kundId: k ? k.id : '', affarId: kopia ? kopia.affarId || null : a ? a.id : null };
      // Utkastet sparas där arket öppnades (fynd magnus-M6): från listan utan kund hittas det i listan, och från kundsidan
      // hittas också ett utkast som startade i listan men där samma kund valdes
      const start = kopia ? `kopia:${kopiaAv}` : edNyckel(bas);
      const sparat = utkast.get(start) || (bas.kundId && !kopia ? [...utkast.entries()].map(([, v]) => v).find((v) => !v.nyckel && !v.kopiaAv && v.kundId === bas.kundId && (v.affarId || null) === (bas.affarId || null)) : null);
      ed = sparat ? { ...sparat, aterupptaget: true }
        : kopia ? { ...bas, mall: kopia.mall, titel: `${kopia.titel} (kopia)`.slice(0, 120), intro: kopia.intro || '', mottagare: kopia.mottagare, sista: omDagar(14), fragor: kopiaFragor(kopia.fragor), last: false, kopiaAv, kopiaTitel: kopia.titel, mottagareRord: true }
        : { ...bas, ...fraanMall('arbetsmiljo'), mottagare: (k && k.anstallda) || 50, sista: omDagar(14), last: false, valjKund: !k };
      ed.start = sparat && sparat.start ? sparat.start : start;
      if (!ed.bas) ed.bas = avtryck(ed);
    }
    ritaArk();
  }
  const underText = (k) => `${k ? `${k.namn} · ` : ''}En anonym länk till medarbetarna – inga namn eller e‑post`; // hårt bindestreck – "e-/post" bröts på mobilen
  function mallval() {
    return `<fieldset class="enk-mallar"><legend class="sr">Mall</legend><p class="enk-ed-hjalp">Frågorna är förslag som du ändrar fritt.</p><div class="enk-mallar-lista">${ENKATMALLAR.map((m) => `<label class="enk-mall"><input type="radio" name="mall" value="${e(m.id)}" ${ed.mall === m.id ? 'checked' : ''} data-enk-mall><span><b>${e(m.namn)}</b><small>${e(m.kort)}</small><em>${m.id === 'egen' ? 'Tom' : `Mall · ${plural(m.fragor.length, 'fråga', 'frågor')}`}</em></span></label>`).join('')}</div></fieldset>`;
  }
  // Låsta frågor (någon har svarat): en tät läslista – förut fulla formulär med grepp som såg redigerbara ut (fynd ux-G9)
  function lastHtml(f, i) {
    const extra = f.typ === 'skala' ? ` · 1 = ${(f.etiketter || [])[0] || ''}, 5 = ${(f.etiketter || [])[1] || ''}` : f.typ === 'flerval' ? ` · ${plural((f.alternativ || []).length, 'alternativ', 'alternativ')}${f.flera ? ', flera svar' : ''}` : '';
    return `<li class="enk-ed-last-rad" data-enk-i="${i}"><span class="enk-nr" aria-hidden="true">${i + 1}</span><span><b>${e(f.text)}</b><small>${e(E.TYPER[f.typ])}${e(extra)}${f.kravs ? ' · måste besvaras' : ' · valfri'}</small></span></li>`;
  }
  function fragaHtml(f, i, n) {
    if (ed.last) return lastHtml(f, i);
    const id = `enk-f-${i}`;
    const typVal = Object.entries(E.TYPER).map(([v, t]) => `<option value="${v}" ${f.typ === v ? 'selected' : ''}>${e(t)}</option>`).join('');
    const altN = (f.alternativ || []).length;
    const extra = f.typ === 'skala' ? `<div class="enk-ed-skala"><label><span class="etikett">1 betyder</span><input class="falt" data-enk-et="0" maxlength="40" value="${e((f.etiketter || [])[0] || '')}" placeholder="Instämmer inte alls"></label><label><span class="etikett">5 betyder</span><input class="falt" data-enk-et="1" maxlength="40" value="${e((f.etiketter || [])[1] || '')}" placeholder="Instämmer helt"></label></div>`
      : f.typ === 'flerval' ? `<label class="enk-ed-alt"><span class="etikett">Svarsalternativ <em>– ett per rad</em><span class="enk-ed-altn" data-enk-altn ${altN > E.MAX.alternativ ? 'data-over' : ''}>${altN} / ${E.MAX.alternativ}</span></span><textarea class="falt" data-enk-alt rows="4" maxlength="900" placeholder="Alternativ 1&#10;Alternativ 2">${e((f.alternativ || []).join('\n'))}</textarea></label>
        <label class="kryss enk-ed-flera"><input type="checkbox" data-enk-flera ${f.flera ? 'checked' : ''}><span>Flera svar är tillåtna</span></label>`
      : f.typ === 'fritext' ? `<p class="enk-ed-not">Fritextsvaren visas sorterade, utan koppling till person, när minst ${E.GRANS} har svarat.</p>` : '';
    return `<li class="enk-ed-fraga" data-enk-i="${i}" data-typ="${e(f.typ)}">
      <div class="enk-ed-topp"><span class="enk-nr" aria-hidden="true">${i + 1}</span>
        <label class="enk-ed-typ"><span class="sr">Typ av fråga ${i + 1}</span><select class="falt" data-enk-typ>${typVal}</select></label>
        <span class="enk-ed-verktyg"><button class="ikonknapp" type="button" data-g="enk-flytta" data-i="${i}" data-steg="-1" aria-label="Flytta fråga ${i + 1} upp" title="Flytta upp" ${i === 0 ? 'disabled' : ''}>${ik('chevron')}</button><button class="ikonknapp enk-ner" type="button" data-g="enk-flytta" data-i="${i}" data-steg="1" aria-label="Flytta fråga ${i + 1} ned" title="Flytta ned" ${i === n - 1 ? 'disabled' : ''}>${ik('chevron')}</button><button class="ikonknapp enk-bort" type="button" data-g="enk-bort" data-i="${i}" aria-label="Ta bort fråga ${i + 1}" title="Ta bort frågan" ${n === 1 ? 'disabled' : ''}>${ik('papperskorg')}</button></span></div>
      <label class="enk-ed-text"><span class="sr">Fråga ${i + 1}</span><textarea class="falt" id="${id}" data-enk-text rows="2" maxlength="${E.MAX.fraga}" placeholder="Skriv frågan">${e(f.text || '')}</textarea></label>
      ${extra}
      <label class="kryss enk-ed-kravs"><input type="checkbox" data-enk-kravs ${f.kravs ? 'checked' : ''}><span>Måste besvaras</span></label></li>`;
  }
  function ritaFragor() {
    const ol = $('[data-enk-fragor]'); if (!ol) return;
    ol.innerHTML = ed.fragor.map((f, i) => fragaHtml(f, i, ed.fragor.length)).join('');
    const r = $('[data-enk-antal]'); if (r) r.textContent = String(ed.fragor.length);
    const ny = $('[data-enk-ny]'); if (ny) ny.hidden = ed.fragor.length >= E.MAX.fragor;
  }
  // Numrerade avsnitt i arket (fynd ux-G8): Mall · Om enkäten · Frågor – så att den långa kolumnen har en riktning
  const avsnitt = (nr, text, extra = '') => `<div class="enk-ed-avsnitt"><span class="enk-nr" aria-hidden="true">${nr}</span><h3>${text}</h3>${extra}</div>`;
  function ritaArk() {
    const k = kund(ed.kundId); const ny = !ed.nyckel;
    const kunder = db().kunder.slice().sort((a, b) => (a.typ === b.typ ? a.namn.localeCompare(b.namn, 'sv') : a.typ === 'foretag' ? -1 : 1));
    const medMall = ny && !ed.kopiaAv; let nr = 0;
    oppnaArk(`${arkHuvud(ny ? 'Ny enkät' : 'Ändra enkät', underText(k), 'enkat')}
      <form id="enk-form" class="ark-kropp enk-ed" data-enk-form novalidate>
        ${ed.aterupptaget ? `<p class="enk-ed-utkast">${ik('info')}<span>Ditt utkast finns kvar – ${ny ? 'det du skrev senast' : 'ändringarna är inte sparade än'}.</span><button class="knapp knapp-spok knapp-liten" type="button" data-g="enk-borja-om">${ny ? 'Börja om' : 'Släng ändringarna'}</button></p>` : ''}
        ${ed.kopiaAv ? `<p class="enk-ed-utkast">${ik('info')}<span>Kopia av <b>${e(ed.kopiaTitel || '')}</b> – frågorna är kopierade och kan ändras. Svaren följer inte med.</span></p>` : ''}
        ${medMall ? `${avsnitt(++nr, 'Välj mall')}${mallval()}` : ''}
        ${avsnitt(++nr, 'Om enkäten')}
        ${k && !ed.valjKund ? '' : `<label><span class="etikett">Kund <span class="krav">*</span></span><select class="falt" name="kund" data-enk-kund>${k ? '' : '<option value="">Välj kund</option>'}${kunder.map((x) => `<option value="${e(x.id)}" ${k && x.id === k.id ? 'selected' : ''}>${e(x.namn)}${x.typ === 'klubb' ? ' · Klubb' : ''}</option>`).join('')}</select></label>`}
        <label><span class="etikett">Namn på enkäten <span class="krav">*</span></span><input class="falt" name="titel" maxlength="${E.MAX.titel}" value="${e(ed.titel)}" placeholder="T.ex. Medarbetarenkät hösten 2026"></label>
        <label><span class="etikett">Inledning <em>– visas överst för den som svarar</em></span><textarea class="falt" name="intro" rows="3" maxlength="${E.MAX.intro}">${e(ed.intro)}</textarea></label>
        <div class="enk-ed-rad"><label><span class="etikett">Ungefär hur många får länken? <span class="krav">*</span></span><input class="falt" name="mottagare" type="number" min="1" max="${E.MAX.mottagare}" step="1" value="${e(ed.mottagare)}"><small class="falt-hint">Svarsfrekvensen räknas mot det här talet.</small></label>
          <label><span class="etikett">Sista svarsdag <span class="krav">*</span></span><input class="falt" name="sista" type="date" min="${e(idag())}" max="${e(E.plusDagar(idag(), E.MAX.dagar))}" value="${e(ed.sista)}"><small class="falt-hint">Länken stängs efter den dagen – du kan förlänga den.</small></label></div>
        ${avsnitt(++nr, `Frågor <span class="rakna" data-enk-antal>${ed.fragor.length}</span>`, ed.last ? '' : '<small>Ordningen här är ordningen i enkäten.</small>')}
        ${ed.last ? `<p class="enk-ed-last">${ik('las')}<span><b>Frågorna är låsta – ${plural(svarFor(ed.nyckel).length, 'person har', 'personer har')} redan svarat.</b> Ändrade frågor skulle blanda ihop resultatet. Namn, inledning, mottagare och sista dag går att ändra. Vill du ändra frågorna, gör en kopia som ny enkät.</span><button class="knapp knapp-kontur knapp-liten" type="button" data-g="enk-kopia" data-id="${e(ed.nyckel)}">${ik('plus')}Kopia som ny enkät</button></p>` : ''}
        <ol class="enk-ed-fragor${ed.last ? ' enk-ed-lastlista' : ''}" data-enk-fragor></ol>
        ${ed.last ? '' : `<div class="enk-ed-ny" data-enk-ny><span class="etikett">Lägg till en fråga</span><div class="enk-ed-ny-knappar">${Object.entries(E.TYPER).map(([v, t]) => `<button class="knapp knapp-kontur knapp-liten" type="button" data-g="enk-lagg" data-typ="${v}">${ik('plus')}${e(t)}</button>`).join('')}</div></div>`}
        <p class="enk-ed-not">${ik('info')}Mallarna innehåller bara frågor – inga svar, siffror eller resultat. Svaren sparas utan namn, e‑post och klockslag, och resultatet visas först när minst ${E.GRANS} har svarat.</p>
        <p class="enk-ed-fel" data-enk-fel role="alert" hidden></p>
      </form>
      <div class="ark-fot"><span class="enk-ed-tips" aria-hidden="true">Enter = nästa fält · Ctrl+Enter = ${ny ? 'skapa' : 'spara'}</span><button class="knapp knapp-spok" type="button" data-g="stang-ark">Avbryt</button><button class="knapp knapp-accent" type="submit" form="enk-form">${ik(ny ? 'lank' : 'bock')}${ny ? 'Skapa enkät och länk' : 'Spara'}</button></div>`, { bred: true });
    ritaFragor();
  }
  // Fälten i arket → ed (före varje omritning av frågorna och när arket stängs)
  function las() {
    const f = $('[data-enk-form]'); if (!f || !ed) return;
    if (f.titel) ed.titel = f.titel.value; if (f.intro) ed.intro = f.intro.value;
    if (f.mottagare) ed.mottagare = f.mottagare.value; if (f.sista) ed.sista = f.sista.value;
    if (f.kund && f.kund.value) ed.kundId = f.kund.value;
    if (ed.last) return;
    $$('[data-enk-i]', f).forEach((li) => {
      const q = ed.fragor[+li.dataset.enkI]; if (!q) return;
      q.text = $('[data-enk-text]', li).value; q.kravs = $('[data-enk-kravs]', li).checked;
      const et = $$('[data-enk-et]', li); if (et.length) q.etiketter = et.map((x) => x.value);
      const alt = $('[data-enk-alt]', li); if (alt) q.alternativ = alt.value.split('\n').map((x) => x.trim()).filter(Boolean);
      const fl = $('[data-enk-flera]', li); if (fl) q.flera = fl.checked;
    });
  }
  const arket = () => document.querySelector('dialog[data-ark]');
  const arketOppet = () => { const a = arket(); return !!(a && a.open && a.querySelector('[data-enk-form]')); };
  const arkToast = (...a) => { const t = toast(...a); if (t && t.setAttribute) t.setAttribute('data-ark-bara', ''); return t; }; // försvinner med arket
  // Stängs arket utan att sparas: utkastet ligger kvar (bara under sessionen) – för en ny enkät alltid, för Ändra enkät när något ändrats
  const dlg = arket();
  if (dlg) {
    dlg.addEventListener('close', () => {
      const varEnkat = !!dlg.querySelector('[data-enk-form]');
      if (varEnkat && ed && !ed.sparad && dlg.dataset.enkStanger !== 'ja') {
        las();
        const nyckel = ed.nyckel || ed.start || edNyckel(ed);
        if (avtryck(ed) !== ed.bas) utkast.set(nyckel, { ...ed, fragor: kopiaFragor(ed.fragor), aterupptaget: false });
      }
      delete dlg.dataset.enkStanger;
    });
    dlg.addEventListener('input', (ev) => {
      if (!ev.target.closest('[data-enk-form]')) return;
      if (ev.target.name === 'mottagare' && ed) ed.mottagareRord = true;
      // Felet försvinner när man rättar fältet det gällde
      if (ev.target.getAttribute('aria-invalid') === 'true') { ev.target.removeAttribute('aria-invalid'); const p = $('[data-enk-fel]'); if (p) p.hidden = true; }
      las();
      // Flervalets räknare (fynd magnus-M8): "12 / 10" i rött innan man försöker spara
      if (ev.target.matches('[data-enk-alt]')) { const n = ev.target.value.split('\n').map((x) => x.trim()).filter(Boolean).length; const r = $('[data-enk-altn]', ev.target.closest('li')); if (r) { r.textContent = `${n} / ${E.MAX.alternativ}`; r.toggleAttribute('data-over', n > E.MAX.alternativ); } }
    });
    // Enter i ett fält hoppar till nästa fält – förut skickade det formuläret och enkäten skapades direkt (fynd magnus-M3).
    // Ctrl/Cmd+Enter skapar (sparar), som knappen.
    dlg.addEventListener('keydown', (ev) => {
      const t = ev.target; const f = t.closest && t.closest('[data-enk-form]');
      if (ev.key !== 'Enter' || ev.isComposing || !arketOppet()) return;
      if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); const form = $('[data-enk-form]'); if (form) form.requestSubmit(); return; }
      if (!f || t.tagName !== 'INPUT' || /^(button|submit|reset)$/.test(t.type)) return;
      ev.preventDefault();
      const synlig = (x) => x.getClientRects().length && !x.closest('[hidden]') && !x.disabled && !(x.type === 'radio' && !x.checked) && !x.readOnly;
      const alla = $$('input:not([type=hidden]), textarea, button', f).filter((x) => x.tabIndex >= 0 && synlig(x));
      const i = alla.indexOf(t); const nasta = alla.slice(i + 1).find((x) => !x.closest('.enk-ed-verktyg') && !x.matches('[data-g="enk-lagg"]'));
      if (nasta) { nasta.focus(); visaIArk(nasta); }
    });
    dlg.addEventListener('change', (ev) => {
      const t = ev.target; if (!t.closest || !t.closest('[data-enk-form]')) return;
      las();
      if (t.matches('[data-enk-kund]')) {
        // Mottagarna följer vald kund om fältet inte ändrats för hand, och underrubriken säger kundens namn (fynd magnus-M6, sanna-A2)
        const k = kund(t.value); ed.kundId = t.value || '';
        const f = $('[data-enk-form]');
        if (k && k.anstallda && !ed.mottagareRord && f && f.mottagare) { ed.mottagare = k.anstallda; f.mottagare.value = k.anstallda; }
        const p = arket() && arket().querySelector('.ark-rubrik p'); if (p) p.textContent = underText(k);
      }
      if (t.matches('[data-enk-mall]')) {
        // Dina frågor per mall sparas i arket – väljer du mallen igen kommer de tillbaka (fynd magnus-M2; förut var de borta för gott)
        const mFor = (id) => ((ENKATMALLAR.find((x) => x.id === id) || {}).fragor) || [];
        const orort = ed.fragor.length === mFor(ed.mall).length && ed.fragor.every((f, i) => mFor(ed.mall)[i] && mFor(ed.mall)[i].text === f.text);
        ed.perMall = ed.perMall || {};
        ed.perMall[ed.mall] = { fragor: kopiaFragor(ed.fragor), intro: ed.intro };
        const sparad = ed.perMall[t.value]; const m = fraanMall(t.value);
        const gammalMallTitel = ENKATMALLAR.some((x) => x.namn === ed.titel);
        ed.mall = m.mall; ed.fragor = sparad ? kopiaFragor(sparad.fragor) : m.fragor; ed.intro = sparad ? sparad.intro : m.intro;
        if (!ed.titel || gammalMallTitel) ed.titel = m.titel;
        const f = $('[data-enk-form]'); f.titel.value = ed.titel; f.intro.value = ed.intro;
        ritaFragor();
        if (sparad) arkToast('Dina frågor för mallen är tillbaka', null, 'aterstall');
        else if (!orort) arkToast('Mallens frågor ersatte dina – välj den förra mallen igen så kommer dina ändringar tillbaka', null, 'info');
      }
      if (t.matches('[data-enk-typ]')) {
        const li = t.closest('[data-enk-i]'); const q = ed.fragor[+li.dataset.enkI]; q.typ = t.value;
        if (q.typ === 'skala' && !q.etiketter) q.etiketter = ENKAT_SKALA.slice();
        if (q.typ === 'flerval' && !(q.alternativ && q.alternativ.length)) q.alternativ = [];
        ritaFragor(); fokusFraga(+li.dataset.enkI, '[data-enk-typ]');
      }
    });
  }
  // Rulla bara arkets egen rullyta – scrollIntoView flyttade hela arket på mobilen (bottenarket gled upp och lämnade en tom yta)
  function visaIArk(el, mitt = false) {
    const d = arket(); if (!el || !d) return;
    let p = el.parentElement;
    while (p && p !== d && !(p.scrollHeight > p.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    if (!p || p === d) return;
    const r = el.getBoundingClientRect(); const b = p.getBoundingClientRect();
    if (mitt) p.scrollTop += r.top - b.top - (b.height - r.height) / 2;
    else if (r.top < b.top + 8) p.scrollTop += r.top - b.top - 8;
    else if (r.bottom > b.bottom - 8) p.scrollTop += Math.min(r.bottom - b.bottom + 8, r.top - b.top - 8);
  }
  function fokusFraga(i, vad = '[data-enk-text]') {
    requestAnimationFrame(() => { const li = $(`[data-enk-i="${i}"]`); if (!li) return; const x = $(vad, li); const m = x && x.tagName === 'SELECT' && x._valjKnapp ? x._valjKnapp : x; if (m) { m.focus({ preventScroll: true }); visaIArk(li); } });
  }
  // Felraden står direkt under fältet som ska rättas, och både fältet och felet rullas fram i arkets kropp (fynd magnus-M5 – förut sist i
  // frågekortet, bakom arkets fot på mobilen). Raden skapas igen om frågorna har ritats om.
  function felRad(text, falt) {
    let p = $('[data-enk-fel]');
    if (!p) { const f = $('[data-enk-form]'); if (!f) return; f.insertAdjacentHTML('beforeend', '<p class="enk-ed-fel" data-enk-fel role="alert" hidden></p>'); p = $('[data-enk-fel]'); }
    p.textContent = text; p.hidden = false;
    if (falt) { const lab = falt.closest('label'); const ank = (lab && lab.closest('.enk-ed-fraga, [data-enk-form]') ? lab : null) || falt; ank.after(p); }
    if (falt) {
      falt.setAttribute('aria-invalid', 'true'); const m = falt.tagName === 'SELECT' && falt._valjKnapp ? falt._valjKnapp : falt; m.focus({ preventScroll: true });
      visaIArk(m, true); requestAnimationFrame(() => visaIArk(p));
    }
  }
  document.addEventListener('submit', (ev) => {
    const f = ev.target; if (!f.matches || !f.matches('[data-enk-form]')) return;
    ev.preventDefault();
    // Bara från det öppna arket, och en gång (dubbelklick, Enter två gånger)
    if (!arketOppet() || !ed || ed.sparad) return;
    las();
    $$('[aria-invalid]', f).forEach((x) => x.removeAttribute('aria-invalid'));
    if (!ed.kundId || !kund(ed.kundId)) { felRad('Välj vilken kund enkäten gäller.', f.kund); return; }
    const gammal = ed.nyckel && hamta(ed.nyckel);
    // En stängd eller utgången enkät får behålla sin passerade sista dag när man bara ändrar texten
    const k = E.kontrolleraEnkat({ ...ed, fragor: ed.fragor }, gammal && ed.sista === gammal.sista ? null : idag());
    if (!k.ok) {
      const forsta = k.fel[0];
      const falt = forsta.falt === 'titel' ? f.titel : forsta.falt === 'mottagare' ? f.mottagare : forsta.falt === 'sista' ? f.sista
        : forsta.fraga != null ? $(`[data-enk-i="${forsta.fraga}"] ${forsta.falt === 'alternativ' ? '[data-enk-alt]' : '[data-enk-text]'}`, f) : null;
      felRad(forsta.text + (k.fel.length > 1 ? ` (${plural(k.fel.length - 1, 'sak till', 'saker till')} att rätta)` : ''), falt); return;
    }
    const nu = new Date().toISOString(); const x = k.enkat;
    if (gammal) {
      const flyttad = gammal.sista !== x.sista;
      // Har någon hunnit svara medan arket var öppet: frågorna står kvar som de var (resultatet blandas inte ihop)
      const last = ed.last || svarFor(ed.nyckel).length > 0;
      Object.assign(gammal, { titel: x.titel, intro: x.intro, mottagare: x.mottagare, sista: x.sista, andrad: nu }, last ? {} : { fragor: x.fragor });
      logga(`Enkäten ${x.titel} ändrades${flyttad ? ` – sista svarsdag ${datumText(x.sista, { ar: 'auto', gemen: true })}` : ''}.`, { kundId: gammal.kundId, affarId: gammal.affarId || undefined, typ: 'dokument' });
      utkast.delete(ed.nyckel); ed.sparad = true; spara(); stang(); rendera();
      toast('Enkäten är sparad');
      return;
    }
    const n = (() => { let t = nyNyckel(); while (enkater()[t]) t = nyNyckel(); return t; })();
    let r = nyNyckel(); while (r === n) r = nyNyckel();
    enkater()[n] = { kundId: ed.kundId, affarId: ed.affarId || null, titel: x.titel, intro: x.intro, mall: ed.mall || 'egen', fragor: x.fragor, mottagare: x.mottagare, sista: x.sista,
      skapad: nu, skapadAv: K.jag, andrad: nu, stangd: null, resultat: r, resultatSparrad: null };
    logga(`Enkäten ${x.titel} skapades – en anonym svarslänk till ungefär ${x.mottagare} ${x.mottagare === 1 ? 'person' : 'personer'}.`, { kundId: ed.kundId, affarId: ed.affarId || undefined, typ: 'dokument' });
    utkast.delete(ed.start || edNyckel(ed)); utkast.delete(edNyckel(ed)); ed.sparad = true;
    spara(); stang();
    // Bekräftelsen står i kortet Nästa steg (enk-skapad) i stället för i en toast – toasten lade sig över texten i Resultat till
    // kunden och hade en andra accentknapp (Kopiera finns redan i hjälten och i kortet). Skärmläsare får beskedet i toastlådan.
    nyss = n;
    location.hash = `#/enkat/${n}`;
    meddela('Enkäten är skapad. Nästa steg är att skicka svarslänken.');
  });
  // Bara den enkät som just skapades, tills man lämnar den eller svarslänken har skickats
  let nyss = null;
  addEventListener('hashchange', () => { if (nyss && location.hash !== `#/enkat/${nyss}`) nyss = null; });
  // Ett besked bara för skärmläsare i den befintliga toastlådan (aria-live) – inget syns
  function meddela(text) {
    const l = document.querySelector('[data-toaster]'); if (!l) return;
    const p = document.createElement('p'); p.className = 'sr'; p.textContent = text; l.appendChild(p); setTimeout(() => p.remove(), 5000);
  }
  function stang() { const a = arket(); if (a && a.open) { a.dataset.enkStanger = 'ja'; a.close(); } }

  /* --- Länkar, mejl och QR-kod --------------------------------------------------------------- */
  function mejlSvar(n) {
    const x = hamta(n); const pk = kundensKontakt(x); const u = anv(x.skapadAv || K.jag);
    const text = [`Hej${pk ? ` ${fornamn(pk.namn)}` : ''}!`, '', `Här är länken till den anonyma enkäten ${x.titel}. Skicka den vidare till medarbetarna – samma länk till alla${x.mottagare ? `, ungefär ${x.mottagare} personer` : ''}.`, '',
      `Länk: ${lank(n)}`, `Sista svarsdag: ${fastDatum(x.sista)}`, '',
      `Enkäten är anonym: den frågar inte efter namn eller e-post, och resultatet visas bara sammanställt när minst ${E.GRANS} har svarat. Du får en egen länk till resultatet.`, '',
      'Hälsningar', u.namn, 'Uperformance', '', ARLIG_LANK].join('\r\n');
    return `mailto:${pk && pk.epost ? encodeURIComponent(pk.epost).replace(/%40/g, '@') : ''}?subject=${encodeURIComponent(`Enkät till medarbetarna – ${x.titel}`)}&body=${encodeURIComponent(text)}`;
  }
  function mejlRes(n) {
    const x = hamta(n); const pk = kundensKontakt(x); const u = anv(x.skapadAv || K.jag); const s = sm(n);
    const text = [`Hej${pk ? ` ${fornamn(pk.namn)}` : ''}!`, '', `Här är resultatet av enkäten ${x.titel}${s.antal ? ` – hittills har ${s.antal} av ungefär ${s.mottagare} svarat` : ''}.`, '',
      `Resultat: ${resLank(x)}`, '', `Sidan visar bara sammanställd statistik och uppdateras i omgångar om ${E.GRANS} svar. Inga namn eller e-post finns i enkäten, och en fråga visas först när minst ${E.GRANS} har svarat på den.`,
      'Du kan skriva ut sidan, spara den som PDF eller ladda ner sammanställningen (CSV).', '', 'Hälsningar', u.namn, 'Uperformance', '', ARLIG_LANK].join('\r\n');
    return `mailto:${pk && pk.epost ? encodeURIComponent(pk.epost).replace(/%40/g, '@') : ''}?subject=${encodeURIComponent(`Resultatet av enkäten – ${x.titel}`)}&body=${encodeURIComponent(text)}`;
  }
  // Steget "Svarslänken skickad" i enkätens gång: när länken kopieras eller mejlet öppnas första gången (ingen aktivitet för kopiering)
  function markeraSkickad(n, via) {
    const x = hamta(n); if (!x || x.skickad) return false;
    x.skickad = { tid: new Date().toISOString(), via }; spara(); return true;
  }
  function qrArk(n) {
    const x = hamta(n); if (!x) return;
    let svg = ''; try { svg = QR ? QR.svg(lank(n), { titel: `QR-kod till enkäten ${x.titel}` }) : ''; } catch (err) { svg = ''; }
    oppnaArk(`${arkHuvud('QR-kod till enkäten', 'Visa den på en skärm eller skriv ut den – mobilkameran öppnar enkäten direkt.', 'qr')}
      <div class="ark-kropp enk-qr">${svg ? `<div class="enk-qr-bild">${svg}</div>` : '<p class="enk-ed-not">QR-koden kunde inte skapas.</p>'}
        <p class="enk-qr-text"><b>${e(x.titel)}</b><small>${e(kund(x.kundId) ? kund(x.kundId).namn : '')} · sista svarsdag ${e(datumText(x.sista, { ar: 'auto', gemen: true }))}</small></p>
        <p class="enk-ed-not">${ik('info')}${e(ARLIG)}</p></div>
      <div class="ark-fot"><button class="knapp knapp-spok" type="button" data-g="stang-ark">Stäng</button>${svg ? `<button class="knapp knapp-kontur" type="button" data-g="enk-qr-spara" data-id="${e(n)}">${ik('ladda-ner')}Spara bilden</button><button class="knapp knapp-accent" type="button" data-g="enk-qr-skriv" data-id="${e(n)}">${ik('skrivare')}Skriv ut</button>` : ''}</div>`);
  }
  const filnamn = (t) => String(t || 'enkat').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'enkat';

  /* --- Utskriften (samma papper som kundens resultatsida) ------------------------------------- */
  function rapportPapper(n, { qr = false } = {}) {
    const x = hamta(n); const s = sm(n); const k = kund(x.kundId);
    if (qr) {
      let svg = ''; try { svg = QR.svg(lank(n)); } catch (err) { svg = ''; }
      return `<article class="er-papper er-qr-papper"><p class="er-marke">Uperformance</p><h1>${e(x.titel)}</h1><p class="er-ingress">${e(k ? k.namn : '')} · anonym enkät – inga namn eller e‑post</p><div class="er-qr">${svg}</div><p class="er-ingress">Skanna koden med mobilkameran. Sista svarsdag ${e(fastDatum(x.sista))}.</p><p class="er-lank">${e(lank(n))}</p></article>`;
    }
    const omgang = E.omgangText(s, { stangd: lage(x) !== 'oppen' });
    return `<article class="er-papper"><header class="er-papper-huvud"><p class="er-marke">Uperformance · enkätresultat</p><h1>${e(x.titel)}</h1>
        <p class="er-ingress">${e(k ? k.namn : '')} · ${e(andelText(s))} har svarat (${Math.round(s.andel * 100)} %) · ${lage(x) === 'oppen' ? `pågår till ${e(fastDatum(x.sista))}` : `avslutad, sista dag ${e(fastDatum(x.sista))}`}</p>${omgang ? `<p class="er-ingress">${e(omgang)}</p>` : ''}</header>
      ${s.visas ? `<div class="er-fragor">${E.fragorHtml(s, { esc: e, ik })}</div>` : `<p class="er-dold">Resultatet visas när minst ${E.GRANS} har svarat – just nu ${plural(s.antal, 'svar', 'svar')}.</p>`}
      <footer class="er-papper-fot">Anonym enkät: inga namn, e‑postadresser eller klockslag sparas. En fråga visas först när minst ${E.GRANS} har svarat på den. Utskrivet ${e(fastDatum(idag()))}.${x.exempel ? ' Exempeldata – svaren är påhittade.' : ''}</footer></article>`;
  }

  /* --- Vyn #/enkat/<nyckel> ----------------------------------------------------------------- */
  const hjalte = (o) => sidhjalte({ ogon: 'Enkäter', ...o, klass: 'sidhjalte-enk' });
  const lastSkarpt = () => hjalte({ titel: 'Enkäter kommer i den skarpa versionen', text: 'Anonyma enkäter finns i demoläget. Den skarpa versionen behöver serverstöd som tar emot svaren utan att spara något som pekar ut en person – tills dess används enkäterna bara i demon.', knappar: `<a class="knapp knapp-accent" href="#/">${ik('hem')}Till översikten</a>` });
  // Andel i hjälten med ring (fynd ux-G3, samma ring som affärens Chans att vinna): gul under gränsen, strecket vid 5 svar av mottagarna
  function medRing(html, s) {
    if (!window.UPDiagram || !window.UPDiagram.ring) return html;
    const grans = Math.min(1, E.GRANS / s.mottagare);
    const ring = window.UPDiagram.ring(s.andel * 100, { klass: 'glas-ring', ton: s.visas ? 'mint' : 'gul', t: 11, grad: true, dekor: true, mal: grans > 0 && grans < 1 ? grans * 100 : null, attr: `data-lage="${s.visas ? (s.andel >= 0.7 ? 'hog' : 'mitt') : 'lag'}"` });
    return html.replace(/(<strong class="glas-varde"[^>]*data-format="pct"[^>]*>[\s\S]*?<\/strong>)/, (m) => `<span class="glas-rad">${m}${ring}</span>`);
  }
  // Enkätens gång som steg (fynd ux-G3 – "kolla alla stegen i processen"): datum ur datan, första ej klara steget är aktivt
  function gangHtml(n, x, s) {
    const l = lage(x); const avslutad = l !== 'oppen';
    const dag = (t) => (t ? dagTill(dagIso(t)) : '');
    const steg = [
      ['Skapad', true, dag(x.skapad)],
      ['Svarslänken skickad', !!x.skickad || s.antal > 0, x.skickad ? `${x.skickad.via === 'mejl' ? 'mejl öppnat' : 'kopierad'} ${dag(x.skickad.tid)}` : s.antal ? 'svar har kommit' : 'kopiera eller mejla länken'],
      [`${E.GRANS} svar`, s.visas, s.visas ? 'resultatet visas' : `${s.antal} av ${E.GRANS}`],
      ['Delad med kunden', !!x.delad, x.delad ? `${x.delad.via === 'kopierad' ? 'länken kopierad' : 'mejl öppnat'} ${dag(x.delad.tid)}` : s.visas ? 'skicka resultatlänken' : `när ${E.GRANS} har svarat`],
      ['Avslutad', avslutad, avslutad ? (x.stangd ? `stängd ${dag(x.stangd)}` : `sista dag ${dagTill(x.sista)}`) : `sista dag ${dagTill(x.sista)}`],
    ];
    const aktiv = steg.findIndex(([, klar]) => !klar);
    return `<section class="kort enk-gang" aria-label="Enkätens gång"><ol class="enk-gang-steg">${steg.map(([namn, klar, under], i) => `<li data-status="${klar ? 'klar' : i === aktiv ? 'aktiv' : 'kommande'}" ${i === aktiv ? 'aria-current="step"' : ''}><span class="enk-gang-nr" aria-hidden="true">${klar ? ik('bock') : i + 1}</span><span><b>${e(namn)}</b><small>${e(under)}</small></span></li>`).join('')}</ol></section>`;
  }
  function visa(n) {
    if (SKARP) return lastSkarpt();
    const x = hamta(n);
    if (!x) return `${hjalte({ titel: 'Enkäten finns inte', text: 'Den kan ha tagits bort, eller så är adressen fel.', knappar: `<a class="knapp knapp-kontur" href="#/enkater">${ik('pil-v')}Alla enkäter</a>` })}`;
    const k = kund(x.kundId); const a = x.affarId && affar(x.affarId); const s = sm(n); const l = lage(x); const d = dagarTill(x.sista);
    const pk = kundensKontakt(x);
    const nasta = !s.visas && l === 'oppen'; // färre än fem svar och enkäten pågår: Svarslänken är Nästa steg i huvudkolumnen (fynd ux-G1)
    // Hjältens knappar på en rad (fynd magnus-M9): Ändra finns i Frågorna-kortet
    const knappar = [
      l === 'oppen' ? `<button class="knapp knapp-accent" type="button" data-g="enk-kopiera" data-id="${e(n)}">${ik('lank')}Kopiera svarslänken</button>` : '',
      `<a class="knapp knapp-kontur" href="#/kund/${e(x.kundId)}">${ik('kunder')}${e(k ? k.namn : 'Kunden')}</a>`,
    ].join('');
    const tal = [
      { emo: 'anstallda', etikett: 'Svar', varde: s.antal, under: `av ungefär ${e(s.mottagare)}` },
      { emo: 'stapel', etikett: 'Andel', varde: s.andel, format: 'pct', under: s.visas ? 'resultatet visas' : `${E.GRANS - s.antal > 0 ? `${E.GRANS - s.antal} till behövs` : ''}`, ton: s.visas ? 'mint' : '' },
      { emo: 'klocka', etikett: l === 'oppen' ? 'Dagar kvar' : 'Läge', ...(l === 'oppen' ? { varde: Math.max(0, d), under: `sista dag ${e(dagTill(x.sista))}` } : { text: LAGE[l][0], under: x.stangd ? `stängd ${e(datumText(dagIso(x.stangd), { ar: 'auto', gemen: true }))}` : '' }) },
      { emo: 'enkat', etikett: 'Frågor', varde: x.fragor.length, under: `${x.fragor.filter((f) => f.kravs).length} obligatoriska` },
    ];
    const omgang = E.omgangText(s, { stangd: l !== 'oppen' });
    const prickar = `<div class="enk-grans-prickar" role="img" aria-label="${s.antal} av ${E.GRANS} svar som behövs">${Array.from({ length: E.GRANS }, (_, i) => `<i ${i < s.antal ? 'data-pa' : ''}></i>`).join('')}</div>`;
    const resultat = s.visas
      ? `<section class="kort enk-res" data-enk-res data-enk-del="res" tabindex="-1"><div class="kort-huvud"><h2>${ik('stapel')}Resultatet</h2><span class="rakna">${e(andelText(s))}</span></div>
          ${x.exempel ? `<p class="enk-exempel">${ik('info')}Exempeldata – svaren är påhittade för att visa hur resultatet ser ut.</p>` : ''}
          ${omgang ? `<p class="enk-omgang">${ik('info')}<span>${e(omgang)}</span></p>` : ''}
          <div class="er-fragor">${E.fragorHtml(s, { esc: e, ik })}</div></section>`
      : `<section class="kort enk-res enk-grans" data-enk-res data-enk-del="res" tabindex="-1"><div class="kort-huvud"><h2>${ik('las')}Resultatet visas vid ${E.GRANS} svar</h2><span class="rakna">${e(andelText(s))}</span></div>
          <div class="enk-grans-inre">${prickar}
          <p><b>${s.antal ? `${plural(s.antal, 'person har', 'personer har')} svarat.` : 'Ingen har svarat än.'}</b> Resultatet visas när minst ${E.GRANS} har svarat – annars skulle det gå att räkna ut vad en enskild person tyckte. Samma gräns gäller för varje fråga och för kundens resultatlänk.</p></div></section>`;
    const lankRuta = (url, etikett, g) => `<div class="lankruta"><input class="falt" readonly value="${e(url)}" aria-label="${e(etikett)}" data-markera-allt><button class="knapp knapp-kontur knapp-liten" type="button" data-g="${g}" data-id="${e(n)}" aria-label="Kopiera ${e(etikett.toLowerCase())}">Kopiera</button></div>`;
    const mejlKnapp = (typ) => `<a class="knapp knapp-kontur knapp-liten" href="${e(typ === 'svar' ? mejlSvar(n) : mejlRes(n))}" data-enk-mejl="${typ}" data-id="${e(n)}" aria-label="${pk && pk.epost ? `Mejla ${e(fornamn(pk.namn))}` : 'Mejla'} ${typ === 'svar' ? 'svarslänken' : 'resultatlänken'}">${ik('mejl')}${pk && pk.epost ? `Mejla ${e(fornamn(pk.namn))}` : 'Mejla'}</a>`;
    // Svarslänken: delningen överst, sedan en fot med det som ändrar enkäten (Förläng, Stäng enkäten) – "Stäng" lästes som "stäng kortet" (fynd ux-G12)
    const skapadNyss = nasta && nyss === n && !x.skickad && !s.antal;
    // Redan skickad (eller svar har kommit) men färre än fem: nästa steg är att påminna – "skicka svarslänken" stod kvar fast steget var bockat
    const paminn = nasta && (!!x.skickad || s.antal > 0);
    const svarKort = `<section class="kort enk-dela${nasta ? ' enk-nasta' : ''}" data-enk-del="dela" tabindex="-1"><div class="kort-huvud"><h${nasta ? 2 : 3}>${ik('lank')}${nasta ? (paminn ? 'Nästa steg: påminn om svarslänken' : 'Nästa steg: skicka svarslänken') : 'Svarslänken'}</h${nasta ? 2 : 3}>${lageChip(x)}</div>
        ${skapadNyss ? `<p class="enk-skapad">${ik('bock')}<span><b>Enkäten är skapad.</b> Den finns också på kundsidan och under Dokument.</span></p>` : ''}
        <p class="enk-dela-text">${nasta ? `${paminn ? `Påminn ${pk ? e(fornamn(pk.namn)) : 'kunden'} om att dela länken med medarbetarna` : `Skicka länken till ${pk ? e(fornamn(pk.namn)) : 'kunden'}, som delar den med medarbetarna`}${x.mottagare ? ` (ungefär ${e(x.mottagare)} personer)` : ''}. ` : ''}En gemensam länk till alla som ska svara. Den frågar inte efter namn eller e‑post${l === 'oppen' ? `, och den gäller till och med ${e(datumText(x.sista, { ar: 'auto', gemen: true }))}` : ''}.</p>
        ${l === 'oppen' ? lankRuta(lank(n), 'Svarslänken', 'enk-kopiera') : `<p class="enk-dela-stangd">${ik('las')}${l === 'stangd' ? 'Enkäten är stängd – den som öppnar länken får veta det.' : 'Sista svarsdagen har passerat – länken tar inte emot fler svar.'}</p>`}
        ${l === 'oppen' ? `<div class="enk-dela-knappar">${mejlKnapp('svar')}<button class="knapp knapp-kontur knapp-liten" type="button" data-g="enk-qr" data-id="${e(n)}">${ik('qr')}QR-kod</button></div>` : ''}
        ${nasta ? `<div class="enk-nasta-grans">${prickar}<p><b>${s.antal ? `${plural(s.antal, 'person har', 'personer har')} svarat` : 'Ingen har svarat än'}.</b> Resultatet visas när minst ${E.GRANS} har svarat – annars skulle det gå att räkna ut vad en enskild person tyckte.</p></div>` : ''}
        ${pk && !pk.epost ? '<p class="enk-dela-not">Kontaktpersonen saknar e‑post – kopiera länken och skicka den på annat sätt.</p>' : !pk ? '<p class="enk-dela-not">Kunden har ingen kontaktperson – kopiera länken och skicka den själv.</p>' : ''}
        ${kan() ? `<div class="enk-dela-fot">${l === 'oppen' ? `<button class="knapp knapp-spok knapp-liten" type="button" data-g="enk-forlang" data-id="${e(n)}">${ik('klocka')}Förläng 14 dagar</button><button class="knapp knapp-spok knapp-liten" type="button" data-g="enk-stang" data-id="${e(n)}">${ik('las')}Stäng enkäten</button>`
          : `<button class="knapp knapp-kontur knapp-liten" type="button" data-g="enk-oppna" data-id="${e(n)}">${ik('aterstall')}${l === 'stangd' ? 'Öppna enkäten igen' : 'Förläng 14 dagar'}</button>`}</div>` : ''}</section>`;
    const delad = x.delad ? `${x.delad.via === 'kopierad' ? 'Resultatlänken kopierades' : `Mejl till ${e(x.delad.till || 'kunden')} öppnades`} ${e(datumText(dagIso(x.delad.tid), { ar: 'auto', gemen: true }))}.` : '';
    const resKort = `<section class="kort enk-dela"><div class="kort-huvud"><h3>${ik('stapel')}Resultat till kunden</h3>${x.resultatSparrad ? '<span class="chip">Stängd</span>' : x.delad ? '<span class="chip chip-is">Delad</span>' : ''}</div>
        <p class="enk-dela-text">En egen länk för ${pk ? e(pk.namn) : 'kunden'} med bara sammanställd statistik – de som svarar ser den aldrig. Den visar resultatet först vid ${E.GRANS} svar och uppdateras sedan i omgångar om ${E.GRANS}.</p>
        ${x.resultatSparrad ? `<p class="enk-dela-stangd">${ik('las')}Resultatlänken är stängd – kunden ser den inte längre.</p>` : lankRuta(resLank(x), 'Resultatlänken', 'enk-kopiera-res')}
        ${x.resultatSparrad ? '' : `<div class="enk-dela-knappar">${mejlKnapp('res')}<a class="knapp knapp-kontur knapp-liten" href="${e(resLank(x))}" target="_blank" rel="noopener">${ik('helskarm')}Öppna kundens vy</a></div>`}
        ${delad ? `<p class="enk-dela-not">${delad}</p>` : ''}
        ${kan() ? `<div class="enk-dela-fot"><button class="knapp knapp-spok knapp-liten" type="button" data-g="${x.resultatSparrad ? 'enk-res-oppna' : 'enk-res-stang'}" data-id="${e(n)}">${ik(x.resultatSparrad ? 'aterstall' : 'las')}${x.resultatSparrad ? 'Öppna resultatlänken igen' : 'Stäng resultatlänken'}</button></div>` : ''}</section>`;
    const sparKort = `<section class="kort enk-dela"><div class="kort-huvud"><h3>${ik('ladda-ner')}Spara och skriv ut</h3></div>
        <div class="enk-dela-knappar"><button class="knapp knapp-kontur knapp-liten" type="button" data-g="enk-skriv" data-id="${e(n)}">${ik('skrivare')}Skriv ut / spara som PDF</button><button class="knapp knapp-kontur knapp-liten" type="button" data-g="enk-csv" data-id="${e(n)}">${ik('ladda-ner')}CSV</button></div>
        <p class="enk-dela-not">Sammanställningen per fråga – aldrig en rad per person, inga namn eller e‑post.</p></section>`;
    const omKort = `<section class="kort enk-om"><div class="kort-huvud"><h3>${ik('skold')}Så skyddas anonymiteten</h3></div><ul class="enk-om-lista">
        <li>${ik('bock')}Ingen inloggning, inga namn och ingen e‑post – samma länk till alla.</li>
        <li>${ik('bock')}Svaren sparas med dag men utan klockslag, och fritext visas i bokstavsordning.</li>
        <li>${ik('bock')}Resultatet och varje fråga visas först vid ${E.GRANS} svar.</li>
        <li>${ik('bock')}Resultatet uppdateras i omgångar om ${E.GRANS} svar – ingen kan jämföra före och efter ett enskilt svar.</li>
        <li>${ik('bock')}En webbläsare kan svara en gång – länken säger till om man redan har svarat.</li></ul>
        <p class="enk-dela-not">${e(ARLIG)}</p></section>`;
    const fragLista = `<ol>${x.fragor.map((f, i) => `<li><span class="enk-nr" aria-hidden="true">${i + 1}</span><span><b>${e(f.text)}</b><small>${e(E.TYPER[f.typ])}${f.kravs ? '' : ' · valfri'}</small></span></li>`).join('')}</ol>`;
    const fragFot = kan() ? `<div class="enk-dela-knappar"><button class="knapp knapp-spok knapp-liten" type="button" data-g="enk-andra" data-id="${e(n)}">${ik('redigera')}Ändra enkäten</button><button class="knapp knapp-spok knapp-liten" type="button" data-g="enk-kopia" data-id="${e(n)}">${ik('plus')}Kopia som ny enkät</button></div>` : '';
    const sammanFragor = `${plural(x.fragor.length, 'fråga', 'frågor')} · ${x.fragor.filter((f) => f.kravs).length} obligatoriska`;
    // När resultatet visas står frågorna redan där – kortet är ihopfällt (fynd ux-G2); annars förhandsvisningen i huvudkolumnen (ux-G1)
    const fragKort = s.visas
      ? `<section class="kort enk-fragelista enk-fragelista-fall" data-enk-del="fragor" tabindex="-1"><details class="enk-fraga-fall"><summary class="kort-huvud"><h3>${ik('enkat')}Frågorna</h3><small>${e(sammanFragor)}<span class="enk-fall-visa"> · Visa</span></small></summary>${fragLista}${fragFot}</details></section>`
      : `<section class="kort enk-fragelista" data-enk-del="fragor" tabindex="-1"><div class="kort-huvud"><h${nasta ? 2 : 3}>${ik('enkat')}Frågorna</h${nasta ? 2 : 3}><span class="rakna">${x.fragor.length}</span></div><p class="enk-dela-not enk-fraga-sam">${e(sammanFragor)} – så här ser medarbetarna dem.</p>${fragLista}${fragFot}</section>`;
    // Mobil/surfplatta (en kolumn): ankarrad under hjälten – Svarslänken låg förut efter alla frågor (fynd magnus-M10)
    const ankare = `<nav class="enk-ankare" aria-label="Hoppa till">${[['res', s.visas ? 'Resultatet' : 'Läget', 'stapel'], ['dela', 'Svarslänken', 'lank'], ['fragor', 'Frågorna', 'enkat']].map(([m, t, i]) => `<button class="knapp knapp-kontur knapp-liten" type="button" data-g="enk-hoppa" data-mal="${m}">${ik(i)}${t}</button>`).join('')}</nav>`;
    const huvud = nasta ? `${svarKort}${fragKort}` : `${resultat}`;
    const sida = nasta ? `${resKort}${omKort}` : s.visas ? `${svarKort}${resKort}${sparKort}${fragKort}${omKort}` : `${svarKort}${fragKort}${resKort}${omKort}`;
    const ogon = `<a class="enk-ogon-kund${a ? ' enk-ogon-kund-dold' : ''}" href="#/kund/${e(x.kundId)}">${e(k ? k.namn : 'Kunden')}</a>${a ? `<span class="enk-ogon-sep${a ? ' enk-ogon-kund-dold' : ''}" aria-hidden="true"> · </span><a href="#/affar/${e(a.id)}">${e(a.titel)}</a>` : ''}`;
    return `${medRing(hjalte({ ogon, titel: e(x.titel), text: `Anonym enkät · ${e(LAGE[l][0].toLowerCase())}${l === 'oppen' ? ` till och med ${e(datumText(x.sista, { ar: 'auto', gemen: true }))}` : ''} · skapad av ${e(anv(x.skapadAv).namn)}`, knappar, tal }), s)}
      ${gangHtml(n, x, s)}${nasta ? '' : ankare}
      <div class="enk-rum${nasta ? ' enk-rum-nasta' : ''}"><div class="enk-huvud" data-kolumn-klister>${huvud}</div><div class="enk-sida" data-kolumn-klister>${sida}</div></div>`;
  }
  function visaAlla() {
    if (SKARP) return lastSkarpt();
    const rader = lista(); const pagar = rader.filter(([, x]) => lage(x) === 'oppen'); const avslutade = rader.filter(([, x]) => lage(x) !== 'oppen');
    const svar = rader.reduce((s2, [n]) => s2 + svarFor(n).length, 0);
    const vantar = pagar.filter(([n]) => svarFor(n).length < E.GRANS).length;
    const delade = rader.filter(([, x]) => x.delad && !x.resultatSparrad).length;
    const narmast = pagar.map(([, x]) => x.sista).sort()[0];
    // Fyra olika tal (fynd ux-G6 – förut tre ettor): pågår, svar, väntar på gränsen och delat med kunden
    const tal = [{ emo: 'enkat', etikett: 'Pågår', varde: pagar.length, under: narmast ? `närmast slut ${e(dagTill(narmast))}` : plural(rader.length, 'enkät totalt', 'enkäter totalt') },
      { emo: 'anstallda', etikett: 'Svar', varde: svar, under: `anonyma, i ${plural(rader.length, 'enkät', 'enkäter')}` },
      { emo: 'timglas', etikett: `Väntar på ${E.GRANS} svar`, varde: vantar, under: vantar ? 'resultatet visas inte än' : 'alla pågående visar resultat', ton: vantar ? 'gul' : '' },
      { emo: 'skicka', etikett: 'Delat med kunden', varde: delade, under: 'resultatlänk skickad' }];
    // Så går det till: tre steg – även i tomläget, där de är vägen in (fynd ux-G5)
    const steg = (fyll = false) => `<section class="kort enk-sa"${fyll ? ' data-fyll-sida' : ''}><div class="kort-huvud"><h2>${ik('kompass')}Så går det till</h2></div><ol class="enk-sa-steg">
      <li><span class="enk-nr" aria-hidden="true">1</span><span><b>Skapa enkäten</b><small>Här, på kundsidan eller affären – välj en mall och ändra frågorna.</small></span></li>
      <li><span class="enk-nr" aria-hidden="true">2</span><span><b>Skicka svarslänken</b><small>Till kontaktpersonen, som delar den med medarbetarna. Inga namn eller e‑post sparas.</small></span></li>
      <li><span class="enk-nr" aria-hidden="true">3</span><span><b>Dela resultatet</b><small>Vid minst ${E.GRANS} svar – en egen resultatlänk till kunden, eller utskrift som PDF.</small></span></li></ol></section>`;
    const grupp = (titel, r) => (r.length ? `<div class="enk-alla-grupp"><h3 class="enk-alla-rubrik">${titel} <span class="rakna">${r.length}</span></h3><div class="enk-alla-lista">${r.map((x) => radHtml(x, { medKund: true })).join('')}</div></div>` : '');
    return `${hjalte({ ogon: 'Kunderna', titel: 'Enkäter', text: `Anonyma enkäter till kundernas medarbetare – en länk till alla, och resultatet sammanställt när minst ${E.GRANS} har svarat.`, knappar: kan() ? `<button class="knapp knapp-accent" type="button" data-g="enk-ny">${ik('plus')}Ny enkät</button>` : '', tal })}
      <div class="enk-alla">${rader.length ? `<section class="kort enk-alla-kort"><div class="kort-huvud"><h2>${ik('enkat')}Alla enkäter</h2><span class="rakna">${rader.length}</span></div>${grupp('Pågår', pagar)}${grupp('Avslutade', avslutade)}</section>${steg(true)}`
        : `<section class="kort enk-tom">${emo('enkat', { ruta: 'l', ton: 'mint' })}<div><h2>Inga enkäter än</h2><p>En anonym enkät ger kundens medarbetare en gemensam länk – och kunden ett sammanställt resultat när minst ${E.GRANS} har svarat.</p></div>${kan() ? `<button class="knapp knapp-kontur" type="button" data-g="enk-ny">${ik('plus')}Ny enkät</button>` : ''}</section>${steg(true)}`}
        <p class="vm-arlig enk-arlig">${ik('info')}${e(ARLIG)}</p></div>`;
  }

  /* --- Dokument och sökning ------------------------------------------------------------------- */
  // En post per enkät i Dokument (fack Underlag, kalla 'enkat'): samma form som dokPoster i crm.js
  function dokPoster(kundId) {
    if (SKARP) return [];
    return lista({ kundId }).map(([n, x]) => {
      const s = sm(n); const l = lage(x); const a = x.affarId ? affar(x.affarId) : null;
      const detalj = `${andelText(s)} har svarat${l === 'oppen' ? ` · sista dag ${dagTill(x.sista)}` : ''}`;
      return { id: `e-${n}`, kalla: 'enkat', enkat: n, fack: 'underlag', kat: 'enkat', titel: x.titel, nummer: '', under: 'Anonym enkät', kundId: x.kundId, affarId: a ? a.id : null,
        lage: l === 'oppen' ? 'vantar' : 'klar', status: l === 'oppen' ? ['Pågår', 'chip-ok'] : l === 'stangd' ? ['Stängd', 'chip'] : ['Avslutad', 'chip'], detalj, detaljUt: `${s.antal} av ${s.mottagare} svar · sista dag ${x.sista}`,
        varde: null, vardeText: `${s.antal} svar`, vardeUnder: s.mottagare ? `av ${s.mottagare}` : '', utgar: l === 'oppen' ? x.sista : null, skapad: x.skapad, tid: [x.skapad, x.andrad, x.stangd].filter(Boolean).map(String).sort().pop(), av: x.skapadAv || null };
    });
  }
  function sokTraffar(q, traff) {
    if (SKARP || !q) return [];
    return lista().filter(([, x]) => traff(x.titel, q) || traff((kund(x.kundId) || {}).namn, q) || traff('enkät enkäter', q)).slice(0, 4).map(([n, x]) => ({ n, x, s: sm(n) }));
  }

  /* --- Handlarna --------------------------------------------------------------------------- */
  const nyKlar = () => { spara(); rendera(); };
  // Fokus efter en åtgärd som ritar om vyn: knappen som tar över (t.ex. Öppna enkäten igen efter Stäng, fynd magnus-M14)
  const fokusEfter = (valj) => setTimeout(() => { const b = document.querySelector(valj); if (b) b.focus({ preventScroll: false }); }, 60);
  const G = {
    'enk-ny': (el) => oppna({ kundId: el.dataset.kund, affarId: el.dataset.affar }),
    'enk-andra': (el) => oppna({ nyckel: el.dataset.id }),
    'enk-kopia': (el) => { stang(); setTimeout(() => oppna({ kopiaAv: el.dataset.id }), 0); },
    'enk-borja-om': () => {
      if (!ed) return;
      if (ed.nyckel) { utkast.delete(ed.nyckel); const n = ed.nyckel; ed = null; oppna({ nyckel: n }); return; }
      utkast.delete(ed.start || edNyckel(ed)); utkast.delete(edNyckel(ed));
      const bas = { nyckel: null, kundId: ed.kundId, affarId: ed.affarId, start: ed.start }; const k = kund(ed.kundId);
      ed = { ...bas, ...fraanMall('arbetsmiljo'), mottagare: (k && k.anstallda) || 50, sista: omDagar(14), last: false }; ed.bas = avtryck(ed); ritaArk();
    },
    'enk-lagg': (el) => {
      if (!ed || ed.last) return; las();
      if (ed.fragor.length >= E.MAX.fragor) { arkToast(`Högst ${E.MAX.fragor} frågor`, null, 'varning'); return; }
      const typ = el.dataset.typ; const q = { id: nyFragaId(), typ, text: '', kravs: typ !== 'fritext' };
      if (typ === 'skala') q.etiketter = ENKAT_SKALA.slice(); if (typ === 'flerval') { q.alternativ = []; q.flera = false; }
      ed.fragor.push(q); ritaFragor(); fokusFraga(ed.fragor.length - 1);
    },
    'enk-flytta': (el) => {
      if (!ed || ed.last) return; las();
      const i = +el.dataset.i; const j = i + +el.dataset.steg; if (j < 0 || j >= ed.fragor.length) return;
      [ed.fragor[i], ed.fragor[j]] = [ed.fragor[j], ed.fragor[i]]; ritaFragor();
      requestAnimationFrame(() => { const b = $(`[data-enk-i="${j}"] [data-g="enk-flytta"][data-steg="${el.dataset.steg}"]`) || $(`[data-enk-i="${j}"] [data-g="enk-flytta"]:not([disabled])`); if (b && !b.disabled) b.focus({ preventScroll: true }); else fokusFraga(j); const li = $(`[data-enk-i="${j}"]`); if (li) { li.setAttribute('data-flyttad', ''); visaIArk(li); } });
    },
    'enk-bort': (el) => {
      if (!ed || ed.last || ed.fragor.length <= 1) return; las();
      const i = +el.dataset.i; const [bort] = ed.fragor.splice(i, 1); ritaFragor();
      fokusFraga(Math.min(i, ed.fragor.length - 1));
      // Toasten ligger i arkets låda (crm.js toastLada) och försvinner med arket – Ångra efter stängt ark gjorde ingenting
      arkToast(`Fråga ${i + 1} togs bort`, null, 'bock', { atgard: { text: 'Ångra', fn: () => { if (!ed || !arketOppet()) return; las(); ed.fragor.splice(i, 0, bort); ritaFragor(); fokusFraga(i); } } });
    },
    'enk-hoppa': (el) => { const m = document.querySelector(`[data-enk-del="${sel(el.dataset.mal)}"]`); if (!m) return; const det = m.querySelector('details'); if (det) det.open = true; m.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); m.focus({ preventScroll: true }); },
    'enk-kopiera': (el) => { const f = el.parentElement && el.parentElement.querySelector('input[data-markera-allt]'); K.kopiera(lank(el.dataset.id), f); if (markeraSkickad(el.dataset.id, 'kopierad')) rendera(); },
    'enk-kopiera-res': (el) => {
      const x = hamta(el.dataset.id); if (!x) return; const f = el.parentElement && el.parentElement.querySelector('input[data-markera-allt]'); K.kopiera(resLank(x), f);
      if (!x.delad) { x.delad = { tid: new Date().toISOString(), via: 'kopierad' }; nyKlar(); }
    },
    'enk-qr': (el) => qrArk(el.dataset.id),
    'enk-qr-skriv': (el) => K.skrivUtPapper(rapportPapper(el.dataset.id, { qr: true })),
    'enk-qr-spara': (el) => { const x = hamta(el.dataset.id); if (!x || !QR) return; K.laddaNerFil(`qr-${filnamn(x.titel)}.svg`, QR.svg(lank(el.dataset.id), { marginal: 4 }).replace('<svg ', '<svg width="800" height="800" '), 'image/svg+xml'); },
    'enk-stang': (el) => { const x = hamta(el.dataset.id); if (!x) return; bekrafta({ titel: 'Stänga enkäten?', sym: 'las', text: `Länken tar inte emot fler svar. ${plural(svarFor(el.dataset.id).length, 'svar', 'svar')} finns kvar, och du kan öppna enkäten igen.`, knapp: 'Stäng enkäten', g: 'enk-stang-ok', data: { id: el.dataset.id } }); },
    'enk-stang-ok': (el) => { const x = hamta(el.dataset.id); if (!x) return; x.stangd = new Date().toISOString(); x.andrad = x.stangd; logga(`Enkäten ${x.titel} stängdes – ${plural(svarFor(el.dataset.id).length, 'svar', 'svar')}.`, { kundId: x.kundId, affarId: x.affarId || undefined, typ: 'dokument' }); stang(); nyKlar(); toast('Enkäten är stängd'); fokusEfter(`[data-g="enk-oppna"][data-id="${sel(el.dataset.id)}"]`); },
    'enk-oppna': (el) => {
      const x = hamta(el.dataset.id); if (!x) return; const nu = new Date().toISOString();
      const fore = lage(x); x.stangd = null; if (x.sista < idag()) x.sista = omDagar(14); x.andrad = nu;
      logga(`Enkäten ${x.titel} ${fore === 'stangd' ? 'öppnades igen' : 'förlängdes'} – sista svarsdag ${datumText(x.sista, { ar: 'auto', gemen: true })}.`, { kundId: x.kundId, affarId: x.affarId || undefined, typ: 'dokument' });
      nyKlar(); toast(`Enkäten tar emot svar till och med ${datumText(x.sista, { ar: 'auto', gemen: true })}`); fokusEfter(`[data-g="enk-stang"][data-id="${sel(el.dataset.id)}"]`);
    },
    'enk-forlang': (el) => {
      const x = hamta(el.dataset.id); if (!x) return;
      const ny = E.plusDagar(x.sista < idag() ? idag() : x.sista, 14); const tak = E.plusDagar(idag(), E.MAX.dagar);
      x.sista = ny > tak ? tak : ny; x.andrad = new Date().toISOString();
      logga(`Sista svarsdag för enkäten ${x.titel} flyttades till ${datumText(x.sista, { ar: 'auto', gemen: true })}.`, { kundId: x.kundId, affarId: x.affarId || undefined, typ: 'dokument' });
      nyKlar(); toast(`Sista svarsdag är nu ${datumText(x.sista, { ar: 'auto', gemen: true })}`);
    },
    'enk-res-stang': (el) => { const x = hamta(el.dataset.id); if (!x) return; bekrafta({ titel: 'Stänga resultatlänken?', sym: 'las', text: 'Kunden ser inte längre resultatet via länken. Enkäten och svaren påverkas inte, och du kan öppna länken igen.', knapp: 'Stäng resultatlänken', g: 'enk-res-stang-ok', data: { id: el.dataset.id } }); },
    'enk-res-stang-ok': (el) => { const x = hamta(el.dataset.id); if (!x) return; x.resultatSparrad = new Date().toISOString(); x.andrad = x.resultatSparrad; logga(`Resultatlänken för enkäten ${x.titel} stängdes.`, { kundId: x.kundId, affarId: x.affarId || undefined, typ: 'dokument' }); stang(); nyKlar(); toast('Resultatlänken är stängd'); fokusEfter(`[data-g="enk-res-oppna"][data-id="${sel(el.dataset.id)}"]`); },
    'enk-res-oppna': (el) => { const x = hamta(el.dataset.id); if (!x) return; x.resultatSparrad = null; x.andrad = new Date().toISOString(); logga(`Resultatlänken för enkäten ${x.titel} öppnades igen.`, { kundId: x.kundId, affarId: x.affarId || undefined, typ: 'dokument' }); nyKlar(); toast('Kunden ser resultatet igen'); fokusEfter(`[data-g="enk-res-stang"][data-id="${sel(el.dataset.id)}"]`); },
    'enk-skriv': (el) => { const s = sm(el.dataset.id); if (!s.visas) return; K.skrivUtPapper(rapportPapper(el.dataset.id)); },
    'enk-csv': (el) => { const x = hamta(el.dataset.id); const s = sm(el.dataset.id); if (!x || !s.visas) return; K.laddaNerCsv(`enkat-${filnamn(x.titel)}-${idag()}`, E.csvRader(x, s, (kund(x.kundId) || {}).namn)); toast('Sammanställningen är nedladdad (CSV)'); },
  };
  // Mejlen öppnas av webbläsaren (mailto) – CRM:et vet bara att mejlprogrammet öppnades, inte att mejlet skickades (fynd magnus-M13)
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('a[data-enk-mejl]'); if (!a) return;
    const x = hamta(a.dataset.id); if (!x) return; const pk = kundensKontakt(x);
    if (a.dataset.enkMejl === 'res') {
      x.delad = { tid: new Date().toISOString(), till: pk ? pk.namn : '', via: 'mejl' }; x.andrad = x.delad.tid;
      logga(`Ett mejl med resultatlänken för enkäten ${x.titel} öppnades${pk ? ` till ${pk.namn}` : ''}.`, { kundId: x.kundId, affarId: x.affarId || undefined, typ: 'mejl' });
    } else {
      if (!x.skickad) x.skickad = { tid: new Date().toISOString(), via: 'mejl' };
      logga(`Ett mejl med svarslänken till enkäten ${x.titel} öppnades${pk ? ` till ${pk.namn}` : ''}.`, { kundId: x.kundId, affarId: x.affarId || undefined, typ: 'mejl' });
    }
    spara(); setTimeout(() => rendera(), 300);
  });

  const vagar = [
    [/^#\/enkater$/, visaAlla, 'enkater', 'Enkäter'],
    [/^#\/enkat\/([\w-]+)$/, visa, 'enkater', 'Enkät'],
  ];
  return { vagar, G, FORM: {}, kortHtml, knappHtml, dokPoster, sokTraffar, lank, resLank, hamta, sm, lage, LAGE, oppna, kan, ARLIG };
};
