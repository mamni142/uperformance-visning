/* ============================================================
   Uperformance CRM – temamotorn (window.UPTema)
   Fyra teman (tema.css, tema-toner.css) + "Följ systemet". tema-tidigt.js har redan satt data-tema och
   data-glas på <html> före första målningen; här sköts bytet:
   - UPTema.satt(id, { fran, direkt })  sparar valet för kontot och byter mjukt: en rund våg från det valda provet
                          (View Transitions), annars kort tvärtoning, direkt vid prefers-reduced-motion
   - UPTema.farg(n)       läser token --t-<n> eller --<n> (för diagram och canvas)
   - UPTema.valjare('stor'|'liten')  väljarna i Inställningar och kontomenyn
   - händelsen 'up:tema' på window, detail { tema, val, mork }
   Temat gäller kontot i den här webbläsaren. Glaset (html[data-glas], glas.css) har sitt eget val per konto.
   ============================================================ */
(function () {
  'use strict';
  var d = document.documentElement;
  var NYCKEL = 'up-crm-tema:', GLAS = 'up-crm-glas:', STIL = 'up-crm-stil:';

  // Ordningen är den som visas i väljarna. "kort" syns i Inställningar, "sok" används av sökningen (Ctrl K).
  var TEMAN = [
    { id: 'system', namn: 'Följ systemet', mini: 'Auto', kort: 'Original eller Mörk efter datorn', sok: 'system automatiskt auto dator följ tema' },
    { id: 'original', namn: 'Original', mini: 'Original', kort: 'Mörka navy-hjältar och mint', sok: 'original standard förval tema' },
    { id: 'ljus', namn: 'Ljus', mini: 'Ljus', kort: 'Ljust glas och mörk text, luftigt', sok: 'ljus ljust luftigt vitt tema' },
    { id: 'mork', namn: 'Mörk', mini: 'Mörk', kort: 'Helmörkt och djupt, skönt för ögonen', sok: 'mörk mörkt dark natt kväll tema' },
    { id: 'fargglad', namn: 'Färgglad', mini: 'Färgglad', kort: 'Mättat blått och mint med korall', sok: 'färgglad färgglatt glad livlig tema' }
  ];
  var GILTIG = /^(original|ljus|mork|fargglad)$/;
  var morkMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  var lugnMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function konto() {
    try { var S = window.UP_SKARPT; return (S && S.lage === 'skarp' && S.jag && S.jag.id) || localStorage.getItem('up-crm-jag') || 'gast'; } catch (e) { return 'gast'; }
  }
  function lasVal() {
    var v = null;
    try { v = localStorage.getItem(NYCKEL + konto()); } catch (e) { v = null; }
    return v === 'system' || GILTIG.test(v || '') ? v : 'original';
  }
  function upplos(val) { return GILTIG.test(val || '') ? val : (morkMq.matches ? 'mork' : 'original'); }
  function info(id) { return TEMAN.filter(function (t) { return t.id === id; })[0] || TEMAN[1]; }

  var tema = window.UPTema = window.UPTema || {};
  tema.lista = TEMAN;
  tema.info = info;
  tema.val = lasVal; // det sparade valet: 'system' eller ett tema-id
  tema.aktivt = function () { return d.getAttribute('data-tema') || upplos(lasVal()); };
  tema.mork = function () { return tema.aktivt() === 'mork'; };
  // Token: farg('accent') → '#7ee0c3'
  tema.farg = function (n, reserv) {
    var s = getComputedStyle(d);
    return s.getPropertyValue('--t-' + n).trim() || s.getPropertyValue('--' + n).trim() || reserv || '';
  };

  /* --- Bytet -------------------------------------------------------- */
  var stopp = 0;
  function skicka(t) {
    try { window.dispatchEvent(new CustomEvent('up:tema', { detail: { tema: t, val: lasVal(), mork: t === 'mork' } })); } catch (e) { /* mycket gammal webbläsare */ }
  }
  // Mobilens adressfält följer temat; Original behåller sidans egen färg ur <meta>.
  var metaOrig = null;
  function metaFarg() {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) return;
    if (metaOrig === null) metaOrig = m.getAttribute('data-original') || m.getAttribute('content') || '';
    var f = tema.aktivt() === 'original' ? metaOrig : tema.farg('ben');
    if (f) m.setAttribute('content', f);
  }
  // Vågen utgår från det valda provet (fran = elementet), annars från fönstrets mitt. Radien når fönstrets längsta hörn.
  function vag(fran) {
    var b = fran && fran.getBoundingClientRect ? fran.getBoundingClientRect() : null;
    var x = b && b.width ? b.left + b.width / 2 : innerWidth / 2, y = b && b.width ? b.top + b.height / 2 : innerHeight / 2;
    var r = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)));
    d.style.setProperty('--vag-x', Math.round(x) + 'px'); d.style.setProperty('--vag-y', Math.round(y) + 'px'); d.style.setProperty('--vag-r', r + 'px');
  }
  // Allt byter samtidigt: den gamla bilden står kvar tills den nya är klar att visas, sedan sveper den nya in som en mjuk rund våg.
  // Hela omräkningen sker innan animationen börjar, så att den aldrig syns som ett ryck. Utan View Transitions: kort tvärtoning.
  var vtPagar = 0, vtNu = null, fangat = false;
  // Medan vågen sveper träffar alla tryck <html>: webbläsaren testar inte mot sidan under bilden, inte ens med pointer-events: none.
  // Ett tryck avslutar därför vågen direkt och klicket skickas vidare till det som ligger där – annars försvinner ett snabbt andra klick.
  // Trycket når ingen annan: en öppen meny (kontomenyn) skulle annars tro att man klickade utanför den.
  window.addEventListener('pointerdown', function (ev) {
    fangat = !!vtNu && ev.target === d;
    if (!fangat) return;
    ev.stopImmediatePropagation();
    try { vtNu.skipTransition(); } catch (e) { /* redan klar */ }
  }, true);
  window.addEventListener('mousedown', function (ev) { if (fangat && ev.target === d) ev.stopImmediatePropagation(); }, true);
  window.addEventListener('click', function (ev) {
    if (!fangat) return;
    fangat = false;
    if (ev.target !== d) return;
    ev.stopImmediatePropagation();
    var vidare = function () {
      var el = document.elementFromPoint(ev.clientX, ev.clientY);
      if (!el || el === d) return;
      var f = el.closest('button, a[href], input, select, textarea, [tabindex]');
      if (f) f.focus({ preventScroll: true });
      el.click();
    };
    if (vtNu && vtNu.finished) vtNu.finished.then(vidare, vidare); else vidare();
  }, true);
  function byt(gor, hur) {
    if ((hur && hur.direkt) || lugnMq.matches || document.hidden) { gor(); return; }
    if (document.startViewTransition) {
      vag(hur && hur.fran);
      // sidans egna övergångsnamn stängs av under tiden. Ett snabbt andra byte avbryter det första – klassen står kvar tills sista är klart
      vtPagar++; d.classList.add('tema-vt');
      var vt = null;
      var klar = function () { vtPagar = Math.max(0, vtPagar - 1); if (!vtPagar) d.classList.remove('tema-vt'); if (vtNu === vt) vtNu = null; };
      try {
        vt = vtNu = document.startViewTransition(gor);
        ['ready', 'updateCallbackDone'].forEach(function (k) { if (vt[k]) vt[k].catch(function () {}); });
        if (vt.finished) vt.finished.then(klar, klar); else setTimeout(klar, 900);
      } catch (e) { klar(); gor(); }
      return;
    }
    d.classList.add('tema-byter');
    gor();
    clearTimeout(stopp);
    stopp = setTimeout(function () { d.classList.remove('tema-byter'); }, 320);
  }
  function tillampa(t, hur) {
    if (d.getAttribute('data-tema') === t) { markera(); return; }
    byt(function () { d.setAttribute('data-tema', t); metaFarg(); markera(); skicka(t); }, hur);
  }
  tema.satt = function (val, hur) {
    val = val === 'system' || GILTIG.test(val || '') ? val : 'original';
    try { localStorage.setItem(NYCKEL + konto(), val); } catch (e) { /* privat läge: gäller tills sidan laddas om */ }
    tillampa(upplos(val), hur);
    markera();
    return upplos(val);
  };
  // Glaset: på som förval, valet sparas per konto som temat
  var tatMq = window.matchMedia ? window.matchMedia('(prefers-reduced-transparency: reduce)') : { matches: false };
  tema.glasPa = function () {
    try { return localStorage.getItem(GLAS + konto()) !== '0'; } catch (e) { return d.hasAttribute('data-glas'); }
  };
  // Minskad genomskinlighet på datorn går före kontots val: då är alla ytor täckta (valet står kvar)
  function glasAttr(pa) { d.toggleAttribute('data-glas', !!pa && !tatMq.matches); }
  tema.glasSatt = function (pa, hur) {
    try { localStorage.setItem(GLAS + konto(), pa ? '1' : '0'); } catch (e) { /* privat läge: gäller tills sidan laddas om */ }
    byt(function () { glasAttr(pa); skicka(tema.aktivt()); }, hur);
    markera();
  };
  tema.glasVaxel = function () {
    return '<button type="button" class="glas-vaxel" role="switch" data-g="glas-vaxla" aria-checked="' + tema.glasPa() + '"><span class="glas-vaxel__spar" aria-hidden="true"><i></i></span>' +
      '<span class="glas-vaxel__text"><b>Glasdesign</b><small>Frostat glas i hela CRM:et</small></span></button>';
  };
  // Apple-stilen (apple.css): på som förval, valet sparas per konto som glaset. Bytet går samma väg som temat (vågen).
  tema.stilPa = function () {
    try { return localStorage.getItem(STIL + konto()) !== '0'; } catch (e) { return d.getAttribute('data-stil') === 'apple'; }
  };
  function stilAttr(pa) { if (pa) d.setAttribute('data-stil', 'apple'); else d.removeAttribute('data-stil'); }
  tema.stilSatt = function (pa, hur) {
    try { localStorage.setItem(STIL + konto(), pa ? '1' : '0'); } catch (e) { /* privat läge: gäller tills sidan laddas om */ }
    byt(function () { stilAttr(pa); skicka(tema.aktivt()); }, hur);
    markera();
  };
  tema.stilVaxel = function () {
    return '<button type="button" class="glas-vaxel" role="switch" data-g="stil-vaxla" aria-checked="' + tema.stilPa() + '"><span class="glas-vaxel__spar" aria-hidden="true"><i></i></span>' +
      '<span class="glas-vaxel__text"><b>Apple-stil</b><small>Typsnitt, knappar och fält som i iOS och macOS</small></span></button>';
  };
  // Efter kontobyte (crm.js) eller när en annan flik ändrat: läs kontots val på nytt.
  tema.lasOm = function (hur) {
    var fore = d.getAttribute('data-tema'), glasFore = d.hasAttribute('data-glas');
    tillampa(upplos(lasVal()), hur);
    glasAttr(tema.glasPa());
    stilAttr(tema.stilPa());
    // bara glaset ändrades (kontobyte, annan flik): up:tema ändå, så att 3D-scenerna (scen3d.js) läser om sin palett
    if (d.getAttribute('data-tema') === fore && d.hasAttribute('data-glas') !== glasFore) skicka(fore);
    markera();
  };
  if (tatMq.addEventListener) tatMq.addEventListener('change', function () { glasAttr(tema.glasPa()); skicka(tema.aktivt()); });

  if (morkMq.addEventListener) morkMq.addEventListener('change', function () { if (lasVal() === 'system') tillampa(upplos('system')); markera(); });
  window.addEventListener('storage', function (ev) {
    if (ev.key === null || ev.key === 'up-crm-jag' || (ev.key && (ev.key.indexOf(NYCKEL) === 0 || ev.key.indexOf(GLAS) === 0 || ev.key.indexOf(STIL) === 0))) tema.lasOm();
  });

  /* --- Väljarna ----------------------------------------------------- */
  // Proven ritas med det temats egna token (data-tema-prov i tema.css), så att de alltid stämmer.
  function bild(id) {
    var en = function (t) {
      return '<span class="tema-bild__ram" data-tema-prov="' + t + '"><i class="tb-sido"><b></b><b></b><b></b></i>' +
        '<span class="tb-yta"><i class="tb-hjalte"><b></b><s></s></i><i class="tb-kort"><b></b><s></s><em></em></i><i class="tb-kort"><b></b><s></s></i></span></span>';
    };
    return '<span class="tema-bild' + (id === 'system' ? ' tema-bild--system' : '') + '" aria-hidden="true">' +
      (id === 'system' ? en('original') + en('mork') : en(id)) + '</span>';
  }
  // Det lilla provet: ett fönster (meny, yta, text och knapp) i temats färger
  function ruta(id) {
    var del = function (t) { return '<span class="tema-ruta__del" data-tema-prov="' + t + '"><i></i><s></s><b></b></span>'; };
    return '<span class="tema-ruta' + (id === 'system' ? ' tema-ruta--system' : '') + '" aria-hidden="true">' + (id === 'system' ? del('original') + del('mork') : del(id)) + '</span>';
  }
  tema.ruta = ruta;
  tema.valjare = function (storlek) {
    var val = lasVal();
    if (storlek === 'liten') {
      return '<div class="tema-valjare tema-valjare--liten" role="group" aria-label="Tema">' + TEMAN.map(function (t) {
        return '<button type="button" class="tema-knapp" data-g="tema-val" data-tema-id="' + t.id + '" aria-pressed="' + (val === t.id) + '" aria-label="Tema: ' + t.namn + '" title="' + t.namn + ' – ' + t.kort + '">' + ruta(t.id) + '<span class="tema-knapp__namn">' + t.mini + '</span></button>';
      }).join('') + '</div>';
    }
    return '<div class="tema-valjare tema-valjare--stor" role="group" aria-label="Tema">' + TEMAN.map(function (t, n) {
      return '<button type="button" class="tema-kort" data-g="tema-val" data-tema-id="' + t.id + '" aria-pressed="' + (val === t.id) + '" style="--n:' + n + '">' + bild(t.id) +
        '<span class="tema-kort__text"><b>' + t.namn + '</b><small>' + t.kort + '</small></span>' +
        '<span class="tema-kort__bock" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button>';
    }).join('') + '</div>';
  };
  // Texten bredvid väljaren, t.ex. "Mörk · följer systemet"
  tema.beskrivning = function () {
    var val = lasVal();
    return val === 'system' ? info(upplos('system')).namn + ' · följer systemet' : info(val).namn;
  };
  function markera() {
    var val = lasVal();
    Array.prototype.forEach.call(document.querySelectorAll('[data-g="tema-val"][data-tema-id]'), function (b) {
      if (!b.classList.contains('sok-traff')) b.setAttribute('aria-pressed', String(b.getAttribute('data-tema-id') === val));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-tema-namn]'), function (s) { s.textContent = tema.beskrivning(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-g="glas-vaxla"]'), function (b) {
      if (!b.classList.contains('sok-traff')) b.setAttribute('aria-checked', String(tema.glasPa()));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-g="stil-vaxla"]'), function (b) {
      if (!b.classList.contains('sok-traff')) b.setAttribute('aria-checked', String(tema.stilPa()));
    });
  }
  tema.markera = markera;

  // Handlarna (data-g) tas in av crm.js. Sökningens rader bekräftas med en toast – där syns inte väljaren.
  tema.G = {
    'tema-val': function (el) {
      var id = el.getAttribute('data-tema-id');
      var t = tema.satt(id, { fran: el });
      if (el.classList.contains('sok-traff') && window.UPCRM) window.UPCRM.toast('Tema: ' + info(id).namn + (id === 'system' ? ' (just nu ' + info(t).namn + ')' : ''));
    },
    'glas-vaxla': function (el) {
      var pa = !tema.glasPa();
      tema.glasSatt(pa, { fran: el });
      if (el.classList.contains('sok-traff') && window.UPCRM) window.UPCRM.toast(pa ? 'Glasdesignen är på' : 'Glasdesignen är av');
    },
    'stil-vaxla': function (el) {
      var pa = !tema.stilPa();
      tema.stilSatt(pa, { fran: el });
      if (el.classList.contains('sok-traff') && window.UPCRM) window.UPCRM.toast(pa ? 'Apple-stilen är på' : 'Apple-stilen är av');
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', metaFarg); else metaFarg();
})();
