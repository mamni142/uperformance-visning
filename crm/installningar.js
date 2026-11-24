/* Uperformance CRM – Inställningar (#/installningar, för alla roller). Utseendet (tema och glas) med stora förhandsbilder, och länkar
   till de inställningar som redan finns på andra ställen – de flyttas inte. Laddas före crm.js, som anropar window.UPInstallningar(K)
   sist och tar in vägen. Väljarna kommer från tema.js (UPTema), stilen står i tema.css. */
window.UPInstallningar = (K) => {
  'use strict';
  const { e, ik, emo, sidhjalte, anv, SKARP } = K;
  const T = window.UPTema;

  /* Tvåstegsverifiering (bara skarpt läge, 2026-11-23): kontot slår på en autentiseringsapp som andra steg vid inloggningen.
     Kortet hämtar läget från servern (UPLager.tvasteg) och ritar om sig självt: av → ställ in (QR-kod + hemlighet + bekräfta med en
     kod) → reservkoderna visas EN gång → på (stäng av kräver en giltig kod). Hemligheten och koderna sparas aldrig i webbläsaren. */
  const L = K.L; const TS = { lage: 'laddar', status: null, start: null, reserv: null, fel: '' };
  const tsRot = () => document.querySelector('[data-tvasteg]');
  function tsHtml() {
    const fel = TS.fel ? `<p class="ts-fel" role="alert">${ik('varning')}<span>${e(TS.fel)}</span></p>` : '';
    if (TS.lage === 'laddar') return '<p class="ts-text">Hämtar läget …</p>';
    if (TS.lage === 'fel') return `<p class="ts-text">Kunde inte hämta läget just nu.</p><div class="ts-knappar"><button class="knapp knapp-kontur knapp-liten" type="button" data-g="ts-hamta">Försök igen</button></div>`;
    if (TS.lage === 'reserv') return `
      <p class="ts-status" data-pa>${ik('bock')}<span>Tvåstegsverifiering är på.</span></p>
      <p class="ts-text"><strong>Spara dina reservkoder nu</strong> – de visas bara den här gången. Varje kod gäller en gång och används om du inte har telefonen till hands.</p>
      <ul class="ts-reserv" aria-label="Reservkoder">${TS.reserv.map((k) => `<li>${e(k.slice(0, 4))} ${e(k.slice(4))}</li>`).join('')}</ul>
      <div class="ts-knappar"><button class="knapp knapp-kontur knapp-liten" type="button" data-g="ts-kopiera">${ik('dokument')}Kopiera koderna</button><button class="knapp knapp-accent knapp-liten" type="button" data-g="ts-klar">Jag har sparat dem</button></div>`;
    if (TS.lage === 'stall-in') return `
      <ol class="ts-steg">
        <li><strong>Öppna din autentiseringsapp</strong><span>Till exempel Microsoft Authenticator, Google Authenticator eller 1Password.</span></li>
        <li><strong>Skanna QR-koden</strong><span>Eller skriv in nyckeln för hand.</span>
          <div class="ts-qr"><div class="ts-qr-bild" aria-label="QR-kod för autentiseringsappen">${window.UPQR ? window.UPQR.svg(TS.start.uri, { marginal: 2, titel: 'QR-kod för autentiseringsappen' }) : ''}</div>
          <div class="ts-nyckel"><small>Nyckel</small><code>${e(TS.start.hemlighet.replace(/(.{4})/g, '$1 ').trim())}</code><button class="knapp knapp-kontur knapp-liten" type="button" data-g="ts-kopiera-nyckel">${ik('dokument')}Kopiera</button></div></div></li>
        <li><strong>Skriv koden som appen visar</strong>
          <form class="ts-form" data-form="ts-bekrafta" novalidate><input class="falt ts-kod" name="kod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000 000" aria-label="Sexsiffrig kod från appen" data-nativ>
          <button class="knapp knapp-accent knapp-liten" type="submit">Slå på</button><button class="knapp knapp-kontur knapp-liten" type="button" data-g="ts-avbryt">Avbryt</button></form></li>
      </ol>${fel}`;
    if (TS.lage === 'stang') return `
      <p class="ts-status" data-pa>${ik('bock')}<span>Tvåstegsverifiering är på.</span></p>
      <p class="ts-text">Skriv en kod från appen (eller en reservkod) för att stänga av skyddet.</p>
      <form class="ts-form" data-form="ts-stang" novalidate><input class="falt ts-kod" name="kod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="9" placeholder="Kod" aria-label="Kod från appen eller reservkod" data-nativ>
      <button class="knapp knapp-kontur knapp-liten" type="submit">Stäng av</button><button class="knapp knapp-kontur knapp-liten" type="button" data-g="ts-avbryt">Avbryt</button></form>${fel}`;
    const st = TS.status || {};
    if (st.aktiv) return `
      <p class="ts-status" data-pa>${ik('bock')}<span>Tvåstegsverifiering är på${st.aktiverad ? ` sedan ${e(K.datumText ? K.datumText(st.aktiverad.slice(0, 10)) : st.aktiverad.slice(0, 10))}` : ''}.</span></p>
      <p class="ts-text">Vid inloggning krävs både ditt lösenord (eller koden till din e-post) och en kod från din autentiseringsapp. ${e(K.plural ? K.plural(st.reservkoderKvar || 0, 'reservkod', 'reservkoder') : (st.reservkoderKvar || 0) + ' reservkoder')} kvar.</p>
      ${st.krav ? '<p class="ts-text">Tvåstegsverifiering krävs för alla konton och kan inte stängas av. Har du tappat telefonen? Logga in med en reservkod, eller be administratören nollställa den.</p>' /* KRAV_TVASTEG */ : '<div class="ts-knappar"><button class="knapp knapp-kontur knapp-liten" type="button" data-g="ts-stang">Stäng av …</button></div>'}`;
    return `
      <p class="ts-status">${ik('las')}<span>Tvåstegsverifiering är av.</span></p>
      <p class="ts-text">Skydda kontot med ett andra steg: efter lösenordet (eller engångskoden via e-post) skriver du en kod från en app i telefonen. Då räcker det inte att någon känner till ditt lösenord eller kommer åt din e-post.</p>
      <div class="ts-knappar"><button class="knapp knapp-accent knapp-liten" type="button" data-g="ts-starta">${ik('skold')}Slå på tvåstegsverifiering</button></div>${fel}`;
  }
  function tsRita() { const r = tsRot(); if (r) r.innerHTML = tsHtml(); const k = r && r.querySelector('.ts-kod'); if (k) k.focus(); }
  async function tsHamta() {
    if (!SKARP || !L || !L.tvasteg) return;
    TS.lage = 'laddar'; TS.fel = ''; tsRita();
    const svar = await L.tvasteg.status();
    TS.lage = svar.ok ? 'vila' : 'fel'; TS.status = svar.ok ? svar : null; tsRita();
  }
  const tsKort = () => (SKARP ? `<section class="kort inst-tvasteg" aria-labelledby="inst-ts-rubrik">
          <div class="kort-huvud"><h2 id="inst-ts-rubrik">${emo('skold', { ruta: 'm', ton: 'mint' })}Tvåstegsverifiering</h2></div>
          <div class="kort-inre" data-tvasteg>${tsHtml()}</div>
        </section>` : '');
  /* Lösenord (bara skarpt läge, 2026-11-23): byt sitt eget lösenord. Det nuvarande krävs när kontot har ett eget; den som fortfarande
     har det tillfälliga skriver det. Servern avgör om det nya duger (längd, inte e-postadressen, inte det tillfälliga). */
  const LS = { fel: '', status: null };
  const lsRot = () => document.querySelector('[data-losen-kort]');
  const lsHtml = () => `<p class="ts-status"${LS.status && LS.status.eget ? ' data-pa' : ''}>${ik(LS.status && LS.status.eget ? 'bock' : 'las')}<span>${!LS.status ? 'Hämtar …' : LS.status.eget ? `Du har ett eget lösenord${LS.status.satt ? ` sedan ${e(K.datumText ? K.datumText(LS.status.satt.slice(0, 10)) : LS.status.satt.slice(0, 10))}` : ''}.` : 'Du använder fortfarande det tillfälliga lösenordet – välj ett eget.'}</span></p>
      <form class="ls-form" data-form="ls-byt" novalidate>
        <label class="etikett" for="ls-nu">${LS.status && !LS.status.eget ? 'Tillfälligt lösenord' : 'Nuvarande lösenord'}</label><input class="falt" id="ls-nu" name="nuvarande" type="password" autocomplete="current-password" maxlength="200">
        <label class="etikett" for="ls-nytt">Nytt lösenord <em>(minst ${LS.status ? LS.status.minst : 10} tecken)</em></label><input class="falt" id="ls-nytt" name="nytt" type="password" autocomplete="new-password" maxlength="200">
        <label class="etikett" for="ls-upprepa">Upprepa det nya</label><input class="falt" id="ls-upprepa" name="upprepa" type="password" autocomplete="new-password" maxlength="200">
        ${LS.fel ? `<p class="ts-fel" role="alert">${e(LS.fel)}</p>` : ''}
        <div class="knapprad"><button class="knapp knapp-accent" type="submit">${ik('las')}Byt lösenord</button></div>
      </form>`;
  const lsRita = () => { const r = lsRot(); if (r) r.innerHTML = lsHtml(); };
  async function lsHamta() { if (!SKARP || !L || !L.losenord) return; const s = await L.losenord.status(); if (s.ok) { LS.status = s; lsRita(); } }
  const lsKort = () => (SKARP && L && L.losenord ? `<section class="kort inst-losen" aria-labelledby="inst-ls-rubrik">
          <div class="kort-huvud"><h2 id="inst-ls-rubrik">${emo('nyckel', { ruta: 'm', ton: 'is' })}Lösenord</h2></div>
          <div class="kort-inre" data-losen-kort>${lsHtml()}</div>
        </section>` : '');
  const TS_G = {
    'ts-hamta': () => tsHamta(),
    'ts-starta': async () => {
      TS.fel = '';
      const svar = await L.tvasteg.starta();
      if (!svar.ok) { TS.fel = svar.meddelande || 'Kunde inte börja just nu.'; tsRita(); return; }
      TS.start = { hemlighet: svar.hemlighet, uri: svar.uri }; TS.lage = 'stall-in'; tsRita();
    },
    'ts-avbryt': () => { TS.start = null; TS.fel = ''; TS.lage = 'vila'; tsRita(); },
    'ts-stang': () => { TS.fel = ''; TS.lage = 'stang'; tsRita(); },
    'ts-klar': () => { TS.reserv = null; tsHamta(); },
    'ts-kopiera': async () => { try { await navigator.clipboard.writeText(TS.reserv.join('\n')); K.toast('Reservkoderna är kopierade'); } catch (err) { K.toast('Kunde inte kopiera – skriv av koderna', null, 'varning'); } },
    'ts-kopiera-nyckel': async () => { try { await navigator.clipboard.writeText(TS.start.hemlighet); K.toast('Nyckeln är kopierad'); } catch (err) { K.toast('Kunde inte kopiera – skriv av nyckeln', null, 'varning'); } },
  };
  const TS_FORM = {
    'ls-byt': async (form) => {
      const d = new FormData(form); const nytt = String(d.get('nytt') || '');
      if (nytt !== String(d.get('upprepa') || '')) { LS.fel = 'De nya lösenorden är inte likadana.'; lsRita(); return; }
      const svar = await L.losenord.byt(String(d.get('nuvarande') || ''), nytt);
      if (!svar.ok) { LS.fel = svar.meddelande || 'Kunde inte byta lösenordet.'; lsRita(); return; }
      LS.fel = ''; K.toast('Ditt nya lösenord är sparat', null, 'las'); lsHamta();
    },
    'ts-bekrafta': async (form) => {
      const kod = String(new FormData(form).get('kod') || '').replace(/\s/g, '');
      if (!/^\d{6}$/.test(kod)) { TS.fel = 'Koden är sex siffror.'; tsRita(); return; }
      const svar = await L.tvasteg.bekrafta(kod);
      if (!svar.ok) { TS.fel = svar.meddelande || 'Koden stämmer inte.'; tsRita(); return; }
      TS.start = null; TS.fel = ''; TS.reserv = svar.reservkoder || []; TS.lage = 'reserv'; tsRita();
      K.toast('Tvåstegsverifiering är på');
    },
    'ts-stang': async (form) => {
      const kod = String(new FormData(form).get('kod') || '').replace(/\s/g, '');
      if (!/^(\d{6}|\d{8})$/.test(kod)) { TS.fel = 'Skriv de sex siffrorna från appen eller en reservkod (åtta siffror).'; tsRita(); return; }
      const svar = await L.tvasteg.stangAv(kod);
      if (!svar.ok) { TS.fel = svar.meddelande || 'Koden stämmer inte.'; tsRita(); return; }
      K.toast('Tvåstegsverifiering är avstängd'); tsHamta();
    },
  };

  function visa() {
    if (SKARP && TS.lage !== 'stall-in' && TS.lage !== 'reserv') setTimeout(tsHamta, 0); // läget hämtas varje gång sidan öppnas
    if (SKARP) setTimeout(lsHamta, 0);
    const u = anv(K.jag) || {};
    const admin = u.roll === 'admin' || !!u.admin; // samma konton som ser kontrollcentralen, i demon och skarpt
    const lank = (href, ikon, ton, rubrik, under) => `<a class="inst-lank" href="${e(href)}">${emo(ikon, { ruta: 'm', ton })}<span><strong>${e(rubrik)}</strong><small>${e(under)}</small></span>${ik('pil')}</a>`;
    const knapp = (g, ikon, ton, rubrik, under) => `<button class="inst-lank" type="button" data-g="${e(g)}">${emo(ikon, { ruta: 'm', ton })}<span><strong>${e(rubrik)}</strong><small>${e(under)}</small></span>${ik('pil')}</button>`;
    const rader = [
      lank('#/profil', 'anstallda', 'is', 'Min profil', 'Presentation, kontakt, arbetsdagar och ledighet'),
      knapp('lp-status', 'klocka', 'mint', 'Min status', 'Online, i möte, lunch, semester …'),
      SKARP ? '' : lank('#/chatt', 'prat', 'mint', 'Meddelanden', 'Ljud och skrivbordsaviseringar ställs in i chatten – egna mallar längre ned'),
      lank('../integritet.html', 'skold', 'mint', 'Integritet och personuppgifter', 'Vad som sparas, hur länge och dina rättigheter'),
      admin ? lank('#/admin', 'server', 'orange', 'Adminpanelen', '3D, utloggning vid inaktivitet och påminnelser') : '',
      admin ? lank('#/sakerhet', 'radar', 'rod', 'Säkerhet', 'Skanningar och säkerhetsloggen') : '',
    ].filter(Boolean).join('');
    return sidhjalte({ klass: 'sidhjalte-installningar', ogon: u.namn ? `Gäller ${e(u.namn)}` : 'Ditt konto', titel: 'Inställningar', text: 'Välj hur CRM:et ska se ut. Temat, glaset och Apple-stilen sparas för ditt konto i den här webbläsaren.' }) + `
      <div class="inst-rum">
        <section class="kort inst-tema" aria-labelledby="inst-tema-rubrik">
          <div class="kort-huvud"><h2 id="inst-tema-rubrik">${emo('gnista', { ruta: 'm', ton: 'mint' })}Utseende</h2><span class="rakna" data-tema-namn>${e(T.beskrivning())}</span></div>
          <div class="kort-inre">
            ${T.valjare('stor')}
            ${T.glasVaxel()}
            ${T.stilVaxel ? T.stilVaxel() : ''}
            <p class="inst-tema__not">Följ systemet växlar mellan Original och Mörk efter datorns läge. Hela CRM:et byter färg. Kundens sidor, presentationen, filmen, dokumenten och utskrifter ser likadana ut i alla teman, och 3D-scenerna är alltid nattscener. Snabbare: kontomenyn<span class="bara-mus">, eller Ctrl K och skriv "tema"</span>.</p>
          </div>
        </section>
        <section class="kort" aria-labelledby="inst-fler-rubrik">
          <div class="kort-huvud"><h2 id="inst-fler-rubrik">${emo('installningar', { ruta: 'm', ton: 'is' })}Fler inställningar</h2></div>
          <div class="kort-inre"><div class="inst-lankar">${rader}</div></div>
        </section>
        ${lsKort()}
        ${tsKort()}
        ${!SKARP && window.UPChattMallar ? window.UPChattMallar.kortHtml() : ''}
      </div>`;
  }
  return { vagar: [[/^#\/installningar$/, visa, 'installningar', 'Inställningar']], G: { ...(T ? T.G : {}), ...TS_G }, FORM: TS_FORM };
};
