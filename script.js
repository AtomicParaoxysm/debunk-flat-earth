// DOM elements
const tRange = document.getElementById("tRange");
const tVal = document.getElementById("tVal");
const altVal = document.getElementById("altVal");
const xVal = document.getElementById("xVal");
const dVal = document.getElementById("dVal");
const thetaVal = document.getElementById("thetaVal");
const dGlobeVal = document.getElementById("dGlobeVal");
const thetaGlobeVal = document.getElementById("thetaGlobeVal");
const moonFlatEl = document.getElementById("moonFlat");
const moonGlobeEl = document.getElementById("moonGlobe");
const flatPct = document.getElementById("flatPct");
const globePct = document.getElementById("globePct");
const verdict = document.getElementById("verdict");
const chart = document.getElementById("chart");

// Editable inputs
const Rinput = document.getElementById("Rinput");
const Hinput = document.getElementById("Hinput");
const RmoonInput = document.getElementById("RmoonInput");
const LatInput = document.getElementById("LatInput");

// UI diagram elements
const observerUI = document.getElementById("observer");
const moonUI = document.getElementById("moonUI");
const heightLineUI = document.getElementById("heightLineUI");
const xLineUI = document.getElementById("xLineUI");
const dLineUI = document.getElementById("dLineUI");
const altLabel = document.getElementById("altLabel");
const edgeL = document.getElementById("edgeL");
const edgeR = document.getElementById("edgeR");
const edgeWarning = document.getElementById("edgeWarning");

// Real (globe) constants
const EARTH_R = 6371;      // km
const MOON_DIST = 384400;  // km, centre to centre (mean)
const MOON_R = 1737.4;     // km

const DEG = Math.PI / 180;
const NIGHT_STEPS = 240;

// Largest moon circle drawn in a sky panel, in pixels
const maxMoonPixels = 160;

function drawLine(el, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  el.style.left = x1 + "px";
  el.style.top = y1 + "px";
  el.style.width = length + "px";
  el.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
}

function readParams() {
  return {
    R: Math.max(1, Number(Rinput.value)),
    h: Math.max(1, Number(Hinput.value)),
    r: Math.max(0, Number(RmoonInput.value)),
    lat: Math.min(89, Math.max(0, Number(LatInput.value))) * DEG,
  };
}

// Moon altitude (radians) t hours after moonrise, Moon on the celestial
// equator: rises due east at t = 0, culminates at t = 6, sets due west at t = 12.
function altitudeAt(t, lat) {
  const hourAngle = 15 * (t - 6) * DEG;
  const s = Math.cos(lat) * Math.cos(hourAngle);
  return Math.asin(Math.max(0, s));
}

// Flat model: Moon at height h must sit x = h / tan(alt) away to appear at alt.
function flatModel(alt, p) {
  const sinA = Math.sin(alt);
  if (sinA < 1e-9) return { x: Infinity, d: Infinity, theta: 0 };
  const d = p.h / sinA;
  return { x: p.h / Math.tan(alt), d, theta: 2 * Math.atan(p.r / d) / DEG };
}

// Globe model: observer on the surface, distance to the Moon shrinks by up to
// one Earth radius as the Moon climbs.
function globeModel(alt) {
  const sinA = Math.sin(alt);
  const cosA = Math.cos(alt);
  const d = Math.sqrt(MOON_DIST * MOON_DIST - EARTH_R * EARTH_R * cosA * cosA) - EARTH_R * sinA;
  return { d, theta: 2 * Math.atan(MOON_R / d) / DEG };
}

function fmtKm(v) {
  return isFinite(v) ? Math.round(v).toLocaleString() : "∞";
}

