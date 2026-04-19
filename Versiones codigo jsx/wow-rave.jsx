import { useState, useEffect, useRef } from "react";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const DEFAULT_STEPS = [
  { type:"stars",   key:"stars",        question:"¿Cómo te ha parecido?",  sub:"Puntúa del 1 al 5." },
  { type:"options", key:"denomination", question:"¿De qué zona es?",       sub:"Elige la denominación.", optionsKey:"optionsDenomination", correctKey:"denomination" },
  { type:"options", key:"wineName",     question:"¿Cuál es el vino?",      sub:"Selecciona el nombre.",  optionsKey:"optionsName",          correctKey:"name" },
];
const DB = {
  wines: [
    { id:"w1",  name:"Marqués de Riscal Reserva",  winery:"Marqués de Riscal",     denomination:"Rioja",           vintage:2019, grape:"Tempranillo",  optionsDenomination:["Rioja","Ribera del Duero","Priorat"],      optionsName:["Marqués de Riscal Reserva","Campo Viejo Reserva","Viña Ardanza"], optionsGrape:["Tempranillo","Garnacha","Monastrell"] },
    { id:"w2",  name:"Pesquera Crianza",            winery:"Alejandro Fernández",   denomination:"Ribera del Duero",vintage:2020, grape:"Tempranillo",  optionsDenomination:["Rueda","Ribera del Duero","Toro"],         optionsName:["Pesquera Crianza","Condado de Haza","Protos Crianza"],            optionsGrape:["Tempranillo","Albariño","Verdejo"] },
    { id:"w3",  name:"Clos Mogador",                winery:"René Barbier",          denomination:"Priorat",         vintage:2018, grape:"Garnacha",     optionsDenomination:["Priorat","Montsant","Penedès"],            optionsName:["Clos Mogador","Clos Erasmus","Vall Llach"],                       optionsGrape:["Garnacha","Cariñena","Syrah"] },
    { id:"w4",  name:"Vega Sicilia Único",          winery:"Vega Sicilia",          denomination:"Ribera del Duero",vintage:2017, grape:"Tempranillo",  optionsDenomination:["Ribera del Duero","Toro","Rueda"],         optionsName:["Vega Sicilia Único","Alión","Pingus"],                            optionsGrape:["Tempranillo","Cabernet Sauvignon","Merlot"] },
    { id:"w5",  name:"Albariño Pazo de Señorans",   winery:"Pazo de Señorans",      denomination:"Rías Baixas",     vintage:2022, grape:"Albariño",     optionsDenomination:["Rías Baixas","Rueda","Penedès"],           optionsName:["Pazo de Señorans","Martín Códax","Fillaboa"],                     optionsGrape:["Albariño","Verdejo","Godello"] },
    { id:"w6",  name:"Gramona III Lustros",         winery:"Gramona",               denomination:"Cava",            vintage:2016, grape:"Xarel·lo",     optionsDenomination:["Cava","Penedès","Champagne"],              optionsName:["Gramona III Lustros","Recaredo Terrers","Juvé y Camps"],          optionsGrape:["Xarel·lo","Macabeo","Chardonnay"] },
    { id:"w7",  name:"Numanthia Termes",            winery:"Numanthia",             denomination:"Toro",            vintage:2020, grape:"Tinta de Toro", optionsDenomination:["Toro","Ribera del Duero","Arribes"],       optionsName:["Numanthia Termes","Pintia","San Román"],                          optionsGrape:["Tinta de Toro","Tempranillo","Garnacha"] },
    { id:"w8",  name:"Muga Reserva",                winery:"Bodegas Muga",          denomination:"Rioja",           vintage:2019, grape:"Tempranillo",  optionsDenomination:["Rioja","Navarra","Ribera del Duero"],      optionsName:["Muga Reserva","Prado Enea","Torre Muga"],                         optionsGrape:["Tempranillo","Garnacha","Mazuelo"] },
    { id:"w9",  name:"Descendientes J. Palacios",   winery:"Descendientes Palacios",denomination:"Bierzo",          vintage:2021, grape:"Mencía",       optionsDenomination:["Bierzo","Ribeira Sacra","Valdeorras"],     optionsName:["Descendientes J. Palacios","Paixar","Pittacum"],                  optionsGrape:["Mencía","Garnacha","Tempranillo"] },
    { id:"w10", name:"El Nido",                     winery:"Bodegas El Nido",       denomination:"Jumilla",         vintage:2020, grape:"Monastrell",   optionsDenomination:["Jumilla","Yecla","Alicante"],              optionsName:["El Nido","Clio","Casa Castillo"],                                 optionsGrape:["Monastrell","Cabernet Sauvignon","Syrah"] },
  ],
  qr_codes:[
    {id:"qr1", code:"abc123",label:"QR Vino 1"},{id:"qr2", code:"def456",label:"QR Vino 2"},
    {id:"qr3", code:"ghi789",label:"QR Vino 3"},{id:"qr4", code:"jkl012",label:"QR Vino 4"},
    {id:"qr5", code:"mno345",label:"QR Vino 5"},{id:"qr6", code:"pqr678",label:"QR Vino 6"},
    {id:"qr7", code:"stu901",label:"QR Vino 7"},{id:"qr8", code:"vwx234",label:"QR Vino 8"},
    {id:"qr9", code:"yza567",label:"QR Vino 9"},{id:"qr10",code:"bcd890",label:"QR Vino 10"},
  ],
  tastings:[
    {id:"t1",qrId:"qr1",wineId:"w1",event:"Cata Bar Velázquez",date:"2024-03-22",active:true},
    {id:"t2",qrId:"qr2",wineId:"w2",event:"Cata Avanzada Abril",date:"2024-04-10",active:true,
      steps:[...DEFAULT_STEPS,{type:"options",key:"grape",question:"¿Qué uva?",sub:"La variedad principal.",optionsKey:"optionsGrape",correctKey:"grape"},{type:"scale",key:"intensity",question:"Color",sub:"Intensidad del 1 al 5.",min:1,max:5,labels:{min:"Claro",max:"Intenso"}},{type:"text",key:"notes",question:"Cuéntanos",sub:"Aromas, sensaciones…",placeholder:"Lo que percibes...",optional:true}]},
    {id:"t3",qrId:"qr1",wineId:"w2",event:"Cata Anterior",date:"2024-03-15",active:false},
  ],
  users:[{id:"u1",email:"carlos@email.com",name:"Carlos M.",hasPassword:true},{id:"u2",email:"ana@email.com",name:"Ana G.",hasPassword:false}],
  denominations:["Rioja","Ribera del Duero","Priorat","Rueda","Rías Baixas","Penedès","Jumilla","Toro","Montsant","Bierzo","Jerez","Cava","Cariñena","Navarra","Somontano"],
  ratings:[
    {id:"r1",tastingId:"t1",userId:"u1",answers:{stars:4,denomination:"Rioja",wineName:"Marqués de Riscal Reserva"},date:"2024-03-22"},
    {id:"r2",tastingId:"t2",userId:"u1",answers:{stars:3,denomination:"Rueda",wineName:"Condado de Haza"},date:"2024-04-10"},
    {id:"r3",tastingId:"t3",userId:"u1",answers:{stars:5,denomination:"Ribera del Duero",wineName:"Pesquera Crianza"},date:"2024-03-15"},
    {id:"r4",tastingId:"t1",userId:"u2",answers:{stars:5,denomination:"Rioja",wineName:"Campo Viejo Reserva"},date:"2024-03-22"},
  ],
};

