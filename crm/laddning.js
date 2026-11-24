/* Laddningen in i CRM:et (2026-11-24, användaren: "en cool vortex animering till en laddning sida när man loggar in till crm,
   i samma färgtema och stil som animeringen på login sidan" – "gör så den inte hackar eller laggar").
   Virveln = samma silkeslinjer som Flödet på inloggningen (mint → is, additivt ljus på bläck med norrsken) vridna till en virvel
   i perspektiv runt märket (cirkeln med U:et), med ljuspartiklar som dras in och en ljusbana runt loggan.

   Jämnheten: ritningen sker i en egen tråd (laddning-arbetare.js, Worker + OffscreenCanvas), så att CRM:ets inläsning och
   3D-kompilering på huvudtråden aldrig stoppar virveln. Märkets rörelser (uppritning, andning, banan, glöden, suget) är bara
   CSS-animationer av transform/opacity – de går på grafikkortet. Saknar webbläsaren OffscreenCanvas ritas samma kod på huvudtråden.

   Flödet: inloggningen anropar UPLaddning.visa() när kontot är klart och sparar starttiden i sessionStorage (up-laddning).
   crm/index.html laddar skriptet först i <head> (data-crm): finns en färsk markering visas virveln direkt (html[data-laddar]
   ger bläcket före första målningen) i samma fas, och sugs in i märket när CRM:et har ritats (vyn har innehåll och sidan är
   laddad) – högst 7 s. Direktlänkar (?visa=…) och omladdningar får ingen virvel. Reducerad rörelse: bara märket och texten.
   Inga inline-skript (CSP). */
