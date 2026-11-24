/* ============================================================================================================
   Uperformance CRM – de guidade turerna (2026-11-23). Laddas efter guide.js och lämnas till UPGuide.registrera.
   En tur per kapitel i hjalp-innehall.js (samma id och roller, så att Hjälp kan starta rätt tur) + tangentbordsturen
   om Ctrl K. Formatet står överst i guide.js. Texterna beskriver bara det som finns – ändras en sida, ändra här.
   Väljarna är verifierade i headless Edge mot demon (Temp/upshot/guide/turer.mjs) på 1440 och 390 px per roll.
   Regler: stabila väljare (data-g, data-af, data-kd, id på rubriker) – aldrig #valj-knapp-N; ingen data i texterna.
   ============================================================================================================ */
(() => {
  'use strict';
  const G = window.UPGuide;
  if (!G || typeof G.registrera !== 'function') { console.warn('[guide-turer] UPGuide saknas'); return; }
  const SKARP = !!(window.UP_SKARPT && window.UP_SKARPT.lage === 'skarp');
  const smal = () => innerWidth < 1000;
  const pek = () => matchMedia('(pointer: coarse)').matches; // pekskärm: inga tangenttips som inte går att använda
  // Mer-arket på mobilen (Hjälp, Meddelanden ligger där): öppnas före steget och stängs när steget lämnas
  const oppnaMer = async () => {
    if (document.querySelector('dialog[open] .mer-ark')) return;
    const k = document.querySelector('.flikrad [data-g="mer"]'); if (!k) return;
    k.click(); await new Promise((r) => setTimeout(r, 380));
  };
  const stangMer = () => { const d = document.querySelector('dialog[open] .mer-ark'); const dlg = d && d.closest('dialog'); if (dlg) dlg.close(); };
  const hash = () => location.hash || '#/';
  // stå kvar om man redan är på en sida av rätt slag, annars gå till exemplet
  const ellerSida = (re, exempel) => () => (re.test(hash()) ? null : exempel);
  // kortet/sektionen runt ett element (hålet ramar hela kortet i stället för en rubrik)
  const kortRunt = (sel, upp = 'section, .kort') => (ctx) => { const el = ctx.$(sel); return el ? el.closest(upp) || el : null; };

  G.registreraKurser([
    { id: 'grunderna', namn: 'Grunderna', ikon: 'gnista', ton: 'mint', text: 'Hitta i CRM:et, din dag, dina uppgifter och dina inställningar.', beskrivning: 'Hitta i CRM:et, din dag, dina uppgifter och dina inställningar.', roller: [] },
    { id: 'salj', namn: 'Sälj', ikon: 'salj', ton: 'is', text: 'Från förfrågan och kund till offert, möte och provision.', beskrivning: 'Från förfrågan och kund till offert, möte och provision.', roller: [] },
    { id: 'testteamet', namn: 'Underlag och testdagar', ikon: 'stetoskop', ton: 'mint', text: 'Kundunderlaget, projekten och testdagen.', beskrivning: 'Kundunderlaget, projekten och testdagen.', roller: [] },
    { id: 'ledning', namn: 'Ledning och admin', ikon: 'mal', ton: 'gul', text: 'Teamets försäljning, konton och säkerhet.', beskrivning: 'Teamets försäljning, konton och säkerhet.', roller: [] },
  ]);

  G.registrera([
    /* ---- Grunderna ------------------------------------------------------------------------------------------ */
    { id: 'kom-igang', rubrik: 'Kom igång', kurs: 'grunderna', roller: [], sida: '#/', nasta: 'ctrl-k',
      beskrivning: 'Menyn, sökningen och var allt finns.',
      klarText: 'Nu hittar du runt. Nästa tur visar sökningen med Ctrl K.',
      steg: [
        { id: 'meny', mal: '#sidomeny', mobilMal: '.flikrad', placering: 'hoger', rubrik: 'Menyn',
          text: '<p>Alla sidor finns i menyn. På mobilen ligger de viktigaste i flikraden längst ned och resten under Mer.</p>' },
        { id: 'kant', mal: '[data-sido-knapp]', om: () => !smal(), rubrik: 'Fäll in menyn',
          text: '<p>Knappen på kanten fäller in menyn så att du får mer plats. Tangenten <kbd>[</kbd> gör samma sak.</p>' },
        { id: 'mer', mal: '.flikrad [data-g="mer"]', om: () => smal(), rubrik: 'Mer',
          text: '<p>Under Mer finns resten av sidorna, ditt konto och inställningarna.</p>' },
        { id: 'sok', mal: '[data-sok]', mobilMal: '.topprad [data-g="oppna-sok"]', rubrik: 'Sök efter allt',
          text: pek() ? '<p>Sök efter kunder, affärer, dokument, sidor och åtgärder. Tryck på förstoringsglaset var du än är.</p>'
            : '<p>Sök efter kunder, affärer, dokument, sidor och åtgärder. <kbd>Ctrl</kbd> <kbd>K</kbd> (⌘ K på Mac) hoppar hit var du än är.</p>' },
        { id: 'avis', mal: '[data-g="aviseringar"]', rubrik: 'Aviseringar',
          text: '<p>Klockan visar det som har hänt: försenade uppgifter, öppnade offerter, nya underlag och meddelanden.</p>' },
        { id: 'hjalp', mal: '#sidomeny [data-nav-till="hjalp"]', om: () => !smal() && !!document.querySelector('#sidomeny [data-nav-till="hjalp"]')?.getClientRects().length, valfri: true, rubrik: 'Hjälp',
          text: '<p>Användarguiden, vanliga frågor och de här turerna. Tryck <kbd>?</kbd> var som helst för att öppna turerna.</p>' },
        // ryms inte menyn ligger Hjälp och det man använder minst under Mer
        { id: 'mermeny', mal: '#sidomeny .nav-merknapp', om: () => !smal() && !document.querySelector('#sidomeny [data-nav-till="hjalp"]')?.getClientRects().length, valfri: true, rubrik: 'Mer i menyn',
          text: '<p>Ryms inte alla sidor i menyn hamnar de du använder minst under Mer – till exempel Hjälp med användarguiden och de här turerna. Tryck <kbd>?</kbd> var som helst för att öppna turerna.</p>' },
        // mobilen: Hjälp ligger i Mer-arket – arket öppnas för steget och stängs när steget lämnas
        { id: 'hjalp-mobil', mal: 'dialog[open] .mer-ark a[href="#/hjalp"]', om: () => smal(), valfri: true, behallArk: true, fore: oppnaMer, efter: stangMer, rubrik: 'Hjälp',
          text: '<p>Under Mer finns Hjälp: användarguiden, vanliga frågor och de här turerna.</p>' },
      ] },

    { id: 'ctrl-k', rubrik: pek() ? 'Sök i CRM:et' : 'Sök med Ctrl K', kurs: 'grunderna', roller: [], sida: '#/', nasta: 'oversikt',
      beskrivning: pek() ? 'Hitta kunder, sidor och åtgärder med sökningen.' : 'Tangentbordet: hitta kunder, sidor och åtgärder utan musen.',
      klarText: pek() ? 'Sökningen finns på alla sidor – prova den nästa gång du letar efter en kund.' : 'Ctrl K fungerar på alla sidor – prova den nästa gång du letar efter en kund.',
      steg: [
        { id: 'oppna', mal: '[data-sok]', mobilMal: '.topprad [data-g="oppna-sok"]', rubrik: 'Öppna sökningen',
          text: pek() ? '<p>Sökningen finns överst på alla sidor.</p>' : '<p>Sökningen nås med ett kortkommando från vilken sida som helst.</p>',
          prova: true, gor: smal() ? 'Tryck på sökknappen.' : 'Tryck Ctrl K (⌘ K på Mac) – eller klicka i sökfältet.',
          bra: 'Där är den.',
          klar: () => { const f = document.querySelector('[data-sok-falt]'); return !!f && document.activeElement === f; } },
        { id: 'skriv', mal: '[data-sok]', rubrik: 'Skriv några bokstäver',
          text: '<p>Träffarna grupperas: kunder, affärer, dokument, sidor och åtgärder. Det räcker med början av ett namn.</p>',
          prova: true, gor: 'Skriv till exempel "berg".', bra: 'Snyggt – träffarna kommer medan du skriver.',
          fyll: { '[data-sok-falt]': 'berg' },
          klar: () => { const f = document.querySelector('[data-sok-falt]'); return !!f && f.value.trim().length >= 2; } },
        { id: 'traffar', mal: ['[data-sok-traffar]', '[data-sok]'], rubrik: pek() ? 'Välj en träff' : 'Välj med tangenterna',
          // ett klick i rutan (Fyll i exempel) stänger sökningen – öppna den igen med det som står i fältet
          fore: () => {
            const f = document.querySelector('[data-sok-falt]'); const t = document.querySelector('[data-sok-traffar]');
            if (!f || !f.value || (t && !t.hidden && document.activeElement === f)) return;
            const k = smal() && document.querySelector('.topprad [data-g="oppna-sok"]');
            if (k) k.click(); else { f.focus(); f.dispatchEvent(new Event('input', { bubbles: true })); }
          },
          text: pek() ? '<p>Tryck på en träff för att öppna den. Skriv "ny" för att se åtgärderna, till exempel Ny kund.</p>'
            : '<p><kbd>↑</kbd> <kbd>↓</kbd> väljer, <kbd>Enter</kbd> öppnar och <kbd>Esc</kbd> stänger. Skriv "ny" för att se åtgärderna, till exempel Ny kund.</p>' },
      ] },

    { id: 'oversikt', rubrik: 'Översikten – din dag', kurs: 'grunderna', roller: [], sida: '#/', nasta: 'teamet',
      beskrivning: 'Vad du ska börja med, din lista och teamet.',
      steg: [
        { id: 'halsning', mal: '[data-hero3d]', mobilMal: ['.hero3d-text h1', '.hero3d-text'], roller: ['salj', 'chef', 'test'], rubrik: 'Din dag',
          text: '<p>Översikten är startsidan: hälsningen, dagens datum och det viktigaste just nu.</p>' },
        { id: 'nyckel', mal: '[data-nyckelremsa]', roller: ['salj', 'chef', 'test'], valfri: true, rubrik: 'Nyckeltalen',
          text: '<p>Talen visar läget i siffror – till exempel affärer, värde och vad som väntar.</p>' },
        { id: 'borja', mal: '.ob-fokus', roller: ['salj', 'chef', 'test'], valfri: true, rubrik: 'Börja här',
          text: '<p>Den åtgärd som ger mest just nu. Knapparna tar dig direkt dit.</p>' },
        { id: 'lista', mal: kortRunt('#ob-h-lista', 'section'), roller: ['salj', 'chef', 'test'], rubrik: 'Din lista',
          text: '<p>Dina uppgifter. Bocka av dem när de är gjorda.</p>' },
        { id: 'team', mal: 'section.ob-team', roller: ['salj', 'chef', 'test'], valfri: true, rubrik: 'Senaste i teamet',
          text: '<p>Vad kollegorna har gjort: samtal, möten, offerter och nya underlag.</p>' },
        { id: 'ao', mal: 'section.ao-hjalte', mobilMal: ['.ao-text h1', '.ao-text'], roller: ['admin'], rubrik: 'Kontrollcentralen',
          text: '<p>Som admin börjar du här: systemets hälsa med säkerhet, konton, data och drift.</p>' },
        { id: 'ao-konton', mal: '#ao-h-k', roller: ['admin'], rubrik: 'Kontona',
          text: '<p>Hur kontona mår: aktivitet, förfallna uppgifter och poster som står still.</p>' },
        { id: 'ao-sak', mal: '#ao-h-s', roller: ['admin'], rubrik: 'Säkerheten',
          text: '<p>Säkerhetskontrollerna och vad som behöver ses över.</p>' },
      ] },

    { id: 'teamet', rubrik: 'Chatt, videomöten och att göra', kurs: 'grunderna', roller: [], sida: '#/att-gora', nasta: 'dokument',
      beskrivning: 'Dina uppgifter, aviseringarna och chatten.',
      steg: [
        { id: 'snabb', mal: '[data-form="todo-snabb"]', rubrik: 'Ny uppgift',
          text: '<p>Skriv en uppgift och tryck Enter – den hamnar i din lista.</p>' },
        { id: 'dag', mal: '[data-g="todo-dag"]', rubrik: 'Veckan',
          text: '<p>Välj dag i veckoremsan för att se vad som ligger då.</p>' },
        { id: 'lista', mal: (ctx) => ctx.$('[data-td-lista]') || kortRunt('#td-g-idag', 'section')(ctx), valfri: true, rubrik: 'Dina uppgifter',
          text: '<p>Bocka av det som är gjort eller skjut fram det som får vänta.</p>' },
        { id: 'forslag', mal: 'section.td-forslag', valfri: true, rubrik: 'Förslag',
          text: '<p>CRM:et föreslår uppgifter ur det som väntar. Lägg till eller välj Inte nu.</p>' },
        { id: 'avis', mal: '[data-g="aviseringar"]', rubrik: 'Aviseringar',
          text: '<p>Klockan samlar försenade uppgifter, öppnade offerter och nya underlag.</p>' },
        { id: 'chatt', mal: '#sidomeny [data-nav-till="chatt"]', om: () => !SKARP && !smal(), valfri: true, rubrik: 'Meddelanden',
          text: '<p>Skriv med kollegorna. <kbd>@</kbd> nämner en kollega och <kbd>#</kbd> länkar en kund eller affär.</p>' },
        { id: 'chatt-mobil', mal: 'dialog[open] .mer-ark a[href="#/chatt"]', om: () => !SKARP && smal(), valfri: true, behallArk: true, fore: oppnaMer, efter: stangMer, rubrik: 'Meddelanden',
          text: '<p>Under Mer finns Meddelanden: skriv med kollegorna. @ nämner en kollega och # länkar en kund eller affär.</p>' },
      ] },

    { id: 'dokument', rubrik: 'Dokument och mallar', kurs: 'grunderna', roller: [], sida: '#/dokument', nasta: 'installningar',
      beskrivning: 'Alla offerter, ordrar, avtal och filer på ett ställe.',
      steg: [
        { id: 'tal', mal: kortRunt('[data-g="dok-tal"]', '.glaspanel, .sidhjalte-tal, [data-sidhjalte]'), rubrik: 'Läget',
          text: '<p>Korten räknar dokumenten. Klicka på ett kort för att filtrera listan.</p>' },
        { id: 'fack', mal: '[data-g="dok-fack"]', rubrik: 'Typ',
          text: '<p>Visa bara en sorts dokument: offerter, ordrar, avtal, underlag eller möten.</p>' },
        { id: 'atg', mal: kortRunt('#dk-atg-rubrik', 'section'), valfri: true, rubrik: 'Att hantera',
          text: '<p>Det som har gått ut eller väntar på kunden – med en knapp för det som ska göras.</p>' },
        { id: 'lista', mal: '[data-dk-grupp]', rubrik: 'Alla dokument',
          text: '<p>Klicka på en rad för detaljerna: läget, versionerna och vad som hör till samma affär.</p>' },
        { id: 'mallar', sida: '#/dokument/mallar', mal: 'section.ml-grupp', rubrik: 'Mallar',
          text: '<p>Under Mallar fyller du i avtal och dokument direkt ur CRM:ets uppgifter.</p>' },
      ] },

    { id: 'installningar', rubrik: 'Inställningar och utseende', kurs: 'grunderna', roller: [], sida: '#/installningar',
      beskrivning: 'Tema, glas och Apple-stil.',
      steg: [
        // ett enda kort pekas ut (hela väljaren var för stor – rutan täckte den): Mörk, eller Ljus om Mörk redan är valt, så att klicket alltid byter tema
        { id: 'tema', mal: () => ['.inst-tema .tema-kort[data-tema-id="' + (window.UPTema && window.UPTema.val() === 'mork' ? 'ljus' : 'mork') + '"]', '.inst-tema .tema-valjare'], rubrik: 'Välj tema',
          text: '<p>Original, Ljus, Mörk, Färgglad eller Följ systemet – korten står i rad här. Valet gäller ditt konto i den här webbläsaren.</p>',
          prova: true, handelse: 'up:tema', fore: (ctx) => { ctx.data.tema = window.UPTema ? window.UPTema.val() : null; },
          klar: (ctx) => !!window.UPTema && window.UPTema.val() !== ctx.data.tema, gor: 'Klicka på det utpekade temat och se hela CRM:et byta – du kan byta tillbaka när du vill.', bra: 'Snyggt – hela CRM:et bytte färg.' },
        { id: 'glas', mal: '[data-g="glas-vaxla"]', rubrik: 'Glas',
          text: '<p>Glaset gör ytorna halvgenomskinliga. Stäng av det om du vill ha täckta ytor.</p>' },
        { id: 'stil', mal: '[data-g="stil-vaxla"]', valfri: true, rubrik: 'Apple-stil',
          text: '<p>Apple-stilen ändrar form, typsnitt och knappar – aldrig färgerna.</p>' },
        { id: 'fler', mal: kortRunt('#inst-fler-rubrik', 'section'), rubrik: 'Fler inställningar',
          text: '<p>Genvägar till det som finns på andra ställen, till exempel din status och profil.</p>' },
      ] },

    /* ---- Sälj ----------------------------------------------------------------------------------------------- */
    { id: 'kunder', rubrik: 'Kunder och kontaktpersoner', kurs: 'salj', roller: ['salj', 'chef', 'admin'], sida: '#/kunder', nasta: 'forfragningar',
      beskrivning: 'Hitta en kund, kundkortet och tidslinjen.',
      steg: [
        { id: 'hjalte', mal: '[data-sidhjalte]', mobilMal: ['[data-sidhjalte] .sidhjalte-text h1', '[data-sidhjalte] .sidhjalte-text'], rubrik: 'Kunder',
          text: '<p>Alla företag och klubbar. Talen överst visar läget i registret.</p>' },
        { id: 'ny', mal: '[data-sidhjalte] [data-g="snabb"][data-flik="kund"]', rubrik: 'Ny kund',
          text: '<p>Lägg in en kund. Finns namnet redan säger CRM:et till.</p>' },
        { id: 'filter', mal: '[data-g="kund-typ"]', rubrik: 'Filtrera',
          text: '<p>Visa företag eller klubbar för sig.</p>' },
        { id: 'oppna', mal: '[data-kundlista] a[href^="#/kund/"]', rubrik: 'Öppna en kund',
          text: '<p>Hela raden leder till kundkortet – den här eller vilken kund som helst i listan.</p>',
          prova: true, gor: 'Klicka på en kund i listan.', bra: 'Snyggt – här är kundkortet.',
          klar: () => /^#\/kund\//.test(hash()) },
        { id: 'kontakter', sida: ellerSida(/^#\/kund\//, '#/kund/k5'), mal: '[data-kd="kontakter"]', rubrik: 'Kontaktpersoner',
          text: '<p>Kontaktpersonerna med telefon och e-post. Lägg till fler här.</p>' },
        { id: 'tidslinje', sida: ellerSida(/^#\/kund\//, '#/kund/k5'), mal: '[data-kd="tidslinje"]', rubrik: 'Tidslinjen',
          text: '<p>Skriv anteckningar om samtal och möten. Kryssa i Följ upp så blir det en uppgift.</p>' },
      ] },

    { id: 'forfragningar', rubrik: 'Förfrågningar från hemsidan', kurs: 'salj', roller: ['salj', 'chef', 'admin'], sida: '#/forfragningar', nasta: 'saljtavla',
      beskrivning: 'Frågor, bokningar och paketval från hemsidan.',
      steg: [
        { id: 'hjalte', mal: '[data-sidhjalte]', mobilMal: ['[data-sidhjalte] .sidhjalte-text h1', '[data-sidhjalte] .sidhjalte-text'], rubrik: 'Förfrågningar',
          text: '<p>Det besökarna skickar från hemsidan hamnar här, och säljarna får ett mejl.</p>' },
        { id: 'filter', mal: '[data-g="ff-filter"]', rubrik: 'Status',
          text: '<p>Att göra visar nya och pågående. Byt till Blev kund, Klara eller Alla.</p>' },
        { id: 'valj', mal: '[data-g="ff-valj"]', rubrik: 'Öppna en förfrågan',
          text: '<p>Raden fälls ut med meddelandet och kontaktuppgifterna.</p>',
          prova: true, gor: 'Klicka på en förfrågan.', bra: 'Där är detaljerna.',
          klar: () => !!document.querySelector('.ff-rad[data-vald]') },
        { id: 'detalj', mal: ['.ff-rad[data-vald]', '.ff-detalj'], valfri: true, rubrik: 'Ta hand om den',
          text: '<p>Skapa kund och affär, svara med ett mejl eller ta hand om den – och markera Klar när den är hanterad.</p>' },
      ] },

    { id: 'saljtavla', rubrik: 'Säljtavlan', kurs: 'salj', roller: ['salj', 'chef'], sida: '#/salj', nasta: 'offert',
      beskrivning: 'Alla affärer i sina steg.',
      steg: [
        { id: 'stegband', mal: ['[data-ss-etiketter]', '[data-stegband]'], valfri: true, rubrik: 'Stegen',
          text: '<p>Från ny kontakt till signerad order. Klicka på ett steg för att hoppa till kolumnen.</p>' },
        { id: 'kolumn', mal: 'section.kolumn[data-steg="offert"]', mobilMal: '[data-g="till-tavlan"]', rubrik: 'Kolumnerna',
          text: '<p>Varje kolumn är ett steg och varje kort en affär.</p>' },
        { id: 'kort', mal: 'a.affarskort', rubrik: 'Affärskortet',
          text: '<p>Kortet visar värdet, chansen att vinna och nästa steg. Dra kortet till nästa steg – eller använd knapparna på kortet.</p>' },
        { id: 'oppna', mal: 'a.affarskort', rubrik: 'Öppna en affär',
          text: '<p>Klicka på ett kort för att öppna affären.</p>',
          prova: true, gor: 'Klicka på ett affärskort.', bra: 'Snyggt – här är affären.',
          klar: () => /^#\/affar\//.test(hash()) },
        { id: 'nasta', sida: ellerSida(/^#\/affar\//, '#/affar/a2'), mal: '[data-af="nasta"]', rubrik: 'Nästa bästa steg',
          text: '<p>Affärens huvudåtgärd just nu, med en knapp som gör den.</p>' },
      ] },

    { id: 'offert', rubrik: 'Offert och order', kurs: 'salj', roller: ['salj', 'chef'], sida: '#/affar/a2', nasta: 'kundmote',
      beskrivning: 'Offerten på affären och länken till kunden.',
      steg: [
        { id: 'offert', mal: '[data-af="offert"]', rubrik: 'Offerten',
          text: '<p>Välj paket, antal och tillval. Summan räknas medan du väljer.</p>' },
        { id: 'live', mal: '[data-af="offert"] [data-g="starta-mote"]', valfri: true, rubrik: 'Räkna live',
          text: '<p>Öppnar kalkylen i Kundmötet så att du kan räkna tillsammans med kunden.</p>' },
        { id: 'dokkund', mal: '[data-af="dokkund"]', rubrik: 'Till kunden',
          text: '<p>Skapa offert ger en länk som du skickar till kunden. Kunden godkänner digitalt och affären går vidare.</p>' },
        { id: 'check', mal: '[data-af="check"]', valfri: true, rubrik: 'Kontrollpunkterna',
          text: '<p>När kontrollpunkterna är klara skapar du ordern. Kunden signerar den på samma sätt.</p>' },
        { id: 'varde', mal: '[data-af="varde"]', valfri: true, rubrik: 'Affärsvärdet',
          text: '<p>Värdet och betalplanen. En godkänd offert är låst – behöver något ändras görs en ny version.</p>' },
      ] },

    { id: 'kundmote', rubrik: 'Kundmöte och presentation', kurs: 'salj', roller: ['salj', 'chef'], sida: '#/mote', nasta: 'klubbmotorn',
      beskrivning: 'Presentera, räkna live och spara på affären.',
      steg: [
        { id: 'scen', mal: '[data-motescen]', mobilMal: ['[data-ms-ord] h1', '[data-ms-ord]'], rubrik: 'Kundmöte',
          text: '<p>Här förbereder du mötet och startar presentationen i helskärm.</p>' },
        { id: 'kund', mal: '[data-form="starta-mote"]', rubrik: 'Välj kund',
          text: '<p>Välj kund och affär – det du sparar i mötet hamnar på affären.</p>' },
        { id: 'infor', mal: '[data-infor-mote]', valfri: true, rubrik: 'Inför mötet',
          text: '<p>Det som är bra att veta om kunden innan ni ses.</p>' },
        { id: 'kalkyl', mal: '[data-ms="kalkyl"]', valfri: true, rubrik: 'Kalkylen',
          text: '<p>Räkna pris live med kunden och spara kalkylen på affären.</p>' },
        { id: 'starta', mal: '[data-ms="starta"]', rubrik: 'Starta',
          text: '<p>Presentationen öppnas i helskärm. Bläddra med pilarna, <kbd>F</kbd> spelar filmen och <kbd>Esc</kbd> lämnar helskärmen.</p>' },
      ] },

    { id: 'klubbmotorn', rubrik: 'Klubbmotorn', kurs: 'salj', roller: ['salj', 'chef'], sida: '#/klubbmotorn', nasta: 'abonnemang',
      beskrivning: 'Klubbar som tipsar företag – och provisionen.',
      steg: [
        { id: 'rubrik', mal: ['[data-kb3d-rubrik]', '.kb3d-text', 'section.loop'], mobilMal: ['.kb3d-text', 'section.loop'], rubrik: 'Klubbmotorn',
          text: '<p>Klubbar tipsar sina partnerföretag. När företaget blir kund får klubben en del av ordervärdet.</p>' },
        { id: 'steg', mal: '[data-kb3d-steg]', valfri: true, rubrik: 'Så fungerar det',
          text: '<p>Tre steg: klubben tipsar, företaget blir kund och klubben får provision.</p>' },
        { id: 'prov', mal: kortRunt('#kb-h-prov', 'section'), rubrik: 'Provisionerna',
          text: '<p>Provisionen räknas fram när ordern är signerad och är att betala när slutfakturan är skickad. Markera den som utbetald här.</p>' },
        { id: 'klubbar', mal: kortRunt('#kb-h-klubbar', 'section'), rubrik: 'Klubbarna',
          text: '<p>Klubb för klubb: avtalet, tratten från partner till avtal, provisionen och nästa steg.</p>' },
      ] },

    { id: 'abonnemang', rubrik: 'Abonnemang', kurs: 'salj', roller: ['salj', 'chef'], sida: '#/abonnemang', nasta: 'enkater',
      beskrivning: 'Bindningstid, uppsägningsdagar och förnyelser.',
      steg: [
        { id: 'planbok', mal: '[data-ab-planbok]', rubrik: 'Plånboken',
          text: '<p>Abonnemangen som kort – det som ska avgöras först ligger längst fram. Klicka på ett för detaljerna.</p>' },
        { id: 'beslut', mal: kortRunt('#ab-beslut-rubrik', 'section'), rubrik: 'Nästa beslut',
          text: '<p>Sista uppsägningsdagarna på en tidslinje.</p>' },
        { id: 'period', mal: '[data-g="ab-tl"]', rubrik: 'Hur långt fram',
          text: '<p>Välj hur många månader framåt tidslinjen visar.</p>' },
        { id: 'sok', mal: '[data-ab-sok]', rubrik: 'Alla abonnemang',
          text: '<p>Sök i listan och klicka på en rad för detaljerna. Villkoren kommer från avtalet med kunden.</p>' },
      ] },

    { id: 'enkater', rubrik: 'Anonyma enkäter', kurs: 'salj', roller: ['salj'], sida: '#/enkater', dold: SKARP,
      beskrivning: 'En anonym enkät till kundens medarbetare.',
      steg: [
        { id: 'hjalte', mal: '[data-sidhjalte]', mobilMal: ['[data-sidhjalte] .sidhjalte-text h1', '[data-sidhjalte] .sidhjalte-text'], rubrik: 'Enkäter',
          text: '<p>Kunden får statistik över svaren – aldrig vem som har svarat.</p>' },
        { id: 'ny', mal: '[data-g="enk-ny"]', rubrik: 'Ny enkät',
          text: '<p>Välj kund och en mall, och ändra frågorna om du vill.</p>' },
        { id: 'lista', mal: '.enk-kort-rad', valfri: true, rubrik: 'Enkäterna',
          text: '<p>Svarsfrekvensen per enkät. Resultatet visas när minst fem har svarat.</p>' },
        { id: 'sa', mal: '[data-fyll-sida]', valfri: true, rubrik: 'Så går det till',
          text: '<p>Skicka svarslänken eller QR-koden till kontaktpersonen och dela sedan resultatlänken med kunden.</p>' },
      ] },

    /* ---- Underlag och testdagar ----------------------------------------------------------------------------- */
    { id: 'kundunderlag', rubrik: 'Kundunderlag och hälsoformulär', kurs: 'testteamet', roller: ['salj', 'test'], sida: '#/affar/a5', nasta: 'projekt',
      beskrivning: 'Kundlänken i stället för ett Excelark.',
      steg: [
        { id: 'underlag', mal: '[data-af="underlag"]', roller: ['salj'], rubrik: 'Kundunderlaget',
          text: '<p>Kunden fyller i företaget och en rad per deltagare via en länk. Det inskickade blir offert och förifyller överlämningen.</p>' },
        { id: 'kopiera', mal: '[data-g="kopiera-lank"]', roller: ['salj'], valfri: true, rubrik: 'Länken',
          text: '<p>Kopiera länken och skicka den till kontaktpersonen. Den gäller i 30 dagar.</p>' },
        { id: 'deltagare', mal: '[data-af="underlag"] [data-g="visa-deltagare"]', roller: ['salj'], valfri: true, rubrik: 'Deltagarna',
          text: '<p>Se vilka deltagare kunden har skickat in.</p>' },
        { id: 'sparra', mal: '[data-g="sparra-lank"]', roller: ['salj'], valfri: true, rubrik: 'Spärra',
          text: '<p>Länken kan förlängas eller spärras när den inte ska användas längre.</p>' },
        { id: 'proj', sida: '#/projekt/j7', mal: '[data-af="overlamning"]', roller: ['test'], rubrik: 'Underlaget i projektet',
          text: '<p>Testteamet får underlaget från sälj i projektet, med uppgifterna och kontrollpunkterna.</p>' },
        { id: 'halsa', sida: '#/projekt/j7', mal: ['[data-af="halsa"]', '[data-af="deltagare"]'], roller: ['test'], valfri: true, rubrik: 'Hälsoformulären',
          text: '<p>Deltagarna fyller i hälsoformuläret själva. Här ser du vilka som har svarat.</p>' },
        { id: 'deltagarlista', sida: '#/projekt/j7', mal: '[data-af="deltagare"]', roller: ['test'], valfri: true, rubrik: 'Deltagarlistan',
          text: '<p>Deltagarna som kunden har skickat in.</p>' },
      ] },

    { id: 'projekt', rubrik: 'Projekt och testdagar', kurs: 'testteamet', roller: ['test', 'salj'], sida: '#/projekt',
      beskrivning: 'Underlag, bokning, testdag och uppföljning.',
      steg: [
        { id: 'hjalte', mal: '[data-sidhjalte]', mobilMal: ['[data-sidhjalte] .sidhjalte-text h1', '[data-sidhjalte] .sidhjalte-text'], rubrik: 'Projekt',
          text: '<p>När ordern är signerad tar testteamet över. Varje projekt följer stegen till uppföljningen.</p>' },
        { id: 'steg', mal: '[data-projsteg]', rubrik: 'Stegen',
          text: '<p>Projekten per steg: underlag, bokning, test, avstämning och uppföljning.</p>' },
        { id: 'oppna', mal: ['[data-tavla] a.projektkort', 'a.projektkort', 'a[href^="#/projekt/"]'], rubrik: 'Öppna ett projekt',
          text: '<p>Klicka på ett projekt för att se vems tur det är.</p>',
          prova: true, gor: 'Klicka på ett projekt.', bra: 'Snyggt – här är projektet.',
          klar: () => /^#\/projekt\/./.test(hash()) },
        { id: 'nasta', sida: ellerSida(/^#\/projekt\/./, '#/projekt/j7'), mal: '[data-af="nasta"]', rubrik: 'Nästa steg',
          text: '<p>Säger vems tur det är och vad som ska göras – med formuläret för steget.</p>' },
        { id: 'underlag', sida: ellerSida(/^#\/projekt\/./, '#/projekt/j7'), mal: '[data-af="overlamning"]', valfri: true, rubrik: 'Underlag från sälj',
          text: '<p>Granska underlaget. Saknas något: Returnera med en kommentar.</p>' },
        { id: 'testdag', sida: '#/projekt/j1', mal: '[data-g="testdagslista"]', roller: ['test'], valfri: true, rubrik: 'Testdagen',
          text: '<p>Skriv ut testdagslistan och markera närvaro. Lägg i kalendern ger en kalenderfil med testdagen.</p>' },
      ] },

    /* ---- Ledning och admin ---------------------------------------------------------------------------------- */
    { id: 'chef', rubrik: 'Försäljningsledning', kurs: 'ledning', roller: ['chef'], sida: '#/chef',
      beskrivning: 'Teamet, närvaron, pipelinen och ledigheten.',
      steg: [
        { id: 'team', mal: '#lp-h-team', rubrik: 'Teamet just nu',
          text: '<p>Ett kort per säljare: målet, affärerna per steg och aktiviteten.</p>' },
        { id: 'narv', mal: '#lp-h-narv', rubrik: 'Närvaro',
          text: '<p>Fyra veckor med arbetsdagar och frånvaro. Kollegor ser aldrig sjukfrånvaro eller skäl.</p>' },
        { id: 'upp', mal: '#lp-h-upp', rubrik: 'Behöver din uppmärksamhet',
          text: '<p>Ansökningar om ledighet först – godkänn eller neka direkt i listan – och affärer som står still.</p>' },
        { id: 'pipe', mal: '#lp-h-pipe', rubrik: 'Pipeline per säljare',
          text: '<p>Värdet per steg och säljare, viktat efter chansen att vinna.</p>' },
        { id: 'mal', mal: '[data-g="lp-mal"]', valfri: true, rubrik: 'Målen',
          text: '<p>Sätt säljarnas mål här.</p>' },
      ] },

    { id: 'admin', rubrik: 'Administration och personuppgifter', kurs: 'ledning', roller: ['admin'], sida: '#/anvandare',
      beskrivning: 'Konton, roller och säkerhet.',
      steg: [
        { id: 'hjalte', mal: '[data-sidhjalte]', mobilMal: ['[data-sidhjalte] .sidhjalte-text h1', '[data-sidhjalte] .sidhjalte-text'], rubrik: 'Användare',
          text: '<p>Bjud in, ändra roll, inaktivera och logga ut enheter. Allt som görs här loggas.</p>' },
        { id: 'team', mal: '#anv-h-team', rubrik: 'Kontona',
          text: '<p>Alla aktiva konton med roll och status.</p>' },
        { id: 'roll', mal: '#anv-h-roll', valfri: true, rubrik: 'Rollerna',
          text: '<p>Vad sälj, testteamet och admin får göra.</p>' },
        { id: 'beh', mal: '#adm-h-b', valfri: true, rubrik: 'Behörigheter',
          text: '<p>Behörigheterna per roll i en tabell.</p>' },
        { id: 'logg', sida: '#/admin', mal: '#adm-h-l', rubrik: 'Loggen',
          text: '<p>Adminpanelen samlar konton, förslag, inställningar och loggen.</p>' },
      ] },
  ]);
})();