function calcCorrect(answers,steps,wine){let correct=0,total=0;steps.forEach(s=>{if(!s.correctKey)return;total++;if(answers[s.key]===wine[s.correctKey])correct++;});return{correct,total};}
function getActiveTasting(qrCode){const qr=DB.qr_codes.find(q=>q.code===qrCode);if(!qr)return null;const tasting=DB.tastings.find(t=>t.qrId===qr.id&&t.active);if(!tasting)return null;const wine=DB.wines.find(w=>w.id===tasting.wineId);return{tasting,wine,qr,steps:tasting.steps||DEFAULT_STEPS};}
function getUserRatings(userId){return DB.ratings.filter(r=>r.userId===userId).map(r=>{const tasting=DB.tastings.find(t=>t.id===r.tastingId);const wine=DB.wines.find(w=>w.id===tasting?.wineId);const steps=tasting?.steps||DEFAULT_STEPS;const{correct,total}=calcCorrect(r.answers||{},steps,wine||{});return{...r,tasting,wine,steps,correct,total};});}

// Step color palettes — each step gets its own vibe
const PALETTES = [
  { bg:"#0a0012", accent:"#c84bff", accent2:"#a030e0", glow:"rgba(200,75,255,.4)", text:"#f0e8ff" },
  { bg:"#000d1a", accent:"#00c8ff", accent2:"#009ac0", glow:"rgba(0,200,255,.4)", text:"#e0f8ff" },
  { bg:"#0d0a00", accent:"#ffaa00", accent2:"#e08800", glow:"rgba(255,170,0,.4)",  text:"#fff8e0" },
  { bg:"#000d08", accent:"#00ff9d", accent2:"#00cc7a", glow:"rgba(0,255,157,.4)", text:"#e0fff4" },
  { bg:"#0d0000", accent:"#ff4466", accent2:"#cc2244", glow:"rgba(255,68,102,.4)", text:"#ffe0e8" },
  { bg:"#08001a", accent:"#8866ff", accent2:"#6644cc", glow:"rgba(136,102,255,.4)",text:"#ede0ff" },
];

