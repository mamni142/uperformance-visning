/* Uperformance CRM – Förfrågningar från hemsidan (2026-11-23). Användaren: "gör så att det finns en koppling mellan hemsidan och
   loggin och crm, och att de kunder som väljer att skicka förfrågningar eller välja paket eller boka hamnar i crm och att de som är
   anställda får mail … fixa en förfrågningslåda där allt sånt hamnar snyggt och bra sorterat".

   Hemsidans kontaktformulär (index.html #kontakt, assets/up.js) skickar typ kontakt | bokning (Boka genomgång) | paket (Välj Bas …).
   Skarpt läge: POST /api/forfragan → samlingen forfragningar + mejl till FORFRAGAN_TILL (server/api-kund.js). Demoläget: hemsidan och
   CRM:et har samma ursprung, så hemsidan lägger förfrågan i localStorage "up-forfragningar-inkorg" och CRM:et flyttar in den i
   db.forfragningar (vid start, när fliken blir synlig och via storage-händelsen). I demon skickas inget mejl – raden säger det.

   Data: db.forfragningar = [{ id, typ, namn, epost, tel, organisation, representerar: foretag | idrott | annat, paket, antal, onskad,
   meddelande, kalla: 'hemsidan', status: ny | pagar | kund | klar, tilldelad, kundId, affarId, anteckning, skapad, mejl: [{ till, tid }] }].
   Sidan #/forfragningar: hjälten (nya, denna vecka, bokningar, paketval), filter (status som segment, typ som brickor, sök) och
   listan per dag; klick fäller ut detaljerna med åtgärderna Ta hand om, Svara (mejl), Ring, Skapa kund och affär, Klar/Öppna igen. */
