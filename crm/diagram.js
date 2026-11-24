/* Diagrammen i CRM:et – gemensam grund (window.UPDiagram, stil i diagram.css).
   Regler: _underlag/… forskning-diagram.md – monoton kurva (aldrig en påhittad bula), unika gradient-id:n, ingen NaN,
   tomläge i stället för en tom ruta, linjen ritas fram EN gång med bara transform (ett glidande fönster, som intäktsgrafen),
   färgerna är tokens i CSS (stop-color: var(--d-linje …)) så att temabytet tar dem.
   Används av crm.js (sparkline, mjukLinje via UPCRM), ledning.js och sakerhet.js. Måste gå att läsa utan DOM. */
(function () {
  'use strict';
  let raknare = 0;
  const uid = (prefix = 'd') => `${prefix}-${(++raknare).toString(36)}`;
  const tal = (x) => (Math.round(x * 100) / 100).toString();
  const giltig = (q) => Array.isArray(q) && Number.isFinite(q[0]) && Number.isFinite(q[1]);

  // Monoton kubisk kurva (samma som d3 curveMonotoneX): går aldrig över eller under punkterna. Under tre punkter: raka linjer.
  // Punkter som inte är tal (null) ger ett avbrott i linjen – de ritas aldrig som 0.
  function monoton(pts) {
    const delar = []; let del = [];
    (pts || []).forEach((q) => { if (giltig(q)) del.push(q); else if (del.length) { delar.push(del); del = []; } });
    if (del.length) delar.push(del);
    return delar.map(kurva).join(' ');
  }
  function kurva(p) {
    const n = p.length;
    if (n === 1) return `M${tal(p[0][0])},${tal(p[0][1])}`;
    if (n === 2) return `M${tal(p[0][0])},${tal(p[0][1])} L${tal(p[1][0])},${tal(p[1][1])}`;
    const lut = new Array(n);
    const s = (i) => { const h = p[i + 1][0] - p[i][0]; return h ? (p[i + 1][1] - p[i][1]) / h : 0; };
    for (let i = 1; i < n - 1; i++) {
      const h0 = p[i][0] - p[i - 1][0], h1 = p[i + 1][0] - p[i][0]; const s0 = s(i - 1), s1 = s(i);
      const m = (h0 + h1) ? (s0 * h1 + s1 * h0) / (h0 + h1) : 0;
      lut[i] = (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(m)) || 0;
    }
    const kant = (i, j, t) => { const h = p[j][0] - p[i][0]; return h ? (3 * (p[j][1] - p[i][1]) / h - t) / 2 : t; };
    lut[0] = kant(0, 1, lut[1]); lut[n - 1] = kant(n - 2, n - 1, lut[n - 2]);
    let d = `M${tal(p[0][0])},${tal(p[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
      const dx = (p[i + 1][0] - p[i][0]) / 3;
      d += ` C${tal(p[i][0] + dx)},${tal(p[i][1] + dx * lut[i])} ${tal(p[i + 1][0] - dx)},${tal(p[i + 1][1] - dx * lut[i + 1])} ${tal(p[i + 1][0])},${tal(p[i + 1][1])}`;
    }
    return d;
  }

  // Skalan: med noll = 0 är botten noll (antal, belopp); annars 10 % luft under och över datan. Alla lika → mitten.
  function skala(varden, { noll = true } = {}) {
    const v = varden.filter(Number.isFinite);
    if (!v.length) return { lo: 0, hi: 1, tom: true };
    let lo = Math.min(...v), hi = Math.max(...v);
    if (noll) lo = Math.min(0, lo);
    const spann = hi - lo;
    if (!spann) return noll ? { lo: 0, hi: hi > 0 ? hi * 1.1 : 1, tom: hi <= 0 } : { lo: lo - 1, hi: hi + 1, tom: false };
    return { lo: noll ? lo : lo - spann * 0.1, hi: hi + spann * 0.1, tom: false };
  }

  // Liten kurva utan axlar (nyckeltal, kontokort, historik). Bredden är flytande (viewBox sträcks, linjen behåller sin tjocklek
  // med vector-effect), så slutpunkten är en HTML-prick ovanpå – en SVG-cirkel hade blivit en oval. Tom serie eller bara nollor:
  // en vilande streckad linje på baslinjen. etikett = skärmläsartext (slutsatsen), annars aria-hidden.
  function sparkline(varden, b = 120, h = 30, { etikett = '', noll = true, punkt = true } = {}) {
    const v = (varden || []).map((x) => (x == null ? null : +x)).map((x) => (Number.isFinite(x) ? x : null));
    const finns = v.filter((x) => x != null);
    const { lo, hi, tom } = skala(finns, { noll });
    const namn = etikett ? ` role="img" aria-label="${String(etikett).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}"` : ' aria-hidden="true"';
    const TOPP = 3, BOTTEN = 2.5; const y = (x) => h - BOTTEN - ((x - lo) / (hi - lo)) * (h - TOPP - BOTTEN);
    if (tom || !finns.length) {
      return `<span class="d-spark" data-tom${namn}><svg class="sparklinje" viewBox="0 0 ${b} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="spark-linje d-vilar" d="M0,${tal(h - BOTTEN)} L${b},${tal(h - BOTTEN)}"/></svg></span>`;
    }
    const serie = v.length === 1 ? [v[0], v[0]] : v;
    const steg = b / Math.max(1, serie.length - 1);
    const pts = serie.map((x, i) => (x == null ? null : [i * steg, y(x)]));
    const d = monoton(pts);
    const sista = pts.reduce((s, q) => q || s, null);
    const forsta = pts.find(Boolean);
    const id = uid('d-spark');
    const yta = finns.length > 1 ? `<path class="spark-yta" style="fill:url(#${id})" d="${d} L${tal(sista[0])},${h} L${tal(forsta[0])},${h} Z"/>` : '';
    const prick = punkt ? `<i class="d-spark-punkt" aria-hidden="true" style="--x:${(sista[0] / b).toFixed(4)};--y:${(sista[1] / h).toFixed(4)}"></i>` : '';
    return `<span class="d-spark"${namn}><span class="d-spark-ram"><svg class="sparklinje" viewBox="0 0 ${b} ${h}" preserveAspectRatio="none" aria-hidden="true">`
      + `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${h}"><stop class="d-stop-topp" offset="0"/><stop class="d-stop-botten" offset="1"/></linearGradient></defs>`
      + `${yta}<path class="spark-linje" d="${d}"/></svg></span>${prick}</span>`;
  }

  /* Ringar och mätare ------------------------------------------------------------------------------------------------
     En båge = en circle med pathLength="100" (ingen söm, ingen omkrets att räkna), börjar klockan 12 och går medurs, rund ände.
     Den ritas fram EN gång (stroke-dasharray 0 → p, diagram.css), .utan-intro spelar inte om den. Färgen är en ton (data-d-ton:
     mint, is, lila, gul, rod, rosa, cyan, lime, orange) som diagram.css gör till tokens per tema och yta – aldrig fasta färger.
     grad: gradient LÄNGS bågen (en SVG-gradient på en cirkel går tvärs över): bågen är en mask och under den ligger korta segment
     i tonens två nyanser (color-mix av tokens, så temabytet tar dem). Vid 100 % är ringen hel i slutfärgen (ingen söm klockan 12),
     vid 0 % (eller null) syns bara spåret – en rund ände på noll hade blivit en prick.
     Mått i användarenheter: cx, cy, r (bågens mitt), t (tjocklek). p = 0–100, kläms. */
  const tonNamn = (t) => (/^(mint|is|lila|gul|rod|rosa|cyan|lime|orange)$/.test(t) ? t : 'mint');
  function bage({ cx = 50, cy = 50, r = 44, t = 9, p = 0, ton = 'mint', grad = false, spar = true, klass = '', fordrojning = 0, attr = '' } = {}) {
    const v = Number.isFinite(+p) && p != null ? Math.max(0, Math.min(100, +p)) : null;
    const rot = `transform="rotate(-90 ${tal(cx)} ${tal(cy)})"`;
    const c = (k, extra = '') => `<circle class="${k}" cx="${tal(cx)}" cy="${tal(cy)}" r="${tal(r)}" ${extra}/>`;
    const sw = `stroke-width:${tal(t)}`; // som stil: wrapperklassernas gamla "X circle { stroke-width }" vinner annars över attributet
    const sparHtml = spar ? c('d-spar', `style="${sw}"`) : '';
    const f = ` style="${sw}${fordrojning ? `;--d-f:${fordrojning}s` : ''}"`;
    let b = '';
    if (v == null || v <= 0) b = '';
    else if (v >= 100) b = c('d-bage-linje d-bage-hel', `pathLength="100" ${rot}${f}`);
    else if (!grad) b = c('d-bage-linje', `pathLength="100" stroke-dasharray="${tal(v)} 100" ${rot}${f}`);
    else {
      const id = uid('d-ring');
      const lock = (t / 2) / (2 * Math.PI * r) * 100; // den runda ändens längd i pathLength-enheter
      const N = Math.max(6, Math.min(28, Math.round(v / 3.5)));
      let seg = '';
      for (let i = 0; i < N; i++) {
        const fran = (v * i) / N; const till = i === N - 1 ? v + lock + 0.5 : (v * (i + 1)) / N + 0.35;
        const k = Math.round((i / Math.max(1, N - 1)) * 100);
        seg += c('d-bage-seg', `pathLength="100" stroke-dasharray="${tal(till - fran)} 100" stroke-dashoffset="${tal(-fran)}" ${rot} style="stroke-width:${tal(t + 0.6)};stroke:color-mix(in oklab, var(--d-b) ${k}%, var(--d-a))"`);
      }
      // början (den runda änden före klockan 12) i startfärgen
      const start = `<circle class="d-bage-seg" cx="${tal(cx)}" cy="${tal(cy - r)}" r="${tal(t / 2 + 0.3)}" style="fill:var(--d-a);stroke:none"/>`;
      b = `<mask id="${id}" maskUnits="userSpaceOnUse" x="${tal(cx - r - t)}" y="${tal(cy - r - t)}" width="${tal(2 * (r + t))}" height="${tal(2 * (r + t))}">`
        + c('d-bage-mask', `pathLength="100" stroke-dasharray="${tal(v)} 100" ${rot}${f}`) + '</mask>'
        + `<g class="d-bage-grad" mask="url(#${id})">${start}${seg}</g>`;
    }
    return `<g class="d-bage${klass ? ' ' + klass : ''}" data-d-ton="${tonNamn(ton)}"${v == null ? ' data-tom' : ''}${attr ? ' ' + attr : ''}>${sparHtml}${b}</g>`;
  }
  /* Ringen som komponent: SVG:n (viewBox 100) + talet i HTML i mitten (skarpare än SVG-text; data-tal räknas upp av CRM:ets
     räkneverk i en ny vy, slutvärdet står i HTML:en). Storleken sätter klassen (klass), annars 64 px.
     Skärmläsare: role="progressbar" med värdet – eller dekor: true när talet redan står bredvid (glaskorten).
     mal = målmarkering (0–100, ett streck tvärs över spåret). yta: 'ljus' när ringen står på en ljus yta (kort, ark) i ljusa teman. */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function ring(p, { ton = 'mint', t = 9, grad, klass = '', yta = '', tal: tx, enhet = '', etikett = '', aria = '', dekor = false, mal, titel = '', attr = '', mitt = '' } = {}) {
    const v = p == null || !Number.isFinite(+p) ? null : Math.max(0, Math.min(100, +p));
    const r = 50 - t / 2 - 1;
    let malHtml = '';
    if (Number.isFinite(+mal) && mal > 0 && mal < 100) {
      const g = ((mal / 100) * 360 - 90) * Math.PI / 180; const a = r - t / 2 - 2.5, b = r + t / 2 + 2.5;
      malHtml = `<line class="d-ring-mal" x1="${tal(50 + Math.cos(g) * a)}" y1="${tal(50 + Math.sin(g) * a)}" x2="${tal(50 + Math.cos(g) * b)}" y2="${tal(50 + Math.sin(g) * b)}"/>`;
    }
    const avr = v == null ? null : Math.round(v);
    const namn = dekor ? ' aria-hidden="true"'
      : ` role="progressbar" aria-valuemin="0" aria-valuemax="100"${avr == null ? '' : ` aria-valuenow="${avr}"`} aria-valuetext="${esc(aria || (avr == null ? 'Inget värde än' : `${avr} procent${etikett ? ' ' + etikett : ''}`))}"`;
    const talHtml = mitt || (tx == null ? '' : `<span class="d-ring-mitt" aria-hidden="true"><b><span data-tal="${esc(tx)}">${esc(tx)}</span>${enhet ? `<small>${esc(enhet)}</small>` : ''}</b>${etikett ? `<em>${esc(etikett)}</em>` : ''}</span>`);
    return `<span class="d-ring${klass ? ' ' + klass : ''}"${yta ? ` data-yta="${esc(yta)}"` : ''} data-d-ton="${tonNamn(ton)}"${v == null || v <= 0 ? ' data-tom' : ''}${v >= 100 ? ' data-klar' : ''}${titel ? ` title="${esc(titel)}"` : ''}${attr ? ' ' + attr : ''}${namn}>`
      + `<svg class="d-ring-svg" viewBox="0 0 100 100" aria-hidden="true">${bage({ r, t, p: v, ton, grad: grad ?? false, spar: true })}${malHtml}</svg>${talHtml}</span>`;
  }

  window.UPDiagram = { uid, monoton, skala, sparkline, bage, ring };
}());
