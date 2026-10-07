// DOM elements
const tRange = document.getElementById("tRange");
const tVal = document.getElementById("tVal");
const elongVal = document.getElementById("elongVal");
const distVal = document.getElementById("distVal");
const sizeVal = document.getElementById("sizeVal");
const kHelioVal = document.getElementById("kHelioVal");
const kGeoVal = document.getElementById("kGeoVal");
const kHelioLbl = document.getElementById("kHelioLbl");
const kGeoLbl = document.getElementById("kGeoLbl");
const verdict = document.getElementById("verdict");
const modelNote = document.getElementById("modelNote");

const chartTime = document.getElementById("chartTime");
const chartSize = document.getElementById("chartSize");
const scopeHelio = document.getElementById("scopeHelio");
const scopeGeo = document.getElementById("scopeGeo");
const orbitsCanvas = document.getElementById("orbits");

// Editable inputs
const aInput = document.getElementById("aInput");
const pvInput = document.getElementById("pvInput");
const sInput = document.getElementById("sInput");

// Constants
const AU = 149597870.7;     // km
const VENUS_R = 6051.8;     // km
const EARTH_PERIOD = 365.256;
const RAD_TO_ARCSEC = 206264.806;
const CYCLE_STEPS = 400;

const COLOR_HELIO = "#66aaff";
const COLOR_GEO = "#ffcc00";
const COLOR_LIT = "#f3e9c6";
const COLOR_DARK = "#262b40";

function readParams() {
  const a = Math.min(0.99, Math.max(0.1, Number(aInput.value)));
  const pv = Math.min(EARTH_PERIOD - 1, Math.max(10, Number(pvInput.value)));
  const S = Math.max(1, Number(sInput.value));
  // Synodic period: time between two passes of Venus between us and the Sun
  const synodic = 1 / (1 / pv - 1 / EARTH_PERIOD);
  return { a, pv, S, synodic };
}

// Everything below is in Earth-centred coordinates (Earth at the origin),
// so both models can be compared directly.
function state(t, p) {
  const angE = (2 * Math.PI * t) / EARTH_PERIOD;
  const angV = (2 * Math.PI * t) / p.pv;

  // Sun-centred positions, t = 0 is inferior conjunction (both on the +x axis)
  const E = [Math.cos(angE), Math.sin(angE)];
  const V = [p.a * Math.cos(angV), p.a * Math.sin(angV)];

  // Venus as seen from Earth: identical in both models
  const venus = [V[0] - E[0], V[1] - E[1]];
  const dist = Math.hypot(venus[0], venus[1]);

  // Direction to the Sun from Earth
  const sunDir = [-E[0], -E[1]];
  const sunHelio = sunDir;                               // 1 AU away
  const sunGeo = [sunDir[0] * p.S, sunDir[1] * p.S];     // S AU away, beyond Venus

  const elong = angleBetween(sunDir, venus);
  // Positive cross product = Venus east of the Sun (evening sky)
  const east = sunDir[0] * venus[1] - sunDir[1] * venus[0] > 0;

  return {
    E, V, venus, dist, sunGeo, elong, east,
    theta: 2 * Math.atan(VENUS_R / (dist * AU)) * RAD_TO_ARCSEC,
    kHelio: litFraction(venus, sunHelio),
    kGeo: litFraction(venus, sunGeo),
  };
}

function angleBetween(u, v) {
  const c = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]));
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

// Fraction of the disc we see lit, from the phase angle at Venus
function litFraction(venus, sun) {
  const toSun = [sun[0] - venus[0], sun[1] - venus[1]];
  const toEarth = [-venus[0], -venus[1]];
  const i = angleBetween(toSun, toEarth);
  return (1 + Math.cos(i)) / 2;
}

function sampleCycle(p) {
  const pts = [];
  for (let n = 0; n <= CYCLE_STEPS; n++) {
    const t = (p.synodic * n) / CYCLE_STEPS;
    pts.push({ t, ...state(t, p) });
  }
  return pts;
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function plotFrame(ctx, w, h, xMax, xFmt, xTicks) {
  const box = { left: 34, right: 8, top: 6, bottom: 18 };
  box.w = w - box.left - box.right;
  box.h = h - box.top - box.bottom;
  box.px = (x) => box.left + (x / xMax) * box.w;
  box.py = (k) => box.top + box.h - k * box.h;

  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "#8a90aa";
  ctx.strokeStyle = "#252b40";
  ctx.lineWidth = 1;
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = box.py(i / 4);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(w - box.right, y);
    ctx.stroke();
    ctx.fillText(i * 25 + "%", box.left - 4, y + 4);
  }
  ctx.textAlign = "center";
  xTicks.forEach((x) => ctx.fillText(xFmt(x), box.px(x), h - 4));
  return box;
}

