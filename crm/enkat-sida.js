/* Uperformance – svarssidan för en anonym enkät (enkat.html#e=<nyckel>, 2026-11-03).
   En gemensam länk som kunden skickar till sina medarbetare. Ingen inloggning, inga namn eller e-post. Svaret sparas utan klockslag
   (enkatlogik.js) och resultatet visas bara sammanställt när minst fem har svarat. En webbläsare kan svara en gång: sidan minns
   att den har svarat (localStorage, bara här – inget skickas med svaret). Utkastet ligger bara i fliken (sessionStorage, 2026-11-04 –
   på en delad dator eller surfplatta låg förut föregående persons svar kvar, även fritext) och kan rensas med "Rensa mina svar".
   All data går via window.UPLager.enkat. Demoläget: localStorage. Skarpt läge: enkäter är inte aktiverade än – sidan säger det.
   Kundens sidor följer inte CRM:ets tema (Original). Mobil först. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ik = (namn) => `<svg class="ikon" aria-hidden="true"><use href="#i-${namn}"/></svg>`;
  const portal = $('#portal');
  const L = window.UPLager; const E = window.ENKATLOGIK;
  const skarp = !!(L && L.skarp);
  const nyckel = (location.hash.match(/e=([A-Za-z0-9]+)/) || [])[1] || '';
  const SVARAT = `up-enkat-svarat:${nyckel}`; const UTKAST = `up-enkat-utkast:${nyckel}`;
  const las = (k) => { try { return localStorage.getItem(k); } catch (err) { return null; } };
  const skriv = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (err) { /* privat läge */ } };
  // En ny nyckel i samma flik (inklistrad länk) – sidan läste förut bara nyckeln vid laddningen och visade den gamla enkäten
  addEventListener('hashchange', () => location.reload());
  // Utkastet: bara i fliken – stängs den är svaren borta, och nästa person på samma dator ser dem inte
  const lasUtkast = () => { try { return sessionStorage.getItem(UTKAST); } catch (err) { return null; } };
  const skrivUtkast = (v) => { try { if (v == null) sessionStorage.removeItem(UTKAST); else sessionStorage.setItem(UTKAST, v); } catch (err) { /* privat läge */ } };
  skriv(UTKAST, null); // äldre utkast i localStorage (före 2026-11-04) tas bort
  const EP = 'e‑post'; // hårt bindestreck – "e-/post" bröts på 320 px
  const datum = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' }) : '');
  const toast = (text, opt) => (window.UPPortal ? UPPortal.toast(text, opt) : null);
  let vy = null; let svar = {}; let fel = {}; let visaFel = false; let lage = 'laddar'; let skickar = false;

  const tillStart = `<div class="knapprad"><a class="knapp knapp-kontur" href="../">${ik('hem')}Till hemsidan</a></div>`;
  const varning = () => (!skarp ? `<p class="prototypvarning">${ik('info')}<span><strong>Prototyp.</strong> Svaren sparas bara i den här webbläsaren – skriv inget som pekar ut dig eller någon annan.</span></p>` : '');
  const OGILTIG = {
    saknas: skarp ? ['Länken hittades inte', `Kontrollera att hela adressen kom med – långa länkar bryts ibland i ${EP}program. Fungerar den ändå inte, fråga den som skickade länken.`, 'las']
      // Demoläget: enkäten finns bara i webbläsaren där den skapades – en annan dator eller ett privat fönster hittar den inte (fynd sanna-A3)
      : ['Enkäten finns inte i den här webbläsaren', 'Det här är en testversion: enkäten sparas i webbläsaren där den skapades, så länken fungerar bara där – inte på en annan dator, i en annan webbläsare eller i ett privat fönster. Det är inget fel på länken.', 'info'],
    stangd: ['Enkäten är stängd', 'Enkäten tar inte emot fler svar. Tack ändå för att du ville svara!', 'las'],
    utgangen: ['Sista svarsdagen har passerat', 'Enkäten tog emot svar till och med {sista}. Tack ändå för att du ville svara!', 'klocka'],
    'inte-aktiverat': ['Enkäter är inte aktiverade', 'Anonyma enkäter finns bara i demoversionen av Uperformance än. Du behöver inte göra något.', 'info'],
    natverk: ['Kunde inte hämta enkäten', 'Kontrollera internetanslutningen och försök igen. Det du har svarat finns kvar i den här webbläsaren.', 'varning'],
  };
  function visaOgiltig(r) {
    lage = 'ogiltig'; $('[data-sparstatus]').hidden = true; framsteg(0);
    const [rubrik, text, ikon] = OGILTIG[r && r.fel] || (r && r.status === 0 ? OGILTIG.natverk : OGILTIG.saknas);
    portal.innerHTML = `<section class="kort ogiltig" role="alert"><span class="ogiltig-ikon">${ik(ikon)}</span>${r && r.titel ? `<span class="etikett-liten">${e(r.titel)}${r.foretag ? ` · ${e(r.foretag)}` : ''}</span>` : ''}<h1>${e(rubrik)}</h1><p>${e(text.replace('{sista}', datum(r && r.sista)))}</p>
      ${r && r.status === 0 ? '<div class="knapprad"><button class="knapp knapp-accent" type="button" data-forsok>Försök igen</button></div>' : tillStart}</section>`;
    document.title = `${rubrik} · Uperformance`;
  }
  function framsteg(andel) {
    const topp = $('.portal-topp'); if (!topp) return;
    let f = $('.kl-framsteg', topp); if (!f) { topp.insertAdjacentHTML('beforeend', '<div class="kl-framsteg" aria-hidden="true"><i></i></div>'); f = $('.kl-framsteg', topp); }
    f.firstElementChild.style.transform = `scaleX(${Math.max(0, Math.min(1, andel)).toFixed(3)})`;
  }

  /* Formuläret ------------------------------------------------------------------------------------ */
  const besvarad = (f) => { const v = svar[f.id]; return f.typ === 'flerval' ? Array.isArray(v) && v.length > 0 : f.typ === 'fritext' ? String(v || '').trim() !== '' : v != null && v !== ''; };
  const antalSvar = () => vy.fragor.filter(besvarad).length;
  const minuter = () => Math.max(1, Math.round(vy.fragor.reduce((s, f) => s + (f.typ === 'fritext' ? 40 : 12), 0) / 60));
  function fragaHtml(f, i) {
    const v = svar[f.id]; const felText = visaFel ? fel[f.id] : '';
    const namn = `q-${f.id}`; const beskriv = felText ? ` aria-describedby="fel-${e(f.id)}" aria-invalid="true"` : '';
    let kropp = '';
    if (f.typ === 'skala') {
      // Skalans ändar kopplas till gruppen (aria-describedby) – texten läses när man kommer in i gruppen, inte som en lös rad efteråt
      const ander = `ander-${e(f.id)}`;
      const besk = felText ? ` aria-describedby="${ander} fel-${e(f.id)}" aria-invalid="true"` : ` aria-describedby="${ander}"`;
      kropp = `<div class="enk-skala" role="radiogroup" aria-label="${e(f.text)}"${besk}>${[1, 2, 3, 4, 5].map((x) => `<label><input type="radio" name="${namn}" value="${x}" ${+v === x ? 'checked' : ''}><span><b>${x}</b></span></label>`).join('')}</div>
        <div class="enk-skala-ander" aria-hidden="true"><span>1 · ${e(f.etiketter[0])}</span><span>5 · ${e(f.etiketter[1])}</span></div>
        <p class="sr" id="${ander}">1 betyder ${e(f.etiketter[0])}, 5 betyder ${e(f.etiketter[1])}.</p>`;
    } else if (f.typ === 'janej') {
      kropp = `<div class="valknappar enk-janej" role="radiogroup" aria-label="${e(f.text)}"${beskriv}>${[['ja', 'Ja'], ['nej', 'Nej']].map(([x, t]) => `<label><input type="radio" name="${namn}" value="${x}" ${v === x ? 'checked' : ''}><span>${v === x ? ik('bock') : ''}${t}</span></label>`).join('')}</div>`;
    } else if (f.typ === 'flerval') {
      const val = Array.isArray(v) ? v : [];
      kropp = `${f.flera ? '<p class="enk-hint">Välj ett eller flera.</p>' : ''}<div class="enk-val" ${f.flera ? 'role="group"' : 'role="radiogroup"'} aria-label="${e(f.text)}"${beskriv}>${f.alternativ.map((t, j) => `<label><input type="${f.flera ? 'checkbox' : 'radio'}" name="${namn}" value="${j}" ${val.includes(j) ? 'checked' : ''}><span><i aria-hidden="true">${ik('bock')}</i>${e(t)}</span></label>`).join('')}</div>`;
    } else {
      const t = String(v || '');
      kropp = `<textarea class="falt enk-fritext" id="${namn}" name="${namn}" rows="4" maxlength="${E.MAX.fritext}" placeholder="Skriv här …" aria-label="${e(f.text)}"${beskriv}>${e(t)}</textarea>
        <p class="enk-hint"><span>Skriv inte ditt namn eller något annat som pekar ut dig.</span><span data-raknare="${e(f.id)}">${t.length} / ${E.MAX.fritext}</span></p>`;
    }
    return `<fieldset class="kort enk-fraga" data-fraga="${e(f.id)}" ${besvarad(f) ? 'data-ok' : ''} ${felText ? 'data-fel' : ''}>
      <legend class="enk-fraga-rubrik"><span class="halsa-nr enk-fraga-nr">${besvarad(f) ? ik('bock') : i + 1}</span><span>${e(f.text)}${f.kravs ? '' : ' <em>valfri</em>'}</span></legend>
      ${kropp}${felText ? `<span class="falt-hjalp" id="fel-${e(f.id)}">${e(felText)}</span>` : ''}</fieldset>`;
  }
  function ritaForm() {
    lage = 'form';
    const n = antalSvar(); const N = vy.fragor.length; const pct = N ? (n / N) * 100 : 0;
    const chips = [`${ik('las')}Anonym – inga namn eller ${EP}`, `${ik('klocka')}${N} ${N === 1 ? 'fråga' : 'frågor'} · ungefär ${minuter()} min`, `${ik('kalender')}Sista dag ${e(datum(vy.sista))}`];
    portal.innerHTML = `${varning()}
      <section class="valkommen enk-valkommen">
        <div><span class="etikett-liten">${vy.foretag ? `<span class="enk-hel">Anonym enkät ·</span> <span class="enk-hel">${e(vy.foretag)}</span>` : 'Anonym enkät'}</span>
          <h1 tabindex="-1" data-rubrik>${e(vy.titel)}</h1>
          ${vy.intro ? `<p>${e(vy.intro)}</p>` : ''}
          <div class="valkommen-chips">${chips.map((c) => `<span>${c}</span>`).join('')}</div></div>
        <div class="valkommen-hoger">${UPPortal.ring(pct, { tal: n, enhet: `/${N}`, etikett: 'besvarade', aria: `${n} av ${N} frågor besvarade` })}</div>
      </section>
      ${vemSerHtml()}
      <form class="enk-svar" data-enk-svar novalidate>
        <div class="enk-fragor">${vy.fragor.map(fragaHtml).join('')}</div>
        <section class="kort enk-skicka">
          <div><h2>Klar?</h2><p data-enk-kvar>${kvarText()}</p></div>
          <p class="falt-hjalp enk-skicka-fel" data-enk-fel role="alert" ${visaFel && Object.keys(fel).length ? '' : 'hidden'}>${visaFel && Object.keys(fel).length ? e(felSammanfattning()) : ''}</p>
          <div class="enk-skicka-knappar"><button class="knapp knapp-accent enk-skicka-knapp" type="submit" ${skickar ? 'disabled' : ''}>${ik('bock')}Skicka mina svar</button><button class="knapp knapp-spok enk-rensa" type="button" data-rensa ${n ? '' : 'hidden'}>${ik('aterstall')}Rensa mina svar</button></div>
          <p class="enk-skicka-not">${ik('las')}Svaren sparas utan namn, ${EP} och klockslag. ${vy.foretag ? e(vy.foretag) : 'Arbetsgivaren'} ser bara det sammanställda resultatet, och först när minst ${E.GRANS} har svarat. Du kan inte ändra svaren efteråt.</p>
        </section>
      </form>
      <footer class="portal-fot"><span>Enkäten skickas ut av Uperformance${vy.saljare ? ` – ${e(vy.saljare)} är kontaktperson` : ''}.</span><span>Inga namn eller ${EP}adresser samlas in.</span></footer>`;
    $('[data-saker]').hidden = false; $('[data-sparstatus]').hidden = false;
    document.title = `${vy.titel} · Uperformance`;
    framsteg(N ? n / N : 0);
    UPPortal.startaRing(); UPPortal.forstaVisning();
  }
  // "Vem ser vad?" (fynd sanna-A7, som i hälsoformuläret): en skeptisk medarbetare får veta exakt vad arbetsgivaren ser
  const vemSerHtml = () => `<details class="kort enk-vem"><summary>${ik('las')}<span>Vem ser vad?</span><small>Så skyddas dina svar</small></summary><ul>
      <li>${ik('bock')}<span><b>${vy.foretag ? e(vy.foretag) : 'Arbetsgivaren'} och Uperformance</b> ser bara det sammanställda resultatet – hur många som valde varje svar och medelvärden.</span></li>
      <li>${ik('bock')}<span><b>Ingen ser vem som svarat vad.</b> Enkäten frågar inte efter namn eller ${EP}, och svaren sparas utan klockslag.</span></li>
      <li>${ik('bock')}<span><b>Resultatet visas först vid ${E.GRANS} svar</b> och uppdateras sedan i omgångar om ${E.GRANS}, så att ingen kan räkna ut vad den senaste svarade.</span></li>
      <li>${ik('info')}<span><b>Fritextsvar visas ordagrant</b> för arbetsgivaren, i bokstavsordning – skriv inget som pekar ut dig eller någon annan.</span></li></ul></details>`;
  const kvarText = () => { const n = antalSvar(); const N = vy.fragor.length; const krav = vy.fragor.filter((f) => f.kravs && !besvarad(f)).length;
    return n === N ? 'Alla frågor är besvarade.' : krav ? `${krav} ${krav === 1 ? 'fråga som måste besvaras är kvar' : 'frågor som måste besvaras är kvar'} – du har svarat på ${n} av ${N}.` : `Du har svarat på ${n} av ${N}. Resten är valfria.`; };
  const felSammanfattning = () => { const k = Object.keys(fel).filter((x) => x !== '_'); return fel._ || `Svara på ${k.length === 1 ? 'fråga' : 'frågorna'} ${k.map((id) => vy.fragor.findIndex((f) => f.id === id) + 1).join(', ')}.`; };
  // Små uppdateringar utan att rita om allt (fokus och markör står kvar)
  function uppdatera(f) {
    fel = E.kontrolleraSvar(vy, svar).fel;
    const fs = $(`[data-fraga="${CSS.escape(f.id)}"]`, portal);
    if (fs) {
      const ok = besvarad(f); fs.toggleAttribute('data-ok', ok);
      const nr = $('.enk-fraga-nr', fs); if (nr) nr.innerHTML = ok ? ik('bock') : String(vy.fragor.indexOf(f) + 1);
      if (visaFel && !fel[f.id]) { fs.removeAttribute('data-fel'); const h = $('.falt-hjalp', fs); if (h) h.remove(); $$('[aria-invalid]', fs).forEach((x) => { x.removeAttribute('aria-invalid'); x.removeAttribute('aria-describedby'); }); }
      if (f.typ === 'janej') $$('label', fs).forEach((l) => { const in_ = $('input', l); const s = $('span', l); s.innerHTML = `${in_.checked ? ik('bock') : ''}${in_.value === 'ja' ? 'Ja' : 'Nej'}`; });
    }
    const n = antalSvar(); const N = vy.fragor.length;
    UPPortal.satRing(N ? (n / N) * 100 : 0, n, `${n} av ${N} frågor besvarade`);
    framsteg(N ? n / N : 0);
    const k = $('[data-enk-kvar]'); if (k) k.textContent = kvarText();
    const fp = $('[data-enk-fel]'); if (fp && visaFel) { const har = Object.keys(fel).length; fp.hidden = !har; fp.textContent = har ? felSammanfattning() : ''; }
    skrivUtkast(JSON.stringify(svar));
    const rensa = $('[data-rensa]'); if (rensa) rensa.hidden = !n;
  }
  portal.addEventListener('change', (ev) => {
    const fs = ev.target.closest('[data-fraga]'); if (!fs || lage !== 'form') return;
    const f = vy.fragor.find((x) => x.id === fs.dataset.fraga); if (!f) return;
    if (f.typ === 'skala') svar[f.id] = +ev.target.value;
    else if (f.typ === 'janej') svar[f.id] = ev.target.value;
    else if (f.typ === 'flerval') { const v = $$('input:checked', fs).map((x) => +x.value); if (v.length) svar[f.id] = v; else delete svar[f.id]; }
    uppdatera(f);
  });
  portal.addEventListener('input', (ev) => {
    const t = ev.target; if (!t.matches || !t.matches('textarea.enk-fritext') || lage !== 'form') return;
    const fs = t.closest('[data-fraga]'); const f = vy.fragor.find((x) => x.id === fs.dataset.fraga); if (!f) return;
    if (t.value.trim()) svar[f.id] = t.value; else delete svar[f.id];
    const r = $(`[data-raknare="${CSS.escape(f.id)}"]`, fs); if (r) r.textContent = `${t.value.length} / ${E.MAX.fritext}`;
    uppdatera(f);
  });
  portal.addEventListener('submit', async (ev) => {
    if (!ev.target.matches('[data-enk-svar]')) return;
    ev.preventDefault(); if (skickar) return;
    const k = E.kontrolleraSvar(vy, svar); fel = k.fel;
    if (!k.ok) {
      visaFel = true; ritaForm();
      const forsta = Object.keys(fel).find((x) => x !== '_');
      const mal = forsta ? $(`[data-fraga="${CSS.escape(forsta)}"]`) : $('[data-enk-fel]');
      if (mal) { mal.scrollIntoView({ block: 'center', behavior: UPPortal.lugn ? 'auto' : 'smooth' }); const in_ = $('input, textarea', mal); if (in_) in_.focus({ preventScroll: true }); }
      return;
    }
    skickar = true; const knapp = $('.enk-skicka-knapp'); if (knapp) { knapp.disabled = true; knapp.innerHTML = `${ik('klocka')}Skickar …`; }
    const r = await (async () => { try { return await L.enkat.svara(nyckel, k.rent); } catch (err) { return { ok: false, status: 0 }; } })();
    skickar = false;
    if (r && r.ok) { skriv(SVARAT, new Date().toISOString().slice(0, 10)); skrivUtkast(null); ritaTack(true); return; }
    if (r && (r.status === 404 || r.status === 410)) { visaOgiltig(r); return; }
    if (knapp) { knapp.disabled = false; knapp.innerHTML = `${ik('bock')}Skicka mina svar`; }
    toast('Svaren kunde inte skickas – försök igen', { typ: 'varning', under: 'Det du har svarat finns kvar.' });
  });
  portal.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-forsok]')) starta();
    // Rensa mina svar: på en delad dator ska nästa person börja med ett tomt formulär
    if (ev.target.closest('[data-rensa]') && lage === 'form') {
      svar = {}; visaFel = false; skrivUtkast(null); fel = E.kontrolleraSvar(vy, svar).fel; ritaForm();
      scrollTo({ top: 0, behavior: 'auto' }); const h = $('[data-rubrik]'); if (h) h.focus({ preventScroll: true });
      toast('Svaren är rensade', { under: 'Formuläret är tomt igen – inget skickades.' });
    }
  });

  /* Tack och redan svarat ------------------------------------------------------------------------- */
  function ritaTack(nyss) {
    lage = 'tack'; framsteg(1); $('[data-sparstatus]').hidden = true; $('[data-saker]').hidden = false;
    const fore = vy && vy.foretag;
    portal.innerHTML = `${varning()}<section class="kort skickat enk-tack">${nyss ? `<span class="skickat-bock">${ik('bock')}</span>` : `<span class="ogiltig-ikon">${ik('bock')}</span>`}
      <h1 tabindex="-1" data-rubrik>${nyss ? 'Tack för dina svar!' : 'Du har redan svarat'}</h1>
      <p>${nyss ? `Svaren är sparade – anonymt, utan namn, ${EP} eller klockslag. ${fore ? e(fore) : 'Arbetsgivaren'} ser bara det sammanställda resultatet när minst ${E.GRANS} har svarat.`
        : `Den här webbläsaren har redan skickat svar på ${vy ? `enkäten ${e(vy.titel)}` : 'enkäten'}. Varje person svarar en gång, så att resultatet blir rättvist.`}</p>
      <ol class="enk-tack-steg"><li><span>1</span><b>Svaren läggs ihop</b><small>Ingen kan se vad just du svarade.</small></li><li><span>2</span><b>Sammanställningen</b><small>Visas först när minst ${E.GRANS} har svarat.</small></li><li><span>3</span><b>Uppföljning</b><small>${fore ? e(fore) : 'Arbetsgivaren'} och Uperformance går igenom resultatet.</small></li></ol>
      ${tillStart}</section>`;
    document.title = 'Tack · Uperformance';
    // Sidan börjar om överst (förut stod den kvar längst ned efter Skicka – tackrubriken låg ovanför bilden på mobilen)
    scrollTo({ top: 0, behavior: 'auto' });
    const h = $('[data-rubrik]'); if (h) h.focus({ preventScroll: true });
    if (nyss && window.UPPortal && !UPPortal.lugn) { const b = $('.skickat-bock'); if (b) { const r = b.getBoundingClientRect(); UPPortal.konfetti(r.left + r.width / 2, r.top + r.height / 2); } }
  }

  /* Start ----------------------------------------------------------------------------------------- */
  let slutaLyssna = null;
  async function starta() {
    if (!L || !E) { visaOgiltig({ fel: 'saknas' }); return; }
    const r = await (async () => { try { return await L.enkat.hamta(nyckel); } catch (err) { return { ok: false, status: 0 }; } })();
    if (!r || !r.ok) { visaOgiltig(r); return; }
    vy = r.vy;
    if (las(SVARAT)) { ritaTack(false); return; }
    try { const u = JSON.parse(lasUtkast() || 'null'); if (u && typeof u === 'object') svar = E.kontrolleraSvar(vy, u).rent; } catch (err) { svar = {}; }
    fel = E.kontrolleraSvar(vy, svar).fel;
    ritaForm();
    if (!slutaLyssna) slutaLyssna = L.enkat.lyssna(nyckel, (h) => {
      if (lage !== 'form') return;
      if (h.ogiltig) { visaOgiltig(h.fel); return; }
      // Säljaren ändrade frågorna innan någon svarat: rita om med svaren som fortfarande passar
      if (h.vy && JSON.stringify(h.vy.fragor) !== JSON.stringify(vy.fragor)) { vy = h.vy; svar = E.kontrolleraSvar(vy, svar).rent; ritaForm(); toast('Enkäten har uppdaterats', { under: 'Dina svar på frågorna som finns kvar står kvar.' }); }
      else if (h.vy) vy = h.vy;
    });
  }
  if (!nyckel) visaOgiltig({ fel: 'saknas' }); else starta();
})();
