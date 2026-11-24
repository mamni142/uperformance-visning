/* Hälsoappen i tre telefoner (sektionen Plattform, 2026-11-23). Den främre telefonen kör appen (halsoapp/app.html, tema efter versionen)
   och laddas först när sektionen närmar sig. Klick på en bakre telefon eller i växeln blandar fram den versionen i tre steg
   (A ut åt sidan, B den främre backar, C på plats – se apptrio.css), i 3D så att telefonerna aldrig går igenom varandra. Bakre telefoner visar en bild
   (appen i dem avlastas, så bara en app körs åt gången). Finns inte halsoapp/ (t.ex. GitHub-exporten) står bilderna kvar. */
(() => {
  'use strict';
  const rot = document.querySelector('[data-apptrio]'); if (!rot) return;
  const hog = rot.querySelector('[data-at-hog]'), not = rot.querySelector('[data-at-not]');
  const tel = (id) => hog.querySelector(`.at-tel[data-at="${id}"]`);
  const lugn = matchMedia('(prefers-reduced-motion: reduce)');
  const NOT = {
    uperformance: 'Prova appen – tryck och svep i telefonen. Prototyp med exempeldata.',
    landslaget: 'Längdlandslaget – ett koncept av Uperformance, inte en officiell app från Svenska Skidförbundet. Exempeldata.',
    imaginecare: 'ImagineCare – ett koncept av Uperformance, inte en officiell app från ImagineCare. Exempeldata.',
  };
  const TITEL = { uperformance: 'Hälsoappen – Uperformance', landslaget: 'Hälsoappen – koncept för Längdlandslaget', imaginecare: 'Hälsoappen – koncept för ImagineCare' };
  const SR = { uperformance: '#fff', landslaget: '#fff', imaginecare: '#0b1520' }; // statusradens färg mot bilden
  let ordning = [...hog.querySelectorAll('.at-tel')].sort((a, b) => a.dataset.plats - b.dataset.plats).map((t) => t.dataset.at);
  let synlig = false, upptagen = false, vantar = null, harApp = null;

  // statusraden: ikoner och klocka
  const IK = '<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg viewBox="0 0 16 12"><path d="M8 2.5c2.3 0 4.4.9 6 2.4l1.3-1.4A10.5 10.5 0 0 0 8 .5C5.2.5 2.6 1.6.7 3.5L2 4.9a8.5 8.5 0 0 1 6-2.4zm0 4c1.2 0 2.3.5 3.2 1.2l1.3-1.4A6.6 6.6 0 0 0 8 4.5c-1.7 0-3.3.7-4.5 1.8l1.3 1.4C5.7 7 6.8 6.5 8 6.5zm0 2.4L6.3 10.6 8 12l1.7-1.4z"/></svg><svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="23" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="17" height="8" rx="2"/><rect x="24.5" y="4" width="1.8" height="4" rx=".9" opacity=".5"/></svg>';
  hog.querySelectorAll('.at-status-ik').forEach((s) => { s.innerHTML = IK; });
  const klocka = () => { const d = new Date(), t = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; hog.querySelectorAll('[data-at-klocka]').forEach((k) => { k.textContent = t; }); };
  klocka(); setInterval(klocka, 20000);
  ordning.forEach((id) => tel(id).style.setProperty('--sr', SR[id]));

  const kollaApp = () => harApp || (harApp = fetch('halsoapp/app.html', { method: 'HEAD', cache: 'no-store' }).then((r) => r.ok).catch(() => false));

  // appen i den främre telefonen
  function ladda() {
    const id = ordning[0], t = tel(id);
    if (!synlig || t.querySelector('iframe')) return;
    kollaApp().then((ok) => {
      if (!ok || ordning[0] !== id || t.querySelector('iframe')) return;
      const f = document.createElement('iframe');
      f.title = TITEL[id]; f.setAttribute('allow', 'fullscreen');
      f.addEventListener('load', () => {
        t.dataset.klar = '';
        // statusraden följer appens läge (mörk text i det ljusa läget)
        const kolla = () => { try { const n = f.contentDocument.body.dataset.niva; t.style.setProperty('--sr', n === 'motionar' ? '#0b1520' : n === 'elit' ? '#fff' : SR[id]); } catch (e) {} };
        kolla(); try { new MutationObserver(kolla).observe(f.contentDocument.body, { attributes: true, attributeFilter: ['data-niva'] }); } catch (e) {}
      }, { once: true });
      f.src = 'halsoapp/app.html' + (id === 'uperformance' ? '' : '?tema=' + id);
      t.querySelector('.at-skarm').insertBefore(f, t.querySelector('.at-statusrad'));
    });
  }
  function avlasta(t) {
    delete t.dataset.klar; t.style.setProperty('--sr', SR[t.dataset.at]);
    setTimeout(() => { if (t.dataset.plats !== '0') t.querySelector('iframe')?.remove(); }, 600);
  }
  function placera() { ordning.forEach((id, p) => { const t = tel(id); t.dataset.plats = p; t.querySelector('.at-fram').setAttribute('aria-hidden', 'true'); }); }

  function visaVal(id) {
    rot.querySelectorAll('.at-vaxel [data-at-val]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.atVal === id)));
    not.dataset.byter = ''; setTimeout(() => { not.textContent = NOT[id]; delete not.dataset.byter; }, 220);
  }

  function valj(id) {
    const i = ordning.indexOf(id); if (i <= 0) return;
    if (upptagen) { vantar = id; return; }
    visaVal(id);
    const fram = tel(ordning[0]), ny = tel(id), nyOrdning = ordning.slice();
    nyOrdning[i] = ordning[0]; nyOrdning[0] = id;
    if (lugn.matches) { ordning = nyOrdning; placera(); avlasta(fram); ladda(); return; }
    // Tre steg i följd, så att två telefoner aldrig är på samma djup där de överlappar (se apptrio.css):
    // A den valda dras ut åt sidan, B den främre backar in i djupet, C alla till sina nya platser.
    upptagen = true;
    hog.dataset.fas = 'a'; ny.dataset.drar = '';
    setTimeout(() => { hog.dataset.fas = 'b'; fram.dataset.sjunk = String(i); avlasta(fram); }, 340);
    setTimeout(() => {
      hog.dataset.fas = 'c'; delete ny.dataset.drar; delete fram.dataset.sjunk;
      ordning = nyOrdning; placera();
    }, 340 + 260);
    setTimeout(() => {
      delete hog.dataset.fas; upptagen = false; ladda();
      if (vantar) { const v = vantar; vantar = null; valj(v); }
    }, 340 + 260 + 760);
  }

  // Högen lutar lite efter musen (bara mus, inte under ett byte) – telefonerna ser ut att stå i rummet.
  const scen = hog.querySelector('[data-at-scen]');
  if (scen && matchMedia('(hover: hover) and (pointer: fine)').matches && !lugn.matches) {
    let ram = 0;
    hog.addEventListener('pointermove', (ev) => {
      if (ram) return;
      ram = requestAnimationFrame(() => { ram = 0;
        const r = hog.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width - .5, py = (ev.clientY - r.top) / r.height - .5;
        scen.style.setProperty('--ty', (-9 + px * 10).toFixed(2) + 'deg'); scen.style.setProperty('--tx', (3 - py * 6).toFixed(2) + 'deg'); });
    });
    hog.addEventListener('pointerleave', () => { scen.style.removeProperty('--ty'); scen.style.removeProperty('--tx'); });
  }

  rot.addEventListener('click', (ev) => { const b = ev.target.closest('[data-at-val]'); if (b) valj(b.dataset.atVal); });
  // piltangenter i växeln
  rot.querySelector('.at-vaxel').addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    const knappar = [...ev.currentTarget.querySelectorAll('button')], i = knappar.indexOf(document.activeElement);
    const n = knappar[(i + (ev.key === 'ArrowRight' ? 1 : -1) + knappar.length) % knappar.length]; n.focus(); valj(n.dataset.atVal); ev.preventDefault();
  });

  placera();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((p) => { if (p.some((x) => x.isIntersecting)) { synlig = true; ladda(); } }, { rootMargin: '300px 0px' }).observe(rot);
  } else { synlig = true; ladda(); }
})();