function curve(ctx, pts, xKey, yKey, box, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach((pt, i) => {
    const x = box.px(pt[xKey]);
    const y = box.py(pt[yKey]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function dot(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = "#0b1020";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawTimeChart(pts, p, cur) {
  const { ctx, w, h } = setupCanvas(chartTime);
  const ticks = [0, 100, 200, 300, 400, 500];
  const box = plotFrame(ctx, w, h, p.synodic, (d) => d + "d", ticks);

  curve(ctx, pts, "t", "kGeo", box, COLOR_GEO);
  curve(ctx, pts, "t", "kHelio", box, COLOR_HELIO);

  ctx.strokeStyle = "#f5f5f5";
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(box.px(cur.t), box.top);
  ctx.lineTo(box.px(cur.t), box.top + box.h);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSizeChart(pts, cur, maxTheta) {
  const { ctx, w, h } = setupCanvas(chartSize);
  const xMax = Math.ceil((maxTheta * 1.05) / 10) * 10;
  const ticks = [];
  for (let x = 0; x <= xMax; x += 20) ticks.push(x);
  const box = plotFrame(ctx, w, h, xMax, (x) => x + "″", ticks);

  // Galileo's 1610 observations: Venus small and nearly round, later large and crescent
  ctx.fillStyle = "rgba(120, 230, 140, 0.22)";
  ctx.fillRect(box.px(9), box.py(1), box.px(25) - box.px(9), box.py(0.75) - box.py(1));
  ctx.fillStyle = "rgba(120, 230, 140, 0.9)";
  ctx.textAlign = "left";
  ctx.fillText("small + nearly full", box.px(26), box.py(0.9));

  curve(ctx, pts, "theta", "kGeo", box, COLOR_GEO);
  curve(ctx, pts, "theta", "kHelio", box, COLOR_HELIO);

  dot(ctx, box.px(cur.theta), box.py(cur.kGeo), COLOR_GEO);
  dot(ctx, box.px(cur.theta), box.py(cur.kHelio), COLOR_HELIO);
}

// Venus through a telescope: lit side faces the Sun
function drawScope(canvas, theta, k, east, maxTheta) {
  const { ctx, w, h } = setupCanvas(canvas);
  const cx = w / 2;
  const cy = h / 2;

  const sky = ctx.createRadialGradient(cx, cy * 2.2, 0, cx, cy, w / 2);
  sky.addColorStop(0, "#1b2135");
  sky.addColorStop(1, "#050712");
  ctx.fillStyle = sky;
  ctx.beginPath();
  ctx.arc(cx, cy, w / 2 - 2, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = "#2f3755";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Shared scale: the largest Venus gets fills 160px
  const R = Math.max(2, ((theta / maxTheta) * 160) / 2);

  // East of the Sun means the Sun is to the west (right, facing south)
  const litRight = east;

  ctx.fillStyle = COLOR_DARK;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = COLOR_LIT;
  ctx.beginPath();
  if (litRight) ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2);
  else ctx.arc(cx, cy, R, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.fill();

  // Terminator: an ellipse that adds light past half, or eats it below half
  const rx = R * Math.abs(2 * k - 1);
  ctx.fillStyle = k >= 0.5 ? COLOR_LIT : COLOR_DARK;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, R, 0, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#8a90aa";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = litRight ? "right" : "left";
  ctx.fillText(litRight ? "Sun →" : "← Sun", litRight ? w - 22 : 22, cy + 4);
}

function circle(ctx, x, y, r, stroke, dash) {
  ctx.strokeStyle = stroke;
  ctx.setLineDash(dash || []);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.setLineDash([]);
}

function body(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

function line(ctx, x1, y1, x2, y2, color, dash) {
  ctx.strokeStyle = color;
  ctx.setLineDash(dash || []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Top-down views of both models at the current moment
function drawOrbits(p, cur) {
  const { ctx, w, h } = setupCanvas(orbitsCanvas);
  const cy = h / 2 + 8;
  const reach = 92;

  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = COLOR_HELIO;
  ctx.fillText("Sun-centred (Copernicus)", w / 4, 16);
  ctx.fillStyle = COLOR_GEO;
  ctx.fillText("Earth-centred (Ptolemy)", (3 * w) / 4, 16);
  ctx.lineWidth = 1.5;

  // Sun-centred: Sun in the middle
  {
    const cx = w / 4;
    const k = reach;
    const ex = cx + cur.E[0] * k, ey = cy - cur.E[1] * k;
    const vx = cx + cur.V[0] * k, vy = cy - cur.V[1] * k;
    circle(ctx, cx, cy, k, "#3a4260", [3, 3]);
    circle(ctx, cx, cy, p.a * k, "#3a4260", [3, 3]);
    line(ctx, vx, vy, cx, cy, "rgba(255, 204, 0, 0.35)");
    line(ctx, ex, ey, vx, vy, "#f5f5f5", [4, 3]);
    body(ctx, cx, cy, 8, "#ffcc00");
    body(ctx, ex, ey, 5, "#00d0ff");
    body(ctx, vx, vy, 4, "#ffffff");
  }

  // Earth-centred: Earth in the middle, Venus on an epicycle, Sun farther out
  {
    const cx = (3 * w) / 4;
    const drawnS = Math.min(p.S, 2.4);
    const k = reach / Math.max(drawnS, 1 + p.a);
    const sunDir = [-cur.E[0], -cur.E[1]];
    const sx = cx + sunDir[0] * drawnS * k, sy = cy - sunDir[1] * drawnS * k;
    const ccx = cx + sunDir[0] * k, ccy = cy - sunDir[1] * k;   // epicycle centre, 1 unit out
    const vx = cx + cur.venus[0] * k, vy = cy - cur.venus[1] * k;
    circle(ctx, cx, cy, k, "#3a4260", [3, 3]);                  // deferent
    circle(ctx, cx, cy, drawnS * k, "#3a4260", [1, 4]);         // Sun's circle
    circle(ctx, ccx, ccy, p.a * k, "#5a6280", [3, 3]);          // epicycle
    line(ctx, vx, vy, sx, sy, "rgba(255, 204, 0, 0.35)");
    line(ctx, cx, cy, vx, vy, "#f5f5f5", [4, 3]);
    body(ctx, sx, sy, 8, "#ffcc00");
    body(ctx, cx, cy, 5, "#00d0ff");
    body(ctx, vx, vy, 4, "#ffffff");
    if (p.S > drawnS) {
      ctx.fillStyle = "#8a90aa";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(`Sun at ${p.S} AU (not to scale)`, cx, h - 8);
    }
  }
}

function update() {
  const p = readParams();
  tRange.max = Math.round(p.synodic);
  const t = Math.min(Number(tRange.value), p.synodic);

  const cur = { t, ...state(t, p) };
  const pts = sampleCycle(p);
  const maxTheta = Math.max(...pts.map((pt) => pt.theta));

  const pct = (k) => (k * 100).toFixed(0);
  tVal.textContent = t.toFixed(0);
  elongVal.textContent = ((cur.elong * 180) / Math.PI).toFixed(1);
  distVal.textContent = cur.dist.toFixed(3);
  sizeVal.textContent = cur.theta.toFixed(1);
  kHelioVal.textContent = kHelioLbl.textContent = pct(cur.kHelio);
  kGeoVal.textContent = kGeoLbl.textContent = pct(cur.kGeo);

  const maxGeo = Math.max(...pts.map((pt) => pt.kGeo));
  const smallest = pts.reduce((m, pt) => (pt.theta < m.theta ? pt : m));
  verdict.textContent =
    `Over a full cycle the Sun-centred model shows every phase, and Venus is nearly full exactly when it looks smallest ` +
    `(${smallest.theta.toFixed(0)}″, ${pct(smallest.kHelio)}% lit). ` +
    `The Earth-centred model never gets past ${pct(maxGeo)}% lit, and is darkest when smallest. ` +
    `Galileo saw a small, nearly full Venus in 1610, which only the Sun-centred geometry allows.`;

  if (p.S < 1.001) {
    modelNote.textContent =
      "S = 1 is Tycho Brahe's model: Venus orbits the Sun, the Sun orbits Earth. Its phases match the Sun-centred model exactly, so phases cannot rule it out. Stellar parallax (1838) and the aberration of starlight (1727) show Earth itself moves, which settles it.";
  } else if (p.S < 1 + p.a) {
    modelNote.textContent =
      `With S below ${(1 + p.a).toFixed(2)} AU, Venus sometimes passes behind the Sun, which Ptolemy's model does not allow. Set S to 1 to see Tycho's model.`;
  } else {
    modelNote.textContent =
      "Both models put Venus at the same distance from us at every moment, so sizes match. The only difference is where the Sun is, and that alone sets the phase. Try S = 1 to see Tycho's compromise model.";
  }

  drawTimeChart(pts, p, cur);
  drawSizeChart(pts, cur, maxTheta);
  drawScope(scopeHelio, cur.theta, cur.kHelio, cur.east, maxTheta);
  drawScope(scopeGeo, cur.theta, cur.kGeo, cur.east, maxTheta);
  drawOrbits(p, cur);
}

tRange.addEventListener("input", update);
aInput.addEventListener("input", update);
pvInput.addEventListener("input", update);
sInput.addEventListener("input", update);
window.addEventListener("resize", update);

update();
