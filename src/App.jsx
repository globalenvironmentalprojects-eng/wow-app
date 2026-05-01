import { useState, useEffect, useRef } from "react";
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { db, auth } from './firebase.js';
import {
  collection, query, where, getDocs,
  addDoc, serverTimestamp, updateDoc, doc
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "firebase/auth";

// ─── DEFAULT STEPS ────────────────────────────────────────────────────────────
const DEFAULT_STEPS = [
  { type:"stars",   key:"stars",        question:"¿Cómo lo valoras?",          sub:"Puntúa del 1 al 5 según tu experiencia." },
  { type:"options", key:"denomination", question:"¿Cuál es la denominación?",   sub:"Elige la que crees correcta.", optionsKey:"optionsDenomination", correctKey:"denomination" },
  { type:"options", key:"wineName",     question:"¿Cuál es el vino?",           sub:"¿Reconoces alguno en tu copa?", optionsKey:"optionsName", correctKey:"name" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function calcCorrect(a, s, w) {
  let c=0, t=0;
  s.forEach(x => { if(!x.correctKey) return; t++; if(a[x.key]===w[x.correctKey]) c++; });
  return { correct:c, total:t };
}

async function getActiveTastingByCode(code) {
  console.log("Buscando código:", code);
  const qrSnap = await getDocs(query(collection(db,"qr_codes"), where("code","==",code)));
  const numSnap = await getDocs(query(collection(db,"qr_codes"), where("numericCode","==",code)));
  console.log("Por code:", qrSnap.size, "Por numericCode:", numSnap.size);
  const qrDoc = qrSnap.docs[0] || numSnap.docs[0];
  if (!qrDoc) return null;
  const qr = { id: qrDoc.id, ...qrDoc.data() };
  console.log("QR encontrado:", qr);
  const tSnap = await getDocs(query(collection(db,"tastings"),
    where("qrId","==",qr.id), where("active","==",true)));
  console.log("Tastings activos:", tSnap.size);
  if (tSnap.empty) return null;
  const tasting = { id: tSnap.docs[0].id, ...tSnap.docs[0].data() };
  const wineSnap = await getDocs(collection(db,"wines"));
  const wineDoc = wineSnap.docs.find(d => d.id === tasting.wineId);
  if (!wineDoc) return null;
  const wine = { id: wineDoc.id, ...wineDoc.data() };
  return { tasting, wine, qr, steps: tasting.steps || DEFAULT_STEPS };
}

// ─── QR SCANNER COMPONENT ─────────────────────────────────────────────────────
function QRScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [manualCode, setManualCode] = useState("");
  const [mode, setMode] = useState("camera");
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (mode !== "camera") return;
    let active = true;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t=>t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        const scan = () => {
          if (!active) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            import("jsqr").then(({ default: jsQR }) => {
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              if (code) {
                active = false;
                stopCamera();
                onResult(code.data);
                return;
              }
            });
          }
          rafRef.current = requestAnimationFrame(scan);
        };
        videoRef.current.onloadedmetadata = () => { rafRef.current = requestAnimationFrame(scan); };
      })
      .catch(() => setMode("manual"));

    return () => { active = false; stopCamera(); };
  }, [mode]);

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t=>t.stop());
  };

  const close = () => { stopCamera(); onClose(); };

  return (
    <div style={{position:"fixed",inset:0,background:"#000",zIndex:200,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:"100%",maxWidth:420,padding:"20px 22px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,0.8)"}}>
        <div style={{fontFamily:"Fraunces,serif",fontSize:18,fontWeight:800,color:"var(--neon)",letterSpacing:4}}>WOW</div>
        <button onClick={close} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontFamily:"DM Mono,monospace",fontSize:12}}>✕ Cerrar</button>
      </div>

      <div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:4,margin:"0 0 16px",width:"calc(100% - 44px)",maxWidth:376}}>
        {[["camera","📷 Cámara"],["manual","⌨️ Manual"]].map(([m,l])=>(
          <button key={m} onClick={()=>{stopCamera();setMode(m);}} style={{flex:1,background:mode===m?"var(--neon)":"none",border:"none",color:mode===m?"#000":"rgba(255,255,255,0.6)",padding:"9px 6px",borderRadius:7,cursor:"pointer",fontFamily:"Fraunces,serif",fontSize:12,fontWeight:700}}>{l}</button>
        ))}
      </div>

      {mode==="camera"&&(
        <div style={{flex:1,width:"100%",maxWidth:420,position:"relative",overflow:"hidden"}}>
          <video ref={videoRef} playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          <canvas ref={canvasRef} style={{display:"none"}}/>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            <div style={{width:220,height:220,border:"2px solid var(--neon)",boxShadow:"0 0 0 9999px rgba(0,0,0,0.5)",borderRadius:4}}/>
          </div>
          <div style={{position:"absolute",bottom:20,left:0,right:0,textAlign:"center",color:"rgba(255,255,255,0.6)",fontFamily:"DM Mono,monospace",fontSize:11,letterSpacing:1}}>
            APUNTA AL CÓDIGO QR
          </div>
        </div>
      )}

      {mode==="manual"&&(
        <div style={{flex:1,width:"100%",maxWidth:420,padding:"0 22px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontFamily:"Fraunces,serif",fontSize:28,fontWeight:800,color:"white",marginBottom:8}}>Introduce el código</div>
          <div style={{fontFamily:"DM Mono,monospace",fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:28}}>Código de 6 dígitos de la botella o tarjeta.</div>
          <input
            value={manualCode}
            onChange={e=>setManualCode(e.target.value.replace(/\D/g,"").slice(0,6))}
            placeholder="000000"
            maxLength={6}
            autoFocus
            style={{background:"rgba(255,255,255,0.06)",border:"1.5px solid rgba(255,255,255,0.15)",borderRadius:10,padding:"16px",color:"var(--neon)",fontFamily:"DM Mono,monospace",fontSize:24,letterSpacing:6,outline:"none",width:"100%",textAlign:"center",marginBottom:16}}
            onKeyDown={e=>e.key==="Enter"&&manualCode.length>=3&&onResult(manualCode)}
          />
          <button onClick={()=>manualCode.length>=3&&onResult(manualCode)} disabled={manualCode.length<3}
            style={{width:"100%",padding:"16px",background:"var(--neon)",border:"none",borderRadius:10,color:"#060608",fontFamily:"Fraunces,serif",fontSize:15,fontWeight:800,cursor:"pointer",opacity:manualCode.length>=3?1:0.3}}>
            BUSCAR CATA →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,700&family=DM+Mono:wght@300;400;500&display=swap');

  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

  :root {
    --bg:#060608; --surface:#0d0d12; --surface2:#13131a; --surface3:#1a1a24;
    --border:rgba(255,255,255,0.06); --border-hi:rgba(0,255,120,0.25);
    --neon:#00ff78; --neon2:#00e86a; --neon-dim:rgba(0,255,120,0.08);
    --cyan:#00dcff; --text:#f0f0f5; --text-muted:#c8c8d8; --text-dim:#6a6a80;
    --radius:16px; --radius-sm:10px; --radius-xs:7px;
  }

  html,body{height:100%;overflow-x:hidden;}
  body{background:var(--bg);color:var(--text);font-family:'Fraunces',serif;-webkit-font-smoothing:antialiased;}
  body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,255,120,0.04) 0%,transparent 60%);pointer-events:none;z-index:0;}
  .app{position:relative;z-index:1;min-height:100vh;}

  @keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse-neon{0%,100%{box-shadow:0 0 12px rgba(0,255,120,0.3)}50%{box-shadow:0 0 28px rgba(0,255,120,0.6)}}
  @keyframes glitch{0%,95%,100%{clip-path:none;transform:none}96%{clip-path:inset(20% 0 60% 0);transform:translate(-3px,2px)}97%{clip-path:inset(50% 0 30% 0);transform:translate(3px,-2px)}}

  .au{animation:up 0.4s cubic-bezier(0.4,0,0.2,1) both;}
  .d1{animation-delay:0.06s;} .d2{animation-delay:0.12s;} .d3{animation-delay:0.18s;}

  /* ── SHELL ── */
  .shell{min-height:100vh;max-width:420px;margin:0 auto;display:flex;flex-direction:column;padding:0 22px 80px;}

  /* ── TOP BAR ── */
  .top-bar{padding:28px 0 22px;display:flex;align-items:center;justify-content:space-between;}
  .wordmark{font-family:'Fraunces',serif;font-size:20px;font-weight:800;letter-spacing:6px;color:var(--neon);text-shadow:0 0 20px rgba(0,255,120,0.5);animation:glitch 8s infinite;}

  /* ── PROGRESS ── */
  .progress-track{height:1px;background:var(--border);margin-bottom:40px;position:relative;}
  .progress-fill{height:100%;background:linear-gradient(90deg,var(--neon),var(--cyan));transition:width .6s cubic-bezier(0.4,0,0.2,1);position:relative;}
  .progress-fill::after{content:'';position:absolute;right:-1px;top:-3px;width:7px;height:7px;border-radius:50%;background:var(--neon);box-shadow:0 0 10px var(--neon);}

  /* ── AGE GATE ── */
  .age-gate{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 28px;text-align:center;max-width:420px;margin:0 auto;}
  .age-logo{font-family:'Fraunces',serif;font-size:52px;font-weight:800;letter-spacing:8px;color:var(--neon);text-shadow:0 0 30px rgba(0,255,120,0.5);margin-bottom:8px;animation:glitch 8s infinite;}
  .age-tagline{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--text-dim);margin-bottom:48px;}
  .age-title{font-size:30px;font-weight:700;line-height:1.2;margin-bottom:12px;}
  .age-sub{font-family:'DM Mono',monospace;font-size:13px;color:var(--text-muted);margin-bottom:40px;line-height:1.7;font-weight:300;}
  .age-check{display:flex;align-items:flex-start;gap:14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px 18px;cursor:pointer;margin-bottom:24px;text-align:left;transition:border-color .2s;}
  .age-check:hover{border-color:var(--border-hi);}
  .age-check.checked{border-color:var(--neon);}
  .age-checkbox{width:20px;height:20px;border-radius:4px;border:1.5px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s;margin-top:1px;}
  .age-check.checked .age-checkbox{background:var(--neon);border-color:var(--neon);color:#000;font-weight:800;font-size:11px;}
  .age-check-text{font-family:'DM Mono',monospace;font-size:13px;color:var(--text-muted);line-height:1.6;}

  /* ── SCANNER ENTRY ── */
  .entry-screen{min-height:100vh;max-width:420px;margin:0 auto;padding:0 22px;display:flex;flex-direction:column;justify-content:center;gap:20px;}
  .entry-logo{font-family:'Fraunces',serif;font-size:42px;font-weight:800;letter-spacing:8px;color:var(--neon);text-shadow:0 0 30px rgba(0,255,120,0.5);text-align:center;margin-bottom:4px;animation:glitch 8s infinite;}
  .entry-sub{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--text-dim);text-align:center;margin-bottom:32px;}
  .entry-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;text-align:center;}
  .entry-icon{font-size:48px;margin-bottom:16px;}
  .entry-card-title{font-size:22px;font-weight:700;margin-bottom:8px;}
  .entry-card-sub{font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:20px;}
  .entry-error{background:rgba(255,77,109,0.1);border:1px solid rgba(255,77,109,0.3);border-radius:var(--radius-sm);padding:12px 16px;font-family:'DM Mono',monospace;font-size:12px;color:#ff4d6d;text-align:center;}

  /* ── PARTICIPATION MODE ── */
  .mode-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:18px 20px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:16px;margin-bottom:10px;}
  .mode-card:hover{border-color:var(--border-hi);}
  .mode-card.sel{border-color:var(--neon);background:var(--neon-dim);}
  .mode-icon{width:44px;height:44px;border-radius:12px;background:var(--neon-dim);border:1px solid var(--border-hi);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
  .mode-title{font-size:15px;font-weight:700;margin-bottom:3px;}
  .mode-desc{font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);line-height:1.5;}

  /* ── FORM FIELDS ── */
  .field-group{margin-bottom:14px;}
  .field-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;display:block;}
  .inp{width:100%;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius-xs);padding:13px 15px;color:var(--text);font-size:14px;font-family:'Fraunces',serif;outline:none;transition:border-color .2s;margin-bottom:0;}
  .inp:focus{border-color:var(--neon);}
  .inp::placeholder{color:var(--text-dim);}
  .pass-wrap{position:relative;}
  .pass-wrap .inp{padding-right:44px;}
  .eye-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;transition:color .2s;}
  .eye-btn:hover{color:var(--neon);}
  .form-note{font-family:'DM Mono',monospace;font-size:11px;color:var(--text-dim);margin-top:8px;line-height:1.6;}
  .form-error{font-family:'DM Mono',monospace;font-size:11px;color:#ff4d6d;margin-top:6px;}

  /* ── AUTH TABS ── */
  .auth-tabs{display:flex;gap:3px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-xs);padding:3px;margin-bottom:18px;}
  .auth-tab{flex:1;background:none;border:none;font-family:'Fraunces',serif;font-size:12px;font-weight:700;color:var(--text-muted);padding:9px 6px;border-radius:6px;cursor:pointer;transition:all .2s;}
  .auth-tab.on{background:var(--neon);color:#000;}

  /* ── SURVEY ── */
  .step-body{display:flex;flex-direction:column;padding-bottom:8px;}
  .eyebrow{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--neon);margin-bottom:16px;display:flex;align-items:center;gap:8px;}
  .eyebrow::before{content:'';display:block;width:20px;height:1px;background:var(--neon);box-shadow:0 0 6px var(--neon);}
  .h1{font-size:32px;font-weight:800;line-height:1.1;margin-bottom:10px;letter-spacing:-.5px;}
  .h1 em{font-style:normal;color:var(--neon);}
  .sub{font-family:'DM Mono',monospace;font-size:13px;color:var(--text-muted);line-height:1.65;margin-bottom:32px;font-weight:300;}

  /* Stars */
  .stars-wrap{margin-bottom:36px;}
  .stars-row{display:flex;gap:8px;margin-bottom:10px;}
  .star-btn{flex:1;aspect-ratio:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;transition:all .18s;color:var(--text-dim);}
  .star-btn.lit{background:var(--neon-dim);border-color:var(--neon);color:var(--neon);transform:scale(1.06);box-shadow:0 0 16px rgba(0,255,120,0.2);}
  .star-lbl{font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);text-align:center;min-height:16px;}

  /* Options */
  .opts{display:flex;flex-direction:column;gap:10px;margin-bottom:32px;}
  .opt{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:17px 20px;cursor:pointer;transition:all .18s;display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:600;color:var(--text);position:relative;overflow:hidden;}
  .opt::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--neon);transform:scaleY(0);transition:transform .2s;box-shadow:0 0 8px var(--neon);}
  .opt:hover{border-color:var(--border-hi);background:var(--surface2);}
  .opt.sel{border-color:var(--neon);background:var(--neon-dim);}
  .opt.sel::before{transform:scaleY(1);}
  .opt-check{width:20px;height:20px;border-radius:50%;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;transition:all .2s;flex-shrink:0;font-family:'DM Mono',monospace;}
  .opt.sel .opt-check{background:var(--neon);border-color:var(--neon);color:#000;font-weight:700;}

  /* Scale */
  .scale-track{display:flex;gap:8px;margin-bottom:10px;}
  .scl{flex:1;padding:14px 4px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xs);cursor:pointer;font-size:16px;font-weight:700;color:var(--text-muted);transition:all .15s;display:flex;align-items:center;justify-content:center;}
  .scl.sel{background:var(--neon-dim);border-color:var(--neon);color:var(--neon);}
  .scale-ends{display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:10px;color:var(--text-dim);}

  /* Textarea */
  .txta{width:100%;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius-xs);padding:14px 16px;color:var(--text);font-size:14px;font-family:'Fraunces',serif;outline:none;resize:none;min-height:100px;line-height:1.6;transition:border-color .2s;}
  .txta:focus{border-color:var(--neon);}
  .txta::placeholder{color:var(--text-dim);}
  .multi-note{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;}

  /* ── BUTTONS ── */
  .btn{width:100%;padding:16px;border:none;border-radius:var(--radius-sm);font-family:'Fraunces',serif;font-size:14px;font-weight:800;cursor:pointer;transition:all .2s;letter-spacing:.5px;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:20px;}
  .btn-neon{background:var(--neon);color:#060608;}
  .btn-neon:hover{background:#1fff8a;transform:translateY(-1px);box-shadow:0 8px 28px rgba(0,255,120,0.35);}
  .btn-neon:active{transform:translateY(0);}
  .btn-neon:disabled{opacity:.25;cursor:not-allowed;transform:none;box-shadow:none;}
  .btn-ghost{background:none;border:1px solid var(--border);color:var(--text-muted);margin-top:10px;}
  .btn-ghost:hover{border-color:var(--border-hi);color:var(--text);}

  /* ── RESULT ── */
  .ty-shell{min-height:100vh;max-width:420px;margin:0 auto;padding:48px 22px 80px;display:flex;flex-direction:column;}
  .ty-badge{width:80px;height:80px;border-radius:50%;background:var(--neon-dim);border:1px solid var(--border-hi);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;color:var(--neon);margin-bottom:24px;box-shadow:0 0 40px rgba(0,255,120,0.2);}
  .ty-pills{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 28px;}
  .ty-pill{display:flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);border-radius:99px;padding:8px 14px;font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);}
  .ty-pill .v{color:var(--text);font-weight:600;}
  .ty-pill .ok{color:var(--neon);}
  .ty-pill .bad{color:#ff4d6d;}
  .cta-box{background:var(--surface);border:1px solid var(--border-hi);border-radius:var(--radius);padding:24px;margin-top:auto;}
  .cta-box-title{font-size:20px;font-weight:800;margin-bottom:6px;}
  .cta-box-sub{font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted);margin-bottom:16px;line-height:1.6;}

  /* ── PROFILE ── */
  .profile-shell{max-width:420px;margin:0 auto;padding:0 22px 80px;}
  .profile-top{padding:28px 0 22px;display:flex;align-items:center;gap:16px;border-bottom:1px solid var(--border);margin-bottom:24px;}
  .avatar{width:52px;height:52px;border-radius:50%;background:var(--neon-dim);border:1px solid var(--border-hi);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:var(--neon);flex-shrink:0;}
  .pn{font-size:22px;font-weight:800;} .pe{font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);margin-top:2px;}
  .pstats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;}
  .pstat{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:18px 12px;text-align:center;position:relative;overflow:hidden;}
  .pstat::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,var(--neon),var(--cyan));}
  .pstat-v{font-size:28px;font-weight:800;color:var(--neon);line-height:1;margin-bottom:4px;}
  .pstat-l{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);}
  .insight{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px 18px;margin-bottom:10px;display:flex;align-items:center;gap:14px;}
  .ins-ic{width:40px;height:40px;border-radius:12px;background:var(--neon-dim);border:1px solid var(--border-hi);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
  .ins-l{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px;}
  .ins-v{font-size:14px;font-weight:700;line-height:1.3;}
  .hist-h{font-size:18px;font-weight:800;margin:22px 0 14px;}
  .h-row{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;transition:border-color .2s;}
  .h-row:hover{border-color:var(--border-hi);}
  .h-ic{width:36px;height:36px;border-radius:10px;background:var(--neon-dim);border:1px solid var(--border-hi);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
  .h-name{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .h-meta{font-family:'DM Mono',monospace;font-size:10px;color:var(--text-muted);margin-top:2px;}
  .h-r{text-align:right;flex-shrink:0;}
  .h-stars{color:var(--neon);font-size:12px;}
  .h-badge{display:inline-block;font-family:'DM Mono',monospace;font-size:10px;font-weight:500;padding:3px 8px;border-radius:99px;margin-top:3px;}
  .hb-ok{background:rgba(0,255,120,0.1);color:var(--neon);}
  .hb-bad{background:rgba(255,77,109,0.1);color:#ff4d6d;}

  /* ── ADMIN ── */
  .admin-shell{max-width:960px;margin:0 auto;padding:0 20px 80px;}
  .admin-top{padding:26px 0 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);margin-bottom:24px;gap:10px;flex-wrap:wrap;}
  .admin-logo{font-family:'Fraunces',serif;font-size:18px;font-weight:800;letter-spacing:4px;color:var(--neon);}
  .anav{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xs);padding:3px;}
  .anav-btn{background:none;border:none;font-family:'Fraunces',serif;font-size:11px;font-weight:700;color:var(--text-muted);padding:7px 13px;border-radius:5px;cursor:pointer;transition:all .18s;letter-spacing:.5px;}
  .anav-btn.on{background:var(--neon);color:#060608;}
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:24px;}
  .kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:20px 18px;position:relative;overflow:hidden;}
  .kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,var(--neon),var(--cyan));}
  .kpi-v{font-size:36px;font-weight:800;line-height:1;margin-bottom:4px;color:var(--neon);}
  .kpi-l{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);}
  .sec-title{font-size:18px;font-weight:800;margin-bottom:14px;}
  .tbox{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:24px;}
  table{width:100%;border-collapse:collapse;}
  th{padding:12px 16px;text-align:left;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);border-bottom:1px solid var(--border);font-weight:500;}
  td{padding:13px 16px;font-size:13px;border-bottom:1px solid var(--border);}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:var(--surface2);}
  .tag{display:inline-flex;align-items:center;padding:3px 9px;border-radius:99px;font-family:'DM Mono',monospace;font-size:10px;font-weight:500;}
  .t-ok{background:rgba(0,255,120,0.1);color:var(--neon);}
  .t-bad{background:rgba(255,77,109,0.1);color:#ff4d6d;}
  .t-active{background:rgba(0,255,120,0.1);color:var(--neon);}
  .t-inactive{background:var(--surface3);color:var(--text-muted);}
  .qr-row{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 18px;margin-bottom:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;transition:border-color .2s;}
  .qr-row:hover{border-color:var(--border-hi);}
  .qr-lbl{font-size:14px;font-weight:800;min-width:80px;}
  .qr-num{font-family:'DM Mono',monospace;font-size:18px;font-weight:700;color:var(--neon);letter-spacing:3px;min-width:80px;}
  .qr-url{font-family:'DM Mono',monospace;font-size:10px;color:var(--text-muted);background:var(--surface3);padding:4px 8px;border-radius:5px;flex:1;}
  .sdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
  .sdot-on{background:var(--neon);box-shadow:0 0 6px var(--neon);}
  .sdot-off{background:var(--text-dim);}
  .form-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px;margin-bottom:18px;}
  .fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
  @media(max-width:480px){.fg2{grid-template-columns:1fr;}}
  .btn-sm{background:var(--neon);border:none;border-radius:var(--radius-xs);color:#060608;font-family:'Fraunces',serif;font-size:12px;font-weight:800;padding:8px 16px;cursor:pointer;transition:opacity .2s;letter-spacing:.3px;}
  .btn-sm:hover{opacity:.85;}
  .btn-sm-g{background:none;border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-muted);font-family:'Fraunces',serif;font-size:12px;font-weight:600;padding:8px 14px;cursor:pointer;transition:all .2s;}
  .btn-sm-g:hover{border-color:var(--border-hi);color:var(--text);}
  .login-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
  .login-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:40px 30px;width:100%;max-width:340px;text-align:center;}
  .login-logo{font-family:'Fraunces',serif;font-size:36px;font-weight:800;letter-spacing:6px;color:var(--neon);margin-bottom:4px;}
  .login-sub{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);margin-bottom:28px;}
  .login-err{font-family:'DM Mono',monospace;font-size:11px;color:#ff4d6d;margin-bottom:10px;}
  .spinner{width:16px;height:16px;border:2px solid rgba(0,0,0,.2);border-top-color:#060608;border-radius:50%;animation:spin .7s linear infinite;}
  .spinner-white{width:16px;height:16px;border:2px solid rgba(255,255,255,.2);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;}

  /* Modal */
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:500;padding:20px;backdrop-filter:blur(6px);animation:fadeIn .2s ease;}
  .modal-card{background:var(--surface2);border:1px solid var(--border-hi);border-radius:var(--radius);padding:28px;width:100%;max-width:500px;max-height:80vh;overflow-y:auto;}
  .modal-title{font-size:20px;font-weight:800;margin-bottom:4px;}
  .modal-sub{font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);margin-bottom:22px;line-height:1.6;}
  .config-section{margin-bottom:18px;}
  .config-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--neon);margin-bottom:10px;display:block;}
  .config-opts{display:flex;flex-direction:column;gap:6px;}
  .config-opt{display:flex;align-items:center;gap:10px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius-xs);padding:10px 14px;cursor:pointer;transition:all .18s;font-size:13px;font-weight:600;}
  .config-opt:hover{border-color:var(--border-hi);}
  .config-opt.sel{border-color:var(--neon);background:var(--neon-dim);}
  .config-check{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;transition:all .18s;font-weight:800;}
  .config-opt.sel .config-check{background:var(--neon);border-color:var(--neon);color:#000;}
  .modal-actions{display:flex;gap:8px;margin-top:22px;}

  /* QR Print */
  .qr-print-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-top:16px;}
  .qr-print-card{background:#ffffff;border:1px solid #ddd;border-radius:var(--radius-sm);padding:16px;text-align:center;}
.qr-print-code{font-family:'DM Mono',monospace;font-size:24px;font-weight:700;color:#000000;letter-spacing:4px;margin-bottom:6px;}
.qr-print-label{font-family:'DM Mono',monospace;font-size:10px;color:#666666;letter-spacing:1px;}
  .qr-print-code{font-family:'DM Mono',monospace;font-size:24px;font-weight:700;color:var(--neon);letter-spacing:4px;margin-bottom:6px;}
  .qr-print-label{font-family:'DM Mono',monospace;font-size:10px;color:var(--text-muted);letter-spacing:1px;}

  @media print {
    .no-print{display:none!important;}
    body{background:white;color:black;}
    .qr-print-card{border:1px solid #ccc;break-inside:avoid;}
    .qr-print-code{color:#000;}
    .qr-print-label{color:#666;}
  }

  /* ── DEMO BAR ── */
  .demo-bar{position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:center;gap:4px;background:rgba(6,6,8,0.96);border-top:1px solid var(--border);padding:10px 8px 14px;z-index:1000;backdrop-filter:blur(16px);}
  .demo-btn{background:none;border:none;font-family:'Fraunces',serif;font-size:11px;font-weight:700;color:var(--text-muted);padding:6px 14px;border-radius:99px;cursor:pointer;transition:all .18s;white-space:nowrap;}
  .demo-btn.on{background:var(--neon);color:#060608;}

  select.sel-inp{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text);font-family:'Fraunces',serif;font-size:13px;font-weight:600;padding:7px 10px;outline:none;cursor:pointer;}
`;

// ─── PASSWORD INPUT ───────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder="Mínimo 8 caracteres", className="inp" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pass-wrap">
      <input className={className} type={show?"text":"password"} placeholder={placeholder} value={value} onChange={onChange}/>
      <button className="eye-btn" onClick={()=>setShow(s=>!s)} type="button">
        {show
          ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        }
      </button>
    </div>
  );
}

// ─── SESSION CONFIG MODAL ─────────────────────────────────────────────────────
function SessionConfigModal({ qr, wines, denominations, onClose, onSave }) {
  const [event, setEvent] = useState("");
  const [wineId, setWineId] = useState("");
  const [decoys, setDecoys] = useState([]);
  const [dens, setDens] = useState([]);
  const cw = wines.find(w=>w.id===wineId);
  const cd = cw?.denomination || "";
  const toggleDecoy = id => { if(id===wineId) return; setDecoys(p=>p.includes(id)?p.filter(x=>x!==id):p.length<2?[...p,id]:p); };
  const toggleDen = d => { if(d===cd) return; setDens(p=>p.includes(d)?p.filter(x=>x!==d):p.length<2?[...p,d]:p); };
  const canSave = wineId && decoys.length===2 && (dens.length===2||!cd);
  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-card">
        <div className="modal-title">Configurar sesión — {qr?.label}</div>
        <div className="modal-sub">Elige el vino correcto, dos señuelos y dos denominaciones incorrectas.</div>
        <div className="config-section">
          <label className="field-label">Nombre del evento</label>
          <input className="inp" placeholder="Ej: Cata Bar Velázquez, 15 mayo" value={event} onChange={e=>setEvent(e.target.value)}/>
        </div>
        <div className="config-section">
          <span className="config-label">✓ Vino correcto</span>
          <div className="config-opts">{wines.map(w=>(
            <div key={w.id} className={`config-opt${wineId===w.id?" sel":""}`} onClick={()=>{setWineId(w.id);setDecoys([]);setDens([]);}}>
              <div className="config-check">{wineId===w.id?"✓":""}</div>
              <div><div style={{fontWeight:700}}>{w.name}</div><div style={{fontSize:11,color:"var(--text-muted)",fontFamily:"DM Mono,monospace"}}>{w.denomination} · {w.winery}</div></div>
            </div>
          ))}</div>
        </div>
        {wineId&&<div className="config-section">
          <span className="config-label">✗ Señuelos (elige 2)</span>
          <div className="config-opts">{wines.filter(w=>w.id!==wineId).map(w=>(
            <div key={w.id} className={`config-opt${decoys.includes(w.id)?" sel":""}`} onClick={()=>toggleDecoy(w.id)}>
              <div className="config-check">{decoys.includes(w.id)?"✓":""}</div>
              <div><div style={{fontWeight:700}}>{w.name}</div><div style={{fontSize:11,color:"var(--text-muted)",fontFamily:"DM Mono,monospace"}}>{w.denomination}</div></div>
            </div>
          ))}</div>
        </div>}
        {wineId&&cd&&<div className="config-section">
          <span className="config-label">D.O. correcta: {cd} · Elige 2 incorrectas</span>
          <div className="config-opts">{denominations.filter(d=>d!==cd).map(d=>(
            <div key={d} className={`config-opt${dens.includes(d)?" sel":""}`} onClick={()=>toggleDen(d)}>
              <div className="config-check">{dens.includes(d)?"✓":""}</div>
              <div style={{fontWeight:700}}>{d}</div>
            </div>
          ))}</div>
        </div>}
        <div className="modal-actions">
          <button className="btn-sm" disabled={!canSave} onClick={()=>onSave(qr.id,{wineId,decoyWineIds:decoys,denominationOptions:[cd,...dens],event})}>ACTIVAR SESIÓN</button>
          <button className="btn-sm-g" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP RENDERERS ───────────────────────────────────────────────────────────
function StepStars({ answer, setAnswer }) {
  const [hover, setHover] = useState(0);
  const labels = ["","No me convenció","Regular","Bien","Muy bueno","Excepcional ✦"];
  return (
    <div className="stars-wrap">
      <div className="stars-row">
        {[1,2,3,4,5].map(n=>(
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
    <div className="opts">{(opts||[]).map(o=>(
      <button key={o} className={`opt${answer===o?" sel":""}`} onClick={()=>setAnswer(o)}>
        {o}<div className="opt-check">{answer===o?"✓":""}</div>
      </button>
    ))}</div>
  );
}
function StepScale({ step, answer, setAnswer }) {
  const pts = Array.from({length:step.max-step.min+1},(_,i)=>step.min+i);
  return (
    <div>
      <div className="scale-track">{pts.map(n=><button key={n} className={`scl${answer===n?" sel":""}`} onClick={()=>setAnswer(n)}>{n}</button>)}</div>
      {step.labels&&<div className="scale-ends"><span>{step.labels.min}</span><span>{step.labels.max}</span></div>}
    </div>
  );
}
function StepMulti({ step, wine, answer, setAnswer }) {
  const opts = step.optionsKey ? wine[step.optionsKey] : step.options;
  const sel = answer||[];
  const toggle = v => setAnswer(sel.includes(v)?sel.filter(x=>x!==v):[...sel,v]);
  return (<><div className="multi-note">Selección múltiple</div><div className="opts">{(opts||[]).map(o=><button key={o} className={`opt${sel.includes(o)?" sel":""}`} onClick={()=>toggle(o)}>{o}<div className="opt-check">{sel.includes(o)?"✓":""}</div></button>)}</div></>);
}
function StepText({ step, answer, setAnswer }) {
  return <textarea className="txta" placeholder={step.placeholder||"Escribe aquí..."} value={answer||""} onChange={e=>setAnswer(e.target.value)}/>;
}

// ─── AGE GATE ─────────────────────────────────────────────────────────────────
function AgeGate({ onConfirm }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="age-gate au">
      <div className="age-logo">WOW</div>
      <div className="age-tagline">Cata ciega de vinos</div>
      <div className="age-title">Bienvenido a la experiencia</div>
      <div className="age-sub">Antes de continuar necesitamos confirmar que eres mayor de edad. El consumo de alcohol está prohibido para menores de 18 años.</div>
      <div className={`age-check${checked?" checked":""}`} onClick={()=>setChecked(c=>!c)} style={{width:"100%",maxWidth:360}}>
        <div className="age-checkbox">{checked?"✓":""}</div>
        <div className="age-check-text">Confirmo que tengo 18 años o más y acepto participar en esta cata de vinos.</div>
      </div>
      <button className="btn btn-neon" style={{width:"100%",maxWidth:360}} disabled={!checked} onClick={onConfirm}>
        ACCEDER A LA CATA →
      </button>
    </div>
  );
}

// ─── ENTRY / QR SCAN SCREEN ───────────────────────────────────────────────────
function EntryScreen({ onSessionFound }) {
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCode = async (code) => {
    setShowScanner(false);
    setLoading(true);
    setError(null);
    try {
      const session = await getActiveTastingByCode(code.trim().toUpperCase());
      if (session) {
        onSessionFound(session);
      } else {
        setError(`Código "${code}" no encontrado o sin cata activa. Comprueba el código e inténtalo de nuevo.`);
      }
    } catch (e) {
      setError("Error al buscar la cata. Inténtalo de nuevo.");
    }
    setLoading(false);
  };

  if (showScanner) return <QRScanner onResult={handleCode} onClose={()=>setShowScanner(false)}/>;

  return (
    <div className="entry-screen">
      <div className="entry-logo">WOW</div>
      <div className="entry-sub">Cata ciega · Descubre qué hay en tu copa</div>

      <div className="entry-card au">
        <div className="entry-icon">📷</div>
        <div className="entry-card-title">Escanear código QR</div>
        <div className="entry-card-sub">Apunta la cámara al código QR de la botella o de la tarjeta de la cata.</div>
        <button className="btn btn-neon" style={{marginTop:0}} onClick={()=>setShowScanner(true)} disabled={loading}>
          {loading ? <div className="spinner"/> : "ABRIR CÁMARA →"}
        </button>
      </div>

      <div style={{textAlign:"center",fontFamily:"DM Mono,monospace",fontSize:11,color:"var(--text-dim)",letterSpacing:1}}>
        — O —
      </div>

      <div className="entry-card au d1">
        <div className="entry-icon">⌨️</div>
        <div className="entry-card-title">Introducir código</div>
        <div className="entry-card-sub">Escribe el código de 6 dígitos que aparece en la tarjeta.</div>
        <ManualCodeInput onSubmit={handleCode} loading={loading}/>
      </div>

      {error && <div className="entry-error au">{error}</div>}
    </div>
  );
}

function ManualCodeInput({ onSubmit, loading }) {
  const [code, setCode] = useState("");
  return (
    <div style={{marginTop:4}}>
      <input
        value={code}
        onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
        placeholder="000000"
        maxLength={6}
        style={{
          width:"100%",background:"var(--surface2)",border:"1.5px solid var(--border)",
          borderRadius:"var(--radius-xs)",padding:"14px",color:"var(--neon)",
          fontFamily:"DM Mono,monospace",fontSize:24,letterSpacing:6,
          textAlign:"center",outline:"none",marginBottom:12,
          borderColor:code.length===6?"var(--neon)":"var(--border)"
        }}
        onKeyDown={e=>e.key==="Enter"&&code.length===6&&onSubmit(code)}
      />
      <button
        onClick={()=>onSubmit(code)}
        disabled={code.length<3||loading}
        className="btn btn-neon"
        style={{marginTop:0}}
      >
        {loading?<div className="spinner"/>:"BUSCAR CATA →"}
      </button>
    </div>
  );
}

// ─── PARTICIPATION MODE ───────────────────────────────────────────────────────
function ParticipationMode({ onSelect }) {
  const [mode, setMode] = useState(null);
  const [authTab, setAuthTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const modes = [
    { id:"account", icon:"👤", title:"Crear cuenta o iniciar sesión", desc:"Accede con tu cuenta WOW para guardar tu historial y estadísticas completas." },
    { id:"contact", icon:"📱", title:"Solo quiero el resultado", desc:"Deja tu nombre y email o teléfono para recibir el resultado de la cata." },
    { id:"anon",    icon:"🕵️", title:"Participar de forma anónima", desc:"Sin dejar datos. Tu valoración se registra pero no podrás ver el resultado." },
  ];

  const handleContinue = async () => {
    setError(null);
    if (mode === "anon") { onSelect({ mode:"anon", user:null }); return; }
    if (mode === "contact") {
      if (!name || !contact) { setError("Por favor rellena todos los campos."); return; }
      onSelect({ mode:"contact", user:{ name, contact } }); return;
    }
    if (mode === "account") {
      setLoading(true);
      try {
        let userCred;
        if (authTab === "login") {
          userCred = await signInWithEmailAndPassword(auth, email, password);
        } else {
          userCred = await createUserWithEmailAndPassword(auth, email, password);
        }
        onSelect({ mode:"account", user:{ uid:userCred.user.uid, email:userCred.user.email, name:email.split("@")[0] } });
      } catch(e) {
        const msgs = { "auth/user-not-found":"Usuario no encontrado.", "auth/wrong-password":"Contraseña incorrecta.", "auth/email-already-in-use":"Este email ya tiene cuenta.", "auth/weak-password":"La contraseña debe tener al menos 6 caracteres.", "auth/invalid-email":"Email no válido." };
        setError(msgs[e.code] || "Error al iniciar sesión.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="shell">
      <div className="top-bar au"><div className="wordmark">WOW</div></div>
      <div className="step-body au">
        <div className="eyebrow">Antes de empezar</div>
        <div className="h1">¿Cómo quieres <em>participar</em>?</div>
        <div className="sub">Elige cómo quieres registrar tu experiencia en esta cata.</div>

        {modes.map(m=>(
          <div key={m.id} className={`mode-card${mode===m.id?" sel":""}`} onClick={()=>setMode(m.id)}>
            <div className="mode-icon">{m.icon}</div>
            <div><div className="mode-title">{m.title}</div><div className="mode-desc">{m.desc}</div></div>
          </div>
        ))}

        {/* Account form */}
        {mode==="account"&&(
          <div style={{marginTop:16,animation:"up .35s ease both"}}>
            <div className="auth-tabs">
              {[["login","Iniciar sesión"],["register","Crear cuenta"]].map(([t,l])=>(
                <button key={t} className={`auth-tab${authTab===t?" on":""}`} onClick={()=>setAuthTab(t)}>{l}</button>
              ))}
            </div>
            <div className="field-group"><label className="field-label">Email</label><input className="inp" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div className="field-group"><label className="field-label">Contraseña</label><PasswordInput value={password} onChange={e=>setPassword(e.target.value)}/></div>
          </div>
        )}

        {/* Contact form */}
        {mode==="contact"&&(
          <div style={{marginTop:16,animation:"up .35s ease both"}}>
            <div className="field-group"><label className="field-label">Tu nombre</label><input className="inp" placeholder="¿Cómo te llamas?" value={name} onChange={e=>setName(e.target.value)}/></div>
            <div className="field-group"><label className="field-label">Email o teléfono</label><input className="inp" placeholder="tu@email.com o +34 600 000 000" value={contact} onChange={e=>setContact(e.target.value)}/></div>
            <div className="form-note">Solo te contactaremos para enviarte el resultado de la cata.</div>
          </div>
        )}

        {mode==="anon"&&(
          <div style={{marginTop:8,padding:"12px 16px",background:"var(--neon-dim)",border:"1px solid var(--border-hi)",borderRadius:"var(--radius-sm)",fontFamily:"DM Mono,monospace",fontSize:12,color:"var(--text-muted)",animation:"up .35s ease both"}}>
            Tu valoración se guardará de forma anónima. No recibirás el resultado ni podrás ver tus estadísticas.
          </div>
        )}

        {error&&<div className="form-error" style={{marginTop:8}}>{error}</div>}

        <button className="btn btn-neon" disabled={!mode||loading} onClick={handleContinue}>
          {loading?<div className="spinner"/>:"EMPEZAR LA CATA →"}
        </button>
      </div>
    </div>
  );
}

// ─── SURVEY APP ───────────────────────────────────────────────────────────────
function SurveyApp({ session, participant, onGoProfile, onSetUser }) {
  const { wine, tasting, steps } = session;
  const totalSteps = steps.length;
  const contactStep = totalSteps + 1;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const surveyStep = step>=1&&step<=totalSteps ? steps[step-1] : null;
  const pct = step===0 ? 0 : Math.min(((step-1)/totalSteps)*100, 100);
  const setAnswer = val => setAnswers(a=>({...a,[surveyStep.key]:val}));
  const cur = surveyStep ? answers[surveyStep.key] : null;

  const canContinue = () => {
    if (!surveyStep||surveyStep.optional) return true;
    const a = cur;
    if (surveyStep.type==="multi") return Array.isArray(a)&&a.length>0;
    if (surveyStep.type==="stars") return a>0;
    return !!a;
  };

  const submit = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db,"ratings"), {
        tastingId: tasting.id,
        userId: participant?.user?.uid || null,
        participantName: participant?.user?.name || null,
        participantContact: participant?.user?.contact || null,
        participantMode: participant?.mode || "anon",
        answers,
        date: serverTimestamp(),
      });
      if (participant?.user && onSetUser) onSetUser(participant.user);
    } catch(e) {
      console.error("Error guardando valoración:", e);
    }
    setLoading(false);
    setDone(true);
  };

  if (done) {
    const { correct, total } = calcCorrect(answers, steps, wine);
    const hasContact = participant?.mode !== "anon";
    return (
      <div className="ty-shell au">
        <div className="top-bar"><div className="wordmark">WOW</div></div>
        <div className="ty-badge">✓</div>
        <div className="h1" style={{marginBottom:8}}>¡Valoración enviada!</div>
        <div style={{fontFamily:"DM Mono,monospace",fontSize:13,color:"var(--text-muted)",marginBottom:0,lineHeight:1.7}}>
          {hasContact ? "En breve recibirás el resultado y tus estadísticas." : "Gracias por participar en la cata WOW."}
        </div>
        <div className="ty-pills">
          <div className="ty-pill">Puntuación <span className="v" style={{marginLeft:6}}>{"★".repeat(answers.stars||0)}</span></div>
          {total>0&&<div className="ty-pill">Aciertos <span className="v" style={{marginLeft:6}}>{correct}/{total}</span></div>}
        </div>
        {hasContact && participant?.mode==="account" && (
          <div className="cta-box">
            <div className="cta-box-title">Ver mi perfil</div>
            <div className="cta-box-sub">Consulta tu historial completo, estadísticas y ranking de catadores.</div>
            <button className="btn btn-neon" onClick={onGoProfile}>Ver mi perfil →</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="top-bar au"><div className="wordmark">WOW</div><div style={{fontFamily:"DM Mono,monospace",fontSize:10,color:"var(--text-dim)",letterSpacing:1}}>{tasting.event}</div></div>
      <div className="progress-track au"><div className="progress-fill" style={{width:`${pct}%`}}/></div>

      {step===0&&(
        <div className="step-body au" key="s0">
          <div className="eyebrow">Cata ciega</div>
          <div className="h1">¿Qué hay en tu <em>copa</em>?</div>
          <div className="sub">Valora el vino sin conocer su origen. Solo tú y tu paladar.</div>
          <div style={{height:160,background:"var(--surface)",borderRadius:"var(--radius)",border:"1px solid var(--border-hi)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",marginBottom:8}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 50%,rgba(0,255,120,0.15) 0%,transparent 70%)"}}/>
            <div style={{fontSize:64,position:"relative",zIndex:1}}>🍷</div>
          </div>
          <button className="btn btn-neon" onClick={()=>setStep(1)}>EMPEZAR CATA →</button>
        </div>
      )}

      {surveyStep&&(
        <div className="step-body au" key={`s${step}`}>
          <div className="eyebrow">{String(step).padStart(2,"0")} / {String(totalSteps).padStart(2,"0")}</div>
          <div className="h1">{surveyStep.question}</div>
          <div className="sub">{surveyStep.sub}</div>
          {surveyStep.type==="stars"   &&<StepStars step={surveyStep} answer={cur} setAnswer={setAnswer}/>}
          {surveyStep.type==="options" &&<StepOptions step={surveyStep} wine={wine} answer={cur} setAnswer={setAnswer}/>}
          {surveyStep.type==="scale"   &&<StepScale step={surveyStep} answer={cur} setAnswer={setAnswer}/>}
          {surveyStep.type==="multi"   &&<StepMulti step={surveyStep} wine={wine} answer={cur} setAnswer={setAnswer}/>}
          {surveyStep.type==="text"    &&<StepText step={surveyStep} answer={cur} setAnswer={setAnswer}/>}
          <button className="btn btn-neon" onClick={()=>setStep(s=>s+1)} disabled={!canContinue()}>
            {step===totalSteps?"FINALIZAR →":"CONTINUAR →"}
          </button>
          {surveyStep.optional&&!cur&&<button className="btn btn-ghost" onClick={()=>setStep(s=>s+1)}>Omitir</button>}
        </div>
      )}

      {step===contactStep&&(
        <div className="step-body au" key="final">
          <div className="eyebrow">Último paso</div>
          <div className="h1">¿Todo listo para <em>enviar</em>?</div>
          <div className="sub">Tu valoración está completa. Pulsa enviar para registrarla.</div>
          <button className="btn btn-neon" onClick={submit} disabled={loading}>
            {loading?<div className="spinner"/>:"ENVIAR VALORACIÓN →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── USER PROFILE ─────────────────────────────────────────────────────────────
function UserProfile({ user, onBack }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    getDocs(query(collection(db,"ratings"), where("userId","==",user.uid))).then(async snap => {
      const rs = await Promise.all(snap.docs.map(async d => {
        const r = { id:d.id, ...d.data() };
        const tSnap = await getDocs(query(collection(db,"tastings"), where("__name__","==",r.tastingId)));
        const tasting = tSnap.docs[0] ? { id:tSnap.docs[0].id, ...tSnap.docs[0].data() } : null;
        const wSnap = tasting ? await getDocs(collection(db,"wines")) : null;
        const wine = wSnap?.docs.find(d=>d.id===tasting?.wineId);
        const wineData = wine ? { id:wine.id, ...wine.data() } : null;
        const steps = tasting?.steps || DEFAULT_STEPS;
        const { correct, total } = calcCorrect(r.answers||{}, steps, wineData||{});
        return { ...r, tasting, wine:wineData, correct, total };
      }));
      setRatings(rs);
      setLoading(false);
    });
  }, [user]);

  if (!user) return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 24px",textAlign:"center",maxWidth:420,margin:"0 auto"}}>
      <div style={{fontSize:40,marginBottom:16}}>👤</div>
      <div style={{fontSize:22,fontWeight:800,marginBottom:8}}>Sin sesión iniciada</div>
      <div style={{fontFamily:"DM Mono,monospace",fontSize:13,color:"var(--text-muted)"}}>Completa una cata con tu cuenta para ver tu perfil.</div>
      <button className="btn btn-neon" onClick={onBack}>Volver</button>
    </div>
  );

  const total = ratings.length;
  const totalQ = ratings.reduce((s,r)=>s+(r.total||0),0);
  const totalC = ratings.reduce((s,r)=>s+(r.correct||0),0);
  const pct = totalQ ? Math.round((totalC/totalQ)*100) : 0;
  const avg = total ? (ratings.reduce((a,b)=>a+(b.answers?.stars||0),0)/total).toFixed(1) : "—";
  const denoms = {};
  ratings.forEach(r=>{if(r.wine)denoms[r.wine.denomination]=(denoms[r.wine.denomination]||0)+1;});
  const favDen = Object.entries(denoms).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";

  return (
    <div className="profile-shell">
      <div className="profile-top au">
        <div className="avatar">{user.name?.[0]?.toUpperCase()||"?"}</div>
        <div><div className="pn">{user.name}</div><div className="pe">{user.email}</div></div>
        <button className="btn-sm-g" style={{marginLeft:"auto"}} onClick={onBack}>← Volver</button>
      </div>
      {loading ? <div style={{textAlign:"center",padding:40,fontFamily:"DM Mono,monospace",fontSize:12,color:"var(--text-muted)"}}>Cargando...</div> : (
        <>
          <div className="pstats au d1">
            {[[total,"CATAS"],[pct+"%","ACIERTOS"],[avg+"★","MEDIA"]].map(([v,l])=>(
              <div className="pstat" key={l}><div className="pstat-v">{v}</div><div className="pstat-l">{l}</div></div>
            ))}
          </div>
          <div className="insight au d2"><div className="ins-ic">🏆</div><div><div className="ins-l">Vs media global</div><div className="ins-v">{pct}% tú · 58% media · {pct>=58?"¡Por encima! 🎉":"Sigue catando 💪"}</div></div></div>
          <div className="insight au d3"><div className="ins-ic">🍇</div><div><div className="ins-l">D.O. favorita</div><div className="ins-v">{favDen}</div></div></div>
          <div className="hist-h">Historial</div>
          {ratings.length===0&&<div style={{textAlign:"center",padding:"32px 0",fontFamily:"DM Mono,monospace",fontSize:12,color:"var(--text-muted)"}}>Aún no hay catas registradas.</div>}
          {ratings.map(r=>(
            <div className="h-row" key={r.id}>
              <div className="h-ic">🍷</div>
              <div style={{flex:1,minWidth:0}}><div className="h-name">{r.wine?.name||"—"}</div><div className="h-meta">{r.tasting?.event} · {r.date?.seconds?new Date(r.date.seconds*1000).toLocaleDateString():r.date}</div></div>
              <div className="h-r">
                <div className="h-stars">{"★".repeat(r.answers?.stars||0)}{"☆".repeat(5-(r.answers?.stars||0))}</div>
                <div className={`h-badge ${r.correct===r.total&&r.total>0?"hb-ok":"hb-bad"}`}>{r.total>0?`${r.correct}/${r.total} ✓`:"—"}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [wines, setWines] = useState([]);
  const [tastings, setTastings] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [nw, setNw] = useState({name:"",winery:"",denomination:"",vintage:""});
  const [configuringQr, setConfiguringQr] = useState(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const DOMAIN = window.location.origin;
  const DENOMINATIONS = ["Rioja","Ribera del Duero","Priorat","Rueda","Rías Baixas","Penedès","Jumilla","Toro","Montsant","Bierzo","Jerez","Cava","Cariñena","Navarra","Somontano"];

  useEffect(() => {
    const load = async () => {
      const [wS,tS,rS,qS] = await Promise.all([
        getDocs(collection(db,"wines")),
        getDocs(collection(db,"tastings")),
        getDocs(collection(db,"ratings")),
        getDocs(collection(db,"qr_codes")),
      ]);
      setWines(wS.docs.map(d=>({id:d.id,...d.data()})));
      setTastings(tS.docs.map(d=>({id:d.id,...d.data()})));
      setRatings(rS.docs.map(d=>({id:d.id,...d.data()})));
      setQrCodes(qS.docs.map(d=>({id:d.id,...d.data()})));
    };
    load();
  }, []);

  const addWine = async () => {
    if (!nw.name) return;
    try {
      await addDoc(collection(db,"wines"), {
        name:nw.name, winery:nw.winery, denomination:nw.denomination,
        vintage:parseInt(nw.vintage),
        optionsDenomination:[nw.denomination,"Rioja","Ribera del Duero"],
        optionsName:[nw.name,"Opción 2","Opción 3"],
      });
      const snap = await getDocs(collection(db,"wines"));
      setWines(snap.docs.map(d=>({id:d.id,...d.data()})));
      setNw({name:"",winery:"",denomination:"",vintage:""}); setShowForm(false);
    } catch(e) { console.error(e); }
  };

  const generateQRCodes = async () => {
    if (qrCodes.length >= 30) { alert("Ya tienes 30 códigos QR generados."); return; }
    setGeneratingQR(true);
    try {
      const existing = qrCodes.map(q => q.numericCode);
      const toCreate = 30 - qrCodes.length;
      for (let i = 0; i < toCreate; i++) {
        let num;
        do { num = String(Math.floor(100000 + Math.random() * 900000)); }
        while (existing.includes(num));
        existing.push(num);
        const code = "wow-" + num;
        await addDoc(collection(db,"qr_codes"), {
          code, numericCode: num,
          label: `QR Vino ${qrCodes.length + i + 1}`,
          createdAt: serverTimestamp(),
        });
      }
      const snap = await getDocs(collection(db,"qr_codes"));
      setQrCodes(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
    setGeneratingQR(false);
  };

  const total = ratings.length;
  const avg = total ? (ratings.reduce((a,b)=>a+(b.answers?.stars||0),0)/total).toFixed(1) : "—";

  return (
    <div className="admin-shell">
      <div className="admin-top">
        <div className="admin-logo">WOW · Admin</div>
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
            {[[total||0,"VALORACIONES"],[avg+"★","MEDIA"],[qrCodes.length,"QR CODES"],[wines.length,"VINOS"]].map(([v,l])=>(
              <div className="kpi au" key={l}><div className="kpi-v">{v}</div><div className="kpi-l">{l}</div></div>
            ))}
          </div>
          <div className="sec-title">Últimas valoraciones</div>
          <div className="tbox"><table>
            <thead><tr><th>Sesión</th><th>Participante</th><th>⭐</th><th>Modo</th><th>Fecha</th></tr></thead>
            <tbody>{ratings.slice(-10).reverse().map(r=>{
              const t=tastings.find(tt=>tt.id===r.tastingId);
              return(<tr key={r.id}>
                <td><strong>{t?.event||"—"}</strong></td>
                <td style={{color:"var(--text-muted)",fontSize:12}}>{r.participantName||r.participantContact||"Anónimo"}</td>
                <td style={{color:"var(--neon)"}}>{("★").repeat(r.answers?.stars||0)}</td>
                <td><span className={`tag ${r.participantMode==="account"?"t-ok":r.participantMode==="contact"?"t-active":"t-inactive"}`}>{r.participantMode||"anon"}</span></td>
                <td style={{fontSize:11,color:"var(--text-muted)"}}>{r.date?.seconds?new Date(r.date.seconds*1000).toLocaleDateString():r.date}</td>
              </tr>);
            })}</tbody>
          </table></div>
        </>
      )}

      {tab==="qr"&&(
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div className="sec-title" style={{marginBottom:0}}>QR Codes y sesiones</div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn-sm" onClick={generateQRCodes} disabled={generatingQR||qrCodes.length>=30}>
                {generatingQR?"Generando...":"⚡ Generar 30 QR"}
              </button>
              <button className="btn-sm-g" onClick={()=>window.print()}>🖨️ Imprimir</button>
            </div>
          </div>

          {/* Print view */}
          {qrCodes.length>0&&(
            <div className="qr-print-grid">
              {qrCodes.map(qr=>{
                const active=tastings.find(t=>t.qrId===qr.id&&t.active);
                const aw=wines.find(w=>w.id===active?.wineId);
                return(
                  <div key={qr.id} className="qr-print-card">
                      <QRCode value={`${DOMAIN}/v/${qr.code}`} size={120} style={{margin:"0 auto 10px",display:"block"}}/>
                      <div className="qr-print-code">{qr.numericCode||qr.code}</div>
                      <div className="qr-print-label">{qr.label}</div>
                    </div>
                    );
                  })}
                </div>
          )}

          {qrCodes.length===0&&(
            <div style={{textAlign:"center",padding:"48px 20px",fontFamily:"DM Mono,monospace",fontSize:13,color:"var(--text-muted)"}}>
              No hay QR codes. Pulsa "Generar 30 QR" para crearlos.
            </div>
          )}

          {/* Session assignment */}
          {qrCodes.length>0&&(
            <>
              <div className="sec-title" style={{marginTop:24}}>Asignar sesiones</div>
              {qrCodes.map(qr=>{
                const active=tastings.find(t=>t.qrId===qr.id&&t.active);
                const aw=wines.find(w=>w.id===active?.wineId);
                return(
                  <div key={qr.id} className="qr-row">
                    <div>
                      <div className="qr-lbl">{qr.label}</div>
                      <div className="qr-num">{qr.numericCode||"—"}</div>
                    </div>
                    <div className="qr-url">{DOMAIN}/v/{qr.code}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                      <div className={`sdot ${active?"sdot-on":"sdot-off"}`}/>
                      <span style={{fontSize:11,color:active?"var(--neon)":"var(--text-muted)",fontFamily:"DM Mono,monospace"}}>
                        {active?aw?.name||"Activo":"Sin sesión"}
                      </span>
                    </div>
                    <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
                      {active&&<button className="btn-sm-g" onClick={async()=>{await updateDoc(doc(db,"tastings",active.id),{active:false});const s=await getDocs(collection(db,"tastings"));setTastings(s.docs.map(d=>({id:d.id,...d.data()})));}}>Desactivar</button>}
                      <button className="btn-sm" onClick={()=>setConfiguringQr(qr.id)}>{active?"Reconfigurar":"Configurar"}</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {configuringQr&&(
            <SessionConfigModal
              qr={qrCodes.find(q=>q.id===configuringQr)}
              wines={wines}
              denominations={DENOMINATIONS}
              onClose={()=>setConfiguringQr(null)}
              onSave={async(qrId,config)=>{
                try {
                  const oldS=await getDocs(query(collection(db,"tastings"),where("qrId","==",qrId),where("active","==",true)));
                  for(const d of oldS.docs) await updateDoc(doc(db,"tastings",d.id),{active:false});
                  await addDoc(collection(db,"tastings"),{
                    qrId, wineId:config.wineId,
                    event:config.event||"Evento "+new Date().toLocaleDateString(),
                    date:new Date().toISOString().split("T")[0],
                    active:true, decoyWineIds:config.decoyWineIds,
                    denominationOptions:config.denominationOptions,
                  });
                  const s=await getDocs(collection(db,"tastings"));
                  setTastings(s.docs.map(d=>({id:d.id,...d.data()})));
                  setConfiguringQr(null);
                } catch(e){console.error(e);}
              }}
            />
          )}
        </>
      )}

      {tab==="wines"&&(
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div className="sec-title" style={{marginBottom:0}}>Catálogo de vinos</div>
            <button className="btn-sm" onClick={()=>setShowForm(f=>!f)}>+ AÑADIR VINO</button>
          </div>
          {showForm&&(
            <div className="form-box">
              <div style={{fontSize:16,fontWeight:800,marginBottom:14}}>Nuevo vino</div>
              <div className="fg2">
                {[["Nombre","name"],["Bodega","winery"],["Denominación","denomination"],["Añada","vintage"]].map(([l,k])=>(
                  <div key={k}><label className="field-label">{l}</label><input className="inp" style={{marginBottom:0}} placeholder={l} value={nw[k]} onChange={e=>setNw(p=>({...p,[k]:e.target.value}))}/></div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn-sm" onClick={addWine}>GUARDAR</button>
                <button className="btn-sm-g" onClick={()=>setShowForm(false)}>Cancelar</button>
              </div>
            </div>
          )}
          <div className="tbox"><table>
            <thead><tr><th>Nombre</th><th>Bodega</th><th>D.O.</th><th>Añada</th><th>Vals.</th></tr></thead>
            <tbody>{wines.map(w=>{
              const wr=ratings.filter(r=>{const t=tastings.find(tt=>tt.id===r.tastingId);return t?.wineId===w.id;});
              return(<tr key={w.id}><td><strong>{w.name}</strong></td><td style={{color:"var(--text-muted)"}}>{w.winery}</td><td>{w.denomination}</td><td style={{color:"var(--text-muted)"}}>{w.vintage}</td><td style={{color:"var(--neon)",fontWeight:700}}>{wr.length}</td></tr>);
            })}</tbody>
          </table></div>
        </>
      )}

      {tab==="ratings"&&(
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div className="sec-title" style={{marginBottom:0}}>Valoraciones</div>
            <button className="btn-sm">↓ CSV</button>
          </div>
          <div className="tbox"><table>
            <thead><tr><th>Sesión</th><th>Participante</th><th>Modo</th><th>⭐</th><th>D.O.</th><th>Vino</th><th>Fecha</th></tr></thead>
            <tbody>{ratings.map(r=>{
              const t=tastings.find(tt=>tt.id===r.tastingId);
              return(<tr key={r.id}>
                <td><strong>{t?.event||"—"}</strong></td>
                <td style={{fontSize:11,color:"var(--text-muted)"}}>{r.participantName||r.participantContact||"Anónimo"}</td>
                <td><span className={`tag ${r.participantMode==="account"?"t-ok":r.participantMode==="contact"?"t-active":"t-inactive"}`}>{r.participantMode||"anon"}</span></td>
                <td style={{color:"var(--neon)"}}>{("★").repeat(r.answers?.stars||0)}</td>
                <td>{r.answers?.denomination||"—"}</td>
                <td style={{fontSize:12}}>{r.answers?.wineName||"—"}</td>
                <td style={{fontSize:11,color:"var(--text-muted)"}}>{r.date?.seconds?new Date(r.date.seconds*1000).toLocaleDateString():r.date}</td>
              </tr>);
            })}</tbody>
          </table></div>
        </>
      )}

      {tab==="users"&&(
        <><div className="sec-title">Participantes</div>
        <div className="tbox"><table>
          <thead><tr><th>Nombre/Email</th><th>Contacto</th><th>Modo</th><th>Catas</th></tr></thead>
          <tbody>{[...new Map(ratings.filter(r=>r.participantMode!=="anon").map(r=>[r.participantContact||r.userId,r])).values()].map((r,i)=>(
            <tr key={i}>
              <td><strong>{r.participantName||r.userId||"—"}</strong></td>
              <td style={{fontSize:12,color:"var(--text-muted)"}}>{r.participantContact||r.userId||"—"}</td>
              <td><span className={`tag ${r.participantMode==="account"?"t-ok":"t-active"}`}>{r.participantMode}</span></td>
              <td style={{color:"var(--neon)",fontWeight:700}}>{ratings.filter(x=>x.participantContact===r.participantContact||x.userId===r.userId).length}</td>
            </tr>
          ))}</tbody>
        </table></div></>
      )}
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const go = () => { if(pass==="wow2024") onLogin(); else { setErr(true); setTimeout(()=>setErr(false),1400); }};
  return (
    <div className="login-shell">
      <div className="login-card au">
        <div className="login-logo">WOW</div>
        <div className="login-sub">Panel de administración</div>
        <PasswordInput value={pass} onChange={e=>setPass(e.target.value)} placeholder="Contraseña"/>
        {err&&<div className="login-err">Contraseña incorrecta</div>}
        <button className="btn btn-neon" style={{marginTop:16}} onClick={go}>ENTRAR →</button>
        <p style={{fontFamily:"DM Mono,monospace",fontSize:10,color:"var(--text-dim)",marginTop:16}}>Demo: wow2024</p>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  // Detect admin route: /admin or ?admin
  const isAdminRoute = window.location.pathname.includes("/admin") || window.location.search.includes("admin");
  // Detectar código QR de la URL: /v/CODIGO
const urlPath = window.location.pathname;
const qrFromUrl = urlPath.startsWith("/v/") ? urlPath.slice(3) : null;
console.log("URL path:", urlPath);
console.log("QR from URL:", qrFromUrl);

  const [screen, setScreen] = useState("age");
  const [initialCode] = useState(qrFromUrl); // age | entry | mode | survey | profile | result
  const [session, setSession] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [adminAuth, setAdminAuth] = useState(false);
  const [view, setView] = useState(isAdminRoute ? "login" : "survey_flow");

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) setCurrentUser({ uid:user.uid, email:user.email, name:user.email.split("@")[0] });
    });
    return unsub;
  }, []);

  // Admin flow
  if (view==="login" || view==="admin") {
    return (
      <>
        <style>{css}</style>
        <div className="app">
          {view==="login"&&<AdminLogin onLogin={()=>{setAdminAuth(true);setView("admin");}}/>}
          {view==="admin"&&adminAuth&&<AdminPanel onLogout={()=>{setAdminAuth(false);setView("login");}}/>}
        </div>
      </>
    );
  }

  // Survey flow
  return (
    <>
      <style>{css}</style>
      <div className="app">
        {screen==="age" && <AgeGate onConfirm={async()=>{
  if (initialCode) {
    console.log("Buscando con código:", initialCode);
    try {
      const s = await getActiveTastingByCode(initialCode);
      console.log("Sesión encontrada:", s);
      if (s) { setSession(s); setScreen("mode"); return; }
      else { console.log("No se encontró sesión activa"); }
    } catch(e) {
      console.error("Error:", e);
    }
  }
  setScreen("entry");
}}/>} 
        {screen==="entry" && <EntryScreen onSessionFound={s=>{setSession(s);setScreen("mode");}}/>}
        {screen==="mode" && <ParticipationMode onSelect={p=>{setParticipant(p);if(p.mode==="account"&&p.user)setCurrentUser(p.user);setScreen("survey");}}/>}
        {screen==="survey" && session && (
          <SurveyApp
            session={session}
            participant={participant}
            onGoProfile={()=>setScreen("profile")}
            onSetUser={u=>{setCurrentUser(u);}}
          />
        )}
        {screen==="profile" && <UserProfile user={currentUser} onBack={()=>setScreen(session?"survey":"entry")}/>}

     
      </div>
    </>
  );
}
