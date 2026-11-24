/* Uperformance CRM – temat sätts före första målningen (laddas synkront i <head>, efter inloggningsvakten och före stilmallarna).
   Valet sparas per konto: localStorage 'up-crm-tema:<konto>' och 'up-crm-glas:<konto>' (konto = 'up-crm-jag', i skarpt läge den
   inloggade, annars 'gast'). Förval: Original – aldrig systemets läge, annars blir CRM:et plötsligt mörkt. "system" väljs bara aktivt.
   Glaset är på tills kontot stänger av det ('0'). Resten sköts av tema.js. Kundens sidor laddar varken den här filen eller tema.css. */
(function () {
  var d = document.documentElement, t = null, g = null, s = null, konto = 'gast';
  try { var S = window.UP_SKARPT; konto = (S && S.lage === 'skarp' && S.jag && S.jag.id) || localStorage.getItem('up-crm-jag') || 'gast'; } catch (e) { /* ingen lagring */ }
  try { t = localStorage.getItem('up-crm-tema:' + konto); g = localStorage.getItem('up-crm-glas:' + konto); s = localStorage.getItem('up-crm-stil:' + konto); } catch (e) { t = null; }
  if (t === 'system') { try { t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'mork' : 'original'; } catch (e) { t = 'original'; } }
  if (!/^(original|ljus|mork|fargglad)$/.test(t || '')) t = 'original';
  d.setAttribute('data-tema', t);
  if (s !== '0') d.setAttribute('data-stil', 'apple'); // Apple-stilen (apple.css) är på tills kontot stänger av den
  var tat = false; try { tat = window.matchMedia('(prefers-reduced-transparency: reduce)').matches; } catch (e) { tat = false; }
  if (g !== '0' && !tat) d.setAttribute('data-glas', ''); // minskad genomskinlighet på datorn: täckta ytor
  // Mobilens adressfält i rätt färg direkt (Original behåller sidans egen; tema.js håller den i takt vid byten).
  var farg = { ljus: '#fcfcfb', mork: '#0a1119', fargglad: '#eefaf6' }[t];
  try {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) { m.setAttribute('data-original', m.getAttribute('content') || ''); if (farg) m.setAttribute('content', farg); }
  } catch (e) { /* ignorera */ }
})();
