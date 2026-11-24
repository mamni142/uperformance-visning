/* Uperformance – QR-kod utan externa tjänster (window.UPQR, 2026-11-03). Används för enkätens svarslänk (enkater.js).
   Standard-QR (ISO/IEC 18004) i byteläge med felrättning M, version 1–20 (räcker gott för en länk), alla åtta masker
   provas och den med lägst straffpoäng väljs. Bygger på samma steg som Nayukis öppna referensimplementation.
   UPQR.matris(text) → { storlek, moduler: boolean[][] } · UPQR.svg(text, { marginal = 4, titel }) → SVG-sträng (svart på vitt,
   oberoende av tema – en QR-kod måste ha hög kontrast och tyst zon för att gå att skanna). */
(() => {
  'use strict';
  // Felrättning M: kodord per block och antal block, per version (index 0 används inte)
  const ECC = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];
  const BLOCK = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
  const MAXV = 20;
  const bit = (x, i) => ((x >>> i) & 1) !== 0;
  function raData(v) {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  const dataKodord = (v) => Math.floor(raData(v) / 8) - ECC[v] * BLOCK[v];
  // Reed–Solomon över GF(2^8) med polynomet 0x11D
  function gfMul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 0xff; }
  function rsDelare(grad) {
    const r = new Array(grad).fill(0); r[grad - 1] = 1; let rot = 1;
    for (let i = 0; i < grad; i++) { for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], rot); if (j + 1 < r.length) r[j] ^= r[j + 1]; } rot = gfMul(rot, 0x02); }
    return r;
  }
  function rsRest(data, delare) {
    const r = delare.map(() => 0);
    for (const b of data) { const f = b ^ r.shift(); r.push(0); delare.forEach((c, i) => { r[i] ^= gfMul(c, f); }); }
    return r;
  }
  function utf8(text) { return Array.from(new TextEncoder().encode(String(text))); }

  function matris(text) {
    const bytes = utf8(text);
    let v = 1;
    for (; v <= MAXV; v++) { const lang = v < 10 ? 8 : 16; if (4 + lang + bytes.length * 8 <= dataKodord(v) * 8) break; }
    if (v > MAXV) throw new Error('För lång text för en QR-kod');
    // Bitarna: läge (0100 = byte), längd, data, slut, utfyllnad
    const bitar = [];
    const lagg = (x, n) => { for (let i = n - 1; i >= 0; i--) bitar.push((x >>> i) & 1); };
    lagg(4, 4); lagg(bytes.length, v < 10 ? 8 : 16); bytes.forEach((b) => lagg(b, 8));
    const kap = dataKodord(v) * 8;
    lagg(0, Math.min(4, kap - bitar.length)); lagg(0, (8 - (bitar.length % 8)) % 8);
    for (let p = 0xec; bitar.length < kap; p ^= 0xec ^ 0x11) lagg(p, 8);
    const data = []; for (let i = 0; i < bitar.length; i += 8) data.push(bitar.slice(i, i + 8).reduce((s, b) => (s << 1) | b, 0));
    // Block med felrättning, sedan sammanflätade
    const nBlock = BLOCK[v]; const eccLen = ECC[v]; const ra = Math.floor(raData(v) / 8);
    const korta = nBlock - (ra % nBlock); const kortLen = Math.floor(ra / nBlock);
    const block = []; const del = rsDelare(eccLen);
    for (let i = 0, k = 0; i < nBlock; i++) {
      const d = data.slice(k, k + kortLen - eccLen + (i < korta ? 0 : 1)); k += d.length;
      const ecc = rsRest(d, del); if (i < korta) d.push(0); block.push(d.concat(ecc));
    }
    const kod = [];
    for (let i = 0; i < block[0].length; i++) block.forEach((b, j) => { if (i !== kortLen - eccLen || j >= korta) kod.push(b[i]); });

    const n = v * 4 + 17;
    const mod = Array.from({ length: n }, () => new Array(n).fill(false));
    const fun = Array.from({ length: n }, () => new Array(n).fill(false));
    const satt = (x, y, svart) => { mod[y][x] = svart; fun[y][x] = true; };
    for (let i = 0; i < n; i++) { satt(6, i, i % 2 === 0); satt(i, 6, i % 2 === 0); }
    const sokare = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const xx = x + dx; const yy = y + dy; if (xx >= 0 && xx < n && yy >= 0 && yy < n) { const d = Math.max(Math.abs(dx), Math.abs(dy)); satt(xx, yy, d !== 2 && d !== 4); } } };
    sokare(3, 3); sokare(n - 4, 3); sokare(3, n - 4);
    if (v > 1) {
      const na = Math.floor(v / 7) + 2; const steg = Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2;
      const pos = [6]; for (let p = n - 7; pos.length < na; p -= steg) pos.splice(1, 0, p);
      pos.forEach((y, i) => pos.forEach((x, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) satt(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }));
    }
    const format = (mask) => {
      const d = (0 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412;
      for (let i = 0; i <= 5; i++) satt(8, i, bit(b, i));
      satt(8, 7, bit(b, 6)); satt(8, 8, bit(b, 7)); satt(7, 8, bit(b, 8));
      for (let i = 9; i < 15; i++) satt(14 - i, 8, bit(b, i));
      for (let i = 0; i < 8; i++) satt(n - 1 - i, 8, bit(b, i));
      for (let i = 8; i < 15; i++) satt(8, n - 15 + i, bit(b, i));
      satt(8, n - 8, true);
    };
    format(0);
    if (v >= 7) {
      let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const b = (v << 12) | r;
      for (let i = 0; i < 18; i++) { const x = n - 11 + (i % 3); const y = Math.floor(i / 3); satt(x, y, bit(b, i)); satt(y, x, bit(b, i)); }
    }
    // Kodorden i sicksack nerifrån och upp, två kolumner i taget
    let i = 0;
    for (let hoger = n - 1; hoger >= 1; hoger -= 2) {
      if (hoger === 6) hoger = 5;
      for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
        const x = hoger - j; const upp = ((hoger + 1) & 2) === 0; const y = upp ? n - 1 - vert : vert;
        if (!fun[y][x] && i < kod.length * 8) { mod[y][x] = bit(kod[i >>> 3], 7 - (i & 7)); i++; }
      }
    }
    const MASK = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
    const maskera = (m) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fun[y][x] && MASK[m](x, y)) mod[y][x] = !mod[y][x]; };
    const straff = () => {
      let p = 0; const rader = [];
      for (let y = 0; y < n; y++) { rader.push(mod[y].map((b) => (b ? 1 : 0)).join('')); }
      for (let x = 0; x < n; x++) { let s = ''; for (let y = 0; y < n; y++) s += mod[y][x] ? 1 : 0; rader.push(s); }
      rader.forEach((s) => {
        (s.match(/0{5,}|1{5,}/g) || []).forEach((l) => { p += 3 + l.length - 5; });
        p += ((s.match(/(?=10111010000|00001011101)/g) || []).length) * 40;
      });
      for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3; }
      let morka = 0; mod.forEach((r) => r.forEach((b) => { if (b) morka++; }));
      p += Math.floor(Math.abs(morka * 20 - n * n * 10) / (n * n)) * 10;
      return p;
    };
    let bast = 0; let minst = Infinity;
    for (let m = 0; m < 8; m++) { maskera(m); format(m); const s = straff(); if (s < minst) { minst = s; bast = m; } maskera(m); }
    maskera(bast); format(bast);
    return { storlek: n, version: v, mask: bast, moduler: mod };
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function svg(text, { marginal = 4, titel = 'QR-kod' } = {}) {
    const q = matris(text); const s = q.storlek + marginal * 2; let d = '';
    q.moduler.forEach((rad, y) => rad.forEach((b, x) => { if (b) d += `M${x + marginal} ${y + marginal}h1v1h-1z`; }));
    return `<svg class="qr-svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges" role="img" aria-label="${esc(titel)}" xmlns="http://www.w3.org/2000/svg"><rect width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  window.UPQR = Object.freeze({ matris, svg });
})();