// ─── WAVEFORM ─────────────────────────────────────────────────────────────────
function Waveform({ accent }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    let t = 0, raf;
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      const bars = 60;
      const bw = c.width / bars;
      for (let i = 0; i < bars; i++) {
        const x = i * bw + bw / 2;
        const h = (Math.sin(t * 2 + i * 0.4) * 0.5 + 0.5) *
                  (Math.sin(t * 1.3 + i * 0.7) * 0.3 + 0.7) *
                  c.height * 0.85;
        const alpha = 0.15 + (h / c.height) * 0.4;
        ctx.fillStyle = accent.replace("rgb","rgba").replace(")",`,${alpha})`);
        if (!accent.includes("rgba")) {
          // parse hex to rgba
          const r=parseInt(accent.slice(1,3),16),g=parseInt(accent.slice(3,5),16),b=parseInt(accent.slice(5,7),16);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        }
        ctx.beginPath();
        const rr = bw * 0.35;
        ctx.roundRect(x - rr, (c.height - h) / 2, rr * 2, h, rr);
        ctx.fill();
      }
      t += 0.025;
      raf = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(raf);
  }, [accent]);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} />;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@300;400;500;600;700;800&display=swap');

  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

  :root{
    --accent: #c84bff;
    --accent-dim: rgba(200,75,255,.12);
    --bg: #0a0012;
    --text: #f0e8ff;
    --text-muted: #c0b8d0;
    --text-dim: #80789a;
    --border: rgba(255,255,255,0.08);
    --r: 20px;
    --r-sm: 14px;
    --r-xs: 10px;
  }

  html,body{height:100%;overflow-x:hidden;}
  body{
    background:var(--bg);color:var(--text);
    font-family:'Manrope',sans-serif;
    -webkit-font-smoothing:antialiased;
    transition:background .6s ease;
  }
  .app{position:relative;z-index:1;min-height:100vh;}

  @keyframes enter{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
  @keyframes slideRight{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}

  /* ── SURVEY SHELL ── */
  .rave-shell{
    min-height:100vh;max-width:420px;margin:0 auto;
    display:flex;flex-direction:column;
    position:relative;overflow:hidden;
  }

  /* ── AMBIENT BG ── */
  .rave-ambient{
    position:fixed;inset:0;pointer-events:none;z-index:0;
    transition:all .8s cubic-bezier(.4,0,.2,1);
  }

  /* ── TOP ── */
  .rave-top{
    position:relative;z-index:10;
    padding:20px 22px 0;
    display:flex;align-items:center;justify-content:space-between;
  }
  .rave-logo{
    font-family:'Bebas Neue',cursive;
    font-size:28px;letter-spacing:5px;
    color:var(--accent);
    text-shadow:0 0 20px var(--accent);
    transition:color .6s,text-shadow .6s;
  }
  .rave-step-counter{
    font-size:11px;font-weight:700;letter-spacing:2px;
    color:var(--text-dim);font-family:'Manrope',sans-serif;
    text-transform:uppercase;
  }

  /* ── PROGRESS ── */
  .rave-progress{
    position:relative;z-index:10;
    height:2px;margin:16px 22px 0;
    background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;
  }
  .rave-progress-fill{
    height:100%;border-radius:2px;
    background:var(--accent);
    box-shadow:0 0 10px var(--accent);
    transition:width .5s cubic-bezier(.4,0,.2,1),background .6s,box-shadow .6s;
  }

  /* ── WAVEFORM SECTION ── */
  .rave-wave{
    position:relative;z-index:10;
    height:90px;margin:0;overflow:hidden;
  }

  /* ── CONTENT ── */
  .rave-content{
    position:relative;z-index:10;
    flex:1;padding:8px 22px 110px;
    display:flex;flex-direction:column;
  }

  /* ── BIG LABEL ── */
  .rave-label{
    font-family:'Bebas Neue',cursive;
    font-size:64px;line-height:.9;letter-spacing:2px;
    color:var(--accent);margin-bottom:6px;
    text-shadow:0 0 30px var(--accent);
    transition:color .6s,text-shadow .6s;
    word-break:break-word;
  }

  .rave-q{
    font-size:26px;font-weight:800;line-height:1.15;
    margin-bottom:6px;letter-spacing:-.3px;
  }
  .rave-sub{
    font-size:13px;color:var(--text-muted);
    margin-bottom:26px;font-weight:400;line-height:1.5;
    transition:color .6s;
  }

  /* ── STARS ── */
  .rave-stars{display:flex;gap:10px;margin-bottom:10px;}
  .rstar{
    flex:1;aspect-ratio:1;
    border:1.5px solid rgba(255,255,255,.1);
    border-radius:var(--r-sm);
    display:flex;align-items:center;justify-content:center;
    font-size:28px;cursor:pointer;
    transition:all .2s;
    background:rgba(255,255,255,.03);
    color:rgba(255,255,255,.2);
  }
  .rstar.lit{
    border-color:var(--accent);
    background:var(--accent-dim);
    color:var(--accent);
    box-shadow:0 0 20px var(--accent-dim);
    transform:scale(1.08);
  }
  .star-word{
    font-family:'Bebas Neue',cursive;
    font-size:18px;letter-spacing:3px;
    color:var(--accent);text-align:center;min-height:22px;
    transition:all .2s;
  }

  /* ── OPTIONS (horizontal scroll on mobile, vertical otherwise) ── */
  .rave-opts{display:flex;flex-direction:column;gap:10px;}
  .ropt{
    background:rgba(255,255,255,.04);
    border:1.5px solid rgba(255,255,255,.08);
    border-radius:var(--r-sm);padding:16px 18px;
    cursor:pointer;transition:all .2s;
    display:flex;align-items:center;gap:14px;
    font-size:15px;font-weight:600;
    position:relative;overflow:hidden;
  }
  .ropt::before{
    content:'';position:absolute;left:0;top:0;bottom:0;width:3px;
    background:var(--accent);box-shadow:0 0 8px var(--accent);
    transform:scaleY(0);transition:transform .2s;
  }
  .ropt:hover{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.07);}
  .ropt.sel{border-color:var(--accent);background:var(--accent-dim);}
  .ropt.sel::before{transform:scaleY(1);}
  .ropt-dot{
    width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.2);
    display:flex;align-items:center;justify-content:center;
    font-size:11px;flex-shrink:0;transition:all .2s;font-weight:800;
  }
  .ropt.sel .ropt-dot{background:var(--accent);border-color:var(--accent);color:#000;}

  /* ── SCALE ── */
  .rave-scale{display:flex;gap:8px;margin-bottom:10px;}
  .rscl{
    flex:1;padding:16px 4px;
    background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.08);
    border-radius:var(--r-xs);cursor:pointer;
    font-family:'Bebas Neue',cursive;font-size:22px;color:rgba(255,255,255,.3);
    transition:all .15s;display:flex;align-items:center;justify-content:center;
  }
  .rscl.sel{background:var(--accent-dim);border-color:var(--accent);color:var(--accent);box-shadow:0 0 16px var(--accent-dim);}
  .scale-ends{display:flex;justify-content:space-between;font-size:10px;color:var(--text-dim);letter-spacing:.5px;margin-top:6px;}

  /* ── TEXTAREA ── */
  .rtxta{
    width:100%;background:rgba(255,255,255,.04);
    border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r-xs);
    padding:14px 16px;color:var(--text);font-size:14px;
    font-family:'Manrope',sans-serif;outline:none;resize:none;
    min-height:100px;line-height:1.6;transition:border-color .2s;
  }
  .rtxta:focus{border-color:var(--accent);}
  .rtxta::placeholder{color:rgba(255,255,255,.2);}

  /* ── MULTI ── */
  .multi-note{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);margin-bottom:12px;font-weight:700;}

  /* ── BOTTOM ACTION ── */
  .rave-action{
    position:fixed;bottom:58px;left:50%;transform:translateX(-50%);
    width:100%;max-width:420px;
    padding:16px 22px 8px;
    background:linear-gradient(0deg,var(--bg) 60%,transparent);
    z-index:20;transition:background .6s;
  }
  .rave-btn{
    width:100%;padding:18px;border:none;border-radius:var(--r-sm);
    background:var(--accent);color:#000;
    font-family:'Bebas Neue',cursive;
    font-size:20px;letter-spacing:3px;
    cursor:pointer;transition:all .2s;
    display:flex;align-items:center;justify-content:center;gap:8px;
    box-shadow:0 4px 24px var(--accent-dim);
  }
  .rave-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px var(--accent-dim);}
  .rave-btn:disabled{opacity:.3;cursor:not-allowed;transform:none;box-shadow:none;}
  .rave-btn-ghost{
    width:100%;padding:13px;border:1.5px solid rgba(255,255,255,.1);border-radius:var(--r-sm);
    background:none;color:var(--text-muted);
    font-family:'Manrope',sans-serif;font-size:13px;font-weight:600;
    cursor:pointer;transition:all .2s;margin-top:10px;
  }
  .rave-btn-ghost:hover{border-color:var(--accent);color:var(--text);}

  /* ── WELCOME ── */
  .rave-welcome{
    flex:1;display:flex;flex-direction:column;justify-content:center;
    padding:20px 22px 110px;position:relative;z-index:10;
  }
  .rave-welcome-tag{
    display:inline-flex;align-items:center;gap:8px;
    background:var(--accent-dim);border:1px solid var(--accent);
    border-radius:99px;padding:6px 16px;
    font-size:12px;font-weight:700;color:var(--accent);letter-spacing:1px;
    margin-bottom:20px;width:fit-content;
  }
  .rtag-dot{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:pulse 1.5s ease-in-out infinite;}
  .rave-big{font-family:'Bebas Neue',cursive;font-size:80px;line-height:.88;letter-spacing:2px;color:var(--text);margin-bottom:14px;}
  .rave-big span{color:var(--accent);text-shadow:0 0 30px var(--accent);}
  .rave-welcome-sub{font-size:15px;color:var(--text-muted);line-height:1.65;max-width:300px;}

  /* ── RESULT ── */
  .rave-result{
    min-height:100vh;max-width:420px;margin:0 auto;
    padding:0 22px 170px;position:relative;z-index:10;
    display:flex;flex-direction:column;
  }
  .rave-result-hero{
    height:200px;display:flex;flex-direction:column;
    justify-content:flex-end;padding-bottom:20px;position:relative;overflow:hidden;
  }
  .rave-result-big{font-family:'Bebas Neue',cursive;font-size:90px;line-height:.85;color:var(--accent);text-shadow:0 0 40px var(--accent);}
  .rave-result-tag{font-size:12px;font-weight:700;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase;margin-top:4px;}
  .rave-chips{display:flex;flex-direction:column;gap:8px;margin:20px 0;}
  .rave-chip{
    display:flex;align-items:center;justify-content:space-between;
    background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.08);
    border-radius:var(--r-sm);padding:14px 18px;
  }
  .rc-label{font-size:12px;color:var(--text-muted);font-weight:600;letter-spacing:.3px;}
  .rc-val{font-size:16px;font-weight:800;}
  .rc-ok{color:var(--accent);}
  .rc-bad{color:#ff4466;}
  .rave-cta{
    margin-top:auto;background:rgba(255,255,255,.05);
    border:1.5px solid var(--accent);border-radius:var(--r);
    padding:24px;
  }
  .rave-cta-title{font-family:'Bebas Neue',cursive;font-size:28px;letter-spacing:2px;margin-bottom:6px;}
  .rave-cta-sub{font-size:13px;color:var(--text-muted);margin-bottom:18px;line-height:1.6;}

  /* ── CONTACT ── */
  .rave-ctabs{display:flex;gap:4px;background:rgba(255,255,255,.05);border-radius:var(--r-xs);padding:3px;margin-bottom:16px;}
  .rctab{flex:1;background:none;border:none;font-family:'Manrope',sans-serif;font-size:12px;font-weight:700;color:var(--text-muted);padding:8px;border-radius:8px;cursor:pointer;transition:all .2s;}
  .rctab.on{background:var(--accent);color:#000;}
  .rinp-lbl{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;display:block;}
  .rinp{width:100%;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:var(--r-xs);padding:13px 15px;color:var(--text);font-size:14px;font-family:'Manrope',sans-serif;outline:none;transition:border-color .2s;margin-bottom:10px;}
  .rinp:focus{border-color:var(--accent);}
  .rinp::placeholder{color:rgba(255,255,255,.2);}
  .rinp-note{font-size:11px;color:var(--text-muted);margin-bottom:14px;line-height:1.6;}
  .pass-wrap{position:relative;margin-bottom:10px;}
  .pass-wrap .rinp{margin-bottom:0;padding-right:44px;}
  .eye-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;transition:color .2s;}
  .eye-btn:hover{color:var(--accent);}

  /* ── PROFILE ── */
  .profile-shell{max-width:420px;margin:0 auto;padding:0 22px 170px;position:relative;z-index:10;}
  .profile-top{padding:24px 0 22px;display:flex;align-items:center;gap:16px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:22px;}
  .rav-av{width:54px;height:54px;border-radius:var(--r-sm);background:var(--accent);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',cursive;font-size:26px;color:#000;flex-shrink:0;}
  .pn{font-size:22px;font-weight:800;letter-spacing:-.3px;}
  .pe{font-size:12px;color:var(--text-muted);margin-top:2px;}
  .pstats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;}
  .pstat{background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r-sm);padding:18px 12px;text-align:center;}
  .pstat-v{font-family:'Bebas Neue',cursive;font-size:32px;color:var(--accent);line-height:1;margin-bottom:4px;}
  .pstat-l{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);font-weight:600;}
  .ins-row{background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r-sm);padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:14px;}
  .ins-ic{width:38px;height:38px;border-radius:10px;background:var(--accent-dim);border:1px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
  .ins-l{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px;font-weight:700;}
  .ins-v{font-size:13px;font-weight:700;line-height:1.3;}
  .hist-h{font-family:'Bebas Neue',cursive;font-size:24px;letter-spacing:2px;margin:20px 0 14px;color:var(--accent);}
  .hr-row{background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.07);border-radius:var(--r-sm);padding:13px 15px;margin-bottom:8px;display:flex;align-items:center;gap:12px;transition:border-color .2s;}
  .hr-row:hover{border-color:var(--accent);}
  .hr-ic{width:36px;height:36px;border-radius:10px;background:var(--accent-dim);border:1px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
  .hr-name{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .hr-meta{font-size:11px;color:var(--text-muted);margin-top:1px;}
  .hr-r{text-align:right;flex-shrink:0;}
  .hr-stars{color:var(--accent);font-size:12px;}
  .hr-badge{display:inline-block;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;margin-top:3px;}
  .hb-ok{background:var(--accent-dim);color:var(--accent);}
  .hb-bad{background:rgba(255,68,102,.1);color:#ff4466;}

  /* ── ADMIN ── */
  .admin-shell{max-width:960px;margin:0 auto;padding:0 20px 170px;}
  .admin-top{padding:26px 0 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:24px;gap:10px;flex-wrap:wrap;}
  .admin-logo{font-family:'Bebas Neue',cursive;font-size:26px;letter-spacing:5px;color:var(--accent);}
  .anav{display:flex;gap:2px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r-xs);padding:3px;}
  .anav-btn{background:none;border:none;font-family:'Manrope',sans-serif;font-size:12px;font-weight:700;color:var(--text-muted);padding:7px 14px;border-radius:8px;cursor:pointer;transition:all .18s;}
  .anav-btn.on{background:var(--accent);color:#000;}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:22px;}
  .kpi{background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r-sm);padding:20px 18px;position:relative;overflow:hidden;}
  .kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--accent);}
  .kpi-v{font-family:'Bebas Neue',cursive;font-size:40px;color:var(--accent);line-height:1;margin-bottom:4px;}
  .kpi-l{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);font-weight:600;}
  .sec-h{font-family:'Bebas Neue',cursive;font-size:22px;letter-spacing:2px;margin-bottom:14px;color:var(--accent);}
  .tbox{background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r);overflow:hidden;margin-bottom:22px;}
  table{width:100%;border-collapse:collapse;}
  th{padding:12px 16px;text-align:left;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);border-bottom:1px solid rgba(255,255,255,.07);font-weight:600;}
  td{padding:13px 16px;font-size:13px;border-bottom:1px solid rgba(255,255,255,.05);}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:rgba(255,255,255,.03);}
  .tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;}
  .t-ok{background:var(--accent-dim);color:var(--accent);}
  .t-bad{background:rgba(255,68,102,.1);color:#ff4466;}
  .t-active{background:var(--accent-dim);color:var(--accent);}
  .t-inactive{background:rgba(255,255,255,.06);color:var(--text-muted);}
  .qr-row{background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r-sm);padding:16px 20px;margin-bottom:10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;transition:border-color .2s;}
  .qr-row:hover{border-color:var(--accent);}
  .qr-lbl{font-family:'Bebas Neue',cursive;font-size:18px;letter-spacing:1px;min-width:90px;}
  .qr-url{font-family:monospace;font-size:11px;color:var(--text-muted);background:rgba(255,255,255,.06);padding:4px 8px;border-radius:6px;flex:1;}
  .sdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
  .sdot-on{background:var(--accent);box-shadow:0 0 6px var(--accent);}
  .sdot-off{background:var(--text-dim);}
  select.sel-inp{background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.1);border-radius:var(--r-xs);color:var(--text);font-family:'Manrope',sans-serif;font-size:13px;font-weight:600;padding:7px 10px;outline:none;cursor:pointer;}
  .form-box{background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r);padding:22px;margin-bottom:18px;}
  .fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
  @media(max-width:480px){.fg2{grid-template-columns:1fr;}}
  .btn-sm{background:var(--accent);border:none;border-radius:var(--r-xs);color:#000;font-family:'Manrope',sans-serif;font-size:12px;font-weight:800;padding:8px 16px;cursor:pointer;transition:opacity .2s;}
  .btn-sm:hover{opacity:.85;}
  .btn-sm-g{background:none;border:1.5px solid rgba(255,255,255,.1);border-radius:var(--r-xs);color:var(--text-muted);font-family:'Manrope',sans-serif;font-size:12px;font-weight:600;padding:8px 14px;cursor:pointer;transition:all .2s;}
  .btn-sm-g:hover{border-color:var(--accent);color:var(--text);}
  .login-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
  .login-card{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:var(--r);padding:40px 30px;width:100%;max-width:340px;text-align:center;backdrop-filter:blur(20px);}
  .login-logo{font-family:'Bebas Neue',cursive;font-size:44px;letter-spacing:8px;color:var(--accent);text-shadow:0 0 30px var(--accent);margin-bottom:4px;}
  .login-sub{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text-dim);margin-bottom:28px;font-weight:700;}
  .login-err{font-size:12px;color:#ff4466;margin-bottom:10px;font-weight:700;}
  .spinner{width:16px;height:16px;border:2px solid rgba(0,0,0,.2);border-top-color:#000;border-radius:50%;animation:spin .7s linear infinite;}
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:500;padding:20px;backdrop-filter:blur(8px);animation:fadeIn .2s ease;}
  .modal-card{background:#12091e;border:1.5px solid var(--accent);border-radius:var(--r);padding:28px;width:100%;max-width:500px;max-height:80vh;overflow-y:auto;animation:enter .25s ease both;}
  .modal-title{font-family:'Bebas Neue',cursive;font-size:26px;letter-spacing:2px;margin-bottom:4px;}
  .modal-sub{font-size:12px;color:var(--text-muted);margin-bottom:22px;line-height:1.6;}
  .config-section{margin-bottom:20px;}
  .config-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--accent);margin-bottom:10px;display:block;font-weight:700;}
  .config-opts{display:flex;flex-direction:column;gap:6px;}
  .config-opt{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r-xs);padding:10px 14px;cursor:pointer;transition:all .18s;font-size:13px;font-weight:600;}
  .config-opt:hover{border-color:var(--accent);}
  .config-opt.sel{border-color:var(--accent);background:var(--accent-dim);}
  .config-check{width:18px;height:18px;border-radius:50%;border:1.5px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;transition:all .18s;font-weight:800;}
  .config-opt.sel .config-check{background:var(--accent);border-color:var(--accent);color:#000;}
  .modal-actions{display:flex;gap:8px;margin-top:22px;}
  .multi-note{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);margin-bottom:12px;font-weight:700;}
  .inp,.rinp{width:100%;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:var(--r-xs);padding:13px 15px;color:var(--text);font-size:14px;font-family:'Manrope',sans-serif;outline:none;transition:border-color .2s;margin-bottom:10px;}
  .inp:focus,.rinp:focus{border-color:var(--accent);}
  .inp::placeholder,.rinp::placeholder{color:rgba(255,255,255,.2);}
  .inp-lbl,.rinp-lbl{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;display:block;}
  .demo-bar{position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:center;gap:4px;background:rgba(10,0,18,0.97);border-top:1.5px solid rgba(255,255,255,.08);padding:10px 8px 14px;z-index:1000;backdrop-filter:blur(16px);}
  .demo-btn{background:none;border:none;font-family:'Manrope',sans-serif;font-size:11px;font-weight:700;color:var(--text-muted);padding:6px 14px;border-radius:99px;cursor:pointer;transition:all .18s;white-space:nowrap;}
  .demo-btn.on{background:var(--accent);color:#000;}
`;

// ─── PASSWORD INPUT ───────────────────────────────────────────────────────────
function PasswordInput({value,onChange,placeholder="Mínimo 8 caracteres",className="rinp"}) {
  const [show,setShow]=useState(false);
  return(
    <div className="pass-wrap">
      <input className={className} type={show?"text":"password"} placeholder={placeholder} value={value} onChange={onChange}/>
      <button className="eye-btn" onClick={()=>setShow(s=>!s)} type="button">
        {show
          ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        }
      </button>
    </div>
  );
}

// ─── SESSION CONFIG MODAL ─────────────────────────────────────────────────────
function SessionConfigModal({qr,wines,denominations,onClose,onSave}) {
  const [event,setEvent]=useState("");const [wineId,setWineId]=useState("");const [decoys,setDecoys]=useState([]);const [dens,setDens]=useState([]);
  const cw=wines.find(w=>w.id===wineId);const cd=cw?.denomination||"";
  const toggleDecoy=id=>{if(id===wineId)return;setDecoys(p=>p.includes(id)?p.filter(x=>x!==id):p.length<2?[...p,id]:p);};
  const toggleDen=d=>{if(d===cd)return;setDens(p=>p.includes(d)?p.filter(x=>x!==d):p.length<2?[...p,d]:p);};
  const canSave=wineId&&decoys.length===2&&(dens.length===2||!cd);
  return(
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-card">
        <div className="modal-title">Configurar — {qr?.label}</div>
        <div className="modal-sub">Elige el vino correcto, dos señuelos y dos denominaciones incorrectas.</div>
        <div className="config-section"><label className="inp-lbl">Nombre del evento</label><input className="rinp" placeholder="Ej: Cata Bar Velázquez" value={event} onChange={e=>setEvent(e.target.value)} style={{marginBottom:0}}/></div>
        <div className="config-section"><span className="config-label">✓ Vino correcto</span><div className="config-opts">{wines.map(w=><div key={w.id} className={`config-opt${wineId===w.id?" sel":""}`} onClick={()=>{setWineId(w.id);setDecoys([]);setDens([]);}}><div className="config-check">{wineId===w.id?"✓":""}</div><div><div style={{fontWeight:700}}>{w.name}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{w.denomination} · {w.winery}</div></div></div>)}</div></div>
        {wineId&&<div className="config-section"><span className="config-label">✗ Señuelos (elige 2)</span><div className="config-opts">{wines.filter(w=>w.id!==wineId).map(w=><div key={w.id} className={`config-opt${decoys.includes(w.id)?" sel":""}`} onClick={()=>toggleDecoy(w.id)}><div className="config-check">{decoys.includes(w.id)?"✓":""}</div><div><div style={{fontWeight:700}}>{w.name}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{w.denomination}</div></div></div>)}</div></div>}
        {wineId&&cd&&<div className="config-section"><span className="config-label">D.O. correcta: {cd} · Elige 2 incorrectas</span><div className="config-opts">{denominations.filter(d=>d!==cd).map(d=><div key={d} className={`config-opt${dens.includes(d)?" sel":""}`} onClick={()=>toggleDen(d)}><div className="config-check">{dens.includes(d)?"✓":""}</div><div style={{fontWeight:700}}>{d}</div></div>)}</div></div>}
        <div className="modal-actions"><button className="btn-sm" disabled={!canSave} onClick={()=>onSave(qr.id,{wineId,decoyWineIds:decoys,denominationOptions:[cd,...dens],event})}>Activar sesión</button><button className="btn-sm-g" onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  );
}

// ─── SURVEY ───────────────────────────────────────────────────────────────────
function SurveyApp({qrCode="abc123",onGoProfile}) {
  const session=getActiveTasting(qrCode);
  const wine=session?.wine;
  const steps=session?.steps||[];
  const totalSteps=steps.length;
  const contactStep=totalSteps+1;

  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState({});
  const [mode,setMode]=useState("email");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [pass,setPass]=useState("");
  const [done,setDone]=useState(false);
  const [loading,setLoading]=useState(false);
  const [hoverStar,setHoverStar]=useState(0);

  const surveyStep=step>=1&&step<=totalSteps?steps[step-1]:null;
  const palette=PALETTES[(step)%PALETTES.length];
  const setAnswer=val=>setAnswers(a=>({...a,[surveyStep.key]:val}));
  const currentAnswer=surveyStep?answers[surveyStep.key]:null;
  const canContinue=()=>{if(!surveyStep||surveyStep.optional)return true;const a=currentAnswer;if(surveyStep.type==="multi")return Array.isArray(a)&&a.length>0;if(surveyStep.type==="stars")return a>0;return !!a;};
  const submit=()=>{setLoading(true);setTimeout(()=>{setLoading(false);setDone(true);},1000);};

  const starWords=["","No me convenció","Regular","Bien","Muy bueno","¡Excepcional!"];
  const stepLabels=["VALORACIÓN","DENOMINACIÓN","EL VINO","LA UVA","COLOR","NOTAS"];

  if(!wine)return <div className="rave-shell" style={{justifyContent:"center",alignItems:"center",textAlign:"center",padding:"0 24px"}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:60,color:"var(--accent)"}}>!</div><div style={{fontSize:20,fontWeight:800,marginBottom:8}}>Sin sesión activa</div><div style={{color:"var(--text-muted)"}}>Este QR no tiene cata asignada.</div></div>;

  if(done){
    const {correct,total}=calcCorrect(answers,steps,wine);const contact=email||phone;
    return(
      <div className="rave-shell" style={{background:PALETTES[0].bg}}>
        <div className="rave-ambient" style={{background:`radial-gradient(ellipse 70% 50% at 50% 0%,${PALETTES[0].glow} 0%,transparent 60%)`}}/>
        <div className="rave-result">
          <div className="rave-result-hero">
            <Waveform accent={PALETTES[0].accent}/>
            <div style={{position:"relative",zIndex:2}}>
              <div className="rave-result-big">{answers.stars?`${answers.stars}/5`:"—"}</div>
              <div className="rave-result-tag">TU PUNTUACIÓN · {session.tasting.event}</div>
            </div>
          </div>
          <div className="rave-chips">
            {total>0&&<div className="rave-chip"><span className="rc-label">ACIERTOS</span><span className={`rc-val ${correct===total?"rc-ok":"rc-bad"}`}>{correct}/{total}</span></div>}
            <div className="rave-chip"><span className="rc-label">D.O. ELEGIDA</span><span className="rc-val">{answers.denomination||"—"}</span></div>
            <div className="rave-chip"><span className="rc-label">VINO ELEGIDO</span><span className="rc-val">{answers.wineName||"—"}</span></div>
          </div>
          <div className="rave-cta">
            {contact?<><div className="rave-cta-title">¡Ya casi!</div><div className="rave-cta-sub">En breve recibirás el resultado real y tus estadísticas.</div><button className="rave-btn" onClick={onGoProfile}>VER MI PERFIL →</button></>
            :<><div className="rave-cta-title">¿Quieres saberlo?</div><div className="rave-cta-sub">Déjanos tu contacto y revelamos el vino y tus estadísticas.</div><button className="rave-btn" onClick={()=>{setDone(false);setStep(contactStep);}}>QUIERO SABERLO →</button></>}
          </div>
        </div>
      </div>
    );
  }

  return(
    <div className="rave-shell" style={{background:palette.bg,transition:"background .6s"}}>
      {/* Ambient glow */}
      <div className="rave-ambient" style={{background:`radial-gradient(ellipse 80% 60% at 50% -10%,${palette.glow} 0%,transparent 60%)`}}/>

      <style>{`:root{--accent:${palette.accent};--accent-dim:${palette.accent}1a;}`}</style>

      <div className="rave-top">
        <div className="rave-logo">WOW</div>
        {step>0&&step<=totalSteps&&<div className="rave-step-counter">{stepLabels[(step-1)%stepLabels.length]}</div>}
      </div>

      <div className="rave-progress">
        <div className="rave-progress-fill" style={{width:`${step===0?0:Math.min(((step-1)/totalSteps)*100,100)}%`,background:palette.accent,boxShadow:`0 0 10px ${palette.accent}`}}/>
      </div>

      <div className="rave-wave" key={`wave-${step}`}>
        <Waveform accent={palette.accent}/>
      </div>

      {/* WELCOME */}
      {step===0&&(
        <div className="rave-welcome" key="w">
          <div className="rave-welcome-tag"><div className="rtag-dot"/>CATA CIEGA ACTIVA</div>
          <div className="rave-big">¿QUÉ HAY EN TU <span>COPA</span>?</div>
          <div className="rave-welcome-sub">Valora el vino sin conocer su origen. Solo tú y tu paladar cuentan.</div>
        </div>
      )}

      {/* DYNAMIC STEPS */}
      {surveyStep&&(
        <div className="rave-content" key={`s${step}`} style={{animation:"enter .35s cubic-bezier(.4,0,.2,1) both"}}>
          <div className="rave-label">{String(step).padStart(2,"0")}</div>
          <div className="rave-q">{surveyStep.question}</div>
          <div className="rave-sub">{surveyStep.sub}</div>

          {surveyStep.type==="stars"&&(
            <div>
              <div className="rave-stars">
                {[1,2,3,4,5].map(n=>(
                  <div key={n} className={`rstar${n<=(hoverStar||currentAnswer||0)?" lit":""}`}
                    onMouseEnter={()=>setHoverStar(n)} onMouseLeave={()=>setHoverStar(0)}
                    onClick={()=>setAnswer(n)}>★</div>
                ))}
              </div>
              <div className="star-word" style={{color:palette.accent,opacity:(hoverStar||currentAnswer)?1:0}}>{starWords[hoverStar||currentAnswer||0]}</div>
            </div>
          )}

          {surveyStep.type==="options"&&(()=>{
            const opts=surveyStep.optionsKey?wine[surveyStep.optionsKey]:surveyStep.options;
            return(<div className="rave-opts">{(opts||[]).map(o=><div key={o} className={`ropt${currentAnswer===o?" sel":""}`} onClick={()=>setAnswer(o)} style={currentAnswer===o?{borderColor:palette.accent,background:`${palette.accent}18`}:{}}><div className="ropt-dot" style={currentAnswer===o?{background:palette.accent,borderColor:palette.accent,color:"#000"}:{}}>{currentAnswer===o?"✓":""}</div>{o}</div>)}</div>);
          })()}

          {surveyStep.type==="scale"&&(()=>{
            const pts=Array.from({length:surveyStep.max-surveyStep.min+1},(_,i)=>surveyStep.min+i);
            return(<div><div className="rave-scale">{pts.map(n=><div key={n} className={`rscl${currentAnswer===n?" sel":""}`} style={currentAnswer===n?{background:`${palette.accent}20`,borderColor:palette.accent,color:palette.accent}:{}} onClick={()=>setAnswer(n)}>{n}</div>)}</div>{surveyStep.labels&&<div className="scale-ends"><span>{surveyStep.labels.min}</span><span>{surveyStep.labels.max}</span></div>}</div>);
          })()}

          {surveyStep.type==="multi"&&(()=>{
            const opts=surveyStep.optionsKey?wine[surveyStep.optionsKey]:surveyStep.options;
            const sel=currentAnswer||[];
            const toggle=v=>setAnswer(sel.includes(v)?sel.filter(x=>x!==v):[...sel,v]);
            return(<><div className="multi-note">Selección múltiple</div><div className="rave-opts">{(opts||[]).map(o=><div key={o} className={`ropt${sel.includes(o)?" sel":""}`} onClick={()=>toggle(o)} style={sel.includes(o)?{borderColor:palette.accent,background:`${palette.accent}18`}:{}}><div className="ropt-dot" style={sel.includes(o)?{background:palette.accent,borderColor:palette.accent,color:"#000"}:{}}>{sel.includes(o)?"✓":""}</div>{o}</div>)}</div></>);
          })()}

          {surveyStep.type==="text"&&<textarea className="rtxta" placeholder={surveyStep.placeholder||"Escribe aquí..."} value={currentAnswer||""} onChange={e=>setAnswer(e.target.value)} style={{borderColor:currentAnswer?"rgba(255,255,255,.18)":"rgba(255,255,255,.08)"}}/>}
        </div>
      )}

      {/* CONTACT */}
      {step===contactStep&&(
        <div className="rave-content" key="contact" style={{animation:"enter .35s cubic-bezier(.4,0,.2,1) both"}}>
          <div className="rave-label">!</div>
          <div className="rave-q">¿Quieres el resultado?</div>
          <div className="rave-sub">Déjanos tu contacto y revelamos el vino real y tus estadísticas. Totalmente opcional.</div>
          <div className="rave-ctabs">
            {[["email","Email"],["phone","Teléfono"],["account","Cuenta"]].map(([m,l])=>(
              <button key={m} className={`rctab${mode===m?" on":""}`} style={mode===m?{background:palette.accent}:{}} onClick={()=>setMode(m)}>{l}</button>
            ))}
          </div>
          {mode==="email"&&(<><label className="rinp-lbl">Email</label><input className="rinp" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/><div className="rinp-note">Recibirás un link mágico para acceder a tu perfil.</div></>)}
          {mode==="phone"&&(<><label className="rinp-lbl">Teléfono</label><input className="rinp" placeholder="+34 600 000 000" value={phone} onChange={e=>setPhone(e.target.value)}/><div className="rinp-note">Te lo mandamos por WhatsApp.</div></>)}
          {mode==="account"&&(<><label className="rinp-lbl">Email</label><input className="rinp" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/><label className="rinp-lbl">Contraseña</label><PasswordInput value={pass} onChange={e=>setPass(e.target.value)}/><div className="rinp-note">Accede siempre a tu historial de catas.</div></>)}
        </div>
      )}

      {/* Fixed CTA */}
      <div className="rave-action" style={{background:`linear-gradient(0deg,${palette.bg} 50%,transparent)`}}>
        {step===0&&<button className="rave-btn" style={{background:palette.accent}} onClick={()=>setStep(1)}>EMPEZAR →</button>}
        {surveyStep&&<>
          <button className="rave-btn" style={{background:palette.accent}} onClick={()=>setStep(s=>s+1)} disabled={!canContinue()}>
            {loading?<div className="spinner"/>:step===totalSteps?"FINALIZAR →":"SIGUIENTE →"}
          </button>
          {surveyStep.optional&&!currentAnswer&&<button className="rave-btn-ghost" onClick={()=>setStep(s=>s+1)}>Omitir</button>}
        </>}
        {step===contactStep&&<>
          <button className="rave-btn" style={{background:palette.accent}} onClick={submit} disabled={loading}>
            {loading?<div className="spinner"/>:email||phone?"ENVIAR Y REVELAR →":"ENVIAR →"}
          </button>
          {!email&&!phone&&<button className="rave-btn-ghost" onClick={submit}>Omitir y enviar</button>}
        </>}
      </div>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function UserProfile({user=DB.users[0],onBack}) {
  const ratings=getUserRatings(user.id);
  const total=ratings.length;
  const totalQ=ratings.reduce((s,r)=>s+(r.total||0),0);
  const totalC=ratings.reduce((s,r)=>s+(r.correct||0),0);
  const pct=totalQ?Math.round((totalC/totalQ)*100):0;
  const avg=total?(ratings.reduce((a,b)=>a+(b.answers?.stars||0),0)/total).toFixed(1):"—";
  const GLOBAL=58;
  const denoms={};ratings.forEach(r=>{if(r.wine)denoms[r.wine.denomination]=(denoms[r.wine.denomination]||0)+1;});
  const favDen=Object.entries(denoms).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
  return(
    <div className="rave-shell">
      <div className="rave-ambient" style={{background:`radial-gradient(ellipse 70% 50% at 50% 0%,${PALETTES[0].glow} 0%,transparent 60%)`}}/>
      <div className="profile-shell">
        <div className="profile-top">
          <div className="rav-av">{user.name?.[0]}</div>
          <div><div className="pn">{user.name}</div><div className="pe">{user.email}</div></div>
          <button className="btn-sm-g" style={{marginLeft:"auto"}} onClick={onBack}>← Volver</button>
        </div>
        <div className="pstats">{[[total,"Catas"],[pct+"%","Aciertos"],[avg+"★","Media"]].map(([v,l])=><div className="pstat" key={l}><div className="pstat-v">{v}</div><div className="pstat-l">{l}</div></div>)}</div>
        <div className="ins-row"><div className="ins-ic">🏆</div><div><div className="ins-l">Vs media global</div><div className="ins-v">{pct}% tú · {GLOBAL}% media · {pct>=GLOBAL?"¡Por encima! 🎉":"Sigue catando 💪"}</div></div></div>
        <div className="ins-row"><div className="ins-ic">🍇</div><div><div className="ins-l">D.O. favorita</div><div className="ins-v">{favDen}</div></div></div>
        <div className="hist-h">Historial</div>
        {ratings.map((r,i)=>(
          <div className="hr-row" key={r.id} style={{animationDelay:`${i*.06}s`}}>
            <div className="hr-ic">🍷</div>
            <div style={{flex:1,minWidth:0}}><div className="hr-name">{r.wine?.name||"—"}</div><div className="hr-meta">{r.tasting?.event} · {r.date}</div></div>
            <div className="hr-r">
              <div className="hr-stars">{"★".repeat(r.answers?.stars||0)}{"☆".repeat(5-(r.answers?.stars||0))}</div>
              <div className={`hr-badge ${r.correct===r.total&&r.total>0?"hb-ok":"hb-bad"}`}>{r.total>0?`${r.correct}/${r.total} ✓`:"sin aciertos"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function AdminPanel({onLogout}) {
  const [tab,setTab]=useState("dashboard");
  const [wines,setWines]=useState(DB.wines);
  const [tastings,setTastings]=useState(DB.tastings);
  const [ratings]=useState(DB.ratings);
  const [showForm,setShowForm]=useState(false);
  const [nw,setNw]=useState({name:"",winery:"",denomination:"",vintage:""});
  const [configuringQr,setConfiguringQr]=useState(null);
  const total=ratings.length;
  const avg=(ratings.reduce((a,b)=>a+(b.answers?.stars||0),0)/total).toFixed(1);
  const cr=Math.round((ratings.filter(r=>{const t=DB.tastings.find(tt=>tt.id===r.tastingId);const w=DB.wines.find(ww=>ww.id===t?.wineId);const steps=t?.steps||DEFAULT_STEPS;const{correct,total:tot}=calcCorrect(r.answers||{},steps,w||{});return correct===tot&&tot>0;}).length/total)*100);
  const addWine=()=>{if(!nw.name)return;setWines(p=>[...p,{...nw,id:"w"+Date.now(),optionsDenomination:[nw.denomination,"Rioja","Ribera del Duero"],optionsName:[nw.name,"Opción 2","Opción 3"]}]);setNw({name:"",winery:"",denomination:"",vintage:""});setShowForm(false);};
  return(
    <div className="admin-shell">
      <div className="admin-top">
        <div className="admin-logo">WOW</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div className="anav">{[["dashboard","Dashboard"],["qr","QR & Sesiones"],["wines","Vinos"],["ratings","Valoraciones"],["users","Usuarios"]].map(([k,l])=><button key={k} className={`anav-btn${tab===k?" on":""}`} onClick={()=>setTab(k)}>{l}</button>)}</div>
          <button className="btn-sm-g" onClick={onLogout}>Salir</button>
        </div>
      </div>

      {tab==="dashboard"&&(<><div className="kpis">{[[total,"Valoraciones"],[avg+"★","Media"],[cr+"%","Aciertos"],[DB.users.length,"Usuarios"]].map(([v,l])=><div className="kpi" key={l}><div className="kpi-v">{v}</div><div className="kpi-l">{l}</div></div>)}</div><div className="sec-h">Últimas valoraciones</div><div className="tbox"><table><thead><tr><th>Vino</th><th>Evento</th><th>⭐</th><th>D.O.</th><th>Aciertos</th><th>Fecha</th></tr></thead><tbody>{ratings.map(r=>{const t=tastings.find(tt=>tt.id===r.tastingId),w=wines.find(ww=>ww.id===t?.wineId);const steps=t?.steps||DEFAULT_STEPS;const{correct,total:tot}=calcCorrect(r.answers||{},steps,w||{});return(<tr key={r.id}><td><strong>{w?.name||"—"}</strong></td><td style={{color:"var(--text-muted)",fontSize:12}}>{t?.event||"—"}</td><td style={{color:"var(--accent)"}}>{"★".repeat(r.answers?.stars||0)}</td><td>{r.answers?.denomination||"—"}</td><td><span className={`tag ${correct===tot&&tot>0?"t-ok":"t-bad"}`}>{correct}/{tot}</span></td><td style={{fontSize:11,color:"var(--text-muted)"}}>{r.date}</td></tr>);})}</tbody></table></div></>)}
      {tab==="qr"&&(<><div className="sec-h">QR & Sesiones</div><p style={{fontSize:12,color:"var(--text-muted)",marginBottom:20,lineHeight:1.7}}>Configura cada QR: vino correcto, señuelos y denominaciones.</p>{DB.qr_codes.map(qr=>{const active=tastings.find(t=>t.qrId===qr.id&&t.active);const aw=wines.find(w=>w.id===active?.wineId);const hist=tastings.filter(t=>t.qrId===qr.id&&!t.active);return(<div key={qr.id} style={{marginBottom:12}}><div className="qr-row"><div><div className="qr-lbl">{qr.label}</div><div className="qr-url">wow.app/v/{qr.code}</div></div><div style={{display:"flex",alignItems:"center",gap:7,flex:1}}><div className={`sdot ${active?"sdot-on":"sdot-off"}`}/><span style={{fontSize:12,color:active?"var(--accent)":"var(--text-muted)"}}>{active?`Activo → ${aw?.name}`:"Sin sesión"}</span></div><div style={{display:"flex",gap:6,marginLeft:"auto"}}>{active&&<button className="btn-sm-g" onClick={()=>setTastings(p=>p.map(t=>t.id===active.id?{...t,active:false}:t))}>Desactivar</button>}<button className="btn-sm" onClick={()=>setConfiguringQr(qr.id)}>{active?"Reconfigurar":"Configurar"}</button></div></div>{hist.length>0&&<div style={{padding:"0 20px 2px",fontSize:10,color:"var(--text-muted)"}}>Historial: {hist.map(h=>{const w=wines.find(ww=>ww.id===h.wineId);return`${w?.name} (${h.date})`;}).join(" · ")}</div>}</div>);})} {configuringQr&&<SessionConfigModal qr={DB.qr_codes.find(q=>q.id===configuringQr)} wines={wines} denominations={DB.denominations} onClose={()=>setConfiguringQr(null)} onSave={(qrId,config)=>{setTastings(p=>[...p.map(t=>t.qrId===qrId?{...t,active:false}:t),{id:"t"+Date.now(),qrId,wineId:config.wineId,event:config.event||"Evento "+new Date().toLocaleDateString(),date:new Date().toISOString().split("T")[0],active:true}]);setConfiguringQr(null);}}/>}</>)}
      {tab==="wines"&&(<><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}><div className="sec-h" style={{marginBottom:0}}>Catálogo</div><button className="btn-sm" onClick={()=>setShowForm(f=>!f)}>+ Añadir</button></div>{showForm&&<div className="form-box"><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2,marginBottom:14}}>Nuevo vino</div><div className="fg2">{[["Nombre","name"],["Bodega","winery"],["Denominación","denomination"],["Añada","vintage"]].map(([l,k])=><div key={k}><label className="rinp-lbl">{l}</label><input className="rinp" style={{marginBottom:0}} placeholder={l} value={nw[k]} onChange={e=>setNw(p=>({...p,[k]:e.target.value}))}/></div>)}</div><div style={{display:"flex",gap:8}}><button className="btn-sm" onClick={addWine}>Guardar</button><button className="btn-sm-g" onClick={()=>setShowForm(false)}>Cancelar</button></div></div>}<div className="tbox"><table><thead><tr><th>Nombre</th><th>Bodega</th><th>D.O.</th><th>Añada</th><th>Vals.</th><th></th></tr></thead><tbody>{wines.map(w=>{const wr=ratings.filter(r=>{const t=tastings.find(tt=>tt.id===r.tastingId);return t?.wineId===w.id;});return(<tr key={w.id}><td><strong>{w.name}</strong></td><td style={{color:"var(--text-muted)"}}>{w.winery}</td><td>{w.denomination}</td><td style={{color:"var(--text-muted)"}}>{w.vintage}</td><td style={{color:"var(--accent)",fontWeight:700}}>{wr.length}</td><td><button className="btn-sm-g">Stats</button></td></tr>);})}</tbody></table></div></>)}
      {tab==="ratings"&&(<><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}><div className="sec-h" style={{marginBottom:0}}>Valoraciones</div><button className="btn-sm">↓ CSV</button></div><div className="tbox"><table><thead><tr><th>Vino</th><th>Evento</th><th>⭐</th><th>D.O.</th><th>Vino elegido</th><th>Aciertos</th><th>Usuario</th><th>Fecha</th></tr></thead><tbody>{ratings.map(r=>{const t=tastings.find(tt=>tt.id===r.tastingId),w=wines.find(ww=>ww.id===t?.wineId),u=DB.users.find(uu=>uu.id===r.userId);const steps=t?.steps||DEFAULT_STEPS;const{correct,total:tot}=calcCorrect(r.answers||{},steps,w||{});return(<tr key={r.id}><td><strong>{w?.name||"—"}</strong></td><td style={{fontSize:11,color:"var(--text-muted)"}}>{t?.event||"—"}</td><td style={{color:"var(--accent)"}}>{"★".repeat(r.answers?.stars||0)}</td><td>{r.answers?.denomination||"—"}</td><td style={{fontSize:12}}>{r.answers?.wineName||"—"}</td><td><span className={`tag ${correct===tot&&tot>0?"t-ok":"t-bad"}`}>{correct}/{tot}</span></td><td style={{fontSize:11,color:"var(--text-muted)"}}>{u?.email||"—"}</td><td style={{fontSize:11,color:"var(--text-muted)"}}>{r.date}</td></tr>);})}</tbody></table></div></>)}
      {tab==="users"&&(<><div className="sec-h">Usuarios</div><div className="tbox"><table><thead><tr><th>Nombre</th><th>Email</th><th>Tipo</th><th>Catas</th><th>Aciertos</th><th></th></tr></thead><tbody>{DB.users.map(u=>{const ur=getUserRatings(u.id);const tQ=ur.reduce((s,r)=>s+(r.total||0),0);const tC=ur.reduce((s,r)=>s+(r.correct||0),0);return(<tr key={u.id}><td><strong>{u.name}</strong></td><td style={{fontSize:12,color:"var(--text-muted)"}}>{u.email}</td><td><span className={`tag ${u.hasPassword?"t-active":"t-inactive"}`}>{u.hasPassword?"Cuenta":"Magic link"}</span></td><td style={{color:"var(--accent)",fontWeight:700}}>{ur.length}</td><td>{tQ?Math.round((tC/tQ)*100)+"%":"—"}</td><td><button className="btn-sm-g">Ver perfil</button></td></tr>);})}</tbody></table></div></>)}
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({onLogin}) {
  const [pass,setPass]=useState("");const [err,setErr]=useState(false);
  const go=()=>{if(pass==="wow2024")onLogin();else{setErr(true);setTimeout(()=>setErr(false),1400);}};
  return(
    <div className="login-shell">
      <div className="login-card">
        <div className="login-logo">WOW</div>
        <div className="login-sub">Panel de administración</div>
        <PasswordInput value={pass} onChange={e=>setPass(e.target.value)} placeholder="Contraseña"/>
        {err&&<div className="login-err">Contraseña incorrecta</div>}
        <button className="rave-btn" onClick={go}>ENTRAR →</button>
        <p style={{fontSize:11,color:"var(--text-dim)",marginTop:20}}>Demo: wow2024</p>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState("survey");
  const [auth,setAuth]=useState(false);
  const go=v=>setView(v);
  return(
    <>
      <style>{css}</style>
      <div className="app">
        {view==="survey"&&<SurveyApp qrCode="abc123" onGoProfile={()=>go("profile")}/>}
        {view==="profile"&&<UserProfile user={DB.users[0]} onBack={()=>go("survey")}/>}
        {view==="login"&&<AdminLogin onLogin={()=>{setAuth(true);go("admin");}}/>}
        {view==="admin"&&auth&&<AdminPanel onLogout={()=>{setAuth(false);go("login");}}/>}
        <div className="demo-bar">
          <span style={{fontSize:10,color:"var(--text-muted)",padding:"0 4px"}}>DEMO</span>
          {[["survey","🍷 Encuesta"],["profile","👤 Perfil"],["login","⚡ Admin"]].map(([v,l])=>(
            <button key={v} className={`demo-btn${view===v||(v==="login"&&view==="admin")?" on":""}`}
              onClick={()=>v==="login"&&auth?go("admin"):go(v)}>{l}</button>
          ))}
        </div>
      </div>
    </>
  );
}
