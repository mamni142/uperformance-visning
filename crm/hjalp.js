/* Uperformance CRM – Hjälp & guider (#/hjalp), 2026-11-23.
   Användaren: "ta grunden och idén och strukturen från Legohus" – Legohus "Lär dig CRM:et" (kurser, guidade turer, framsteg) plus
   vår användarguide, vanliga frågor och den tekniska dokumentationen. Innehållet ligger i hjalp-innehall.js (window.UPHjalpInnehall,
   verifierat mot koden) – den här filen ritar bara sidan.

   Sidan: sidhjälten (ögonrad, rubrik, sökfältet som filtrerar direkt utan omritning, tre glaskort som byter flik), segmentet
   Användarguide | Guidade turer | Teknisk dokumentation | Vanliga frågor (aria-pressed – mjuka-val.js låter bubblan glida),
   rollfiltret (Alla, Sälj, Testteam, Chef, Admin – förval efter den inloggades roll) och flikens innehåll:
   - Användarguiden: kapitelkort i iOS-stil som fälls ut mjukt (numrerade steg, tips, Visa mig, Starta guiden om UPGuide har turen).
   - Guidade turer: kurserna och turerna ur window.UPGuide (guide.js – byggs för sig) med klar-bock; utan UPGuide en rad om att
     guiderna laddas, och sidan ritas om när de finns.
   - Teknisk dokumentation: innehållsförteckning (klistrad på dator, kapselrad på mobil) + avsnitten; Skriv ut / spara som PDF ger
     ett rent A4-papper via skrivUtPapper (crm.js, .mall-utskrift).
   - Vanliga frågor: en lista som fälls ut.
   Utfällning och sökning ritar aldrig om vyn (bara attribut) – fokus och rullning står kvar. */