function drawChart(p, t, peakFlat, peakGlobe) {
  const dpr = window.devicePixelRatio || 1;
  const w = chart.clientWidth;
  const h = chart.clientHeight;
  chart.width = w * dpr;
  chart.height = h * dpr;
  const ctx = chart.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const left = 42, right = 8, top = 8, bottom = 20;
  const plotW = w - left - right;
  const plotH = h - top - bottom;
  const yMax = Math.max(peakFlat, peakGlobe) * 1.1 || 1;

  const px = (tt) => left + (tt / 12) * plotW;
  const py = (th) => top + plotH - (th / yMax) * plotH;

  // Grid and axis labels
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "#8a90aa";
  ctx.strokeStyle = "#252b40";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const v = (yMax / 4) * i;
    const y = py(v);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(w - right, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(v.toFixed(2) + "°", left - 4, y + 4);
  }
  ctx.textAlign = "center";
  for (let hr = 0; hr <= 12; hr += 2) {
    ctx.fillText(hr === 0 ? "rise" : hr === 12 ? "set" : hr + "h", px(hr), h - 5);
  }

  // Curves
  const curve = (fn, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= NIGHT_STEPS; i++) {
      const tt = (12 * i) / NIGHT_STEPS;
      const y = py(fn(altitudeAt(tt, p.lat)));
      if (i === 0) ctx.moveTo(px(tt), y);
      else ctx.lineTo(px(tt), y);
    }
    ctx.stroke();
  };
  curve((a) => flatModel(a, p).theta, "#ffcc00");
  curve((a) => globeModel(a).theta, "#66aaff");

  // Current-time cursor
  ctx.strokeStyle = "#f5f5f5";
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(px(t), top);
  ctx.lineTo(px(t), top + plotH);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDiagram(p, alt, flat, t) {
  const W = 500;
  const baseX = W / 2;
  const baseY = 214;

  // Fit the whole disc (±R) and the Moon's height in the box
  const kmPerPixel = Math.max(p.R / 230, p.h / 160);

  edgeL.style.left = baseX - p.R / kmPerPixel + "px";
  edgeR.style.left = baseX + p.R / kmPerPixel + "px";

  // East (rising side) is left, west (setting side) is right
  const side = t < 6 ? -1 : 1;
  const beyond = flat.x > p.R;
  const xShown = Math.min(flat.x, p.R + 8 * kmPerPixel);

  const moonX = baseX + side * (xShown / kmPerPixel);
  const moonY = baseY - p.h / kmPerPixel;

  observerUI.style.left = baseX + "px";
  observerUI.style.top = baseY - 12 + "px";

  moonUI.style.left = moonX + "px";
  moonUI.style.top = moonY + "px";
  moonUI.classList.toggle("beyond", beyond);

  drawLine(dLineUI, baseX, baseY - 6, moonX, moonY);
  drawLine(heightLineUI, moonX, baseY, moonX, moonY);
  drawLine(xLineUI, baseX, baseY, moonX, baseY);

  altLabel.textContent = `α = ${(alt / DEG).toFixed(1)}°`;
  altLabel.style.left = baseX + (side < 0 ? -70 : 14) + "px";
  altLabel.style.top = baseY - 30 + "px";

  const minAlt = Math.atan(p.h / p.R) / DEG;
  edgeWarning.textContent = beyond
    ? `To look ${(alt / DEG).toFixed(1)}° high, the Moon would need to be ${fmtKm(flat.x)} km away, past the edge of the disc. On this flat model it can never drop below ${minAlt.toFixed(1)}°, so it could never set.`
    : "";
}

function update() {
  const p = readParams();
  const t = Number(tRange.value);
  const alt = altitudeAt(t, p.lat);

  const flat = flatModel(alt, p);
  const globe = globeModel(alt);

  // Peaks occur at culmination (t = 6)
  const altPeak = altitudeAt(6, p.lat);
  const peakFlat = flatModel(altPeak, p).theta;
  const peakGlobe = globeModel(altPeak).theta;
  const minGlobe = globeModel(0).theta;

  // Text readouts
  tVal.textContent = t.toFixed(1);
  altVal.textContent = (alt / DEG).toFixed(1);
  xVal.textContent = fmtKm(flat.x);
  dVal.textContent = fmtKm(flat.d);
  thetaVal.textContent = flat.theta.toFixed(3);
  dGlobeVal.textContent = fmtKm(globe.d);
  thetaGlobeVal.textContent = globe.theta.toFixed(3);

  const flatRel = peakFlat > 0 ? flat.theta / peakFlat : 0;
  const globeRel = globe.theta / peakGlobe;
  flatPct.textContent = (flatRel * 100).toFixed(0);
  globePct.textContent = (globeRel * 100).toFixed(1);

  // Both sky panels share one scale: the largest the Moon gets all night
  const pxPerDeg = maxMoonPixels / Math.max(peakFlat, peakGlobe);
  moonFlatEl.style.width = moonFlatEl.style.height = Math.max(2, flat.theta * pxPerDeg) + "px";
  moonGlobeEl.style.width = moonGlobeEl.style.height = globe.theta * pxPerDeg + "px";

  const globeSwing = ((peakGlobe - minGlobe) / peakGlobe) * 100;
  verdict.textContent =
    `Flat model: the Moon is ${(flatRel * 100).toFixed(0)}% of its peak size right now, and shrinks to zero at the horizon. ` +
    `Globe: it changes by only ${globeSwing.toFixed(1)}% all night. ` +
    `Photos taken through the night show a constant size, matching the globe.`;

  drawChart(p, t, peakFlat, peakGlobe);
  drawDiagram(p, alt, flat, t);
}

tRange.addEventListener("input", update);
Rinput.addEventListener("input", update);
Hinput.addEventListener("input", update);
RmoonInput.addEventListener("input", update);
LatInput.addEventListener("input", update);
window.addEventListener("resize", update);

update();
