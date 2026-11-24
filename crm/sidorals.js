/* Uperformance CRM – infälld meny (rälsen, 2026-11-02): när huvudmenyn trycks in står alla sidor kvar som ikoner, som i Legohus CRM.
   Rälsen speglar sidomenyn i stället för att ha en egen lista: länkarna, ordningen (roller, testteamets ordning), räknarna och vald
   sida läses ur `.sido nav`, så att rollbyten, kontobyten och nya menyval följer med av sig själva. Menyknappen sitter kvar i
   `.sido-kant` och flyttas till sin plats i rälsen med --rals-knapp-y, chattens snabbknapp läggs under den (chatt.js placeraIkon).
   Stil: sidorals.css. */
(() => {
  'use strict';
  const rals = document.querySelector('[data-sido-rals]');
  const sido = document.querySelector('.sido');
  const nav = sido && sido.querySelector('[data-nav]');
  if (!rals || !nav) return;
  const rot = document.documentElement;
  const dator = matchMedia('(min-width: 1000px)');
  const ik = (namn) => `<svg class="ikon" aria-hidden="true"><use href="#i-${namn}"/></svg>`;
  const synlig = (x) => !!x && x.getClientRects().length > 0;

  rals.innerHTML = `<a class="rals-rund rals-logga" href="#/" data-namn="Översikt" aria-label="Översikt"><svg aria-hidden="true"><use href="#u-mark"/></svg></a>
    <button class="rals-rund" type="button" data-g="sok-oppna" data-namn="Sök · Ctrl K" aria-label="Sök">${ik('sok')}</button>
    <button class="rals-rund" type="button" data-g="skapa-ny" data-rals-ny data-namn="Skapa ny" aria-label="Skapa ny">${ik('plus')}</button>
    <span class="rals-plats" aria-hidden="true"></span>
    <div class="rals-lista" data-rals-lista></div>
    <button class="rals-mer-pil" type="button" tabindex="-1" aria-hidden="true"><span>${ik('chevron')}</span></button>
    <span class="rals-klocka-plats" data-klocka-plats="rals"></span>
    <button class="rals-konto" type="button" data-g="lp-konto" data-namn="Konton och status" aria-haspopup="dialog" aria-label="Konton och status"><span class="avatar" data-rals-avatar aria-hidden="true"></span></button>`;
  const lista = rals.querySelector('[data-rals-lista]');
  const plats = rals.querySelector('.rals-plats');
  const nyKnapp = rals.querySelector('[data-rals-ny]');
  const konto = rals.querySelector('.rals-konto');
  const avatar = rals.querySelector('[data-rals-avatar]');
  const kant = document.querySelector('.sido-kant');
  // Rullar listan (mycket låga fönster) visar en liten pil att det finns fler sidor under kanten – klick rullar ned (fynd-2-meny 4)
  const merPil = rals.querySelector('.rals-mer-pil');
  // Rymms inte sidorna i fönstrets höjd blir raderna så mycket lägre som behövs (ned till 20 px) – först därefter rullar listan.
  // Räknas bara om när höjden, sidorna eller tätheten ändras (en mätning).
  let tatNyckel = '';
  function anpassaTathet() {
    const nyckel = `${innerHeight}|${byggd}|${rot.getAttribute('data-sido-tat') || ''}|${document.querySelector('.chf-ikon[data-i-rals]') ? 1 : 0}`;
    if (nyckel === tatNyckel) return; tatNyckel = nyckel;
    rals.removeAttribute('data-rals-tat'); rals.style.removeProperty('--rals-rad'); rals.style.removeProperty('--rals-ikon');
    const over = lista.scrollHeight - lista.clientHeight; const rader = lista.querySelectorAll('a'); if (over <= 1 || !rader.length) return;
    const nu = rader[0].offsetHeight; const gap = parseFloat(getComputedStyle(lista).rowGap) || 0;
    const rad = Math.max(20, Math.min(nu, Math.floor(nu - (over - gap * (lista.children.length - 1)) / rader.length)));
    rals.style.setProperty('--rals-rad', `${rad}px`); rals.style.setProperty('--rals-ikon', `${Math.max(13, Math.min(16, rad - 9))}px`);
    rals.setAttribute('data-rals-tat', '');
  }
  function pilLage() {
    rals.toggleAttribute('data-rals-mer', lista.scrollTop + lista.clientHeight < lista.scrollHeight - 4);
    rals.toggleAttribute('data-rals-rullad', lista.scrollTop > 4);
  }
  lista.addEventListener('scroll', pilLage, { passive: true });
  merPil.addEventListener('click', () => lista.scrollBy({ top: Math.round(lista.clientHeight * 0.7), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));

  // Bara det som väntar på något får en bricka – totalerna (kunder, affärer, projekt) står i den utfällda menyn, annars blir rälsen orolig
  const BRICKA = new Set(['chatt', 'todo', 'chef', 'dokument', 'sakerhet']);
  const namnPa = (a) => { const k = a.cloneNode(true); k.querySelectorAll('.rakna, svg').forEach((x) => x.remove()); return k.textContent.trim(); };
  // Vad sidomenyn visar just nu, i menyns ordning. Rubrikerna blir avdelare – de kan vara dolda av plats- eller rollskäl, så bara länkarna måste synas.
  // Det egna (Meddelanden, Att göra, Inställningar) ligger i en egen yta längst ner i menyn (sidomeny.css) och har ytans ordning. Rader som
  // bara är undanflyttade till Mer (låga fönster, data-mer-dold) står ändå i rälsen.
  function rader() {
    const barn = [...nav.children].flatMap((x) => (x.matches('[data-nav-mitt-grupp]') ? [...x.children].map((y) => [y, x]) : [[x, x]]))
      .filter(([x]) => (x.matches('a.navlank') ? synlig(x) || (x.hasAttribute('data-mer-dold') && !x.hidden) : x.matches('.nav-etikett')));
    return barn.map(([x, ram], i) => ({ x, i, o: parseInt(getComputedStyle(ram).order, 10) || 0 })).sort((a, b) => a.o - b.o || a.i - b.i).map((r) => r.x);
  }
  let byggd = null;
  function bygg(r) {
    const delar = []; let delare = false;
    for (const x of r) {
      if (!x.matches('a')) { delare = delar.length > 0; continue; }
      if (delare) { delar.push('<span class="rals-delare" aria-hidden="true"></span>'); delare = false; }
      const n = namnPa(x); const use = x.querySelector('svg use');
      const a = document.createElement('a'); a.href = x.getAttribute('href'); a.dataset.namn = n; a.setAttribute('aria-label', n);
      a.innerHTML = `<svg class="ikon" aria-hidden="true"><use href="${use ? use.getAttribute('href') : '#i-mer'}"/></svg>`;
      delar.push(a.outerHTML);
    }
    lista.innerHTML = delar.join('');
  }
  function speglaLankar() {
    const r = rader(); const nyckel = r.map((x) => (x.matches('a') ? x.getAttribute('href') : '|')).join(' ');
    if (nyckel !== byggd) { byggd = nyckel; bygg(r); }
    const egna = new Map([...lista.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a]));
    for (const x of r) {
      const a = x.matches('a') && egna.get(x.getAttribute('href')); if (!a) continue;
      if (x.hasAttribute('aria-current')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      const ra = x.querySelector('.rakna'); const varm = !!ra && ra.classList.contains('rakna-varm');
      const t = ra && !ra.hidden && (synlig(ra) || x.hasAttribute('data-mer-dold')) && (varm || BRICKA.has(ra.dataset.rakna)) ? ra.textContent.trim() : '';
      let b = a.querySelector('i');
      if (!t || t === '0') { if (b) b.remove(); a.setAttribute('aria-label', a.dataset.namn); continue; }
      if (!b) { b = document.createElement('i'); a.appendChild(b); }
      if (b.textContent !== t) b.textContent = t;
      b.toggleAttribute('data-varm', varm);
      a.setAttribute('aria-label', `${a.dataset.namn}, ${t}`);
    }
  }
  function speglaKonto() {
    const av = document.querySelector('[data-mig-avatar]'); if (!av) return;
    avatar.className = av.className; avatar.innerHTML = av.innerHTML; avatar.toggleAttribute('data-bild', av.hasAttribute('data-bild'));
    konto.style.setProperty('--narv', av.style.getPropertyValue('--narv') || 'var(--accent)');
    const kort = document.querySelector('.anvandarval');
    const namn = (kort && kort.getAttribute('aria-label')) || 'Konton och status';
    konto.setAttribute('aria-label', namn); konto.dataset.namn = namn.split('.')[0];
  }
  // Menyknappen står på sin plats i rälsen – höjden följer rälsens mått (låga fönster, ingen Ny-knapp)
  function placeraKnapp() {
    if (!kant || !synlig(plats)) return;
    const y = Math.round(plats.getBoundingClientRect().top + plats.offsetHeight / 2 - kant.getBoundingClientRect().top);
    if (rot.style.getPropertyValue('--rals-knapp-y') !== `${y}px`) rot.style.setProperty('--rals-knapp-y', `${y}px`); // roten: bara vid ändring (hela dokumentets stil räknas om)
  }
  function rita() {
    rals.inert = !(rot.hasAttribute('data-sido-dold') && dator.matches);
    if (!dator.matches) return;
    speglaLankar(); speglaKonto();
    const ny = document.querySelector('.sido .knapp-ny'); nyKnapp.hidden = !synlig(ny);
    anpassaTathet();
    placeraKnapp();
    pilLage();
  }
  let ram = 0;
  const planera = () => { if (!ram) ram = requestAnimationFrame(() => { ram = 0; rita(); }); };
  new MutationObserver(planera).observe(nav, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'aria-current', 'class', 'data-mer-dold'] });
  new MutationObserver(planera).observe(rot, { attributes: true, attributeFilter: ['data-sido-dold', 'data-bara-admin', 'data-roll-chef', 'data-roll-admin', 'data-roll-test', 'data-sido-tat'] });
  const av = document.querySelector('[data-mig-avatar]');
  if (av) new MutationObserver(planera).observe(av, { childList: true, characterData: true, subtree: true, attributes: true });
  dator.addEventListener('change', planera);
  addEventListener('resize', planera);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(planera);
  // crm.js och ledning.js sätter roll och räknare när de startar; rälsen laddas före dem
  addEventListener('DOMContentLoaded', planera);
  addEventListener('load', planera);
  planera();

  /* Glasbubblan med sidans namn: ligger utanför rälsen, som rullar sitt innehåll */
  const bubbla = document.createElement('div');
  bubbla.className = 'sido-bubbla'; bubbla.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bubbla);
  const mal = (ev) => (ev.target.closest ? ev.target.closest('.sido-rals [data-namn]') : null);
  const visa = (el) => {
    const r = el.getBoundingClientRect();
    bubbla.textContent = el.dataset.namn;
    bubbla.style.top = `${Math.round(r.top + r.height / 2)}px`;
    bubbla.style.left = `${Math.round(rals.getBoundingClientRect().right + 10)}px`;
    bubbla.classList.add('syns');
  };
  const dolj = () => bubbla.classList.remove('syns');
  // Fokus som läggs tillbaka när en panel stängs med Esc (kontomenyn, aviseringarna) visar ingen bubbla – den blev förut stående
  // kvar över rälsen tills man klickade någon annanstans (fynd-2-meny 8). Tab till knappen visar den som vanligt.
  let escTid = 0;
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { escTid = performance.now(); dolj(); } }, true);
  [['mouseover', 'mouseout'], ['focusin', 'focusout']].forEach(([in_, ut]) => {
    document.addEventListener(in_, (ev) => { const el = mal(ev); if (el && !(in_ === 'focusin' && performance.now() - escTid < 600)) visa(el); });
    document.addEventListener(ut, (ev) => { if (mal(ev)) dolj(); });
  });
  document.addEventListener('click', dolj, true);
  addEventListener('hashchange', dolj);
  ['up:sido', 'up:tema'].forEach((t) => addEventListener(t, dolj));
  lista.addEventListener('scroll', dolj, { passive: true });
})();
