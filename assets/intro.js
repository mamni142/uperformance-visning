/* Hemsidans intro (assets/intro.css): takten och utgången. Introt syns när html[data-intro="pa"] (tidigt skript i index.html).
   Loggan är klar efter ~2,4 s – då öppnar sig sidan (data-intro="ut", 0,95 s) och introt tas bort. Klick, tryck eller en tangent
   hoppar direkt till utgången. Visas en gång per besök (sessionStorage up-intro). */
(() => {
  'use strict';
  const html = document.documentElement; const ruta = document.querySelector('[data-intro-ruta]');
  if (!ruta) return;
  if (html.dataset.intro !== 'pa') { ruta.remove(); return; }
  try { sessionStorage.setItem('up-intro', '1'); } catch (err) { /* privat läge */ }
  let ute = false;
  const ut = () => {
    if (ute) return; ute = true;
    html.dataset.intro = 'ut';
    setTimeout(() => { ruta.remove(); delete html.dataset.intro; }, 1080);
  };
  const timer = setTimeout(ut, 2450);
  const hoppa = () => { clearTimeout(timer); ut(); };
  addEventListener('pointerdown', hoppa, { once: true, passive: true });
  addEventListener('keydown', hoppa, { once: true });
  // går fliken i bakgrunden under introt: visa sidan direkt när man kommer tillbaka
  document.addEventListener('visibilitychange', () => { if (document.hidden && !ute) hoppa(); });
})();
