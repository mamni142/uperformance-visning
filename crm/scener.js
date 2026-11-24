/* Uperformance CRM – laddar 3D-scenerna (three.js) först när deras vy visas. ES-modul (index.html: <script type="module">).

   ─── KONTRAKT för scen-mote.js, scen-klubb.js och scen-oversikt.js ─────────────────────────────────────────
   Varje fil är en ES-modul som exporterar
       export function montera(nod) → { avmontera() }
   och bygger sin scen med ./scen3d.js (skapaScen / varaktig – se kontraktet överst där).

   Vy            hash            nod som skickas                                    vad scenen gör
   översikten    #/  (eller tom)  #vy (main.vy)                                       lägger in en egen hjältesektion FÖRST i #vy
   Klubbmotorn   #/klubbmotorn   #vy (main.vy)                                       lägger in en egen hjältesektion FÖRST i #vy
   Kundmöte      #/mote          [data-ms-rum] i mötesscenen (motescen.js)           lägger canvasen i rummet och sätter data-ms-3d-klar
                                                                                      på mötesscenen när första WebGL-bilden finns
   Säljtavlan    #/salj          [data-salj-scen] i säljtavlans hjälte (crm.js)      lägger canvasen i noden och placerar stegens
                                                                                      etiketter ([data-ss-etiketter]) vid ringarna

   Regler
   - montera(nod) anropas när vyn visas OCH varje gång crm.js/motescen.js ritat om vyn (ny DOM). Scenen ska då flytta
     sin canvas (s.flytta / varaktig().montera) – aldrig skapa en ny WebGL-kontext. Ingen avmontera() mellan omritningar.
   - avmontera() anropas en gång när användaren lämnar vyn (det senaste handtaget). Anropa då s.vila() / motor.vila():
     canvasen lossas, slingan stannar och allt städas efter en stund om vyn inte öppnas igen.
   - Hjältesektionen (översikt/Klubbmotorn) sätts in synkront i montera() som #vy:s första barn och har attributet
     data-scen3d="oversikt" | "klubb". Finns den redan (vy.querySelector(':scope > [data-scen3d="…"]')) återanvänds den.
     scener.js monterar igen först när det elementet försvunnit (vyn ritad om).
   - Mötet: rummet byts ut vid varje omritning; scener.js monterar igen när det gamla rummet är borta.
   - Saknas WebGL: gör ingenting (lägg inte in någon tom sektion). Ta aldrig bort befintligt innehåll i CRM:et.
   - Fel i en scen får inte stoppa CRM:et: scener.js fångar fel från import/montera/avmontera och skriver dem i konsolen.
   - Utan WebGL2 laddas ingenting (kontrolleras före import()). Tappar en scen sin WebGL-kontext utan att få tillbaka
     den städar scen3d.js den och skickar 'scen3d-tappad' – då monteras vyn igen (högst två gånger per sidvisning).
   - Egen CSS laddas med laddaCss('scen-xxx.css') från scen3d.js (CSP: bara egen origin, inga inline-skript).
   - Data: window.UPCRM (db, kund(id), affar(id), kr(), affarVarde(a), e(), ik() …). Läs bara – ändra inget.
   - Temat: färger och ljus ur s.tema och s.vidTema (scen3d.js, TEMAT) – ett temabyte monterar aldrig om scenen. Duken har
     inga egna kanter: scenens stilmall maskar den mjukt in i hjälten i alla teman (ingen ruta/clip-path).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/* Versioner för webbläsarens cache (som ?v= i HTML-filerna): höj siffran när en scenfil ändras, annars kan
   webbläsaren visa den gamla scenen. scen3d.js importeras med SAMMA ?v= i alla tre scenerna (en motor, en WebGL-kontext)
   – höj den på alla tre ställena samtidigt. Höj också scener.js?v= i index.html när den här filen ändras. */
const VERSION = { mote: 20, klubb: 32, oversikt: 49, salj: 45 };

const vyMedInnehall = () => {
  const vy = document.getElementById('vy');
  return vy && vy.firstElementChild ? vy : null;
};

