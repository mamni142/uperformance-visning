/* Integritetspolicyn: innehållslistan markerar avsnittet man läser (aria-current), och korten tonar in en gång när de kommer i bild.
   Bara IntersectionObserver – inget följer scrollen i varje bildruta. */
(() => {
  'use strict';
  const lankar = [...document.querySelectorAll('[data-ip-lank]')];
  const kort = [...document.querySelectorAll('.ip-kort')];
  const lugn = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!lugn && 'IntersectionObserver' in window) {
    kort.forEach((k) => { if (k.getBoundingClientRect().top > innerHeight) k.dataset.syns = 'nej'; });
    const in1 = new IntersectionObserver((poster) => poster.forEach((p) => { if (p.isIntersecting) { p.target.dataset.syns = 'ja'; in1.unobserve(p.target); } }), { rootMargin: '0px 0px -8% 0px' });
    kort.forEach((k) => in1.observe(k));
  }
  if (!('IntersectionObserver' in window) || !lankar.length) return;
  const satt = (id) => lankar.forEach((a) => { const pa = a.getAttribute('href') === '#' + id; a.setAttribute('aria-current', String(pa)); if (pa && matchMedia('(max-width: 900px)').matches) a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: lugn ? 'auto' : 'smooth' }); });
  const io = new IntersectionObserver((poster) => {
    const synliga = poster.filter((p) => p.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (synliga[0]) satt(synliga[0].target.id);
  }, { rootMargin: '-90px 0px -60% 0px' });
  kort.forEach((k) => io.observe(k));
})();
