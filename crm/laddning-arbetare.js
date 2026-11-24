/* Virveln (laddning.js) – själva ritningen. Körs i en egen tråd (Worker + OffscreenCanvas) så att virveln går jämnt även när
   CRM:et läser in sin kod och kompilerar 3D-scenerna på huvudtråden. Samma fil fungerar som vanligt skript (reserv för
   webbläsare utan OffscreenCanvas): då finns skapaVirvel som self.UPVirvel. Inget DOM här – bara canvas 2D. */
(() => {
  'use strict';
  const TRADAR = 28, PUNKTER = 70;
  const nyDuk = (b, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(b, h) : Object.assign(document.createElement('canvas'), { width: b, height: h }));

  function skapaVirvel(duk) {
    const g = duk.getContext('2d');
    const st = { start: Date.now(), b: 1, h: 1, k: 1, mx: 0, my: 0, ut: false, sug: 0, forra: 0, extra: 0, pextra: 0, ihop: 0, malIhop: 0 };
    const slump = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }; // jämnt utspridda, men samma varje gång
    const PARTIKLAR = Array.from({ length: 46 }, (_, i) => ({ a: slump(i + 1) * Math.PI * 2, f: slump(i + 101), v: .05 + slump(i + 201) * .07, r: .6 + slump(i + 301) * 1.1, j: i }));
    // en färdigritad ljusprick (drawImage är billigt, en gradient per partikel och bild är det inte)
    const prick = nyDuk(32, 32); {
      const pg = prick.getContext('2d'); const gr = pg.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(235,250,255,1)'); gr.addColorStop(.3, 'rgba(126,224,195,.5)'); gr.addColorStop(1, 'rgba(126,224,195,0)');
      pg.fillStyle = gr; pg.fillRect(0, 0, 32, 32);
    }
    const p = Array.from({ length: PUNKTER + 1 }, () => [0, 0, 0]); // återanvänds – ingen ny minnesallokering per bild

    function storlek(o) {
      Object.assign(st, o);
      if (duk.width !== o.b) duk.width = o.b;
      if (duk.height !== o.h) duk.height = o.h;
    }
    function rita(nu) {
      const { b, h, k } = st;
      const dt = Math.min(.05, (nu - (st.forra || nu)) / 1000); st.forra = nu;
      const t = (Date.now() - st.start) / 1000;
      if (st.ut) st.sug = Math.min(1, st.sug + dt / .8);
      const sug = st.sug;
      // Ihopdragen (sidbytet): före navigeringen dras linjerna in i märket och tonar bort, så att bara den stilla loggan står kvar
      // medan webbläsaren byter sida (den gamla sidan fryser en stund) – i CRM:et vecklas virveln ut ur märket igen.
      { const d = st.malIhop - st.ihop; st.ihop += Math.sign(d) * Math.min(Math.abs(d), dt / .55); }
      const e = st.ihop * st.ihop * (3 - 2 * st.ihop);
      const in0 = Math.min(1, t / 1.6), fram = 1 - Math.pow(1 - in0, 3);
      const cx = st.mx || b / 2, cy = st.my || h / 2;
      const R = Math.hypot(b, h) * .6 * (1.25 - .25 * fram) * (1 - .9 * sug * sug * (3 - 2 * sug)) * (1 - .9 * e);
      const luta = .48;
      // Farten ökar steg för steg när virveln sugs in: den extra vinkeln läggs på bild för bild (dt × fart). Förut multiplicerades
      // hela tiden med farten – då hoppade vinkeln flera varv per bild i slutet (hacket användaren såg).
      const fart = 1 + sug * sug * 5;
      st.extra += dt * (fart - 1); st.pextra += dt * sug * 3;
      const tv = t + st.extra, tp = t + st.pextra;
      const hal = 54 * k * (1 - sug); // hålet runt märket
      g.clearRect(0, 0, b, h);
      g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
      // linjerna tonar in från ytterkanten, är ljusast på mitten av vägen och slocknar mjukt mot märket
      const ton = (stopp) => { const gr = g.createRadialGradient(cx, cy, hal * .6, cx, cy, R * 1.02); for (const [q, c] of stopp) gr.addColorStop(q, c); return gr; };
      const tonMint = ton([[0, 'rgba(126,224,195,0)'], [.05, 'rgba(210,245,235,.9)'], [.25, 'rgba(126,224,195,.85)'], [.6, 'rgba(111,182,255,.45)'], [1, 'rgba(111,182,255,0)']]);
      const tonIs = ton([[0, 'rgba(167,210,255,0)'], [.05, 'rgba(235,245,255,.9)'], [.3, 'rgba(167,210,255,.85)'], [.65, 'rgba(126,224,195,.35)'], [1, 'rgba(126,224,195,0)']]);
      const punkt = (ut, bas, s, j) => {
        const r = R * Math.pow(1 - s, 1.6) + hal;
        // inre delar snurrar fortare (differentiell rotation) + en mjuk böljning längs linjen
        const vinkel = bas + s * 3.1 + tv * (.16 + s * s * .95) + Math.sin(s * 6 + t * .6 + j * .7) * .06;
        const z = Math.sin(vinkel);
        ut[0] = cx + Math.cos(vinkel) * r; ut[1] = cy + z * r * luta + Math.sin(s * 8 + j * .5 + t * .5) * 1.6 * k; ut[2] = z;
        return ut;
      };
      const synlig = fram * (1 - sug * .5) * (1 - e);
      for (let j = 0; j < TRADAR; j++) {
        const bas = j / TRADAR * Math.PI * 2; let djup = 0;
        for (let i = 0; i <= PUNKTER; i++) djup += punkt(p[i], bas, i / PUNKTER, j)[2];
        djup = .5 + .5 * (djup / p.length);
        g.beginPath(); g.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length - 1; i++) g.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
        g.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
        g.strokeStyle = j % 2 ? tonIs : tonMint;
        g.globalAlpha = (.04 + .07 * djup) * synlig; g.lineWidth = (5 + 5 * djup) * k; g.stroke(); // glöden
        g.globalAlpha = (.18 + .5 * djup) * synlig; g.lineWidth = (.5 + .8 * djup) * k; g.stroke(); // tråden
      }
      // ljuspartiklar som glider längs virveln in mot märket
      const q = [0, 0, 0];
      for (const pa of PARTIKLAR) {
        const s = (pa.f + tp * pa.v) % 1;
        const [x, y, z] = punkt(q, pa.a, s, pa.j);
        const a = Math.sin(s * Math.PI) * (.35 + .65 * (.5 + .5 * z)) * fram * (1 - sug) * (1 - e);
        if (a < .02) continue;
        const rr = (pa.r + 1.2 * (.5 + .5 * z)) * k;
        g.globalAlpha = a; g.drawImage(prick, x - rr * 3, y - rr * 3, rr * 6, rr * 6);
      }
      // ljuset i mitten – andas och sväller när CRM:et är klart
      const kr = (150 + 30 * Math.sin(t * 1.1) * (1 - e)) * k * (1 + sug * 3) * (1 - .25 * e);
      const sk = g.createRadialGradient(cx, cy, 0, cx, cy, kr);
      sk.addColorStop(0, 'rgba(200, 230, 255, .5)'); sk.addColorStop(.3, 'rgba(126, 224, 195, .16)'); sk.addColorStop(1, 'rgba(126, 224, 195, 0)');
      g.globalAlpha = fram; g.fillStyle = sk; g.fillRect(cx - kr, cy - kr, kr * 2, kr * 2);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      return sug < 1; // false = klart, sluta rita
    }
    return { st, storlek, rita };
  }

  // Som Worker: meddelanden från laddning.js
  if (typeof document === 'undefined' && typeof self !== 'undefined' && typeof self.postMessage === 'function') {
    let v = null, raf = 0;
    const nasta = (fn) => (self.requestAnimationFrame ? self.requestAnimationFrame(fn) : setTimeout(() => fn(performance.now()), 16));
    const stopp = () => { if (raf) (self.cancelAnimationFrame || clearTimeout)(raf); raf = 0; };
    const loop = (nu) => { raf = 0; if (v && v.rita(nu)) raf = nasta(loop); };
    self.onmessage = (e) => {
      const m = e.data || {};
      if (m.typ === 'start') { v = skapaVirvel(m.duk); v.st.start = m.start; v.st.ihop = v.st.malIhop = m.ihop || 0; v.storlek(m.matt); stopp(); raf = nasta(loop); }
      else if (!v) return;
      else if (m.typ === 'storlek') v.storlek(m.matt);
      else if (m.typ === 'ihop') { v.st.malIhop = m.mal; if (!raf) raf = nasta(loop); }
      else if (m.typ === 'ut') { v.st.ut = true; if (!raf) raf = nasta(loop); }
      else if (m.typ === 'paus') stopp();
      else if (m.typ === 'fortsatt') { v.st.forra = 0; if (!raf) raf = nasta(loop); }
      else if (m.typ === 'stopp') { stopp(); v = null; self.close(); }
    };
  } else if (typeof window !== 'undefined') {
    window.UPVirvel = skapaVirvel;
  }
})();