window.UPHjalp = (K) => {
  'use strict';
  const { e, ik, emo, sidhjalte, glasKort, $, $$, anv, rendera, toast } = K;
  const INNEHALL = () => window.UPHjalpInnehall || { guide: [], fragor: [], teknik: [], version: '' };
  // [id, kort namn (mobil och knappar), fullt namn (segmentet på bred skärm)]
  const FLIKAR = [['guide', 'Guide', 'Användarguide'], ['turer', 'Turer', 'Lär dig med guidade turer'], ['teknik', 'Teknik', 'Teknisk dokumentation'], ['fragor', 'Frågor', 'Vanliga frågor']];
  const ROLLER = [['alla', 'Alla'], ['salj', 'Sälj'], ['test', 'Testteam'], ['chef', 'Chef'], ['admin', 'Admin']];
  const ui = { flik: 'guide', roll: null, rollFor: null, sok: '', oppna: new Set(), tocAktiv: null, guideBorta: false };

  /* ---- ikoner och toner: innehållet nämner några symboler som inte finns i spriten – närmaste som finns ---- */
  const ERSATT = { raket: 'gnista', tavla: 'salj', tabell: 'rutnat', hand: 'las', verktyg: 'nyckelverktyg', fraga: 'info' };
  const ikonNamn = (n) => (n && document.getElementById(`i-${n}`) ? n : ERSATT[n] && document.getElementById(`i-${ERSATT[n]}`) ? ERSATT[n] : 'info');
  // navy = Apple-lagrets förvalda ruta (navy blandad med is); övriga toner finns i apple.css/crm.css
  const tonFor = (t) => (['mint', 'is', 'gul', 'rod', 'orange'].includes(t) ? t : '');
  const ruta = (n, ton, storlek = 'm') => emo(ikonNamn(n), { ruta: storlek, ton: tonFor(ton) });

  /* ---- vem är inloggad: rollfiltrets förval ---- */
  function rollForval() {
    const u = anv(K.jag) || {};
    if (u.roll === 'admin') return 'admin';
    if (u.roll === 'test') return 'test';
    if (u.chef) return 'chef';
    return 'salj';
  }
  function sakerstallRoll() { if (ui.rollFor !== K.jag || !ui.roll) { ui.roll = rollForval(); ui.rollFor = K.jag; } }
  const iRoll = (roller) => ui.roll === 'alla' || !Array.isArray(roller) || !roller.length || roller.includes(ui.roll);

  /* ---- guidade turer (window.UPGuide, guide.js) – läses försiktigt: formen kan växa ---- */
  const guide = () => (window.UPGuide && typeof window.UPGuide === 'object' ? window.UPGuide : null);
  const lista = (x) => { try { const v = typeof x === 'function' ? x() : x; return Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []; } catch (err) { return []; } };
  const turer = () => { const g = guide(); return g ? lista(g.turer).filter((t) => t && t.id) : []; };
  const tur = (id) => turer().find((t) => t.id === id) || null;
  const kurser = () => { const g = guide(); return g ? lista(g.kurser).filter((k) => k && (k.id || k.namn)) : []; };
  function arKlar(id) {
    const g = guide(); if (!g) return false;
    try {
      if (typeof g.arKlar === 'function') return !!g.arKlar(id);
      const k = typeof g.klara === 'function' ? g.klara() : g.klara;
      if (Array.isArray(k)) return k.includes(id);
      return !!(k && k[id]);
    } catch (err) { return false; }
  }
  const turNamn = (t) => t.namn || t.rubrik || t.titel || t.id;
  const turText = (t) => t.beskrivning || t.ingress || t.text || '';
  // samma antal som turen visar (roller och villkor för den här skärmen) – guide.js räknar
  const turSteg = (t) => { const g = guide(); if (g && typeof g.antalSteg === 'function') { try { const n = g.antalSteg(t); if (n) return n; } catch (err) { /* reserv nedan */ } } return Array.isArray(t.steg) ? t.steg.length : Number(t.antalSteg) || 0; };
  const kursTurer = (k) => (Array.isArray(k.turer) ? k.turer : []).map((x) => (typeof x === 'string' ? tur(x) : x && x.id ? tur(x.id) || x : null)).filter(Boolean);
  // guide.js laddas för sig: står fliken och väntar ritas sidan om när UPGuide finns (högst ~8 s), och när framstegen ändras
  let vantar = 0;
  function vantaPaGuide() {
    if (guide() || vantar || ui.guideBorta) return;
    let n = 0;
    vantar = setInterval(() => {
      n += 1;
      if (guide() || n > 16) { clearInterval(vantar); vantar = 0; if (!guide()) ui.guideBorta = true; if (arHar()) rendera(); }
    }, 500);
  }
  const arHar = () => /^#\/hjalp$/.test(location.hash);
  for (const h of ['up:guide', 'up:guide-klar', 'up:guide-framsteg']) addEventListener(h, () => { if (arHar() && !document.querySelector('.hj-kap[data-oppen] :focus')) rendera(); });

  /* ---- sökningen: samma text som på sidan; alla ord ska finnas ---- */
  const norm = (s) => String(s || '').toLowerCase().normalize('NFC');
  const ord = (q) => norm(q).split(/\s+/).filter(Boolean);
  const traff = (text, q) => { const o = ord(q); if (!o.length) return true; const t = norm(text); return o.every((w) => t.includes(w)); };
  const delText = (d) => [d.rubrik, d.text, ...(d.lista || []), ...(d.tabell ? [...(d.tabell.rubriker || []), ...(d.tabell.rader || []).flat()] : []), d.kod].filter(Boolean).join(' ');
  const sokText = {
    guide: (k) => [k.rubrik, k.ingress, ...(k.steg || []), ...(k.tips || [])].join(' '),
    teknik: (s) => [s.rubrik, s.ingress, ...(s.delar || []).map(delText)].join(' '),
    fraga: (f) => f.join(' '),
    tur: (t) => [turNamn(t), turText(t)].join(' '),
  };
  // Antal träffar per flik (respekterar rollfiltret) – visas i segmentet medan man söker
  function antalPerFlik(q) {
    const I = INNEHALL();
    return {
      guide: (I.guide || []).filter((k) => iRoll(k.roller) && traff(sokText.guide(k), q)).length,
      turer: turer().filter((t) => iRoll(t.roller) && traff(sokText.tur(t), q)).length,
      teknik: (I.teknik || []).filter((s) => traff(sokText.teknik(s), q)).length,
      fragor: (I.fragor || []).filter((f) => traff(sokText.fraga(f), q)).length,
    };
  }

  /* ---- delarna ---- */
  function kapitelHtml(k) {
    const id = `g-${k.id}`; const oppen = ui.oppna.has(id); const t = tur(k.id);
    const roller = (k.roller || []).length ? k.roller.map((r) => (ROLLER.find(([x]) => x === r) || [r, r])[1]).join(' · ') : 'Alla roller';
    return `<li class="kort hj-kap" data-hj-sok="${e(norm(sokText.guide(k)))}"${oppen ? ' data-oppen' : ''}>
        <h3 class="hj-kap-h"><button type="button" class="hj-kap-knapp" data-g="hjp-fall" data-id="${e(id)}" aria-expanded="${oppen}" aria-controls="hj-${e(id)}">
          ${ruta(k.ikon, k.ton)}
          <span class="hj-kap-text"><strong>${e(k.rubrik)}</strong><small>${e(k.ingress || '')}</small></span>
          <span class="hj-kap-meta"><span class="hj-kap-roll">${e(roller)}</span>${t ? `<span class="hj-kap-tur" title="Det finns en guidad tur">${ik('presentation')}<span>Tur</span></span>` : ''}</span>
          <span class="hj-kap-pil" aria-hidden="true">${ik('chevron')}</span>
        </button></h3>
        <div class="hj-kap-kropp" id="hj-${e(id)}" role="region" aria-label="${e(k.rubrik)}"${oppen ? '' : ' inert'}><div class="hj-kap-inne">
          ${(k.steg || []).length ? `<ol class="hj-steg">${k.steg.map((s, i) => `<li><span class="hj-steg-nr" aria-hidden="true">${i + 1}</span><span>${e(s)}</span></li>`).join('')}</ol>` : ''}
          ${(k.tips || []).length ? `<ul class="hj-tips">${k.tips.map((s) => `<li>${ik('glodlampa')}<span>${e(s)}</span></li>`).join('')}</ul>` : ''}
          <div class="hj-kap-knappar">
            ${k.visa ? `<a class="knapp knapp-kontur knapp-liten" href="${e(k.visa)}">${ik('pil')}Visa mig</a>` : ''}
            ${t ? `<button class="knapp knapp-accent knapp-liten" type="button" data-g="hjp-tur" data-id="${e(t.id)}">${ik('presentation')}Starta guiden</button>` : ''}
          </div>
        </div></div>
      </li>`;
  }

  function guideFlik() {
    const kap = (INNEHALL().guide || []).filter((k) => iRoll(k.roller));
    return `<section class="hj-flik" aria-label="Användarguiden">
        <div class="hj-flik-huvud"><p class="hj-flik-text">Kapitel per uppgift, steg för steg. <span class="hj-bara-stor">Klicka på ett kapitel för stegen – Visa mig tar dig till sidan.</span></p>
          <button class="knapp knapp-kontur knapp-liten" type="button" data-g="hjp-skriv" data-vad="guide">${ik('skrivare')}Skriv ut guiden</button></div>
        ${kap.length ? `<ul class="hj-kapitel" data-hj-lista>${kap.map(kapitelHtml).join('')}</ul>` : '<p class="hj-inga">Inga kapitel för den här rollen – välj Alla.</p>'}
        ${ingaTraffar()}
      </section>`;
  }

  function turRad(t, i) {
    const klar = arKlar(t.id); const n = turSteg(t);
    return `<li class="hj-tur" data-hj-sok="${e(norm(sokText.tur(t)))}"${klar ? ' data-klar' : ''}>
        <span class="hj-tur-nr" aria-hidden="true">${klar ? ik('bock') : i + 1}</span>
        <span class="hj-tur-text"><strong>${e(turNamn(t))}</strong>${turText(t) ? `<small>${e(turText(t))}</small>` : ''}</span>
        <span class="hj-tur-meta">${klar ? '<span class="hj-klar">Klar</span>' : ''}${n ? `<span>${n} steg</span>` : ''}</span>
        <button class="knapp ${klar ? 'knapp-kontur' : 'knapp-accent'} knapp-liten" type="button" data-g="hjp-tur" data-id="${e(t.id)}" aria-label="${klar ? 'Gör om' : 'Starta'} guiden ${e(turNamn(t))}">${ik(klar ? 'aterstall' : 'presentation')}${klar ? 'Gör om' : 'Starta'}</button>
      </li>`;
  }
  function ring(klara, alla) {
    const p = alla ? klara / alla : 0; const r = 17; const o = 2 * Math.PI * r;
    return `<svg class="hj-ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${r}" class="hj-ring-spar"/><circle cx="22" cy="22" r="${r}" class="hj-ring-bage" stroke-dasharray="${o.toFixed(2)}" stroke-dashoffset="${(o * (1 - p)).toFixed(2)}"/></svg>`;
  }
  function turerFlik() {
    const g = guide();
    if (!g) { vantaPaGuide(); return `<section class="hj-flik" aria-label="Guidade turer"><div class="kort hj-laddar" role="status">${ui.guideBorta ? ik('info') : '<span class="hj-laddar-prick" aria-hidden="true"></span>'}<div><strong>${ui.guideBorta ? 'De guidade turerna gick inte att ladda' : 'Guiderna laddas …'}</strong><p>${ui.guideBorta ? 'Ladda om sidan och försök igen. Allt som turerna visar finns också steg för steg i Användarguiden.' : 'De guidade turerna visar dig CRM:et steg för steg på riktiga sidor. Under tiden finns allt i Användarguiden.'}</p></div><button class="knapp knapp-kontur knapp-liten" type="button" data-g="hjp-flik" data-flik="guide">Till användarguiden</button></div></section>`; }
    const alla = turer().filter((t) => iRoll(t.roller));
    const klara = alla.filter((t) => arKlar(t.id)).length;
    const anvanda = new Set();
    let grupper = kurser().map((k) => {
      const ts = kursTurer(k).filter((t) => iRoll(t.roller)); ts.forEach((t) => anvanda.add(t.id));
      return { k, ts };
    }).filter((x) => x.ts.length);
    const ovriga = alla.filter((t) => !anvanda.has(t.id));
    if (ovriga.length) grupper.push({ k: { id: 'ovriga', namn: grupper.length ? 'Fler guider' : 'Guiderna', ikon: 'presentation', ton: 'is' }, ts: ovriga });
    if (!grupper.length) grupper = [];
    const kursHtml = ({ k, ts }) => {
      const kl = ts.filter((t) => arKlar(t.id)).length;
      return `<section class="kort hj-kurs" data-hj-grupp aria-label="${e(k.namn || k.rubrik || '')}">
          <div class="hj-kurs-huvud">${ruta(k.ikon || 'presentation', k.ton || 'is')}<div class="hj-kurs-text"><h3>${e(k.namn || k.rubrik || '')}</h3>${k.beskrivning || k.ingress ? `<p>${e(k.beskrivning || k.ingress)}</p>` : ''}</div>
            <span class="hj-kurs-lage"${kl === ts.length ? ' data-klar' : ''}>${kl} av ${ts.length}</span></div>
          <ol class="hj-turer" data-hj-lista>${ts.map(turRad).join('')}</ol></section>`;
    };
    return `<section class="hj-flik" aria-label="Guidade turer">
        <div class="kort hj-framsteg">${ring(klara, alla.length)}<div><strong>${klara} av ${alla.length} guider klara</strong><p>En guide markerar en sak i taget på riktiga sidor. Gå vidare med → och tillbaka med ←, Esc avslutar – du kan fortsätta där du slutade.</p></div></div>
        ${grupper.length ? `<div class="hj-kurser">${grupper.map(kursHtml).join('')}</div>` : '<p class="hj-inga">Inga guider för den här rollen – välj Alla.</p>'}
        ${ingaTraffar()}
      </section>`;
  }

  function delHtml(d) {
    let h = '';
    if (d.rubrik) h += `<h4>${e(d.rubrik)}</h4>`;
    if (d.text) h += `<p>${e(d.text)}</p>`;
    if (d.lista) h += `<ul class="hj-lista">${d.lista.map((x) => `<li>${e(x)}</li>`).join('')}</ul>`;
    if (d.tabell) {
      const rub = d.tabell.rubriker || [];
      h += `<div class="hj-tabell-ram"><table class="hj-tabell"><thead><tr>${rub.map((r) => `<th scope="col">${e(r)}</th>`).join('')}</tr></thead>
        <tbody>${(d.tabell.rader || []).map((rad) => `<tr>${rad.map((c, i) => (i === 0 ? `<th scope="row" data-etikett="${e(rub[i] || '')}">${e(c)}</th>` : `<td data-etikett="${e(rub[i] || '')}">${e(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    if (d.kod) h += `<pre class="hj-kod"><code>${e(d.kod)}</code></pre>`;
    return h;
  }
  const avsnittHtml = (s, i) => `<section class="kort hj-avsnitt" id="hj-t-${e(s.id)}" data-hj-avsnitt="${e(s.id)}" data-hj-sok="${e(norm(sokText.teknik(s)))}" aria-labelledby="hj-th-${e(s.id)}">
      <div class="hj-avsnitt-huvud">${ruta(s.ikon, s.ton)}<div><span class="hj-avsnitt-nr">${String(i + 1).padStart(2, '0')}</span><h3 id="hj-th-${e(s.id)}">${e(s.rubrik)}</h3>${s.ingress ? `<p>${e(s.ingress)}</p>` : ''}</div></div>
      <div class="hj-avsnitt-kropp">${(s.delar || []).map(delHtml).join('')}</div></section>`;
  function teknikFlik() {
    const I = INNEHALL(); const av = I.teknik || [];
    return `<section class="hj-flik hj-dok" aria-label="Teknisk dokumentation">
        <nav class="hj-toc" aria-label="Innehåll">
          <div class="hj-toc-huvud"><strong>Innehåll</strong>${I.version ? `<small>Version ${e(I.version)}</small>` : ''}</div>
          <div class="hj-toc-lista" role="group" aria-label="Avsnitt">${av.map((s, i) => `<button type="button" data-g="hjp-till" data-id="${e(s.id)}" data-hj-toc="${e(s.id)}"${ui.tocAktiv === s.id ? ' aria-current="true"' : ''}><span class="hj-toc-nr" aria-hidden="true">${i + 1}</span>${e(s.rubrik)}</button>`).join('')}</div>
          <button class="knapp knapp-kontur knapp-liten hj-skriv" type="button" data-g="hjp-skriv" data-vad="teknik" aria-label="Skriv ut eller spara som PDF" title="Skriv ut / spara som PDF">${ik('skrivare')}<span class="hj-skriv-text">Skriv ut / spara som PDF</span></button>
        </nav>
        <div class="hj-dok-text">${av.map(avsnittHtml).join('')}${ingaTraffar()}</div>
      </section>`;
  }

  function fragorFlik() {
    const fr = INNEHALL().fragor || [];
    return `<section class="hj-flik" aria-label="Vanliga frågor">
        <ul class="kort hj-fragor" data-hj-lista>${fr.map(([q, s], i) => { const id = `f-${i}`; const oppen = ui.oppna.has(id); return `<li class="hj-kap hj-fraga" data-hj-sok="${e(norm(`${q} ${s}`))}"${oppen ? ' data-oppen' : ''}>
            <h3 class="hj-kap-h"><button type="button" class="hj-kap-knapp" data-g="hjp-fall" data-id="${id}" aria-expanded="${oppen}" aria-controls="hj-${id}"><span class="hj-fraga-q">${e(q)}</span><span class="hj-kap-pil" aria-hidden="true">${ik('chevron')}</span></button></h3>
            <div class="hj-kap-kropp" id="hj-${id}" role="region" aria-label="${e(q)}"${oppen ? '' : ' inert'}><div class="hj-kap-inne"><p>${e(s)}</p></div></div></li>`; }).join('')}</ul>
        ${ingaTraffar()}
        <p class="hj-fot">Hittar du inte svaret? Fråga din administratör – eller sök i Användarguiden.</p>
      </section>`;
  }
  const ingaTraffar = () => '<div class="hj-inga hj-ingen-traff" data-hj-inga hidden role="status"><p data-hj-inga-text></p><div class="hj-inga-knappar" data-hj-inga-knappar></div></div>';

  /* ---- vyn ---- */
  function visa() {
    sakerstallRoll();
    const I = INNEHALL();
    const g = guide(); const ts = turer(); if (!g) vantaPaGuide();
    const tal = [
      { emo: 'anteckning', etikett: 'Användarguide', varde: (I.guide || []).length, under: 'kapitel steg för steg', ton: 'mint', knapp: 'data-g="hjp-flik" data-flik="guide"' },
      g && ts.length
        ? { emo: 'presentation', etikett: 'Guidade turer', varde: ts.length, under: `${ts.filter((t) => arKlar(t.id)).length} klara`, ton: 'is', knapp: 'data-g="hjp-flik" data-flik="turer"' }
        : { emo: 'presentation', etikett: 'Guidade turer', text: ui.guideBorta ? 'Inte laddade' : 'Laddas', under: 'visar dig på riktiga sidor', ton: 'is', knapp: 'data-g="hjp-flik" data-flik="turer"' },
      { emo: 'system', etikett: 'Dokumentation', varde: (I.teknik || []).length, under: 'avsnitt · går att skriva ut', ton: '', knapp: 'data-g="hjp-flik" data-flik="teknik"' },
      { emo: 'info', etikett: 'Vanliga frågor', varde: (I.fragor || []).length, under: 'korta svar', ton: 'gul', knapp: 'data-g="hjp-flik" data-flik="fragor"' },
    ];
    const sok = `<label class="hj-sok">${ik('sok')}<input type="search" data-hj-sok-falt value="${e(ui.sok)}" placeholder="Sök i hjälpen" aria-label="Sök i hjälpen – filtrerar direkt" autocomplete="off" enterkeyhint="search"></label>`;
    const hjalte = sidhjalte({ klass: 'sidhjalte-hj', ogon: 'Hjälp', titel: 'Hjälp &amp; guider', accent: '',
      text: 'Lär dig CRM:et på ditt sätt: läs guiden steg för steg, låt en guidad tur visa dig på riktiga sidor eller slå upp hur systemet är byggt.', under: sok, tal });
    const seg = `<div class="hj-seg" role="group" aria-label="Visa">${FLIKAR.map(([f, kort, lang]) => `<button type="button" data-g="hjp-flik" data-flik="${f}" aria-pressed="${ui.flik === f}"><span class="hj-seg-lang">${e(lang)}</span><span class="hj-seg-kort">${e(kort)}</span><b class="hj-seg-antal" data-hj-antal="${f}" hidden></b></button>`).join('')}</div>`;
    const visaRoll = ui.flik === 'guide' || ui.flik === 'turer';
    const roll = visaRoll ? `<div class="hj-roll" role="group" aria-label="Roll"><span class="hj-roll-etikett" aria-hidden="true">Roll</span>${ROLLER.map(([r, n]) => `<button type="button" data-g="hjp-roll" data-roll="${r}" aria-pressed="${ui.roll === r}">${e(n)}</button>`).join('')}</div>` : '';
    const innehall = ui.flik === 'turer' ? turerFlik() : ui.flik === 'teknik' ? teknikFlik() : ui.flik === 'fragor' ? fragorFlik() : guideFlik();
    queueMicrotask(efter);
    return `<div class="hj" data-hj-flik="${ui.flik}">${hjalte}<div class="hj-verktyg">${seg}${roll}</div>${innehall}</div>`;
  }
  // Efter varje ritning (samma uppgift, före målningen): sökningen och innehållsförteckningens läge
  function efter() { if (!$('.hj')) return; filtrera(); tocLage(); }

  /* ---- sök direkt: döljer kort och rader, ritar aldrig om ---- */
  function filtrera() {
    const rot = $('.hj'); if (!rot) return;
    const q = ui.sok.trim();
    $$('[data-hj-sok]', rot).forEach((x) => { x.hidden = !traff(x.dataset.hjSok, q); });
    $$('[data-hj-grupp]', rot).forEach((gr) => { gr.hidden = !!q && !$$('[data-hj-sok]', gr).some((x) => !x.hidden); });
    $$('[data-hj-toc]', rot).forEach((b) => { const s = $(`[data-hj-avsnitt="${CSS.escape(b.dataset.hjToc)}"]`, rot); b.hidden = !!(s && s.hidden); });
    const antal = q ? antalPerFlik(q) : null;
    $$('[data-hj-antal]', rot).forEach((b) => { const n = antal ? antal[b.dataset.hjAntal] : 0; b.hidden = !antal; b.textContent = antal ? String(n) : ''; b.closest('button').toggleAttribute('data-tom', !!antal && !n); });
    const inga = $('[data-hj-inga]', rot); if (!inga) return;
    const synliga = $$('[data-hj-sok]', rot).some((x) => !x.hidden);
    inga.hidden = !q || synliga;
    if (!inga.hidden) {
      $('[data-hj-inga-text]', inga).textContent = `Inget här matchar ”${q}”.`;
      const andra = FLIKAR.filter(([f]) => f !== ui.flik && antal[f]);
      $('[data-hj-inga-knappar]', inga).innerHTML = `${andra.map(([f, , lang]) => `<button class="knapp knapp-kontur knapp-liten" type="button" data-g="hjp-flik" data-flik="${f}">${e(lang)} (${antal[f]})</button>`).join('')}<button class="knapp knapp-spok knapp-liten" type="button" data-g="hjp-rensa">Rensa sökningen</button>`;
    }
  }
  document.addEventListener('input', (ev) => {
    const f = ev.target; if (!f.matches || !f.matches('[data-hj-sok-falt]')) return;
    ui.sok = f.value; filtrera();
  });
  document.addEventListener('keydown', (ev) => {
    const f = ev.target; if (ev.key !== 'Escape' || !f.matches || !f.matches('[data-hj-sok-falt]') || !f.value) return;
    ev.preventDefault(); ev.stopPropagation(); f.value = ''; ui.sok = ''; filtrera();
  }, true);

  /* ---- innehållsförteckningen följer läsningen (bara när dokumentationen visas) ---- */
  let tocTick = false;
  function tocLage() {
    const rot = $('.hj-dok'); if (!rot) return;
    const lista = $$('[data-hj-avsnitt]', rot).filter((s) => !s.hidden); if (!lista.length) return;
    const linje = Math.min(innerHeight * 0.32, 260);
    let aktiv = lista[0];
    for (const s of lista) { if (s.getBoundingClientRect().top - linje <= 0) aktiv = s; else break; }
    // längst ned: sista avsnittet
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) aktiv = lista[lista.length - 1];
    const id = aktiv.dataset.hjAvsnitt; if (id === ui.tocAktiv && $(`[data-hj-toc="${CSS.escape(id)}"][aria-current]`, rot)) return;
    ui.tocAktiv = id;
    $$('[data-hj-toc]', rot).forEach((b) => { if (b.dataset.hjToc === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    // kapselraden på mobil: den aktiva kapseln i bild (bara i sidled, inom raden)
    const rad = $('.hj-toc-lista', rot); const b = $(`[data-hj-toc="${CSS.escape(id)}"]`, rot);
    if (rad && b && rad.scrollWidth > rad.clientWidth + 1) {
      const m = b.offsetLeft - (rad.clientWidth - b.offsetWidth) / 2;
      rad.scrollTo({ left: Math.max(0, m), behavior: lugn() ? 'auto' : 'smooth' });
    }
  }
  addEventListener('scroll', () => { if (tocTick || !$('.hj-dok')) return; tocTick = true; requestAnimationFrame(() => { tocTick = false; tocLage(); }); }, { passive: true });
  addEventListener('resize', () => { if ($('.hj-dok')) tocLage(); }, { passive: true });
  const lugn = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Avståndet ovanför ett avsnitt när man hoppar dit: mobilens fasta topprad + den klistrade kapselraden
  function hoppaTill(el) {
    const topp = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topph')) || 0;
    const toc = $('.hj-toc'); const tocH = toc && getComputedStyle(toc).position === 'sticky' && toc.getBoundingClientRect().width > innerWidth * 0.6 ? toc.offsetHeight : 0;
    const y = el.getBoundingClientRect().top + scrollY - topp - tocH - 12;
    scrollTo({ top: Math.max(0, y), behavior: lugn() ? 'auto' : 'smooth' });
  }

  /* ---- utskrift: ett rent papper (skrivUtPapper i crm.js; stilen i hjalp.css @media print) ---- */
  function papper(vad) {
    const I = INNEHALL(); const datum = new Date().toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
    const huvud = (titel) => `<header class="hj-p-huvud"><span class="hj-p-marke">Uperformance CRM</span><h1>${e(titel)}</h1><p>${I.version ? `Version ${e(I.version)} · ` : ''}Utskriven ${e(datum)}</p></header>`;
    if (vad === 'guide') {
      const kap = (I.guide || []).filter((k) => iRoll(k.roller));
      return `<article class="hj-papper">${huvud(`Användarguide${ui.roll !== 'alla' ? ` – ${(ROLLER.find(([r]) => r === ui.roll) || ['', ''])[1]}` : ''}`)}
        ${kap.map((k, i) => `<section class="hj-p-avsnitt"><h2><span>${i + 1}</span>${e(k.rubrik)}</h2>${k.ingress ? `<p class="hj-p-ingress">${e(k.ingress)}</p>` : ''}
          ${(k.steg || []).length ? `<ol>${k.steg.map((s) => `<li>${e(s)}</li>`).join('')}</ol>` : ''}
          ${(k.tips || []).length ? `<div class="hj-p-tips"><strong>Tips</strong><ul>${k.tips.map((s) => `<li>${e(s)}</li>`).join('')}</ul></div>` : ''}</section>`).join('')}
        ${(I.fragor || []).length ? `<section class="hj-p-avsnitt"><h2><span>?</span>Vanliga frågor</h2><dl>${I.fragor.map(([q, s]) => `<dt>${e(q)}</dt><dd>${e(s)}</dd>`).join('')}</dl></section>` : ''}</article>`;
    }
    const av = I.teknik || [];
    return `<article class="hj-papper">${huvud('Teknisk dokumentation')}
      <nav class="hj-p-toc"><strong>Innehåll</strong><ol>${av.map((s) => `<li>${e(s.rubrik)}</li>`).join('')}</ol></nav>
      ${av.map((s, i) => `<section class="hj-p-avsnitt"><h2><span>${i + 1}</span>${e(s.rubrik)}</h2>${s.ingress ? `<p class="hj-p-ingress">${e(s.ingress)}</p>` : ''}${(s.delar || []).map(delHtml).join('')}</section>`).join('')}</article>`;
  }

  /* ---- åtgärder ---- */
  const G = {
    'hjp-flik': (el) => {
      const f = el.dataset.flik; if (!FLIKAR.some(([x]) => x === f)) return;
      const byte = f !== ui.flik; ui.flik = f; rendera();
      // från hjältens glaskort eller "Inget här" längre ned: flikens början i bild
      if (byte && !el.closest('.hj-seg')) { const v = $('.hj-verktyg'); if (v) hoppaTill(v); }
      const b = $(`.hj-seg [data-flik="${f}"]`); if (b && el.closest('.hj-seg, .hj-inga, .glas')) b.focus({ preventScroll: true });
    },
    'hjp-roll': (el) => { ui.roll = el.dataset.roll; rendera(); },
    'hjp-rensa': () => { ui.sok = ''; const f = $('[data-hj-sok-falt]'); if (f) { f.value = ''; f.focus({ preventScroll: true }); } filtrera(); },
    // utfällning utan omritning: attribut + inert, CSS sköter rörelsen
    'hjp-fall': (el) => {
      const id = el.dataset.id; const li = el.closest('.hj-kap'); if (!li) return;
      const oppen = !li.hasAttribute('data-oppen');
      if (oppen) ui.oppna.add(id); else ui.oppna.delete(id);
      li.toggleAttribute('data-oppen', oppen); el.setAttribute('aria-expanded', String(oppen));
      const kropp = $('.hj-kap-kropp', li); if (kropp) kropp.inert = !oppen;
      // Utfällt kort som hamnar nedanför fönstret: rulla så mycket som behövs (efter rörelsen)
      if (oppen && kropp) setTimeout(() => { const r = li.getBoundingClientRect(); const over = r.bottom - innerHeight + 16; if (over > 0) scrollBy({ top: Math.min(over, Math.max(0, r.top - 80)), behavior: lugn() ? 'auto' : 'smooth' }); }, lugn() ? 0 : 360);
    },
    'hjp-tur': (el) => {
      const g = guide(); const id = el.dataset.id;
      if (!g || typeof g.starta !== 'function') { toast('Guiderna laddas fortfarande – försök igen om en stund'); return; }
      try { g.starta(id); } catch (err) { console.error('[hjälp]', err); toast('Guiden kunde inte startas'); }
    },
    // Med tangentbordet (detail 0) flyttas fokus till avsnittets rubrik, så att Tab fortsätter där; med musen står fokus kvar i förteckningen
    'hjp-till': (el, ev) => { const s = $(`[data-hj-avsnitt="${CSS.escape(el.dataset.id)}"]`); if (!s) return; ui.tocAktiv = el.dataset.id; hoppaTill(s); const h = $('h3', s); if (h && ev && ev.detail === 0 && ev.isTrusted) { h.tabIndex = -1; h.focus({ preventScroll: true }); } },
    'hjp-skriv': (el) => { if (typeof K.skrivUtPapper === 'function') K.skrivUtPapper(papper(el.dataset.vad === 'guide' ? 'guide' : 'teknik')); else print(); },
  };

  return { vagar: [[/^#\/hjalp$/, visa, 'hjalp', 'Hjälp & guider']], G, FORM: {} };
};