window.UPForfragningar = (K) => {
  'use strict';
  const { e, ik, emo, toast, spara, rendera, logga, anv, sidhjalte, plural, kr, nyId, $, relTid, datumText, idag } = K; // K.bekrafta används för radera
  const db = () => K.db;
  const lista = () => { const d = db(); if (!Array.isArray(d.forfragningar)) d.forfragningar = []; return d.forfragningar; };
  const INKORG = 'up-forfragningar-inkorg';
  const ANSTALLDA = ['gustav.svensson@uperformance.se', 'magnus.andreasson@uperformance.se']; // samma som serverns FORFRAGAN_TILL
  const TYP = { kontakt: { namn: 'Kontakt', ikon: 'prat', ton: 'is' }, bokning: { namn: 'Boka genomgång', ikon: 'kalender', ton: 'mint' }, paket: { namn: 'Paketval', ikon: 'medalj', ton: 'gul' } };
  const STATUS = { ny: ['Ny', 'chip-atgard'], pagar: ['Pågår', 'chip-folj'], kund: ['Blev kund', 'chip-ok'], klar: ['Klar', 'chip-neutral'] };
  const PAKET = { bas: 'Bas', basplus: 'Bas+', basplusplus: 'Bas++' };
  const REP = { foretag: 'Företag', idrott: 'Idrottsförening', annat: 'Annat' };
  const ui = { status: 'oppna', typ: 'alla', vald: null, sok: '', nyVald: false };
  const kan = () => { const u = anv(K.jag) || {}; return u.roll === 'salj' || u.roll === 'admin' || !!u.admin; };
  // radera en förfrågan (rätten att bli raderad): i skarpt läge bara administratören – servern tillåter bara admin att radera
  const kanRadera = () => { const u = anv(K.jag) || {}; return !K.SKARP ? kan() : u.roll === 'admin' || !!u.admin; };
  const raderasDatum = (f) => { const d = new Date(f.skapad || Date.now()); d.setMonth(d.getMonth() + 12); return d.toISOString().slice(0, 10); };

  /* ---- demoläget: hämta det hemsidan har lagt i inkorgen ---- */
  function hamtaInkorg({ tyst = false } = {}) {
    if (K.SKARP) return 0;
    let inkorg = []; try { inkorg = JSON.parse(localStorage.getItem(INKORG) || '[]'); } catch (err) { inkorg = []; }
    if (!Array.isArray(inkorg) || !inkorg.length) return 0;
    const finns = new Set(lista().map((f) => f.id)); let n = 0; const nya = [];
    for (const f of inkorg) {
      if (!f || typeof f !== 'object' || !f.id || finns.has(f.id)) continue;
      const post = { ...f, kalla: 'hemsidan', status: 'ny', tilldelad: null, kundId: null, affarId: null, anteckning: '', mejl: ANSTALLDA.map((till) => ({ till, tid: f.skapad, demo: true })) };
      lista().unshift(post); nya.push(post); n++;
    }
    try { localStorage.removeItem(INKORG); } catch (err) { /* ingen lagring */ }
    if (n) {
      spara();
      if (!tyst) toast(nya.length === 1 ? `Ny förfrågan från hemsidan: ${nya[0].namn}${nya[0].organisation ? `, ${nya[0].organisation}` : ''} (${TYP[nya[0].typ].namn})` : `${nya.length} nya förfrågningar från hemsidan`, { text: 'Öppna', href: '#/forfragningar' }, 'inkorg');
    }
    return n;
  }
  hamtaInkorg({ tyst: true });
  addEventListener('storage', (ev) => { if (ev.key === INKORG && ev.newValue && hamtaInkorg()) rendera(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && hamtaInkorg()) rendera(); });

  /* ---- delar ---- */
  const nya = () => lista().filter((f) => f.status === 'ny').length;
  const chip = (f) => `<span class="chip ${STATUS[f.status] ? STATUS[f.status][1] : 'chip-neutral'}">${e(STATUS[f.status] ? STATUS[f.status][0] : f.status)}</span>`;
  const iFilter = (f) => (ui.status === 'alla' || (ui.status === 'oppna' ? f.status === 'ny' || f.status === 'pagar' : f.status === ui.status)) && (ui.typ === 'alla' || f.typ === ui.typ);
  const sokText = (f) => `${f.namn} ${f.organisation || ''} ${f.epost} ${f.meddelande || ''}`.toLowerCase();
  const dagRubrik = (iso) => { const d = (iso || '').slice(0, 10); const i = idag(); if (d === i) return 'Idag'; const ig = new Date(`${i}T12:00:00Z`); ig.setUTCDate(ig.getUTCDate() - 1); if (d === ig.toISOString().slice(0, 10)) return 'Igår'; return datumText(d); };
  const sammanfatt = (f) => [f.typ === 'paket' && f.paket ? `Vill ha ${PAKET[f.paket] || f.paket}` : '', f.typ === 'bokning' ? `Vill boka en genomgång${f.onskad ? ` · ${f.onskad}` : ''}` : '', f.antal ? `${f.antal} personer` : '', f.meddelande ? f.meddelande.replace(/\s+/g, ' ').slice(0, 120) : ''].filter(Boolean).join(' · ');

  // "Igår 14:20", "Idag 08:00" eller "12 nov 14:20" – datum och klockslag en gång (förut "Igår · igår")
  const inkomText = (iso) => { if (!iso) return '–'; const d = new Date(iso); const kl = isNaN(d) ? '' : ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; return `${dagRubrik(iso)}${kl}`; };
  // samma dubblettregel som Snabbregistrera och importen (crm.js namnNyckel – finns inte i BYGG, därför kopierad)
  const namnNyckel = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/[\s,.]+(ab|aktiebolag|hb|handelsbolag|kb|kommanditbolag)\.?(\s*\(publ\))?$/u, '').trim();
  // ansvarig säljare: den inloggade om hen är säljare, annars första aktiva säljaren (som snabbregistreringen) – admin är inte säljare
  const ansvarigSaljare = () => { const u = anv(K.jag) || {}; if (u.roll === 'salj') return K.jag; const s = (db().anvandare || []).find((x) => x.roll === 'salj' && x.aktiv !== false && x.aktiv !== 0); return s ? s.id : K.jag; };

  function detaljHtml(f) {
    const t = TYP[f.typ] || TYP.kontakt; const ansv = f.tilldelad ? anv(f.tilldelad) : null; const kundL = f.kundId && K.kund(f.kundId);
    const fakta = [['Typ', t.namn], ['Representerar', REP[f.representerar] || '–'], ['Organisation', f.organisation || '–'], ['Paket', PAKET[f.paket] || '–'], ['Antal personer', f.antal ? String(f.antal) : '–'], ['Önskad tid', f.onskad || '–'], ['Inkom', inkomText(f.skapad)], ['Ansvarig', ansv ? ansv.namn : 'Ingen än']];
    const mejl = (f.mejl || []).length ? `<p class="ff-mejl">${ik('mejl')}<span>${f.mejl.some((m) => m.demo) ? 'I skarpt läge får' : 'Mejl skickat till'} ${e(f.mejl.map((m) => m.till).join(' och '))}${f.mejl.some((m) => m.demo) ? ' ett mejl om förfrågan. I demon skickas inget mejl.' : '.'}</span></p>` : '';
    const svar = `mailto:${encodeURIComponent(f.epost)}?subject=${encodeURIComponent(`Din förfrågan till Uperformance${f.typ === 'bokning' ? ' – genomgång' : f.typ === 'paket' && f.paket ? ` – ${PAKET[f.paket]}` : ''}`)}&body=${encodeURIComponent(`Hej ${String(f.namn || '').split(' ')[0]},\n\nTack för din förfrågan!\n\n`)}`;
    return `<div class="ff-detalj"${ui.nyVald ? ' data-nytt' : ''}>
        <div class="ff-kontakt"><a class="ff-kanal" href="${e(svar)}">${ik('mejl')}<span><small>E-post</small><strong>${e(f.epost)}</strong></span></a>${f.tel ? `<a class="ff-kanal" href="tel:${e(f.tel.replace(/[^\d+]/g, ''))}">${ik('samtal')}<span><small>Telefon</small><strong>${e(f.tel)}</strong></span></a>` : ''}</div>
        ${f.meddelande ? `<blockquote class="ff-meddelande">${e(f.meddelande)}</blockquote>` : ''}
        <dl class="ff-fakta">${fakta.map(([a, b]) => `<div><dt>${e(a)}</dt><dd>${e(b)}</dd></div>`).join('')}</dl>
        ${mejl}
        ${!f.kundId ? `<p class="ff-mejl">${ik('las')}<span>Raderas automatiskt ${e(datumText(raderasDatum(f)))} om ingen affär skapas (GDPR – 12 månader).${f.integritet ? ` Kunden har läst integritetspolicyn (version ${e(f.integritet.version || '1')}).` : ''}</span></p>` : ''}
        ${kundL ? `<p class="ff-lank">${ik('kunder')}<span>Kopplad till <a href="#/kund/${e(kundL.id)}">${e(kundL.namn)}</a>${f.affarId ? ` · <a href="#/affar/${e(f.affarId)}">affären</a>` : ''}</span></p>` : ''}
        ${kan() ? `<div class="ff-knappar">
          ${!f.kundId ? `<button class="knapp knapp-accent knapp-liten" type="button" data-g="ff-kund" data-id="${e(f.id)}">${ik('plus')}Skapa kund och affär</button>` : ''}
          <a class="knapp knapp-kontur knapp-liten" href="${e(svar)}" data-g="ff-svara" data-id="${e(f.id)}">${ik('mejl')}Svara</a>
          ${f.tilldelad !== K.jag && f.status !== 'klar' ? `<button class="knapp knapp-kontur knapp-liten" type="button" data-g="ff-ta" data-id="${e(f.id)}">${ik('todo')}Ta hand om</button>` : ''}
          ${kanRadera() ? `<button class="knapp knapp-kontur knapp-liten ff-radera" type="button" data-g="ff-radera" data-id="${e(f.id)}">${ik('papperskorg')}Radera</button>` : ''}
          ${f.status === 'klar' || f.status === 'kund' ? `<button class="knapp knapp-kontur knapp-liten" type="button" data-g="ff-status" data-status="pagar" data-id="${e(f.id)}">Öppna igen</button>` : `<button class="knapp knapp-kontur knapp-liten" type="button" data-g="ff-status" data-status="klar" data-id="${e(f.id)}">${ik('bock')}Klar</button>`}
        </div>` : ''}
      </div>`;
  }

  function visa() {
    const alla = [...lista()].sort((a, b) => String(b.skapad).localeCompare(String(a.skapad)));
    const sok = ui.sok.trim().toLowerCase();
    const veckaSedan = new Date(Date.now() - 7 * 864e5).toISOString();
    const tal = [
      { emo: 'inkorg', etikett: 'Nya', varde: nya(), under: nya() ? 'väntar på svar' : 'allt är besvarat', ton: nya() ? 'gul' : '' },
      { emo: 'kalender', etikett: 'Senaste 7 dagarna', varde: alla.filter((f) => String(f.skapad) >= veckaSedan).length, under: 'från hemsidan', ton: 'is' },
      { emo: 'kalender', etikett: 'Vill boka genomgång', varde: alla.filter((f) => f.typ === 'bokning' && f.status !== 'klar').length, under: 'öppna', ton: 'mint' },
      { emo: 'medalj', etikett: 'Har valt paket', varde: alla.filter((f) => f.typ === 'paket' && f.status !== 'klar').length, under: 'öppna', ton: 'mint' },
    ];
    const hjalte = sidhjalte({ klass: 'sidhjalte-ff', ogon: 'Från hemsidan', titel: 'Förfrågningar', accent: 'att ta hand om',
      text: 'Allt som kunder skickar från hemsidan – frågor, bokade genomgångar och valda paket – samlas här. Gustav och Magnus får ett mejl för varje ny förfrågan.', tal });
    const visade = alla.filter(iFilter);
    const antal = (s) => alla.filter((f) => (s === 'alla' || (s === 'oppna' ? f.status === 'ny' || f.status === 'pagar' : f.status === s))).length;
    const seg = `<div class="ab-seg ff-seg" role="group" aria-label="Visa">${[['oppna', 'Att göra'], ['kund', 'Blev kund'], ['klar', 'Klara'], ['alla', 'Alla']].map(([s, n]) => `<button type="button" data-g="ff-filter" data-status="${s}" aria-pressed="${ui.status === s}">${e(n)}<span>${antal(s)}</span></button>`).join('')}</div>`;
    const typer = `<div class="ab-seg ff-typer" role="group" aria-label="Typ">${[['alla', 'Alla typer'], ...Object.entries(TYP).map(([k, t]) => [k, t.namn])].map(([k, n]) => `<button type="button" data-g="ff-filter" data-typ="${k}" aria-pressed="${ui.typ === k}">${e(n)}</button>`).join('')}</div>`;
    let rader = ''; let forra = '';
    for (const f of visade) {
      const dag = dagRubrik(f.skapad); if (dag !== forra) { const syns = !sok || visade.some((x) => dagRubrik(x.skapad) === dag && sokText(x).includes(sok)); rader += `<li class="ff-dag" data-ff-dag${syns ? '' : ' hidden'}>${e(dag)}</li>`; forra = dag; }
      const t = TYP[f.typ] || TYP.kontakt; const vald = ui.vald === f.id; const ansv = f.tilldelad ? anv(f.tilldelad) : null;
      rader += `<li class="ff-rad" data-status="${e(f.status)}" data-sok="${e(sokText(f))}"${sok && !sokText(f).includes(sok) ? ' hidden' : ''}${vald ? ' data-vald' : ''}>
          <button type="button" class="ff-rad-knapp" data-g="ff-valj" data-id="${e(f.id)}" aria-expanded="${vald}">
            ${emo(t.ikon, { ruta: 'm', ton: t.ton })}
            <span class="ff-rad-namn"><strong>${e(f.namn)}${f.organisation ? `<em> · ${e(f.organisation)}</em>` : ''}</strong><small>${e(t.namn)}${sammanfatt(f) ? ` – ${e(sammanfatt(f))}` : ''}</small></span>
            <span class="ff-rad-tid">${e(relTid(f.skapad))}</span>
            ${ansv ? K.avatar(ansv.id, true) : '<span class="ff-ingen" title="Ingen ansvarig än"></span>'}
            ${chip(f)}<span class="ff-pil" aria-hidden="true">${ik('chevron')}</span>
          </button>${vald ? detaljHtml(f) : ''}</li>`;
    }
    ui.nyVald = false;
    const tomt = !alla.length ? `<div class="ff-tomt">${emo('inkorg', { ruta: 'l', ton: 'is' })}<h2>Inga förfrågningar än</h2><p>När någon skickar formuläret på hemsidan, bokar en genomgång eller väljer ett paket hamnar det här – och Gustav och Magnus får ett mejl.</p><a class="knapp knapp-kontur" href="../#kontakt">${ik('lank')}Öppna formuläret på hemsidan</a></div>`
      : !visade.length ? '<p class="ff-inga">Inga förfrågningar i det här läget.</p>' : '';
    return hjalte + `<section class="kort ff-lada" aria-labelledby="ff-rubrik">
        <div class="kort-huvud"><h2 id="ff-rubrik">${emo('inkorg', { ruta: 'm', ton: 'is' })}Inkorgen</h2>
          <label class="ab-sok ff-sok">${ik('sok')}<input type="search" data-ff-sok value="${e(ui.sok)}" placeholder="Sök namn, företag eller e-post" aria-label="Sök bland förfrågningarna" autocomplete="off"></label></div>
        <div class="kort-inre"><div class="ff-verktyg">${seg}${typer}</div>
          ${tomt || `<ul class="ff-lista">${rader}</ul>`}</div></section>`;
  }

  // sök direkt i listan – raderna döljs, inget ritas om
  document.addEventListener('input', (ev) => {
    const f = ev.target; if (!f.matches || !f.matches('[data-ff-sok]')) return;
    ui.sok = f.value; const q = f.value.trim().toLowerCase();
    document.querySelectorAll('.ff-rad').forEach((li) => { li.hidden = !!q && !li.dataset.sok.includes(q); });
    document.querySelectorAll('[data-ff-dag]').forEach((d) => { let n = d.nextElementSibling; let syns = false; while (n && !n.matches('[data-ff-dag]')) { if (!n.hidden) syns = true; n = n.nextElementSibling; } d.hidden = !syns; });
  });

  const hamta = (id) => lista().find((f) => f.id === id);
  const G = {
    'ff-radera': (el) => { const f = hamta(el.dataset.id); if (!f || !kanRadera()) return;
      K.bekrafta({ titel: 'Radera förfrågan?', text: `${f.namn}s förfrågan och kontaktuppgifter tas bort för gott. Kunden och affären påverkas inte.`, knapp: 'Radera', fara: true, g: 'ff-radera-ok', data: { id: f.id } }); },
    'ff-radera-ok': (el) => { const d = db(); const i = lista().findIndex((x) => x.id === el.dataset.id); if (i < 0) return; const f = lista()[i];
      d.forfragningar.splice(i, 1); ui.vald = null; spara(); rendera(); toast(`${f.namn}s förfrågan är raderad`, null, 'papperskorg'); },
    'ff-filter': (el) => { if (el.dataset.status) ui.status = el.dataset.status; if (el.dataset.typ) ui.typ = el.dataset.typ; rendera(); },
    'ff-valj': (el) => { ui.vald = ui.vald === el.dataset.id ? null : el.dataset.id; ui.nyVald = !!ui.vald; rendera(); },
    'ff-ta': (el) => { const f = hamta(el.dataset.id); if (!f || !kan()) return; f.tilldelad = K.jag; if (f.status === 'ny') f.status = 'pagar'; spara(); toast(`Du tar hand om ${f.namn}s förfrågan`); rendera(); },
    'ff-status': (el) => { const f = hamta(el.dataset.id); if (!f || !kan()) return; const fore = f.status; f.status = el.dataset.status; if (!f.tilldelad) f.tilldelad = K.jag; spara(); rendera();
      toast(f.status === 'klar' ? `${f.namn}s förfrågan är klar` : `${f.namn}s förfrågan är öppen igen`, null, 'bock', { atgard: { text: 'Ångra', fn: () => { f.status = fore; spara(); rendera(); } } }); },
    'ff-svara': (el, ev) => { const f = hamta(el.dataset.id); if (!f) return; if (f.status === 'ny') { f.status = 'pagar'; if (!f.tilldelad) f.tilldelad = K.jag; spara(); } location.href = el.getAttribute('href'); setTimeout(rendera, 50); },
    'ff-kund': (el) => {
      const f = hamta(el.dataset.id); if (!f || !kan() || f.kundId) return; const d = db();
      const namn = (f.organisation || f.namn || 'Ny kund').trim();
      const epost = String(f.epost || '').trim().toLowerCase();
      const finns = d.kunder.find((k) => namnNyckel(k.namn) === namnNyckel(namn));
      const typ = f.representerar === 'idrott' ? 'klubb' : 'foretag';
      const k = finns || { id: nyId('k'), namn, typ, bransch: '', stad: '', orgnr: '', anstallda: f.antal || null, viaKlubb: null, skapad: idag(),
        kontakter: [{ id: nyId('p'), namn: f.namn, roll: '', epost: f.epost, tel: f.tel || '' }] };
      // en klubb får klubbavtal och ingen säljaffär – samma regel som Snabbregistrera (crm.js snabb-kund)
      if (!finns && k.typ === 'klubb') k.klubbavtal = { procent: Math.round(KLUBBMOTORN.provision * 100), form: 'oklart', sedan: idag(), partners: 0 };
      if (!finns) d.kunder.push(k);
      else if (!(k.kontakter || []).some((p) => (p.epost || '').trim().toLowerCase() === epost)) (k.kontakter = k.kontakter || []).push({ id: nyId('p'), namn: f.namn, roll: '', epost: f.epost, tel: f.tel || '' });
      let a = null;
      if (k.typ !== 'klubb') {
        a = { id: nyId('a'), kundId: k.id, titel: f.typ === 'paket' && f.paket ? `${PAKET[f.paket]} – från hemsidan` : f.typ === 'bokning' ? 'Genomgång – bokad på hemsidan' : 'Förfrågan från hemsidan', steg: 'kontakt', ansvarig: ansvarigSaljare(), skapad: idag(), stegAndrad: idag(),
          check: { info: false, samtycke: false, pub: false, order: false }, offert: { paket: f.paket || 'bas', antal: f.antal || 10, tillval: [], app: true, insights: false, uppfoljning: false } };
        d.affarer.push(a);
      }
      f.kundId = k.id; f.affarId = a ? a.id : null; f.status = 'kund'; f.tilldelad = f.tilldelad || K.jag;
      logga(`Förfrågan från hemsidan (${(TYP[f.typ] || TYP.kontakt).namn.toLowerCase()}) – ${f.namn}${f.meddelande ? `: ”${f.meddelande.slice(0, 160)}”` : ''}`, a ? { kundId: k.id, affarId: a.id, typ: 'mejl' } : { kundId: k.id, typ: 'mejl' });
      spara(); rendera();
      if (a) toast(`${finns ? `${k.namn} fanns redan – affären` : `${k.namn} är skapad och affären`} ligger i Ny kontakt`, { text: 'Öppna affären', href: `#/affar/${a.id}` });
      else toast(`${finns ? `${k.namn} fanns redan – kontakten är kopplad` : `Klubben ${k.namn} är skapad med klubbavtal`} (klubbar får ingen säljaffär)`, { text: `Öppna ${k.typ === 'klubb' ? 'klubben' : 'kunden'}`, href: `#/kund/${k.id}` });
    },
  };

  return { vagar: [[/^#\/forfragningar$/, visa, 'forfragningar', 'Förfrågningar']], G, nya, hamtaInkorg };
};
