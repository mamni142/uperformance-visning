/* Uperformance CRM – aviseringscentret (FAS 2, 2026-11-03): klockan i sidomenyn, i rälsen och i mobilens topprad, som i Legohus CRM.
   Arket Aviseringar samlar det som väntar på dig, det viktigaste först: försenade uppgifter (Klar, +1 d), nya chattmeddelanden och
   omnämnanden, offerter och ordrar som kunden har öppnat eller godkänt/signerat, besked om ledighet (och ansökningar som väntar på dig som
   leder), kommande videomöten (Anslut) och kundunderlag som har skickats in. Allt räknas ur CRM:ets egen data i den här webbläsaren – inget
   nytt sparas om kunderna. Lästa och borttagna aviseringar minns per konto som id:n (up-crm-avis:<konto>), också i skarpt läge.
   Valfritt: skrivbordsavisering när fliken inte syns (Notification, av från början). Laddas före crm.js; crm.js anropar
   window.UPAviseringar(BYGG, LED, CHT) och uppdatera() när räknarna ritas om. Stil: sidomeny.css avsnitt 13. */
window.UPAviseringar = (K, LED, CHT) => {
  'use strict';
  const { e, ik, emo, plural, oppnaArk, arkHuvud, toast, relTid, idag, dagarTill, $, $$, anv, SKARP } = K;
  const db = () => K.db;
  const jag = () => K.jag;
  const NYCKEL = 'up-crm-avis:';
  const SKRIV = 'up-crm-avis-skrivbord:';
  const MAX_DAGAR = 14; // offerter, underlag och beslut: de senaste två veckorna
  const lasLagring = () => { try { const v = JSON.parse(localStorage.getItem(NYCKEL + jag()) || '{}') || {}; return { last: v.last || [], bort: v.bort || [] }; } catch (err) { return { last: [], bort: [] }; } };
  const sparaLagring = (v) => { try { localStorage.setItem(NYCKEL + jag(), JSON.stringify({ last: v.last.slice(-400), bort: v.bort.slice(-400) })); } catch (err) { /* privat läge */ } };
  const inomDagar = (iso, n) => { if (!iso) return false; const ms = Date.now() - Date.parse(iso); return ms >= -60000 && ms <= n * 864e5; };
  const kundNamn = (id) => (K.kund(id) || {}).namn || 'Kunden';
  const fornamn = (n) => String(n || '').split(' ')[0];

  /* 01-källorna: varje avisering { id, grupp: 'sent'|'ny', tid, emo, ton, titel, text, href|g, knappar } ------------------------- */
  function samla() {
    const d = db(); if (!d || !jag()) return [];
    const u = anv(jag()); const ut = [];
    // Försenade uppgifter (mina): id med datumet, så att en uppgift som skjuts upp och blir sen igen syns igen
    (d.todos || []).filter((t) => !t.klar && t.ansvarig === jag() && t.datum && dagarTill(t.datum) < 0).forEach((t) => {
      const sen = -dagarTill(t.datum);
      ut.push({ id: `todo:${t.id}:${t.datum}`, grupp: 'sent', tid: `${t.datum}T09:00:00`, emo: 'klocka', ton: 'rod', varm: true, titel: t.text,
        text: `Försenad ${plural(sen, 'dag', 'dagar')}${t.kundId ? ` · ${kundNamn(t.kundId)}` : ''}`, href: t.kundId ? `#/kund/${t.kundId}` : '#/att-gora',
        knappar: [{ text: '+1 d', g: 'todo-skjut', id: t.id, titel: 'Flytta till imorgon' }, { text: 'Klar', g: 'todo-klar', id: t.id, klar: true }] });
    });
    // Chatten (bara demoläget): ett meddelande per samtal med olästa
    if (CHT && CHT.olastaLista) CHT.olastaLista().forEach((c) => {
      ut.push({ id: `chatt:${c.kanal}:${c.id}`, grupp: 'ny', tid: c.tid, emo: 'prat', ton: c.namnd ? 'orange' : 'mint',
        titel: c.namnd ? `${c.av} nämnde dig${c.grupp ? ` i ${c.grupp}` : ''}` : `${c.antal > 1 ? `${c.antal} nya meddelanden` : 'Nytt meddelande'} från ${c.av}${c.grupp ? ` · ${c.grupp}` : ''}`,
        text: c.text, href: `#/chatt/${c.kanal}` });
    });
    // Offerter och ordrar på mina affärer: öppnad, godkänd, signerad
    const mina = new Set((d.affarer || []).filter((a) => a.ansvarig === jag()).map((a) => a.id));
    Object.entries(d.offerter || {}).forEach(([nyckel, o]) => {
      if (!o || !mina.has(o.affarId)) return;
      const namn = o.typ === 'order' ? 'ordern' : 'offerten';
      if ((o.status === 'godkand' || o.status === 'signerad') && inomDagar(o.godkand, MAX_DAGAR)) {
        ut.push({ id: `dok-klar:${nyckel}`, grupp: 'ny', tid: o.godkand, emo: o.status === 'signerad' ? 'signera' : 'bock', ton: 'mint',
          titel: `${kundNamn(o.kundId)} ${o.status === 'signerad' ? 'signerade ordern' : `godkände ${namn}`}`, text: `${o.nummer || ''}${o.godkandAv && o.godkandAv.namn ? ` · ${o.godkandAv.namn}` : ''}`, href: `#/affar/${o.affarId}` });
      } else if (o.status === 'oppnad' && inomDagar(o.oppnad, MAX_DAGAR)) {
        ut.push({ id: `dok-oppnad:${nyckel}`, grupp: 'ny', tid: o.oppnad, emo: 'dokument', ton: 'is', titel: `${kundNamn(o.kundId)} öppnade ${namn}`,
          text: `${o.nummer || ''} · följ upp medan den är färsk`, href: `#/affar/${o.affarId}` });
      }
    });
    // Kundunderlag som kunden har skickat in (mina affärer)
    Object.entries(d.kundlankar || {}).forEach(([nyckel, l]) => {
      if (!l || !mina.has(l.affarId) || l.status !== 'inskickad' || !inomDagar(l.inskickad, MAX_DAGAR)) return;
      ut.push({ id: `underlag:${nyckel}`, grupp: 'ny', tid: l.inskickad, emo: 'inkorg', ton: 'mint', titel: `${kundNamn(l.kundId)} har skickat in sitt underlag`, text: 'Kundunderlaget är klart att använda', href: `#/affar/${l.affarId}` });
    });
    // Testteamet: nytt eller kompletterat underlag från sälj att granska (mina projekt, eller alla utan testansvarig) – mobiltestet 2026-11-04
    if (u && u.roll === 'test') (d.projekt || []).forEach((p) => {
      if (!p || p.steg !== 'underlag' || p.underlagStatus !== 'ny' || (p.ansvarigTest && p.ansvarigTest !== jag())) return;
      const runda = (p.underlagHistorik || []).slice(-1)[0]; const komp = runda && runda.kompletterad;
      const tid = komp || (p.skickad ? `${p.skickad}T09:00:00` : null); if (!tid || !inomDagar(tid, MAX_DAGAR)) return;
      const a = (d.affarer || []).find((x) => x.id === p.affarId); const salj = fornamn((anv(komp ? runda.kompletteradAv : a && a.ansvarig) || {}).namn) || 'Sälj';
      ut.push({ id: `projunderlag:${p.id}:${tid}`, grupp: 'ny', tid, emo: 'underlag', ton: 'mint', titel: komp ? `${salj} har kompletterat underlaget` : `Nytt underlag från ${salj}`, text: `${kundNamn(p.kundId)} · granska och boka testdagen`, href: `#/projekt/${p.id}` });
    });
    // Ledighet: besked om mina ansökningar, och ansökningar som väntar på den som leder
    if (u && Array.isArray(u.franvaro)) u.franvaro.filter((f) => f.beslutAv && f.beslutAv !== u.id && f.beslutTid && inomDagar(f.beslutTid, 30)).forEach((f) => {
      const ok = (f.status || 'godkand') === 'godkand';
      ut.push({ id: `fv:${f.id}:${f.status || 'godkand'}`, grupp: 'ny', tid: f.beslutTid, emo: 'kalender', ton: ok ? 'mint' : 'rod',
        titel: `Din ansökan om ledighet är ${ok ? 'godkänd' : 'nekad'}`, text: `${f.fran === f.till ? f.fran : `${f.fran} – ${f.till}`} · ${ok ? 'Godkänd' : 'Nekad'} av ${fornamn((anv(f.beslutAv) || {}).namn) || 'ledningen'}`, href: '#/profil' });
    });
    if (LED && u && (LED.arChef(u) || LED.arAdm(u))) (d.anvandare || []).filter((x) => x.id !== u.id && Array.isArray(x.franvaro)).forEach((x) => {
      x.franvaro.filter((f) => f.status === 'ansokt').forEach((f) => {
        ut.push({ id: `fv-ansokan:${x.id}:${f.id}`, grupp: 'ny', tid: f.skapad || `${f.fran}T08:00:00`, emo: 'kalender', ton: 'gul', varm: true,
          titel: `${fornamn(x.namn)} ansöker om ledighet`, text: `${f.fran === f.till ? f.fran : `${f.fran} – ${f.till}`} · väntar på ditt beslut`, href: '#/chef' });
      });
    });
    // Videomöten som börjar inom ett dygn (där jag är värd eller inbjuden kollega)
    (Array.isArray(d.videomoten) ? d.videomoten : []).forEach((v) => {
      if (!v || v.status === 'avslutat' || v.status === 'utkast' || v.slutade) return;
      const med = v.vard === jag() || (v.deltagare || []).some((x) => x.typ === 'kollega' && x.id === jag()); if (!med) return;
      const start = Date.parse(v.start); if (!Number.isFinite(start)) return;
      const om = start - Date.now(); if (om > 864e5 || om < -(v.langd || 45) * 60000) return;
      const kl = new Date(start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      const nu = om <= 10 * 60000;
      const dag = v.start.slice(0, 10) === idag() ? 'idag' : 'imorgon';
      ut.push({ id: `vm:${v.id}:${v.start}`, grupp: nu ? 'sent' : 'ny', tid: v.start, tidText: `${dag} ${kl}`, emo: 'video', ton: nu ? 'orange' : 'is', varm: nu,
        titel: `${nu ? (om > 0 ? 'Videomötet börjar snart' : 'Videomötet pågår') : 'Videomöte'} kl ${kl}`, text: `${v.titel || 'Videomöte'}${v.kundId && !String(v.titel || '').endsWith(kundNamn(v.kundId)) ? ` · ${kundNamn(v.kundId)}` : ''}`, href: `#/videomote/${v.id}`, /* titeln slutar ofta redan med kunden */
        knappar: [{ text: 'Anslut', g: 'vm-anslut', id: v.id, klar: true, ikon: 'video' }] });
    });
    const s = lasLagring(); const bort = new Set(s.bort); const last = new Set(s.last);
    return ut.filter((x) => !bort.has(x.id)).map((x) => ({ ...x, ny: !last.has(x.id) }))
      .sort((a, b) => (a.grupp === b.grupp ? (Date.parse(b.tid) || 0) - (Date.parse(a.tid) || 0) : a.grupp === 'sent' ? -1 : 1));
  }

  /* 02-klockorna: sidomenyn, rälsen och mobilens topprad ---------------------------------------------------------- */
  let senast = new Set(); let forsta = true;
  function klockHtml(plats, n, varm) {
    const etikett = `Aviseringar${n ? `, ${plural(n, 'ny', 'nya')}` : ''}`;
    return `<button type="button" class="klocka klocka-${plats}" data-g="aviseringar" aria-haspopup="dialog" aria-label="${e(etikett)}" title="${plats === 'rals' ? '' : e(etikett)}"${plats === 'rals' ? ` data-namn="${e(etikett)}"` : ''}>${ik('bjallra')}${n ? `<b${varm ? ' data-varm' : ''}>${n > 99 ? '99+' : n}</b>` : ''}</button>`;
  }
  function uppdatera() {
    const lista = samla(); const nya = lista.filter((x) => x.ny); const n = nya.length; const varm = nya.some((x) => x.varm);
    $$('[data-klocka-plats]').forEach((p) => {
      const plats = p.dataset.klockaPlats; const html = klockHtml(plats, n, varm);
      if (p.__html !== html) { p.innerHTML = html; p.__html = html; }
    });
    // Nya sedan förra gången: klockan ringer till, och (valfritt) skrivbordsavisering när fliken inte syns
    const idNu = new Set(nya.map((x) => x.id));
    const tillkomna = forsta ? [] : nya.filter((x) => !senast.has(x.id));
    senast = idNu; forsta = false;
    if (tillkomna.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) $$('.klocka').forEach((k) => { k.removeAttribute('data-ny'); void k.offsetWidth; k.setAttribute('data-ny', ''); setTimeout(() => k.removeAttribute('data-ny'), 1000); });
    if (tillkomna.length && skrivbordPa() && document.hidden) tillkomna.slice(0, 3).forEach((x) => { try { const no = new Notification(x.titel, { body: x.text || '', tag: `up-avis-${x.id}`, silent: true }); no.onclick = () => { window.focus(); markera([x.id]); if (x.href) location.hash = x.href.slice(1); no.close(); }; } catch (err) { /* stöds inte */ } });
    if (arket && arket.isConnected) ritaArk();
  }

  /* 03-arket ---------------------------------------------------------------------------------------------------- */
  let arket = null;
  const radHtml = (x) => {
    const knappar = (x.knappar || []).map((k) => `<button type="button" class="${k.klar ? 'avis-klar' : ''}" data-g="${e(k.g)}" data-id="${e(k.id)}" data-avis-id="${e(x.id)}"${k.titel ? ` title="${e(k.titel)}"` : ''}>${k.ikon ? ik(k.ikon) : k.klar ? ik('bock') : ''}${e(k.text)}</button>`).join('');
    return `<div class="avis-rad" ${x.ny ? 'data-ny' : ''} ${x.varm ? 'data-varm' : ''} role="listitem">
      ${emo(x.emo, { ruta: 'm', ton: x.ton })}
      <a class="avis-oppna" href="${e(x.href || '#/')}" data-avis-oppna="${e(x.id)}"><strong>${e(x.titel)}</strong>${x.text ? `<small>${e(x.text)}</small>` : ''}</a>
      <span class="avis-hoger"><span class="avis-tid">${e(x.tidText || relTid(x.tid))}</span><span class="avis-knappar">${knappar}<button type="button" class="avis-bort" data-g="avis-bort" data-avis-id="${e(x.id)}" aria-label="Ta bort aviseringen" title="Ta bort">${ik('stang')}</button></span></span>
    </div>`;
  };
  function innehall() {
    const lista = samla();
    const sent = lista.filter((x) => x.grupp === 'sent'); // Nytt = oläst och högst två dygn gammalt; äldre (även olästa) står under Tidigare – mobiltestet 2026-11-04
    const farsk = (x) => !x.tid || !(Date.now() - Date.parse(x.tid) > 2 * 864e5);
    const nytt = lista.filter((x) => x.grupp !== 'sent' && x.ny && farsk(x)); const tidigare = lista.filter((x) => x.grupp !== 'sent' && !(x.ny && farsk(x)));
    const grupp = (namn, rader) => (rader.length ? `<div class="avis-grupp"><p class="avis-rubrik">${namn}<i>${rader.length}</i></p><div role="list">${rader.map(radHtml).join('')}</div></div>` : '');
    const harNya = lista.some((x) => x.ny);
    const kan = 'Notification' in window && !SKARP_UTAN_NOTIS;
    return `<div class="avis" data-avis>
      ${lista.length ? `<div class="avis-topp"><span class="avis-tid">${plural(lista.filter((x) => x.ny).length, 'ny', 'nya')}</span><span>${harNya ? '<button type="button" class="avis-lank" data-g="avis-alla-lasta">Markera alla som lästa</button>' : ''}${tidigare.length ? ' <button type="button" class="avis-lank" data-g="avis-rensa">Ta bort lästa</button>' : ''}</span></div>` : ''}
      ${grupp('Försenat', sent)}${grupp('Nytt', nytt)}${grupp('Tidigare', tidigare)}
      ${lista.length ? '' : `<div class="avis-tom">${emo('bjallra', { ruta: 'l', ton: 'mint' })}<strong>Inget nytt just nu</strong><span>Här hamnar försenade uppgifter, ${SKARP ? '' : 'nya meddelanden, '}offerter som kunden öppnar och besked om ledighet.</span></div>`}
      <div class="avis-fot"><span>${ik('info')}Aviseringar visas när CRM:et är öppet i den här webbläsaren.</span>${kan ? `<button type="button" class="knapp knapp-kontur knapp-liten" data-g="avis-skrivbord" aria-pressed="${skrivbordPa()}">${skrivbordPa() ? 'Stäng av på skrivbordet' : 'Visa på skrivbordet'}</button>` : ''}</div>
    </div>`;
  }
  const SKARP_UTAN_NOTIS = false;
  // arket pekar alltid på den ritade ytan (efter outerHTML var den gamla bortkopplad – nästa omritning hoppades över, så
  // "+1 d"/"Klar" syntes först när arket öppnades igen); fokus står kvar på samma rad om den finns kvar
  function ritaArk() {
    const yta = arket && (arket.isConnected ? arket : $('dialog.ark [data-avis]')); if (!yta) return;
    const f = document.activeElement; const nyckel = f && yta.contains(f) && f.dataset ? [f.dataset.avisId || f.dataset.avisOppna, f.dataset.g] : null;
    const d = yta.closest('dialog'); yta.outerHTML = innehall(); arket = d ? $('[data-avis]', d) : null;
    if (nyckel && arket) { const ny = [...arket.querySelectorAll('[data-avis-id], [data-avis-oppna]')].find((x) => (x.dataset.avisId || x.dataset.avisOppna) === nyckel[0] && x.dataset.g === nyckel[1]); (ny || arket.querySelector('button, a') || d).focus({ preventScroll: true }); }
  }
  function oppna() {
    oppnaArk(`${arkHuvud('Aviseringar', 'Det som väntar på dig, det viktigaste först', 'bjallra').replace('class="ark-huvud"', 'class="ark-huvud avis-huvud"')}<div class="ark-kropp avis-kropp">${innehall()}</div>`);
    arket = $('dialog.ark [data-avis]'); $$('.klocka').forEach((k) => k.setAttribute('aria-expanded', 'true'));
    const d = arket && arket.closest('dialog');
    if (d) d.addEventListener('close', () => { arket = null; $$('.klocka').forEach((k) => k.setAttribute('aria-expanded', 'false')); }, { once: true });
  }
  function markera(ids) { const s = lasLagring(); const set = new Set(s.last); ids.forEach((id) => set.add(id)); s.last = [...set]; sparaLagring(s); uppdatera(); }
  function taBort(ids) { const s = lasLagring(); const set = new Set(s.bort); ids.forEach((id) => set.add(id)); s.bort = [...set]; sparaLagring(s); uppdatera(); }
  const skrivbordPa = () => { try { return localStorage.getItem(SKRIV + jag()) === '1' && 'Notification' in window && Notification.permission === 'granted'; } catch (err) { return false; } };

  // Klick på en rad: markeras som läst (länken följs som vanligt). Knapparna på raden (Klar, +1 d, Anslut) markerar också raden.
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('[data-avis-oppna]');
    if (a) { markera([a.dataset.avisOppna]); if (K.stangArk) setTimeout(() => K.stangArk(), 0); return; }
    const k = ev.target.closest && ev.target.closest('.avis-knappar [data-avis-id]:not(.avis-bort)');
    // markera() ritar arket innan knappens åtgärd (todo-skjut, todo-klar) har ändrat datan – rita om efteråt också
    if (k) { markera([k.dataset.avisId]); if (k.dataset.g === 'vm-anslut' && K.stangArk) K.stangArk(); else setTimeout(uppdatera, 0); }
  }, true);

  const G = {
    aviseringar: () => { if (arket && arket.isConnected) { K.stangArk(); return; } oppna(); },
    'avis-bort': (el) => taBort([el.dataset.avisId]),
    'avis-alla-lasta': () => markera(samla().map((x) => x.id)),
    'avis-rensa': () => { const s = lasLagring(); const last = new Set(s.last); taBort(samla().filter((x) => last.has(x.id) && x.grupp !== 'sent').map((x) => x.id)); },
    'avis-skrivbord': async () => {
      if (!('Notification' in window)) { toast('Webbläsaren kan inte visa aviseringar på skrivbordet'); return; }
      if (skrivbordPa()) { try { localStorage.setItem(SKRIV + jag(), '0'); } catch (err) { /* */ } toast('Aviseringar på skrivbordet är avstängda'); uppdatera(); return; }
      let p = Notification.permission; if (p === 'default') { try { p = await Notification.requestPermission(); } catch (err) { p = 'denied'; } }
      if (p !== 'granted') { toast('Webbläsaren tillåter inte aviseringar för CRM:et – det går att ändra i webbläsarens inställningar för sidan', null, 'varning'); return; }
      try { localStorage.setItem(SKRIV + jag(), '1'); } catch (err) { /* */ }
      toast('Aviseringar visas på skrivbordet när fliken inte syns', null, 'bjallra'); uppdatera();
    },
  };
  // Tiden går: förfallna uppgifter och möten som närmar sig räknas om varje minut och när fliken syns igen
  setInterval(uppdatera, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) uppdatera(); });
  addEventListener('storage', (ev) => { if (ev.key && ev.key.startsWith(NYCKEL)) uppdatera(); });
  return { G, uppdatera, samla, antal: () => samla().filter((x) => x.ny).length };
};
