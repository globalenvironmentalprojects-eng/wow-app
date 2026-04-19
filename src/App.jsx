
import { db } from './firebase.js';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp
} from "firebase/firestore";

import { useState, useEffect, useRef } from "react";

// ─── SURVEY STEP TYPES ───────────────────────────────────────────────────────
// Añadir una pregunta nueva = añadir un objeto al array `steps` de la cata.
//
// Tipos disponibles:
//   { type: "stars",   key, question }
//   { type: "options", key, question, options: ["A","B","C"], correctKey? }
//   { type: "scale",   key, question, min, max, labels?: {min,max} }
//   { type: "text",    key, question, placeholder?, optional? }
//   { type: "multi",   key, question, options: ["A","B","C"] }   ← varias respuestas
//
// correctKey: si existe, se compara la respuesta con wine[correctKey] al guardar.

// ─── DEFAULT STEPS (base para todas las catas) ────────────────────────────────
const DEFAULT_STEPS = [
  {
    type: "stars",
    key: "stars",
    question: "¿Cómo lo valoras?",
    sub: "Puntúa del 1 al 5 según tu experiencia.",
  },
  {
    type: "options",
    key: "denomination",
    question: "¿Cuál es la denominación?",
    sub: "Elige la que crees correcta.",
    optionsKey: "optionsDenomination", // se lee del objeto wine
    correctKey: "denomination",
  },
  {
    type: "options",
    key: "wineName",
    question: "¿Cuál es el vino?",
    sub: "¿Reconoces alguno en tu copa?",
    optionsKey: "optionsName",
    correctKey: "name",
  },
];