(() => {
  'use strict';
  const NYCKEL = 'up-laddning';
  const ARBETARE = 'laddning-arbetare.js?v=4';
  const lugn = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RING = 'M198,10c103.9,0,188,84,188,187.5s-84.1,187.5-188,187.5S10,301,10,197.5,94.1,10,198,10Z';
  const U = 'M177.5,127.8v88.6c0,7.3,1.6,13,4.7,17.3,3.3,4.1,8.4,6.2,15.5,6.2s12.4-2.1,15.8-6.2c3.4-4.3,5.1-10.1,5.1-17.3v-88.6h49.1v88.6c0,14.9-3.1,27.8-9.3,38.4-6.2,10.5-14.7,18.4-25.5,23.8-10.8,5.3-22.9,8-36.2,8s-25.2-2.7-35.5-8c-10.2-5.3-18.2-13.2-24-23.8-5.8-10.5-8.7-23.3-8.7-38.4v-88.6h49.1-.1Z';
  // Ljusbanan runt märket: två bågar på en cirkel som CSS vrider i virvelns lutning (bakre halvan bakom loggan, främre framför)
  const BANA = '<svg viewBox="0 0 100 100" focusable="false"><circle class="upl-bana-spar" cx="50" cy="50" r="47"/><circle class="upl-bana-sken" cx="50" cy="50" r="47" pathLength="100"/><circle class="upl-bana-bage" cx="50" cy="50" r="47" pathLength="100"/></svg>';
  const SKRIPT = document.currentScript;
  const lagra = {
    las() { try { const v = JSON.parse(sessionStorage.getItem(NYCKEL) || 'null'); return v && Date.now() - v.start < 15000 ? v : null; } catch { return null; } },
    satt(v) { try { sessionStorage.setItem(NYCKEL, JSON.stringify(v)); } catch { /* privat läge – virveln syns ändå på inloggningen */ } },
    bort() { try { sessionStorage.removeItem(NYCKEL); } catch { /* inget */ } }
  };

  let lager = null, markeEl = null, start = 0, ut = false, slutTimer = 0, lyssnar = false;
  let arbetare = null, lokal = null, lokalRaf = 0; // ritningen: i en Worker, annars här

  function bygg(text, direkt, ihop) {
    lager = document.createElement('div');
    lager.className = 'upl'; lager.setAttribute('role', 'status'); lager.setAttribute('aria-live', 'polite');
    if (direkt) lager.setAttribute('data-direkt', '');
    if (ihop) lager.setAttribute('data-ihop', '');
    lager.innerHTML = `<div class="upl-bak" aria-hidden="true"><span></span><span></span></div>
      <canvas class="upl-duk" aria-hidden="true"></canvas>
      <div class="upl-mitt">
        <div class="upl-marke" aria-hidden="true"><span class="upl-glodram"><i class="upl-glod"></i></span>
          <span class="upl-bana upl-bana-bak">${BANA}</span>
          <svg class="upl-logga" viewBox="0 0 396 395" focusable="false"><circle class="upl-fyll" cx="198" cy="197.5" r="188"/><path class="upl-ring" pathLength="1" d="${RING}"/><path class="upl-u" d="${U}"/></svg>
          <span class="upl-bana upl-bana-fram">${BANA}</span>
        </div>
        <p class="upl-text"><span>${text}</span><b class="upl-prickar" aria-hidden="true"><i></i><i></i><i></i></b></p>
      </div>`;
    document.body.appendChild(lager);
    markeEl = lager.querySelector('.upl-marke');
    const duk = lager.querySelector('.upl-duk');
    if (lugn) { duk.remove(); return; }
    startaRitning(duk, ihop ? 1 : 0);
    if (!lyssnar) {
      lyssnar = true;
      addEventListener('resize', () => skicka('storlek'), { passive: true });
      document.addEventListener('visibilitychange', () => skicka(document.hidden ? 'paus' : 'fortsatt'));
      // typsnittet kan flytta texten (och märket) en aning när det laddats klart
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => skicka('storlek'));
    }
  }

  // Dukens storlek (lägre än skärmens pixlar – mjukare och billigare) och märkets mitt, som virveln snurrar runt
  function matt() {
    const k = Math.min(1, devicePixelRatio || 1) * Math.min(1, 1500 / Math.max(1, innerWidth));
    const m = markeEl ? markeEl.getBoundingClientRect() : null;
    return { b: Math.max(1, Math.round(innerWidth * k)), h: Math.max(1, Math.round(innerHeight * k)), k,
      mx: m ? (m.left + m.width / 2) * k : 0, my: m ? (m.top + m.height / 2) * k : 0 };
  }

  function startaRitning(duk, ihop) {
    // 1) egen tråd: huvudtrådens arbete (CRM:ets skript, 3D) kan inte stoppa virveln
    if (duk.transferControlToOffscreen && window.Worker) {
      try {
        const off = duk.transferControlToOffscreen();
        if (!arbetare) arbetare = new Worker(ARBETARE); // i CRM:et skapad redan i <head> (se nedan), så att den hinner starta
        arbetare.onerror = () => { /* tråden kunde inte starta – märket och texten syns ändå */ };
        arbetare.postMessage({ typ: 'start', duk: off, start, ihop, matt: matt() }, [off]);
        return;
      } catch { arbetare = null; }
    }
    // 2) reserv: samma ritning på huvudtråden
    const kor = () => {
      if (!window.UPVirvel || !lager) return;
      lokal = window.UPVirvel(duk); lokal.st.start = start; lokal.st.ihop = lokal.st.malIhop = ihop; lokal.storlek(matt());
      const loop = (nu) => { lokalRaf = 0; if (lokal && !document.hidden && lokal.rita(nu)) lokalRaf = requestAnimationFrame(loop); };
      lokal.fortsatt = () => { if (!lokalRaf && lokal) { lokal.st.forra = 0; lokalRaf = requestAnimationFrame(loop); } };
      lokal.fortsatt();
    };
    if (window.UPVirvel) kor();
    else { const s = document.createElement('script'); s.src = ARBETARE; s.onload = kor; document.head.appendChild(s); }
  }

  function skicka(typ, mal) {
    if (!lager) return;
    if (arbetare) { arbetare.postMessage(typ === 'storlek' ? { typ, matt: matt() } : { typ, mal }); return; }
    if (!lokal) return;
    if (typ === 'storlek') lokal.storlek(matt());
    else if (typ === 'ut') { lokal.st.ut = true; lokal.fortsatt(); }
    else if (typ === 'ihop') { lokal.st.malIhop = mal; lokal.fortsatt(); }
    else if (typ === 'fortsatt') lokal.fortsatt();
  }

  function stada() {
    clearTimeout(slutTimer);
    if (arbetare) { arbetare.postMessage({ typ: 'stopp' }); arbetare = null; }
    if (lokalRaf) cancelAnimationFrame(lokalRaf);
    lokalRaf = 0; lokal = null;
    if (lager) lager.remove();
    lager = null; markeEl = null; ut = false;
    const hade = document.documentElement.hasAttribute('data-laddar');
    document.documentElement.removeAttribute('data-laddar');
    if (hade) dispatchEvent(new Event('up:laddning-klar')); // scener.js monterar 3D först nu (se där)
  }

  /* Inloggningssidan: visa virveln och markera starttiden för CRM:et */
  function visa(text = 'Öppnar CRM:et') {
    stada(); start = Date.now(); lagra.satt({ start });
    bygg(text, false);
    requestAnimationFrame(() => lager && lager.setAttribute('data-in', ''));
  }

  /* Inloggningssidan: dra ihop virveln i märket och gå till CRM:et först när bara den stilla loggan syns. Webbläsaren fryser
     den gamla sidan en stund vid sidbytet – med inget i rörelse syns det inte (förut stannade virveln mitt i ett varv). */
  function lamna(url) {
    if (!lager) { location.href = url; return; }
    lagra.satt({ start });
    lager.setAttribute('data-ihop', '');
    skicka('ihop', 1);
    setTimeout(() => { location.href = url; }, lugn ? 0 : 620);
  }

  /* Tona bort: märket och virveln sugs in, lagret tonar ut */
  function klar() {
    if (!lager || ut) return;
    ut = true; lager.setAttribute('data-ut', '');
    // data-laddar (bläcket och overflow) släpps först i stada(), när lagret redan är osynligt – annars räknades hela sidan om mitt i utgången
    skicka('ut');
    slutTimer = setTimeout(stada, lugn ? 300 : 1250);
  }

  /* CRM:et: fortsätt virveln i samma fas och tona bort när vyn är ritad */
  function fortsatt(v) {
    start = v.start;
    bygg('Öppnar CRM:et', true, true); lager.setAttribute('data-in', '');
    // samma stilla bild som inloggningen slutade med – sedan vecklas virveln ut ur märket
    requestAnimationFrame(() => requestAnimationFrame(() => { if (lager && !ut) { lager.removeAttribute('data-ihop'); skicka('ihop', 0); } }));
    const t0 = performance.now();
    const redo = () => { const vy = document.getElementById('vy'); return document.readyState === 'complete' && vy && vy.childElementCount > 0; };
    // Utgången börjar först när CRM:et är ritat OCH huvudtråden har lugnat sig (tio bilder i rad under 24 ms, på en långsam dator högst 3,5 s – då är skripten
    // körda och 3D-scenens shaders kompilerade). Annars krockade suget med CRM:ets tyngsta arbete och hackade mot slutet.
    let lugna = 0, forra = 0;
    const vanta = (nu) => {
      const gatt = performance.now() - t0;
      if (forra) lugna = nu - forra < 24 ? lugna + 1 : 0;
      forra = nu;
      if ((redo() && gatt > 650 && (lugna >= 10 || gatt > 3500)) || gatt > 8000) { klar(); return; }
      requestAnimationFrame(vanta);
    };
    requestAnimationFrame(vanta);
  }

  // Bakåtknappen tillbaka till inloggningen: ingen kvarglömd virvel eller markering
  addEventListener('pageshow', (e) => { if (e.persisted && lager) { stada(); lagra.bort(); } });

  window.UPLaddning = { visa, lamna, klar };

  // I CRM:et (crm/index.html laddar skriptet med data-crm): finns en färsk markering från inloggningen tar vi över därifrån
  if (SKRIPT && SKRIPT.hasAttribute('data-crm')) {
    const v = lagra.las(); lagra.bort();
    if (v) {
      document.documentElement.setAttribute('data-laddar', '');
      // starta tråden direkt – medan sidan läses in hämtas och startas den parallellt, och virveln syns från första bilden
      if (!lugn && window.Worker && window.OffscreenCanvas && HTMLCanvasElement.prototype.transferControlToOffscreen) { try { arbetare = new Worker(ARBETARE); } catch { arbetare = null; } }
      // så fort <body> finns – inte vid DOMContentLoaded, som kommer först efter att CRM:ets alla skript körts (virveln stod då still)
      if (document.body) fortsatt(v);
      else {
        const obs = new MutationObserver(() => { if (document.body) { obs.disconnect(); fortsatt(v); } });
        obs.observe(document.documentElement, { childList: true });
      }
    }
  }
})();