const VYER = [
  { namn: 'mote', fil: `./scen-mote.js?v=${VERSION.mote}`, hash: (h) => h === '#/mote', nod: () => document.querySelector('#vy [data-motescen] [data-ms-rum]') },
  { namn: 'klubb', fil: `./scen-klubb.js?v=${VERSION.klubb}`, hash: (h) => h === '#/klubbmotorn', nod: vyMedInnehall },
  // adminkontot har kontrollcentralen (sakerhet.js) i stället för arenan
  { namn: 'oversikt', fil: `./scen-oversikt.js?v=${VERSION.oversikt}`, hash: (h) => /^#?\/?$/.test(h) && !document.documentElement.hasAttribute('data-bara-admin'), nod: vyMedInnehall },
  // egenNod: noden själv är vakten (som mötets rum) – ny nod efter omritning → montera igen (canvasen flyttas, samma kontext)
  { namn: 'salj', fil: `./scen-salj.js?v=${VERSION.salj}`, hash: (h) => h === '#/salj', nod: () => document.querySelector('#vy [data-salj-scen]'), egenNod: true },
];

// Billig kontroll innan något laddas: utan WebGL2 hämtas varken three.js eller scenerna (≈ 330 kB)
let webgl2 = null;
function harWebGL2() {
  if (webgl2 !== null) return webgl2;
  // avstängt i adminpanelens inställningar (up-crm-3d = av): inga scener laddas
  try { if (localStorage.getItem('up-crm-3d') === 'av') return (webgl2 = false); } catch (err) { /* ingen lagring */ }
  try {
    if (typeof WebGL2RenderingContext === 'undefined') return (webgl2 = false);
    const gl = document.createElement('canvas').getContext('webgl2');
    webgl2 = !!gl;
    if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (err) { webgl2 = false; }
  return webgl2;
}

const moduler = new Map(); // namn → modul | 'laddar' | 'fel'
let aktiv = null;          // { namn, handtag, vakt } – vakt = noden som visar att monteringen fortfarande gäller
let planerad = false;
let vantarLaddning = false; // väntar på att laddningsvirveln (laddning.js) ska tona bort
let efterBild = false; // false | 'vantar' | 'malad' – en ny montering väntar på att vyn målats en gång (kontrollera)

function slapp() {
  const a = aktiv; aktiv = null;
  if (!a || !a.handtag || typeof a.handtag.avmontera !== 'function') return;
  try { a.handtag.avmontera(); } catch (err) { console.error(`[scener] avmontera (${a.namn}):`, err); }
}

// Förladdningsläget (html[data-3d], index.html): 3D-sidorna ritas i sin slutliga form direkt. Kan scenerna inte visas
// (ingen WebGL2, modulen laddas inte, eller ingen bild inom 10 s) tas flaggan bort och hjältarna står utan scen.
const utan3d = () => document.documentElement.removeAttribute('data-3d');
let vakt3d = 0;
function vaktaBild() {
  clearTimeout(vakt3d);
  vakt3d = setTimeout(() => {
    if (document.hidden || !VYER.some((v) => v.hash(location.hash))) return;
    if (!document.querySelector('#vy canvas.scen3d-duk[data-klar]')) utan3d();
  }, 10000);
}
function ladda(def) {
  moduler.set(def.namn, 'laddar');
  import(def.fil).then(
    (modul) => { moduler.set(def.namn, modul); if (harWebGL2()) document.documentElement.setAttribute('data-3d', ''); planera(); },
    (err) => { moduler.set(def.namn, 'fel'); utan3d(); console.error(`[scener] kunde inte ladda ${def.fil}:`, err); },
  );
}

function kontrollera() {
  planerad = false;
  const def = VYER.find((v) => v.hash(location.hash)) || null;
  if (aktiv && (!def || def.namn !== aktiv.namn)) slapp();
  if (!def) { if (efterBild === 'malad') efterBild = false; return; }
  const nod = def.nod();
  if (!nod) return;                                     // vyn är inte färdigritad än – nästa DOM-ändring kontrollerar igen
  if (!harWebGL2()) { utan3d(); return; }              // ingen WebGL2: hjältarna står utan scen, inget laddas
  if (aktiv && aktiv.vakt && aktiv.vakt.isConnected) return; // redan monterad på nuvarande DOM
  const modul = moduler.get(def.namn);
  if (!modul) { ladda(def); return; }
  if (typeof modul !== 'object') return;                // laddar eller fel
  if (modul.STUBB === true) return;                     // testkuben från motorbygget visas aldrig
  // En ny montering (annan vy, första besöket) väntar tills vyn har målats en gång: förut monterades scenen i samma uppgift
  // som vybytet och första bilden kom 50–100 ms senare (fynd-2-prestanda 3, #/). Omritning i samma vy flyttar duken direkt.
  // Virveln från inloggningen (laddning.js) visas: vänta med 3D tills den har tonat bort. Grafikkortets kompilering av scenens
  // shaders stoppar annars allt bildflöde (även virvelns egen tråd) i upp till en sekund i taget – hacket mot slutet av laddningen.
  if (!aktiv && document.documentElement.hasAttribute('data-laddar')) {
    if (!vantarLaddning) { vantarLaddning = true; addEventListener('up:laddning-klar', () => { vantarLaddning = false; planera(); }, { once: true }); }
    return;
  }
  if (!aktiv && efterBild !== 'malad') {
    if (!efterBild) { efterBild = 'vantar'; requestAnimationFrame(() => setTimeout(() => { efterBild = 'malad'; planera(); }, 0)); }
    return;
  }
  efterBild = false;
  let handtag = null;
  try { handtag = typeof modul.montera === 'function' ? modul.montera(nod) || null : null; } catch (err) { console.error(`[scener] montera (${def.namn}):`, err); }
  aktiv = { namn: def.namn, handtag, vakt: def.namn === 'mote' || def.egenNod ? nod : nod.firstElementChild };
  vaktaBild();
}

function planera() {
  if (planerad) return;
  planerad = true;
  queueMicrotask(kontrollera);
}

// Billig bevakning: varje DOM-ändring i vyn planerar en kontroll (högst en per mikrouppgift)
new MutationObserver(planera).observe(document.getElementById('vy') || document.body, { childList: true, subtree: true });
addEventListener('hashchange', () => {
  for (const [namn, varde] of moduler) if (varde === 'fel') moduler.delete(namn); // nytt försök efter nätverksfel
  planera();
});
addEventListener('pageshow', planera);
// En scen som tappat sin WebGL-kontext (och inte fått tillbaka den) har städats: montera vyn igen med en ny
// kontext – högst två gånger per sidvisning, sedan står hjälten utan scen.
let ombyggen = 0;
document.addEventListener('scen3d-tappad', (ev) => {
  const vard = ev.detail && ev.detail.vard;
  if (ombyggen >= 2 || !aktiv || !vard || !vard.isConnected) return; // bara den scen som visas just nu
  if (aktiv.vakt && aktiv.vakt !== vard && !aktiv.vakt.contains(vard) && !vard.contains(aktiv.vakt)) return;
  ombyggen++;
  aktiv = null; // det gamla handtaget hör till den städade scenen
  setTimeout(planera, 300);
});
planera();