// ─── MOCK DATABASE ────────────────────────────────────────────────────────────
const DB = {
  wines: [
    { id:"w1",  name:"Marqués de Riscal Reserva",  winery:"Marqués de Riscal",     denomination:"Rioja",           vintage:2019, grape:"Tempranillo", optionsDenomination:["Rioja","Ribera del Duero","Priorat"],        optionsName:["Marqués de Riscal Reserva","Campo Viejo Reserva","Viña Ardanza"],    optionsGrape:["Tempranillo","Garnacha","Monastrell"] },
    { id:"w2",  name:"Pesquera Crianza",            winery:"Alejandro Fernández",   denomination:"Ribera del Duero",vintage:2020, grape:"Tempranillo", optionsDenomination:["Rueda","Ribera del Duero","Toro"],           optionsName:["Pesquera Crianza","Condado de Haza","Protos Crianza"],               optionsGrape:["Tempranillo","Albariño","Verdejo"] },
    { id:"w3",  name:"Clos Mogador",                winery:"René Barbier",          denomination:"Priorat",         vintage:2018, grape:"Garnacha",    optionsDenomination:["Priorat","Montsant","Penedès"],              optionsName:["Clos Mogador","Clos Erasmus","Vall Llach"],                          optionsGrape:["Garnacha","Cariñena","Syrah"] },
    { id:"w4",  name:"Vega Sicilia Único",          winery:"Vega Sicilia",          denomination:"Ribera del Duero",vintage:2017, grape:"Tempranillo", optionsDenomination:["Ribera del Duero","Toro","Rueda"],           optionsName:["Vega Sicilia Único","Alión","Pingus"],                               optionsGrape:["Tempranillo","Cabernet Sauvignon","Merlot"] },
    { id:"w5",  name:"Albariño Pazo de Señorans",   winery:"Pazo de Señorans",      denomination:"Rías Baixas",     vintage:2022, grape:"Albariño",    optionsDenomination:["Rías Baixas","Rueda","Penedès"],             optionsName:["Pazo de Señorans","Martín Códax","Fillaboa"],                        optionsGrape:["Albariño","Verdejo","Godello"] },
    { id:"w6",  name:"Gramona III Lustros",         winery:"Gramona",               denomination:"Cava",            vintage:2016, grape:"Xarel·lo",    optionsDenomination:["Cava","Penedès","Champagne"],                optionsName:["Gramona III Lustros","Recaredo Terrers","Juvé y Camps"],             optionsGrape:["Xarel·lo","Macabeo","Chardonnay"] },
    { id:"w7",  name:"Numanthia Termes",            winery:"Numanthia",             denomination:"Toro",            vintage:2020, grape:"Tinta de Toro",optionsDenomination:["Toro","Ribera del Duero","Arribes"],        optionsName:["Numanthia Termes","Pintia","San Román"],                             optionsGrape:["Tinta de Toro","Tempranillo","Garnacha"] },
    { id:"w8",  name:"Muga Reserva",                winery:"Bodegas Muga",          denomination:"Rioja",           vintage:2019, grape:"Tempranillo", optionsDenomination:["Rioja","Navarra","Ribera del Duero"],        optionsName:["Muga Reserva","Prado Enea","Torre Muga"],                            optionsGrape:["Tempranillo","Garnacha","Mazuelo"] },
    { id:"w9",  name:"Descendientes J. Palacios",   winery:"Descendientes Palacios",denomination:"Bierzo",          vintage:2021, grape:"Mencía",      optionsDenomination:["Bierzo","Ribeira Sacra","Valdeorras"],       optionsName:["Descendientes J. Palacios","Paixar","Pittacum"],                     optionsGrape:["Mencía","Garnacha","Tempranillo"] },
    { id:"w10", name:"El Nido",                     winery:"Bodegas El Nido",       denomination:"Jumilla",         vintage:2020, grape:"Monastrell",  optionsDenomination:["Jumilla","Yecla","Alicante"],                optionsName:["El Nido","Clio","Casa Castillo"],                                    optionsGrape:["Monastrell","Cabernet Sauvignon","Syrah"] },
  ],
  qr_codes: [
    { id: "qr1",  code: "abc123", label: "QR Vino 1" },
    { id: "qr2",  code: "def456", label: "QR Vino 2" },
    { id: "qr3",  code: "ghi789", label: "QR Vino 3" },
    { id: "qr4",  code: "jkl012", label: "QR Vino 4" },
    { id: "qr5",  code: "mno345", label: "QR Vino 5" },
    { id: "qr6",  code: "pqr678", label: "QR Vino 6" },
    { id: "qr7",  code: "stu901", label: "QR Vino 7" },
    { id: "qr8",  code: "vwx234", label: "QR Vino 8" },
    { id: "qr9",  code: "yza567", label: "QR Vino 9" },
    { id: "qr10", code: "bcd890", label: "QR Vino 10" },
  ],
  tastings: [
    {
      id: "t1", qrId: "qr1", wineId: "w1",
      event: "Cata Bar Velázquez", date: "2024-03-22", active: true,
      // Sin `steps` → usa DEFAULT_STEPS
    },
    {
      id: "t2", qrId: "qr2", wineId: "w2",
      event: "Cata Avanzada Abril", date: "2024-04-10", active: true,
      // Con `steps` propios → encuesta personalizada para esta cata
      steps: [
        ...DEFAULT_STEPS,
        {
          type: "options",
          key: "grape",
          question: "¿Qué uva predomina?",
          sub: "Adivina la variedad principal.",
          optionsKey: "optionsGrape",
          correctKey: "grape",
        },
        {
          type: "scale",
          key: "intensity",
          question: "Intensidad del color",
          sub: "Del 1 (muy claro) al 5 (muy intenso).",
          min: 1, max: 5,
          labels: { min: "Muy claro", max: "Muy intenso" },
        },
        {
          type: "text",
          key: "notes",
          question: "¿Alguna nota adicional?",
          sub: "Aromas, sabores, impresiones… lo que quieras.",
          placeholder: "Describe lo que percibes...",
          optional: true,
        },
      ],
    },
    {
      id: "t3", qrId: "qr1", wineId: "w2",
      event: "Cata Marzo Anterior", date: "2024-03-15", active: false,
    },
  ],
  users: [
    { id: "u1", email: "carlos@email.com", name: "Carlos M.", hasPassword: true },
    { id: "u2", email: "ana@email.com", name: "Ana G.", hasPassword: false },
  ],
  denominations: [
    "Rioja", "Ribera del Duero", "Priorat", "Rueda", "Rías Baixas",
    "Penedès", "Jumilla", "Toro", "Montsant", "Bierzo",
    "Jerez", "Cava", "Cariñena", "Navarra", "Somontano",
  ],
  ratings: [
    { id: "r1", tastingId: "t1", userId: "u1", answers: { stars: 4, denomination: "Rioja", wineName: "Marqués de Riscal Reserva" }, date: "2024-03-22" },
    { id: "r2", tastingId: "t2", userId: "u1", answers: { stars: 3, denomination: "Rueda", wineName: "Condado de Haza", grape: "Albariño", intensity: 2 }, date: "2024-04-10" },
    { id: "r3", tastingId: "t3", userId: "u1", answers: { stars: 5, denomination: "Ribera del Duero", wineName: "Pesquera Crianza" }, date: "2024-03-15" },
    { id: "r4", tastingId: "t1", userId: "u2", answers: { stars: 5, denomination: "Rioja", wineName: "Campo Viejo Reserva" }, date: "2024-03-22" },
  ],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// Calcula cuántas respuestas fueron correctas para un rating
function calcCorrect(answers, steps, wine) {
  let correct = 0, total = 0;
  steps.forEach(s => {
    if (!s.correctKey) return;
    total++;
    if (answers[s.key] === wine[s.correctKey]) correct++;
  });
  return { correct, total, pct: total ? Math.round((correct / total) * 100) : 0 };
}

async function getActiveTasting(qrCode) {
  const qrSnap = await getDocs(
    query(collection(db, "qr_codes"), where("code", "==", qrCode))
  );
  if (qrSnap.empty) return null;
  const qr = { id: qrSnap.docs[0].id, ...qrSnap.docs[0].data() };

  const tSnap = await getDocs(
    query(collection(db, "tastings"),
      where("qrId", "==", qr.id),
      where("active", "==", true))
  );
  if (tSnap.empty) return null;
  const tasting = { id: tSnap.docs[0].id, ...tSnap.docs[0].data() };

  const wineDoc = await getDocs(collection(db, "wines"));
  const wineData = wineDoc.docs.find(d => d.id === tasting.wineId);
  if (!wineData) return null;
  const wine = { id: wineData.id, ...wineData.data() };

  return { tasting, wine, qr, steps: tasting.steps || DEFAULT_STEPS };
}

function getUserRatings(userId) {
  return DB.ratings.filter(r => r.userId === userId).map(r => {
    const tasting = DB.tastings.find(t => t.id === r.tastingId);
    const wine = DB.wines.find(w => w.id === tasting?.wineId);
    const steps = tasting?.steps || DEFAULT_STEPS;
    const { correct, total } = calcCorrect(r.answers || {}, steps, wine || {});
    return { ...r, tasting, wine, steps, correct, total };
  });
}

// ─── LIQUID ANIMATION VISUAL ──────────────────────────────────────────────────
function LiquidVisual() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    let raf;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const blobs = Array.from({ length: 5 }, (_, i) => ({
      x: W * (0.2 + i * 0.15),
      y: H * 0.5,
      r: 60 + i * 18,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.4,
      phase: i * 1.2,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      frame += 0.012;

      blobs.forEach(b => {
        b.x += b.vx + Math.sin(frame + b.phase) * 0.5;
        b.y += b.vy + Math.cos(frame * 0.7 + b.phase) * 0.4;
        if (b.x < -b.r) b.x = W + b.r;
        if (b.x > W + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = H + b.r;
        if (b.y > H + b.r) b.y = -b.r;
      });

      // Draw metaball-like blobs with additive blend
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      blobs.forEach((b, i) => {
        const colors = [
          ["rgba(0,255,120,", "rgba(0,200,80,"],
          ["rgba(0,220,255,", "rgba(0,150,220,"],
          ["rgba(180,255,0,", "rgba(120,200,0,"],
          ["rgba(0,255,180,", "rgba(0,180,120,"],
          ["rgba(100,255,200,", "rgba(0,200,150,"],
        ];
        const [c1, c2] = colors[i % colors.length];
        const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grd.addColorStop(0, c1 + "0.35)");
        grd.addColorStop(0.5, c2 + "0.12)");
        grd.addColorStop(1, c1 + "0)");
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      });
      ctx.restore();

      // Scanline grid overlay
      ctx.save();
      ctx.strokeStyle = "rgba(0,255,120,0.04)";
      ctx.lineWidth = 1;
      for (let y = 0; y < H; y += 12) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();

      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", borderRadius: "inherit" }}
    />
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,700&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #060608;
    --surface: #0d0d12;
    --surface2: #13131a;
    --surface3: #1a1a24;
    --border: rgba(255,255,255,0.06);
    --border-hi: rgba(0,255,120,0.25);
    --neon: #00ff78;
    --neon2: #00e86a;
    --neon-dim: rgba(0,255,120,0.08);
    --cyan: #00dcff;
    --text: #f0f0f5;
    --text-muted: #c8c8d8;
    --text-dim: #888898;
    --radius: 16px;
    --radius-sm: 10px;
    --radius-xs: 7px;
  }

  html, body { height: 100%; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Fraunces', serif;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  body::after {
    content: '';
    position: fixed; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,255,120,0.04) 0%, transparent 60%);
    pointer-events: none; z-index: 0;
  }

  .app { position: relative; z-index: 1; min-height: 100vh; }

  /* ── Keyframes ── */
  @keyframes up { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes glitch {
    0%,95%,100% { clip-path: none; transform: none; }
    96% { clip-path: inset(20% 0 60% 0); transform: translate(-3px, 2px); }
    97% { clip-path: inset(50% 0 30% 0); transform: translate(3px, -2px); }
    98% { clip-path: inset(70% 0 10% 0); transform: translate(-2px, 1px); }
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes neon-pulse { 0%,100%{box-shadow:0 0 12px rgba(0,255,120,0.3)} 50%{box-shadow:0 0 28px rgba(0,255,120,0.6)} }

  .au { animation: up 0.4s cubic-bezier(0.4,0,0.2,1) both; }
  .d1 { animation-delay:0.05s; }
  .d2 { animation-delay:0.10s; }
  .d3 { animation-delay:0.15s; }
  .d4 { animation-delay:0.20s; }

  /* ── Survey shell ── */
  .survey-shell {
    min-height: 100vh; max-width: 430px;
    margin: 0 auto; padding: 0 22px 80px;
    display: flex; flex-direction: column;
  }

  .top-bar {
    padding: 28px 0 22px;
    display: flex; align-items: center; justify-content: space-between;
  }

  .wordmark {
    font-family: 'Fraunces', serif;
    font-size: 20px; font-weight: 800;
    letter-spacing: 6px;
    color: var(--neon);
    text-shadow: 0 0 20px rgba(0,255,120,0.5);
    animation: glitch 8s infinite;
  }

  .event-tag {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 1px;
    color: var(--text-muted);
    background: var(--surface2);
    border: 1px solid var(--border);
    padding: 5px 10px; border-radius: 99px;
  }

  .progress-track {
    height: 1px; background: var(--border);
    margin-bottom: 44px; position: relative;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--neon), var(--cyan));
    transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
    position: relative;
  }
  .progress-fill::after {
    content:''; position:absolute; right:-1px; top:-3px;
    width:7px; height:7px; border-radius:50%;
    background: var(--neon); box-shadow: 0 0 10px var(--neon);
    animation: neon-pulse 2s ease-in-out infinite;
  }

  .step-body { display:flex; flex-direction:column; padding-bottom:8px; }

  .eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 2.5px;
    text-transform: uppercase; color: var(--neon);
    margin-bottom: 16px; font-weight: 400;
    display: flex; align-items: center; gap: 8px;
  }
  .eyebrow::before {
    content:''; display:block; width:20px; height:1px;
    background: var(--neon); box-shadow: 0 0 6px var(--neon);
  }

  .h1 {
    font-size: 36px; font-weight: 800;
    line-height: 1.1; margin-bottom: 12px;
    letter-spacing: -0.5px;
  }
  .h1 em { font-style:normal; color: var(--neon); }

  .sub {
    font-size: 14px; color: var(--text-muted);
    line-height: 1.65; margin-bottom: 36px;
    font-family: 'DM Mono', monospace; font-weight: 300;
  }

  /* ── Welcome visual ── */
  .hero-visual {
    margin: 0 0 32px;
    height: 220px;
    border-radius: var(--radius);
    border: 1px solid var(--border-hi);
    background: var(--surface);
    overflow: hidden; position: relative;
  }
  .hero-visual::after {
    content:'';
    position:absolute; inset:0;
    background: linear-gradient(180deg, transparent 50%, var(--surface) 100%);
    pointer-events:none;
  }
  .hero-label {
    position: absolute; bottom: 16px; left: 16px; z-index: 2;
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 2px;
    color: var(--neon); opacity: 0.7;
    display: flex; align-items: center; gap: 6px;
  }
  .cursor-blink { animation: blink 1s step-end infinite; color: var(--neon); }

  .live-chip {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--neon-dim); border: 1px solid var(--border-hi);
    border-radius: 99px; padding: 7px 14px;
    font-family: 'DM Mono', monospace;
    font-size: 11px; color: var(--neon);
    margin-bottom: 28px;
  }
  .live-dot {
    width:6px; height:6px; border-radius:50%;
    background: var(--neon); box-shadow: 0 0 8px var(--neon);
    animation: neon-pulse 1.5s ease-in-out infinite;
  }

  /* ── Stars ── */
  .stars-wrap { margin-bottom: 40px; }
  .stars-row { display:flex; gap:8px; margin-bottom:10px; }
  .star-btn {
    flex:1; aspect-ratio:1;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-sm); cursor: pointer;
    display:flex; align-items:center; justify-content:center;
    font-size:24px; transition: all 0.18s;
    color: var(--text-dim);
  }
  .star-btn.lit {
    background: var(--neon-dim); border-color: var(--neon);
    color: var(--neon); transform: scale(1.06);
    box-shadow: 0 0 16px rgba(0,255,120,0.2);
  }
  .star-lbl {
    font-family: 'DM Mono', monospace;
    font-size: 11px; color: var(--text-muted);
    text-align:center; min-height:16px;
    transition: opacity 0.2s;
  }

  /* ── Option cards ── */
  .opts { display:flex; flex-direction:column; gap:10px; margin-bottom:38px; }
  .opt {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 17px 20px;
    cursor:pointer; transition: all 0.18s;
    display:flex; align-items:center; justify-content:space-between;
    font-size: 15px; font-weight: 600; color: var(--text);
    position:relative; overflow:hidden;
  }
  .opt::before {
    content:''; position:absolute; left:0; top:0; bottom:0;
    width:2px; background: var(--neon);
    transform: scaleY(0); transition: transform 0.2s;
    box-shadow: 0 0 8px var(--neon);
  }
  .opt:hover { border-color: var(--border-hi); background: var(--surface2); }
  .opt.sel { border-color: var(--neon); background: var(--neon-dim); }
  .opt.sel::before { transform: scaleY(1); }
  .opt-check {
    width:20px; height:20px; border-radius:50%;
    border: 1px solid var(--border);
    display:flex; align-items:center; justify-content:center;
    font-size:10px; transition: all 0.2s; flex-shrink:0;
    font-family: 'DM Mono', monospace;
  }
  .opt.sel .opt-check { background: var(--neon); border-color:var(--neon); color:#000; font-weight:700; }

  /* ── Contact step ── */
  .ctabs {
    display:flex; gap:3px;
    background: var(--surface2); border:1px solid var(--border);
    border-radius: var(--radius-xs); padding:3px; margin-bottom:20px;
  }
  .ctab {
    flex:1; background:none; border:none;
    font-family:'Fraunces',serif; font-size:11px; font-weight:700;
    color:var(--text-muted); padding:8px 6px; border-radius:6px;
    cursor:pointer; transition:all 0.2s; letter-spacing:0.3px;
  }
  .ctab.on { background:var(--neon); color:#000; }

  .inp-label {
    font-family:'DM Mono',monospace; font-size:10px;
    letter-spacing:2px; text-transform:uppercase;
    color:var(--text-muted); margin-bottom:7px; display:block;
  }
  .inp {
    width:100%; background:var(--surface);
    border:1px solid var(--border); border-radius:var(--radius-xs);
    padding:14px 16px; color:var(--text);
    font-size:14px; font-family:'Fraunces',serif;
    outline:none; transition: border-color 0.2s, box-shadow 0.2s;
    margin-bottom:12px;
  }
  .inp:focus { border-color:var(--neon); box-shadow:0 0 0 3px rgba(0,255,120,0.08); }
  .inp::placeholder { color:var(--text-dim); }

  .note {
    font-family:'DM Mono',monospace; font-size:11px;
    color:var(--text-dim); line-height:1.6; margin-bottom:24px;
  }

  /* ── Button ── */
  .btn {
    width:100%; padding:16px; border:none;
    border-radius:var(--radius-sm);
    font-family:'Fraunces',serif; font-size:14px; font-weight:800;
    cursor:pointer; transition:all 0.2s;
    letter-spacing:1px; text-transform:uppercase;
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .btn-neon {
    background:var(--neon); color:#060608;
  }
  .btn-neon:hover { background: #1fff8a; transform:translateY(-1px); box-shadow:0 8px 28px rgba(0,255,120,0.35); }
  .btn-neon:active { transform:translateY(0); }
  .btn-neon:disabled { opacity:0.25; cursor:not-allowed; transform:none; box-shadow:none; }
  .btn-ghost {
    background:none; border:1px solid var(--border); color:var(--text-muted);
    margin-top:8px;
  }
  .btn-ghost:hover { border-color:var(--border-hi); color:var(--text); }

  /* ── Thank you ── */
  .ty-shell {
    min-height:100vh; max-width:430px; margin:0 auto;
    padding:60px 24px 80px;
    display:flex; flex-direction:column; align-items:center; text-align:center;
  }
  .ty-badge {
    width:88px; height:88px; border-radius:50%;
    background:var(--neon-dim); border:1px solid var(--border-hi);
    display:flex; align-items:center; justify-content:center;
    font-size:36px; margin-bottom:28px;
    box-shadow: 0 0 40px rgba(0,255,120,0.2);
    font-family:'Fraunces',serif; font-weight:800; color:var(--neon);
  }
  .ty-pills { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin:20px 0 32px; }
  .ty-pill {
    display:flex; align-items:center; gap:6px;
    background:var(--surface2); border:1px solid var(--border);
    border-radius:99px; padding:8px 14px;
    font-family:'DM Mono',monospace; font-size:11px; color:var(--text-muted);
  }
  .ty-pill .v { color:var(--text); font-weight:500; }
  .ty-pill .ok { color:var(--neon); }
  .ty-pill .bad { color:#ff4d6d; }
  .cta-box {
    width:100%; background:var(--surface); border:1px solid var(--border-hi);
    border-radius:var(--radius); padding:24px; text-align:left; margin-top:auto;
  }
  .cta-box-title { font-size:20px; font-weight:800; margin-bottom:6px; }
  .cta-box-sub { font-size:13px; color:var(--text-muted); margin-bottom:18px; line-height:1.5; font-family:'DM Mono',monospace; font-weight:300; }

  /* ── Profile ── */
  .profile-shell { max-width:480px; margin:0 auto; padding:0 20px 80px; }
  .profile-top {
    padding:32px 0 24px;
    display:flex; align-items:center; gap:16px;
    border-bottom:1px solid var(--border); margin-bottom:26px;
  }
  .avatar {
    width:52px; height:52px; border-radius:50%;
    background:var(--neon-dim); border:1px solid var(--border-hi);
    display:flex; align-items:center; justify-content:center;
    font-size:18px; font-weight:800; color:var(--neon); flex-shrink:0;
  }
  .p-name { font-size:22px; font-weight:800; line-height:1.1; }
  .p-email { font-family:'DM Mono',monospace; font-size:11px; color:var(--text-muted); margin-top:3px; }

  .p-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
  .pstat {
    background:var(--surface); border:1px solid var(--border);
    border-radius:var(--radius-sm); padding:18px 12px; text-align:center;
    position:relative; overflow:hidden;
  }
  .pstat::after { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,var(--neon),var(--cyan)); }
  .pstat-v { font-size:28px; font-weight:800; line-height:1; margin-bottom:4px; color:var(--neon); }
  .pstat-l { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:var(--text-muted); }

  .insight {
    background:var(--surface); border:1px solid var(--border);
    border-radius:var(--radius-sm); padding:18px 20px;
    margin-bottom:10px; display:flex; align-items:center; gap:14px;
  }
  .ins-icon {
    width:40px; height:40px; border-radius:10px;
    background:var(--neon-dim); display:flex; align-items:center; justify-content:center;
    font-size:18px; flex-shrink:0; border:1px solid var(--border-hi);
  }
  .ins-lbl { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--text-muted); margin-bottom:3px; }
  .ins-val { font-size:14px; font-weight:700; line-height:1.3; }

  .sh { font-size:18px; font-weight:800; margin-bottom:14px; margin-top:22px; }

  .r-row {
    background:var(--surface); border:1px solid var(--border);
    border-radius:var(--radius-sm); padding:15px 18px;
    margin-bottom:8px; display:flex; align-items:center; gap:12px;
    transition:border-color 0.18s; animation: up 0.4s ease both;
  }
  .r-row:hover { border-color:var(--border-hi); }
  .r-icon {
    width:36px; height:36px; border-radius:8px;
    background:var(--neon-dim); border:1px solid var(--border-hi);
    display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;
  }
  .r-name { font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .r-meta { font-family:'DM Mono',monospace; font-size:10px; color:var(--text-muted); margin-top:2px; }
  .r-right { text-align:right; flex-shrink:0; }
  .r-stars { color:var(--neon); font-size:11px; }
  .badge-xs {
    display:inline-block; font-family:'DM Mono',monospace;
    font-size:9px; font-weight:500; padding:3px 8px; border-radius:99px; margin-top:4px; letter-spacing:0.5px;
  }
  .bx-ok { background:rgba(0,255,120,0.1); color:var(--neon); }
  .bx-bad { background:rgba(255,77,109,0.1); color:#ff4d6d; }

  /* ── Admin ── */
  .admin-shell { max-width:960px; margin:0 auto; padding:0 20px 80px; }
  .admin-top {
    padding:26px 0 20px; display:flex; align-items:center; justify-content:space-between;
    border-bottom:1px solid var(--border); margin-bottom:26px; gap:10px; flex-wrap:wrap;
  }
  .anav { display:flex; gap:2px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-xs); padding:3px; }
  .anav-btn {
    background:none; border:none; font-family:'Fraunces',serif;
    font-size:11px; font-weight:700; color:var(--text-muted);
    padding:7px 13px; border-radius:5px; cursor:pointer; transition:all 0.18s;
    letter-spacing:0.5px;
  }
  .anav-btn.on { background:var(--neon); color:#060608; }

  .kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:24px; }
  .kpi {
    background:var(--surface); border:1px solid var(--border);
    border-radius:var(--radius-sm); padding:20px 18px; position:relative; overflow:hidden;
  }
  .kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,var(--neon),var(--cyan)); }
  .kpi-v { font-size:34px; font-weight:800; line-height:1; margin-bottom:4px; color:var(--neon); }
  .kpi-l { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:var(--text-muted); }

  .sec-title { font-size:18px; font-weight:800; margin-bottom:14px; letter-spacing:-0.3px; }

  .tbox { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; margin-bottom:24px; }
  table { width:100%; border-collapse:collapse; }
  th { padding:12px 16px; text-align:left; font-family:'DM Mono',monospace; font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--text-dim); border-bottom:1px solid var(--border); font-weight:500; }
  td { padding:13px 16px; font-size:13px; border-bottom:1px solid var(--border); }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:var(--surface2); }

  .tag { display:inline-flex; align-items:center; padding:3px 9px; border-radius:99px; font-family:'DM Mono',monospace; font-size:10px; font-weight:500; }
  .t-ok  { background:rgba(0,255,120,0.1); color:var(--neon); }
  .t-bad { background:rgba(255,77,109,0.1); color:#ff4d6d; }
  .t-active { background:rgba(0,255,120,0.1); color:var(--neon); }
  .t-inactive { background:var(--surface3); color:var(--text-muted); }

  .qr-row {
    background:var(--surface); border:1px solid var(--border);
    border-radius:var(--radius-sm); padding:16px 20px;
    margin-bottom:10px; display:flex; align-items:center; gap:14px; flex-wrap:wrap;
    transition:border-color 0.18s;
  }
  .qr-row:hover { border-color:var(--border-hi); }
  .qr-lbl { font-size:16px; font-weight:800; min-width:90px; }
  .qr-url { font-family:'DM Mono',monospace; font-size:10px; color:var(--text-muted); background:var(--surface3); padding:4px 8px; border-radius:5px; flex:1; }
  .sdot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .sdot-on { background:var(--neon); box-shadow:0 0 6px var(--neon); }
  .sdot-off { background:var(--text-dim); }

  select.sel-inp {
    background:var(--surface2); border:1px solid var(--border);
    border-radius:var(--radius-xs); color:var(--text);
    font-family:'Fraunces',serif; font-size:12px; font-weight:600;
    padding:7px 10px; outline:none; cursor:pointer;
  }

  .form-box { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:22px; margin-bottom:18px; }
  .fg2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
  @media(max-width:480px) { .fg2 { grid-template-columns:1fr; } }

  .btn-sm { background:var(--neon); border:none; border-radius:var(--radius-xs); color:#060608; font-family:'Fraunces',serif; font-size:11px; font-weight:800; padding:8px 16px; cursor:pointer; transition:opacity 0.18s; letter-spacing:0.5px; }
  .btn-sm:hover { opacity:0.85; }
  .btn-sm-g { background:none; border:1px solid var(--border); border-radius:var(--radius-xs); color:var(--text-muted); font-family:'Fraunces',serif; font-size:11px; font-weight:600; padding:8px 14px; cursor:pointer; transition:all 0.18s; }
  .btn-sm-g:hover { border-color:var(--border-hi); color:var(--text); }

  /* ── Login ── */
  .login-shell { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
  .login-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:40px 30px; width:100%; max-width:340px; text-align:center; }
  .login-wm { font-size:36px; font-weight:800; letter-spacing:8px; color:var(--neon); text-shadow:0 0 30px rgba(0,255,120,0.5); margin-bottom:4px; animation:glitch 8s infinite; }
  .login-sub { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--text-dim); margin-bottom:32px; }
  .err { font-family:'DM Mono',monospace; font-size:11px; color:#ff4d6d; margin-bottom:10px; }

  .spinner { width:16px; height:16px; border:2px solid rgba(0,0,0,0.2); border-top-color:#060608; border-radius:50%; animation:spin 0.7s linear infinite; }

  /* ── Password toggle ── */
  .pass-wrap { position: relative; margin-bottom: 12px; }
  .pass-wrap .inp { margin-bottom: 0; padding-right: 46px; }
  .eye-btn {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: var(--text-muted);
    font-size: 16px; padding: 4px; transition: color 0.18s; line-height: 1;
    display: flex; align-items: center; justify-content: center;
  }
  .eye-btn:hover { color: var(--neon); }

  /* ── Session config modal ── */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center;
    z-index: 500; padding: 20px; backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }
  .modal-card {
    background: var(--surface); border: 1px solid var(--border-hi);
    border-radius: var(--radius); padding: 28px; width: 100%; max-width: 500px;
    max-height: 80vh; overflow-y: auto;
    animation: up 0.25s ease both;
  }
  .modal-title { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
  .modal-sub { font-family: 'DM Mono',monospace; font-size: 11px; color: var(--text-muted); margin-bottom: 24px; }
  .config-section { margin-bottom: 20px; }
  .config-label { font-family: 'DM Mono',monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--neon); margin-bottom: 10px; display: block; }
  .config-opts { display: flex; flex-direction: column; gap: 6px; }
  .config-opt {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius-xs); padding: 10px 14px; cursor: pointer;
    transition: all 0.15s; font-size: 13px; font-weight: 600;
  }
  .config-opt:hover { border-color: var(--border-hi); }
  .config-opt.sel { border-color: var(--neon); background: var(--neon-dim); }
  .config-check {
    width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; flex-shrink: 0; transition: all 0.15s; font-family: 'DM Mono',monospace;
  }
  .config-opt.sel .config-check { background: var(--neon); border-color: var(--neon); color: #060608; font-weight: 700; }
  .modal-actions { display: flex; gap: 8px; margin-top: 24px; }

  .scale-wrap { margin-bottom:40px; }
  .scale-track { display:flex; gap:8px; margin-bottom:10px; }
  .scale-btn {
    flex:1; padding:14px 4px;
    background:var(--surface); border:1px solid var(--border);
    border-radius:var(--radius-xs); cursor:pointer;
    font-size:14px; font-weight:700; color:var(--text-muted);
    transition:all 0.15s; display:flex; align-items:center; justify-content:center;
  }
  .scale-btn.sel {
    background:var(--neon-dim); border-color:var(--neon);
    color:var(--neon); box-shadow:0 0 12px rgba(0,255,120,0.15);
  }
  .scale-labels { display:flex; justify-content:space-between; font-family:'DM Mono',monospace; font-size:10px; color:var(--text-dim); }

  /* ── Multi-select step ── */
  .multi-note { font-family:'DM Mono',monospace; font-size:10px; color:var(--text-muted); margin-bottom:14px; letter-spacing:1px; }

  /* ── Text step ── */
  .textarea {
    width:100%; background:var(--surface); border:1px solid var(--border);
    border-radius:var(--radius-xs); padding:14px 16px; color:var(--text);
    font-size:14px; font-family:'Fraunces',serif; outline:none;
    transition:border-color 0.2s, box-shadow 0.2s; resize:none;
    min-height:110px; margin-bottom:12px; line-height:1.6;
  }
  .textarea:focus { border-color:var(--neon); box-shadow:0 0 0 3px rgba(0,255,120,0.08); }
  .textarea::placeholder { color:var(--text-dim); }

  /* ── Demo bar ── */
  .demo-bar {
    position:fixed; bottom:0; left:0; right:0;
    display:flex; justify-content:center; gap:4px;
    background:rgba(6,6,8,0.96); border-top:1px solid var(--border);
    padding:10px 8px 14px; z-index:1000; backdrop-filter:blur(16px);
  }
  .demo-btn { background:none; border:none; font-family:'Fraunces',serif; font-size:11px; font-weight:700; color:var(--text-muted); padding:5px 12px; border-radius:99px; cursor:pointer; transition:all 0.18s; letter-spacing:0.5px; white-space:nowrap; }
  .demo-btn.on { background:var(--neon); color:#060608; }
`;

// ─── PASSWORD INPUT WITH EYE TOGGLE ──────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder = "Mínimo 8 caracteres" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pass-wrap">
      <input
        className="inp"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button className="eye-btn" onClick={() => setShow(s => !s)} type="button" title={show ? "Ocultar" : "Mostrar"}>
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── STEP RENDERERS ───────────────────────────────────────────────────────────
function StepStars({ answer, setAnswer }) {
  const [hover, setHover] = useState(0);
  const labels = ["","Malo","Regular","Bien","Muy bueno","Excepcional ✦"];
  return (
    <div className="stars-wrap">
      <div className="stars-row">
        {[1,2,3,4,5].map(n => (
          <button key={n} className={`star-btn${n<=(hover||answer)?" lit":""}`}
            onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(0)}
            onClick={()=>setAnswer(n)}>★</button>
        ))}
      </div>
      <div className="star-lbl" style={{opacity:(hover||answer)?1:0}}>{labels[hover||answer]}</div>
    </div>
  );
}

function StepOptions({ step, wine, answer, setAnswer }) {
  const opts = step.optionsKey ? wine[step.optionsKey] : step.options;
  return (
    <div className="opts">
      {(opts||[]).map(o => (
        <button key={o} className={`opt${answer===o?" sel":""}`} onClick={()=>setAnswer(o)}>
          {o}<div className="opt-check">{answer===o?"✓":""}</div>
        </button>
      ))}
    </div>
  );
}

function StepScale({ step, answer, setAnswer }) {
  const pts = Array.from({length: step.max - step.min + 1}, (_,i) => step.min + i);
  return (
    <div className="scale-wrap">
      <div className="scale-track">
        {pts.map(n => (
          <button key={n} className={`scale-btn${answer===n?" sel":""}`} onClick={()=>setAnswer(n)}>{n}</button>
        ))}
      </div>
      {step.labels && <div className="scale-labels"><span>{step.labels.min}</span><span>{step.labels.max}</span></div>}
    </div>
  );
}

function StepMulti({ step, wine, answer, setAnswer }) {
  const opts = step.optionsKey ? wine[step.optionsKey] : step.options;
  const sel = answer || [];
  const toggle = v => setAnswer(sel.includes(v) ? sel.filter(x=>x!==v) : [...sel, v]);
  return (
    <>
      <div className="multi-note">SELECCIÓN MÚLTIPLE</div>
      <div className="opts">
        {(opts||[]).map(o => (
          <button key={o} className={`opt${sel.includes(o)?" sel":""}`} onClick={()=>toggle(o)}>
            {o}<div className="opt-check">{sel.includes(o)?"✓":""}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function StepText({ step, answer, setAnswer }) {
  return <textarea className="textarea" placeholder={step.placeholder||"Escribe aquí..."} value={answer||""} onChange={e=>setAnswer(e.target.value)} />;
}

// ─── SURVEY APP (motor dinámico) ──────────────────────────────────────────────
function SurveyApp({ qrCode = "abc123", onGoProfile }) {
 const [session, setSession] = useState(null);
const [loadingSession, setLoadingSession] = useState(true);

useEffect(() => {
  getActiveTasting(qrCode).then(s => {
    setSession(s);
    setLoadingSession(false);
  });
}, [qrCode]);
  const wine = session?.wine;
  const steps = session?.steps || [];
  const totalSteps = steps.length;
  const contactStep = totalSteps + 1;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const surveyStep = step >= 1 && step <= totalSteps ? steps[step - 1] : null;
  const pct = step === 0 ? 0 : Math.min(((step - 1) / totalSteps) * 100, 100);
  const setAnswer = val => setAnswers(a => ({ ...a, [surveyStep.key]: val }));
  const currentAnswer = surveyStep ? answers[surveyStep.key] : null;

  const canContinue = () => {
    if (!surveyStep || surveyStep.optional) return true;
    const a = currentAnswer;
    if (surveyStep.type === "multi") return Array.isArray(a) && a.length > 0;
    if (surveyStep.type === "stars") return a > 0;
    return !!a;
  };

 const submit = async () => {
  setLoading(true);
  try {
    await addDoc(collection(db, "ratings"), {
      tastingId: session.tasting.id,
      userId: null,
      answers,
      date: serverTimestamp(),
    });
  } catch (e) {
    console.error("Error guardando valoración:", e);
  }
  setLoading(false);
  setDone(true);
};

  if (loadingSession) return (
  <div className="survey-shell" style={{justifyContent:"center",alignItems:"center",textAlign:"center"}}>
    <div style={{color:"var(--neon)",fontSize:14,letterSpacing:2}}>Cargando cata...</div>
  </div>
);

if (!wine) return (

    <div className="survey-shell" style={{justifyContent:"center",alignItems:"center",textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:16}}>⚠</div>
      <div className="h1" style={{fontSize:22}}>QR sin sesión activa</div>
      <div className="sub">Este código no tiene ninguna cata asignada.</div>
    </div>
  );

  if (done) {
    const { correct, total } = calcCorrect(answers, steps, wine);
    const contact = email || phone;
    return (
      <div className="ty-shell au">
        <div className="ty-badge">✓</div>
        <div className="h1" style={{marginBottom:8}}>¡Listo!</div>
        <div className="sub" style={{marginBottom:0}}>{contact?"En breve recibirás el resultado y tus estadísticas.":"Gracias por participar en la cata WOW."}</div>
        <div className="ty-pills">
          <div className="ty-pill">Puntuación <span className="v" style={{marginLeft:6}}>{"★".repeat(answers.stars||0)}</span></div>
          {total > 0 && <div className="ty-pill">Aciertos <span className="v" style={{marginLeft:6}}>{correct}/{total}</span></div>}
          <div className="ty-pill">Preguntas <span className="v" style={{marginLeft:6}}>{totalSteps}</span></div>
        </div>
        {contact
          ? <div className="cta-box"><div className="cta-box-title">Tu perfil WOW</div><div className="cta-box-sub">Consulta tu historial, estadísticas y ranking de catadores.</div><button className="btn btn-neon" onClick={onGoProfile}>Ver mi perfil →</button></div>
          : <div className="cta-box"><div className="cta-box-title">¿Quieres el resultado?</div><div className="cta-box-sub">Déjanos tu contacto y te revelamos el vino y tus estadísticas.</div><button className="btn btn-neon" onClick={()=>{setDone(false);setStep(contactStep);}}>Dejar contacto →</button></div>
        }
      </div>
    );
  }

  return (
    <div className="survey-shell">
      <div className="top-bar au"><div className="wordmark">WOW</div><div className="event-tag">{session.tasting.event}</div></div>
      <div className="progress-track au d1"><div className="progress-fill" style={{width:`${pct}%`}} /></div>

      {step === 0 && (
        <div className="step-body au" key="s0">
          <div className="live-chip"><div className="live-dot"/>CATA EN CURSO · {session.tasting.event}</div>
          <div className="eyebrow">Cata ciega</div>
          <div className="h1">¿Qué hay<br/>en tu <em>copa</em>?</div>
          <div className="sub">Valora el vino sin saber la marca ni la bodega. Solo tu paladar cuenta.</div>
          <div className="hero-visual">
            <LiquidVisual/>
            <div className="hero-label"><span className="cursor-blink">_</span> ANÁLISIS SENSORIAL ACTIVO</div>
          </div>
          <button className="btn btn-neon" onClick={()=>setStep(1)}>EMPEZAR CATA →</button>
        </div>
      )}

      {surveyStep && (
        <div className="step-body au" key={`s${step}`}>
          <div className="eyebrow">{String(step).padStart(2,"0")} / {String(totalSteps).padStart(2,"0")}</div>
          <div className="h1">{surveyStep.question}</div>
          <div className="sub">{surveyStep.sub}</div>
          {surveyStep.type === "stars"   && <StepStars   step={surveyStep} answer={currentAnswer} setAnswer={setAnswer} />}
          {surveyStep.type === "options" && <StepOptions step={surveyStep} wine={wine} answer={currentAnswer} setAnswer={setAnswer} />}
          {surveyStep.type === "scale"   && <StepScale   step={surveyStep} answer={currentAnswer} setAnswer={setAnswer} />}
          {surveyStep.type === "multi"   && <StepMulti   step={surveyStep} wine={wine} answer={currentAnswer} setAnswer={setAnswer} />}
          {surveyStep.type === "text"    && <StepText    step={surveyStep} answer={currentAnswer} setAnswer={setAnswer} />}
          <button className="btn btn-neon" onClick={()=>setStep(s=>s+1)} disabled={!canContinue()}>
            {step === totalSteps ? "FINALIZAR →" : "CONTINUAR →"}
          </button>
          {surveyStep.optional && !currentAnswer && (
            <button className="btn btn-ghost" onClick={()=>setStep(s=>s+1)}>Omitir pregunta</button>
          )}
        </div>
      )}

      {step === contactStep && (
        <div className="step-body au" key="contact">
          <div className="eyebrow">ÚLTIMO PASO</div>
          <div className="h1">¿Quieres el<br/><em>resultado</em>?</div>
          <div className="sub">Opcional. Déjanos tu contacto y te revelamos el vino y tus estadísticas.</div>
          <div className="ctabs">
            {[["email","EMAIL"],["phone","TELÉFONO"],["account","CUENTA"]].map(([m,l])=>(
              <button key={m} className={`ctab${mode===m?" on":""}`} onClick={()=>setMode(m)}>{l}</button>
            ))}
          </div>
          {mode==="email"&&(<><label className="inp-label">Email</label><input className="inp" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/><div className="note">Recibirás un link mágico para acceder a tu perfil sin contraseña.</div></>)}
          {mode==="phone"&&(<><label className="inp-label">Teléfono (WhatsApp)</label><input className="inp" placeholder="+34 600 000 000" value={phone} onChange={e=>setPhone(e.target.value)}/><div className="note">Te enviamos el resultado por WhatsApp con link a tu perfil.</div></>)}
          {mode==="account"&&(<><label className="inp-label">Email</label><input className="inp" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/><label className="inp-label">Contraseña</label><PasswordInput value={pass} onChange={e=>setPass(e.target.value)}/><div className="note">Crea tu cuenta WOW y accede siempre a tu historial de catas.</div></>)}
          <button className="btn btn-neon" onClick={submit} disabled={loading}>
            {loading?<div className="spinner"/>:(email||phone?"ENVIAR Y REVELAR →":"ENVIAR →")}
          </button>
          {!email&&!phone&&<button className="btn btn-ghost" onClick={submit}>Omitir y enviar</button>}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function UserProfile({ user=DB.users[0], onBack }) {
  const ratings = getUserRatings(user.id);
  const total = ratings.length;
  const correctTotal = ratings.reduce((sum, r) => sum + (r.correct||0), 0);
  const totalQ = ratings.reduce((sum, r) => sum + (r.total||0), 0);
  const pct = totalQ ? Math.round((correctTotal / totalQ) * 100) : 0;
  const avg = total?(ratings.reduce((a,b)=>a+(b.answers?.stars||0),0)/total).toFixed(1):"—";
  const GLOBAL = 58;
  const denoms = {};
  ratings.forEach(r=>{if(r.wine)denoms[r.wine.denomination]=(denoms[r.wine.denomination]||0)+1;});
  const favDen = Object.entries(denoms).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";

  return (
    <div className="profile-shell">
      <div className="profile-top au">
        <div className="avatar">{user.name?.[0]}</div>
        <div><div className="p-name">{user.name}</div><div className="p-email">{user.email}</div></div>
        <button className="btn-sm-g" style={{marginLeft:"auto"}} onClick={onBack}>← Volver</button>
      </div>
      <div className="p-stats au d1">
        {[[total,"CATAS"],[pct+"%","ACIERTOS"],[avg+"★","MEDIA"]].map(([v,l])=>(
          <div className="pstat" key={l}><div className="pstat-v">{v}</div><div className="pstat-l">{l}</div></div>
        ))}
      </div>
      <div className="insight au d2">
        <div className="ins-icon">🏆</div>
        <div><div className="ins-lbl">Vs. media global</div><div className="ins-val">{pct}% tú · {GLOBAL}% media · {pct>=GLOBAL?"Por encima 🎉":"Sigue catando 💪"}</div></div>
      </div>
      <div className="insight au d3">
        <div className="ins-icon">🍇</div>
        <div><div className="ins-lbl">Denominación favorita</div><div className="ins-val">{favDen}</div></div>
      </div>
      <div className="sh">Historial</div>
      {ratings.map((r,i)=>(
        <div className="r-row" key={r.id} style={{animationDelay:`${i*0.06}s`}}>
          <div className="r-icon">🍷</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="r-name">{r.wine?.name||"—"}</div>
            <div className="r-meta">{r.tasting?.event} · {r.date}</div>
          </div>
          <div className="r-right">
            <div className="r-stars">{"★".repeat(r.answers?.stars||0)}{"☆".repeat(5-(r.answers?.stars||0))}</div>
            <div className={`badge-xs ${r.correct===r.total&&r.total>0?"bx-ok":r.correct>0?"bx-ok":"bx-bad"}`}>
              {r.total>0?`${r.correct}/${r.total} aciertos`:"sin aciertos"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SESSION CONFIG MODAL ─────────────────────────────────────────────────────
function SessionConfigModal({ qr, wines, denominations, onClose, onSave }) {
  const [event, setEvent] = useState("");
  const [wineId, setWineId] = useState("");
  const [decoys, setDecoys] = useState([]);
  const [dens, setDens] = useState([]);

  const correctWine = wines.find(w => w.id === wineId);
  const correctDen = correctWine?.denomination || "";

  const toggleDecoy = id => {
    if (id === wineId) return; // can't pick correct wine as decoy
    setDecoys(p => p.includes(id) ? p.filter(x => x !== id) : p.length < 2 ? [...p, id] : p);
  };
  const toggleDen = d => {
    if (d === correctDen) return; // correct den always included
    setDens(p => p.includes(d) ? p.filter(x => x !== d) : p.length < 2 ? [...p, d] : p);
  };

  const canSave = wineId && decoys.length === 2 && (dens.length === 2 || !correctDen);

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-card">
        <div className="modal-title">Configurar sesión — {qr?.label}</div>
        <div className="modal-sub">Elige el vino correcto, dos señuelos y dos denominaciones incorrectas.</div>

        <div className="config-section">
          <label className="inp-label">Nombre del evento</label>
          <input className="inp" placeholder="Ej: Cata Bar Velázquez, 15 mayo" value={event} onChange={e=>setEvent(e.target.value)} style={{marginBottom:0}}/>
        </div>

        <div className="config-section">
          <span className="config-label">✓ Vino correcto</span>
          <div className="config-opts">
            {wines.map(w=>(
              <div key={w.id} className={`config-opt${wineId===w.id?" sel":""}`} onClick={()=>{setWineId(w.id);setDecoys([]);setDens([]);}}>
                <div className="config-check">{wineId===w.id?"✓":""}</div>
                <div>
                  <div style={{fontWeight:700}}>{w.name}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",fontFamily:"DM Mono,monospace"}}>{w.denomination} · {w.winery}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {wineId && (
          <div className="config-section">
            <span className="config-label">✗ Vinos señuelo (elige 2)</span>
            <div className="config-opts">
              {wines.filter(w=>w.id!==wineId).map(w=>(
                <div key={w.id} className={`config-opt${decoys.includes(w.id)?" sel":""}`} onClick={()=>toggleDecoy(w.id)}>
                  <div className="config-check">{decoys.includes(w.id)?"✓":""}</div>
                  <div>
                    <div style={{fontWeight:700}}>{w.name}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)",fontFamily:"DM Mono,monospace"}}>{w.denomination} · {w.winery}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {wineId && correctDen && (
          <div className="config-section">
            <span className="config-label">D.O. correcta: {correctDen} · Elige 2 incorrectas</span>
            <div className="config-opts">
              {denominations.filter(d=>d!==correctDen).map(d=>(
                <div key={d} className={`config-opt${dens.includes(d)?" sel":""}`} onClick={()=>toggleDen(d)}>
                  <div className="config-check">{dens.includes(d)?"✓":""}</div>
                  <div style={{fontWeight:700}}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-sm" disabled={!canSave} onClick={()=>onSave(qr.id,{wineId,decoyWineIds:decoys,denominationOptions:[correctDen,...dens],event})}>
            ACTIVAR SESIÓN
          </button>
          <button className="btn-sm-g" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState("dashboard");
 const [wines, setWines] = useState([]);
const [tastings, setTastings] = useState([]);
const [ratings, setRatings] = useState([]);
const [qrCodes, setQrCodes] = useState([]);

useEffect(() => {
  const loadData = async () => {
    const [wSnap, tSnap, rSnap, qSnap] = await Promise.all([
      getDocs(collection(db,"wines")),
      getDocs(collection(db,"tastings")),
      getDocs(collection(db,"ratings")),
      getDocs(collection(db,"qr_codes")),
    ]);
    setWines(wSnap.docs.map(d=>({id:d.id,...d.data()})));
    setTastings(tSnap.docs.map(d=>({id:d.id,...d.data()})));
    setRatings(rSnap.docs.map(d=>({id:d.id,...d.data()})));
    setQrCodes(qSnap.docs.map(d=>({id:d.id,...d.data()})));
  };
  loadData();
}, []);
  const [showForm, setShowForm] = useState(false);
  const [nw, setNw] = useState({name:"",winery:"",denomination:"",vintage:""});
  const [configuringQr, setConfiguringQr] = useState(null);

  const total = ratings.length;
  const avg = (ratings.reduce((a,b)=>a+(b.answers?.stars||0),0)/total).toFixed(1);
  const cr = Math.round((ratings.filter(r=>{
    const t=DB.tastings.find(tt=>tt.id===r.tastingId);
    const w=DB.wines.find(ww=>ww.id===t?.wineId);
    const steps=t?.steps||DEFAULT_STEPS;
    const {correct,total:tot}=calcCorrect(r.answers||{},steps,w||{});
    return correct===tot&&tot>0;
  }).length/total)*100);

 const addWine = async () => {
  if(!nw.name) return;
  try {
    await addDoc(collection(db, "wines"), {
      name: nw.name,
      winery: nw.winery,
      denomination: nw.denomination,
      vintage: parseInt(nw.vintage),
      optionsDenomination: [nw.denomination, "Rioja", "Ribera del Duero"],
      optionsName: [nw.name, "Opción 2", "Opción 3"],
    });
    // Recargar vinos desde Firebase
    const snap = await getDocs(collection(db, "wines"));
    setWines(snap.docs.map(d => ({id: d.id, ...d.data()})));
    setNw({name:"", winery:"", denomination:"", vintage:""});
    setShowForm(false);
  } catch(e) {
    console.error("Error guardando vino:", e);
  }
};

  const reassign = (qrId, wineId) => {
    setTastings(p=>[...p.map(t=>t.qrId===qrId?{...t,active:false}:t),
      {id:"t"+Date.now(),qrId,wineId,event:"Evento "+new Date().toLocaleDateString(),date:new Date().toISOString().split("T")[0],active:true}]);
  };

  return (
    <div className="admin-shell">
      <div className="admin-top">
        <div className="wordmark">WOW</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div className="anav">
            {[["dashboard","Dashboard"],["qr","QR & Sesiones"],["wines","Vinos"],["ratings","Valoraciones"],["users","Usuarios"]].map(([k,l])=>(
              <button key={k} className={`anav-btn${tab===k?" on":""}`} onClick={()=>setTab(k)}>{l}</button>
            ))}
          </div>
          <button className="btn-sm-g" onClick={onLogout}>Salir</button>
        </div>
      </div>

      {tab==="dashboard"&&(
        <>
          <div className="kpi-grid">
            {[[total,"VALORACIONES"],[avg+"★","MEDIA GLOBAL"],[cr+"%","TASA ACIERTO"],[DB.users.length,"USUARIOS"]].map(([v,l])=>(
              <div className="kpi au" key={l}><div className="kpi-v">{v}</div><div className="kpi-l">{l}</div></div>
            ))}
          </div>
          <div className="sec-title">Últimas valoraciones</div>
          <div className="tbox"><table>
            <thead><tr><th>Vino</th><th>Evento</th><th>⭐</th><th>D.O. elegida</th><th>Acierto</th><th>Fecha</th></tr></thead>
            <tbody>{ratings.map(r=>{
              const t=tastings.find(tt=>tt.id===r.tastingId),w=wines.find(ww=>ww.id===t?.wineId);
              return(<tr key={r.id}><td><strong>{w?.name||"—"}</strong></td><td style={{color:"var(--text-muted)",fontSize:12}}>{t?.event||"—"}</td><td style={{color:"var(--neon)"}}>{("★").repeat(r.answers?.stars||0)}</td><td>{r.answers?.denomination||"—"}</td><td><span className={`tag ${calcCorrect(r.answers||{},t?.steps||DEFAULT_STEPS,w||{}).correct>0?"t-ok":"t-bad"}`}>{calcCorrect(r.answers||{},t?.steps||DEFAULT_STEPS,w||{}).correct}/{calcCorrect(r.answers||{},t?.steps||DEFAULT_STEPS,w||{}).total}</span></td><td style={{fontSize:11,color:"var(--text-muted)"}}>{r.date?.seconds ? new Date(r.date.seconds*1000).toLocaleDateString() : r.date}</td></tr>);
            })}</tbody>
          </table></div>
        </>
      )}

      {tab==="qr"&&(
        <>
          <div className="sec-title">QR Codes y sesiones</div>
          <p style={{fontFamily:"DM Mono,monospace",fontSize:12,color:"var(--text-muted)",marginBottom:20,lineHeight:1.7}}>
            Configura cada QR: elige el vino correcto, los dos vinos señuelo y las tres denominaciones que verá el usuario.
          </p>
          {qrCodes.map(qr=>{
            const active=tastings.find(t=>t.qrId===qr.id&&t.active);
            const aw=wines.find(w=>w.id===active?.wineId);
            const hist=tastings.filter(t=>t.qrId===qr.id&&!t.active);
            return(
              <div key={qr.id} style={{marginBottom:12}}>
                <div className="qr-row">
                  <div><div className="qr-lbl">{qr.label}</div><div className="qr-url">wow.app/v/{qr.code}</div></div>
                  <div style={{display:"flex",alignItems:"center",gap:7,flex:1}}>
                    <div className={`sdot ${active?"sdot-on":"sdot-off"}`}/>
                    <span style={{fontSize:12,color:active?"var(--neon)":"var(--text-muted)",fontFamily:"DM Mono,monospace"}}>
                      {active?`ACTIVO → ${aw?.name}`:"SIN SESIÓN"}
                    </span>
                  </div>
                  <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
                    {active&&<button className="btn-sm-g" onClick={()=>setTastings(p=>p.map(t=>t.id===active.id?{...t,active:false}:t))}>Desactivar</button>}
                    <button className="btn-sm" onClick={()=>setConfiguringQr(qr.id)}>
                      {active?"Reconfigurar":"Configurar y activar"}
                    </button>
                  </div>
                </div>
                {hist.length>0&&<div style={{padding:"0 20px 2px",fontFamily:"DM Mono,monospace",fontSize:10,color:"var(--text-dim)"}}>
                  HISTORIAL: {hist.map(h=>{const w=wines.find(ww=>ww.id===h.wineId);return`${w?.name} (${h.date})`;}).join(" · ")}
                </div>}
              </div>
            );
          })}
          {configuringQr && (
            <SessionConfigModal
              qr={qrCodes.find(q=>q.id===configuringQr)}
              wines={wines}
              denominations={DB.denominations}
              onClose={()=>setConfiguringQr(null)}
              onSave={async (qrId, config) => {
  try {
    // Desactivar sesiones anteriores
    const oldSnap = await getDocs(
      query(collection(db,"tastings"),
        where("qrId","==",qrId),
        where("active","==",true))
    );
    for (const d of oldSnap.docs) {
      await updateDoc(doc(db,"tastings",d.id), { active: false });
    }
    // Crear nueva sesión
    await addDoc(collection(db,"tastings"), {
      qrId,
      wineId: config.wineId,
      event: config.event || "Evento " + new Date().toLocaleDateString(),
      date: new Date().toISOString().split("T")[0],
      active: true,
      decoyWineIds: config.decoyWineIds,
      denominationOptions: config.denominationOptions,
    });
    setConfiguringQr(null);
    // Recargar tastings desde Firebase
    const snap = await getDocs(collection(db,"tastings"));
    setTastings(snap.docs.map(d=>({id:d.id,...d.data()})));
  } catch(e) {
    console.error("Error:", e);
  }
}}
            />
          )}
        </>
      )}

      {tab==="wines"&&(
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <div className="sec-title" style={{marginBottom:0}}>Catálogo</div>
            <button className="btn-sm" onClick={()=>setShowForm(f=>!f)}>+ AÑADIR VINO</button>
          </div>
          {showForm&&(
            <div className="form-box">
              <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Nuevo vino</div>
              <div className="fg2">
                {[["Nombre","name"],["Bodega","winery"],["Denominación","denomination"],["Añada","vintage"]].map(([l,k])=>(
                  <div key={k}><label className="inp-label">{l}</label><input className="inp" style={{marginBottom:0}} placeholder={l} value={nw[k]} onChange={e=>setNw(p=>({...p,[k]:e.target.value}))}/></div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}><button className="btn-sm" onClick={addWine}>GUARDAR</button><button className="btn-sm-g" onClick={()=>setShowForm(false)}>Cancelar</button></div>
            </div>
          )}
          <div className="tbox"><table>
            <thead><tr><th>Nombre</th><th>Bodega</th><th>D.O.</th><th>Añada</th><th>Valoraciones</th><th></th></tr></thead>
            <tbody>{wines.map(w=>{
              const wr=ratings.filter(r=>{const t=tastings.find(tt=>tt.id===r.tastingId);return t?.wineId===w.id;});
              return(<tr key={w.id}><td><strong>{w.name}</strong></td><td style={{color:"var(--text-muted)"}}>{w.winery}</td><td>{w.denomination}</td><td style={{color:"var(--text-muted)"}}>{w.vintage}</td><td style={{color:"var(--neon)",fontWeight:700}}>{wr.length}</td><td><button className="btn-sm-g">Ver stats</button></td></tr>);
            })}</tbody>
          </table></div>
        </>
      )}

      {tab==="ratings"&&(
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <div className="sec-title" style={{marginBottom:0}}>Todas las valoraciones</div>
            <button className="btn-sm">↓ CSV</button>
          </div>
          <div className="tbox"><table>
            <thead><tr><th>Vino</th><th>Evento</th><th>⭐</th><th>D.O. elegida</th><th>Vino elegido</th><th>Aciertos</th><th>Usuario</th><th>Fecha</th></tr></thead>
            <tbody>{ratings.map(r=>{
              const t=tastings.find(tt=>tt.id===r.tastingId),w=wines.find(ww=>ww.id===t?.wineId),u=DB.users.find(uu=>uu.id===r.userId);
              const steps=t?.steps||DEFAULT_STEPS;
              const {correct,total:tot}=calcCorrect(r.answers||{},steps,w||{});
              return(<tr key={r.id}>
                <td><strong>{w?.name||"—"}</strong></td>
                <td style={{fontSize:11,color:"var(--text-muted)"}}>{t?.event||"—"}</td>
                <td style={{color:"var(--neon)"}}>{("★").repeat(r.answers?.stars||0)}</td>
                <td>{r.answers?.denomination||"—"}</td>
                <td style={{fontSize:12}}>{r.answers?.wineName||"—"}</td>
                <td><span className={`tag ${correct===tot&&tot>0?"t-ok":correct>0?"t-ok":"t-bad"}`}>{correct}/{tot}</span></td>
                <td style={{fontSize:11,color:"var(--text-muted)"}}>{u?.email||"—"}</td>
                <td style={{fontSize:11,color:"var(--text-muted)"}}>
  {r.date?.seconds ? new Date(r.date.seconds*1000).toLocaleDateString() : r.date}
</td> 
              </tr>);
            })}</tbody>
          </table></div>
        </>
      )}

      {tab==="users"&&(
        <>
          <div className="sec-title">Usuarios</div>
          <div className="tbox"><table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Tipo</th><th>Catas</th><th>% Aciertos</th><th></th></tr></thead>
            <tbody>{DB.users.map(u=>{
              const ur=getUserRatings(u.id);
              const totalQ=ur.reduce((s,r)=>s+(r.total||0),0);
              const totalC=ur.reduce((s,r)=>s+(r.correct||0),0);
              return(<tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td style={{fontFamily:"DM Mono,monospace",fontSize:12,color:"var(--text-muted)"}}>{u.email}</td>
                <td><span className={`tag ${u.hasPassword?"t-active":"t-inactive"}`}>{u.hasPassword?"CUENTA":"MAGIC LINK"}</span></td>
                <td style={{color:"var(--neon)",fontWeight:700}}>{ur.length}</td>
                <td>{totalQ?Math.round((totalC/totalQ)*100)+"%":"—"}</td>
                <td><button className="btn-sm-g">Ver perfil</button></td>
              </tr>);
            })}</tbody>
          </table></div>
        </>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const go = () => { if(pass==="wow2024") onLogin(); else { setErr(true); setTimeout(()=>setErr(false),1400); }};
  return(
    <div className="login-shell">
      <div className="login-card au">
        <div className="login-wm">WOW</div>
        <div className="login-sub">Panel de administración</div>
        <PasswordInput value={pass} onChange={e=>setPass(e.target.value)} placeholder="Contraseña" />
        {err&&<div className="err" style={{marginBottom:8}}>Contraseña incorrecta</div>}
        <button className="btn btn-neon" onClick={go} onKeyDown={e=>e.key==="Enter"&&go()}>ENTRAR →</button>
        <p style={{fontFamily:"DM Mono,monospace",fontSize:10,color:"var(--text-dim)",marginTop:20}}>Demo: wow2024</p>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("survey"); // "survey" | "profile" | "login" | "admin"
  const [auth, setAuth] = useState(false);

  const go = v => setView(v);

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {view === "survey" && <SurveyApp qrCode="abc123" onGoProfile={() => go("profile")} />}
        {view === "profile" && <UserProfile user={DB.users[0]} onBack={() => go("survey")} />}
        {view === "login"  && <AdminLogin onLogin={() => { setAuth(true); go("admin"); }} />}
        {view === "admin"  && auth && <AdminPanel onLogout={() => { setAuth(false); go("login"); }} />}

        <div className="demo-bar">
          <span style={{fontSize:10,color:"var(--text-dim)",fontFamily:"DM Mono,monospace",padding:"0 4px"}}>DEMO</span>
          {[["survey","🍷 Encuesta"],["profile","👤 Perfil"],["login","⚡ Admin"]].map(([v,l]) => (
            <button
              key={v}
              className={`demo-btn${view===v||(v==="login"&&view==="admin")?" on":""}`}
              onClick={() => v === "login" && auth ? go("admin") : go(v)}
            >{l}</button>
          ))}
        </div>
      </div>
    </>
  );
}
