let pktCount = 0;
let history = []; // {t, temp, press}
const MAX_POINTS = 240; // ~72s @ 300ms

const el = (id) => document.getElementById(id);

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function setConn(isOk, ageSec){
  const dot = el("connDot");
  const text = el("connText");
  if(!isOk){
    dot.style.background = "rgba(255,95,109,.9)";
    dot.style.boxShadow = "0 0 12px rgba(255,95,109,.35)";
    text.textContent = "DISCONNECTED";
  }else{
    dot.style.background = "rgba(76,240,166,.9)";
    dot.style.boxShadow = "0 0 12px rgba(76,240,166,.35)";
    text.textContent = `CONNECTED (${ageSec.toFixed(1)}s)`;
  }
}

function updateGauge(temp){
  const t = clamp(temp, 0, 120);

  // 0°C = sinistra (180°), 120°C = destra (0°)
  const deg = 180 + (t/120)*180;
  el("needle").setAttribute("transform", `translate(120,120) rotate(${deg})`);

  const pct = (t/120)*100;
  const gf = el("gaugeFill");
  gf.style.strokeDasharray = `${pct} ${100-pct}`;

  if(t < 70){
    gf.style.stroke = "rgba(76,240,166,.95)";
  }else if(t < 85){
    gf.style.stroke = "rgba(255,213,106,.95)";
  }else{
    gf.style.stroke = "rgba(255,95,109,.95)";
  }
}

function setStatus(status){
  const s = el("status");
  const hint = el("statusHint");

  s.textContent = status ?? "—";

  if(status === "OK"){
    s.style.color = "rgba(76,240,166,.95)";
    hint.textContent = "Nominal telemetry";
  }else if(status === "INIT"){
    s.style.color = "rgba(220,235,255,.66)";
    hint.textContent = "Waiting for telemetry…";
  }else{
    s.style.color = "rgba(255,95,109,.95)";
    hint.textContent = "Fault detected";
  }
}

function drawChart(){
  const canvas = el("chart");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0,0,W,H);

  // background grid
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;

  ctx.strokeStyle = "rgba(160,205,255,0.08)";
  for(let i=1;i<6;i++){
    const y = (H/6)*i;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
  }
  for(let i=1;i<10;i++){
    const x = (W/10)*i;
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
  }

  if(history.length < 2) return;

  const tMin = 0, tMax = 120;
  const pMin = 7.0, pMax = 9.0;

  const xStep = W / (MAX_POINTS-1);

  // temp line
  ctx.strokeStyle = "rgba(111,183,255,0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((p, i)=>{
    const x = i*xStep;
    const y = H - ((p.temp - tMin)/(tMax - tMin))*H;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // pressure line
  ctx.strokeStyle = "rgba(76,240,166,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((p, i)=>{
    const x = i*xStep;
    const y = H - ((p.press - pMin)/(pMax - pMin))*H;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // last point highlight (temp)
  const last = history[history.length-1];
  const lx = (history.length-1)*xStep;
  const ly = H - ((last.temp - tMin)/(tMax - tMin))*H;

  ctx.fillStyle = "rgba(111,183,255,0.95)";
  ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI*2); ctx.fill();
}

async function updateFaultModeLabel(){
  try{
    const r = await fetch("/fault", { cache: "no-store" });
    const j = await r.json();
    el("faultMode").textContent = j.fault_mode ? "ON" : "OFF";
  }catch{
    el("faultMode").textContent = "—";
  }
}

function renderLog(events){
  const log = el("log");
  log.innerHTML = events.map(e=>{
    const d = new Date(e.ts * 1000).toLocaleTimeString();
    return `<div>[${d}] ${escapeHtml(e.msg)}</div>`;
  }).join("");
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

// Rocket micro-vibration via CSS vars on <html>
function rocketShake(vib){
  const shake = clamp(vib, 0, 2) * 1.8;
  document.documentElement.style.setProperty("--rx", `${(Math.random()-0.5)*shake}px`);
  document.documentElement.style.setProperty("--ry", `${(Math.random()-0.5)*shake}px`);
}

async function refresh(){
  let latest;
  try{
    latest = await fetch("/latest", { cache: "no-store" }).then(r=>r.json());
  }catch{
    latest = null;
  }

  if(!latest){
    setConn(false, 999);
    return;
  }

  const now = Date.now()/1000;
  const age = now - (latest.ts || 0);
  const okConn = (latest.ts && age < 2.0);

  setConn(okConn, age);
  el("lastPkt").textContent = latest.ts ? new Date(latest.ts*1000).toLocaleTimeString() : "—";

  const press = Number(latest.pressure ?? 0);
  const temp = Number(latest.temp ?? 0);
  const vib  = Number(latest.vib ?? 0);

  el("pressure").textContent = isFinite(press) ? press.toFixed(2) : "—";
  el("temp").textContent = isFinite(temp) ? temp.toFixed(2) : "—";
  el("vib").textContent = isFinite(vib) ? vib.toFixed(2) : "—";

  setStatus(latest.status || "INIT");
  updateGauge(isFinite(temp) ? temp : 0);

  // rocket shake (even if disconnected it will settle)
  rocketShake(isFinite(vib) ? vib : 0);

  if(okConn){
    pktCount += 1;
    el("pktCount").textContent = String(pktCount);
  }

  if(okConn){
    history.push({ t: now, temp, press });
    if(history.length > MAX_POINTS) history.shift();
    drawChart();
  }

  try{
    const ev = await fetch("/events", { cache: "no-store" }).then(r=>r.json());
    renderLog(ev);
  }catch{
    // ignore
  }

  updateFaultModeLabel();
}

function bindControls(){
  el("btnFaultOn").addEventListener("click", async ()=>{
    await fetch("/fault/on", { method:"POST", cache:"no-store" });
    updateFaultModeLabel();
  });

  el("btnFaultOff").addEventListener("click", async ()=>{
    await fetch("/fault/off", { method:"POST", cache:"no-store" });
    updateFaultModeLabel();
  });
}

bindControls();
setInterval(refresh, 300);
refresh();
