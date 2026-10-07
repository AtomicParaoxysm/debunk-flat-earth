// DOM elements
const tRange = document.getElementById("tRange");
const tVal = document.getElementById("tVal");
const vVal = document.getElementById("vVal");
const abVal = document.getElementById("abVal");
const pxVal = document.getElementById("pxVal");
const dopVal = document.getElementById("dopVal");
const abSize = document.getElementById("abSize");
const pxSize = document.getElementById("pxSize");
const vMeasured = document.getElementById("vMeasured");
const vOrbit = document.getElementById("vOrbit");
const vStar = document.getElementById("vStar");
const verdict = document.getElementById("verdict");

const chartAb = document.getElementById("chartAb");
const chartPx = document.getElementById("chartPx");
const skyAb = document.getElementById("skyAb");
const skyPx = document.getElementById("skyPx");
const orbitsCanvas = document.getElementById("orbits");

// Editable inputs
const starSelect = document.getElementById("starSelect");
const distInput = document.getElementById("distInput");
const kappaInput = document.getElementById("kappaInput");

// Constants
const C = 299792.458;               // km/s
const AU = 149597870.7;             // km
const LY = 9.4607e12;               // km
const LY_PER_PC = 3.26156;
const YEAR_DAYS = 365.25;
const YEAR_S = YEAR_DAYS * 86400;
const ARCSEC = Math.PI / (180 * 3600);
const DEG = Math.PI / 180;

const COLOR_MOVING = "#66aaff";
const COLOR_STILL = "#ff7a85";

// Approximate distances and ecliptic latitudes
const STARS = [
  { name: "61 Cygni", ly: 11.4, beta: 51.9 },
  { name: "Vega", ly: 25, beta: 61.7 },
  { name: "Polaris", ly: 433, beta: 66.1 },
  { name: "Deneb", ly: 2600, beta: 59.9 },
  { name: "Andromeda Galaxy", ly: 2500000, beta: 33.3 },
];

STARS.forEach((s, i) => starSelect.add(new Option(s.name, i)));
starSelect.add(new Option("Custom", "custom"));

let beta = STARS[0].beta * DEG;

function readParams() {
  const ly = Math.max(1, Number(distInput.value));
  const kappa = Math.max(0.001, Number(kappaInput.value)) * ARCSEC;
  return {
    ly,
    kappa,
    parallax: LY_PER_PC / ly,                 // arcsec
    vEarth: C * Math.tan(kappa),              // km/s, from the measured shift
  };
}

// Star at ecliptic longitude 0 and latitude beta; Earth at longitude L.
// Offsets are east/north on the sky, in arcsec.
function shifts(day, p) {
  const L = (2 * Math.PI * day) / YEAR_DAYS;
  const kappaSec = p.kappa / ARCSEC;
  return {
    L,
    abE: kappaSec * Math.cos(L),
    abN: kappaSec * Math.sin(beta) * Math.sin(L),
    pxE: -p.parallax * Math.sin(L),
    pxN: p.parallax * Math.sin(beta) * Math.cos(L),
    doppler: -p.vEarth * Math.sin(L) * Math.cos(beta),
  };
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

function fmtArcsec(v) {
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 10) return v.toFixed(1);
  if (a >= 0.01) return v.toFixed(3);
  return v.toExponential(1);
}

function drawYearChart(canvas, p, key, amp, day) {
  const { ctx, w, h } = setupCanvas(canvas);
  const box = { left: 40, right: 8, top: 6, bottom: 18 };
  const plotW = w - box.left - box.right;
  const plotH = h - box.top - box.bottom;
  const yMax = amp * 1.15;
  const px = (d) => box.left + (d / YEAR_DAYS) * plotW;
  const py = (v) => box.top + plotH / 2 - (v / yMax) * (plotH / 2);

  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "#8a90aa";
  ctx.strokeStyle = "#252b40";
  ctx.lineWidth = 1;
  ctx.textAlign = "right";
  [-amp, 0, amp].forEach((v) => {
    ctx.beginPath();
    ctx.moveTo(box.left, py(v));
    ctx.lineTo(w - box.right, py(v));
    ctx.stroke();
    ctx.fillText(fmtArcsec(v), box.left - 4, py(v) + 4);
  });
  ctx.textAlign = "center";
  ["Jan", "Apr", "Jul", "Oct"].forEach((m, i) => ctx.fillText(m, px(i * 91.3), h - 4));

  // Earth standing still: no shift at all
  ctx.strokeStyle = COLOR_STILL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(0), py(0));
  ctx.lineTo(px(YEAR_DAYS), py(0));
  ctx.stroke();

  ctx.strokeStyle = COLOR_MOVING;
  ctx.beginPath();
  for (let d = 0; d <= YEAR_DAYS; d += 2) {
    const y = py(shifts(d, p)[key]);
    if (d === 0) ctx.moveTo(px(d), y);
    else ctx.lineTo(px(d), y);
  }
  ctx.stroke();

  ctx.strokeStyle = "#f5f5f5";
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(px(day), box.top);
  ctx.lineTo(px(day), box.top + plotH);
  ctx.stroke();
  ctx.setLineDash([]);
}

// The star's apparent path on the sky over a year
function drawSkyTrace(canvas, p, keyE, keyN, amp, day) {
  const { ctx, w, h } = setupCanvas(canvas);
  const cx = w / 2;
  const cy = h / 2;
  const scale = 58 / amp;

  // True position crosshair
  ctx.strokeStyle = "#3a4260";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 70, cy);
  ctx.lineTo(cx + 70, cy);
  ctx.moveTo(cx, cy - 66);
  ctx.lineTo(cx, cy + 66);
  ctx.stroke();

  ctx.strokeStyle = COLOR_MOVING;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  for (let d = 0; d <= YEAR_DAYS + 2; d += 2) {
    const s = shifts(d, p);
    // East is drawn to the left, as on a sky map
    const x = cx - s[keyE] * scale;
    const y = cy - s[keyN] * scale;
    if (d === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  const s = shifts(day, p);
  ctx.fillStyle = COLOR_STILL;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = COLOR_MOVING;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx - s[keyE] * scale, cy - s[keyN] * scale, 4.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "#8a90aa";
  ctx.textAlign = "left";
  ctx.fillText("E", 6, cy - 4);
  ctx.textAlign = "right";
  ctx.fillText("W", w - 6, cy - 4);
  ctx.fillStyle = COLOR_STILL;
  ctx.fillText("still Earth: no motion", w - 6, h - 6);
}

function arrow(ctx, x1, y1, x2, y2, color) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 8 * Math.cos(a - 0.4), y2 - 8 * Math.sin(a - 0.4));
  ctx.lineTo(x2 - 8 * Math.cos(a + 0.4), y2 - 8 * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
}

// Top-down view: Earth on its orbit, its velocity, and the direction to the star
function drawOrbit(p, s) {
  const { ctx, w, h } = setupCanvas(orbitsCanvas);
  const cx = 190;
  const cy = h / 2 + 8;
  const r = 56;

  ctx.strokeStyle = "#3a4260";
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
  ctx.fill();

  const ex = cx + r * Math.cos(s.L);
  const ey = cy - r * Math.sin(s.L);

  // Light from the distant star arrives along -x
  ctx.strokeStyle = "rgba(245, 245, 245, 0.35)";
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(w - 40, ey);
  ctx.lineTo(ex + 8, ey);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(w - 30, ey, 4, 0, 2 * Math.PI);
  ctx.fill();

  // Velocity: perpendicular to the Sun-Earth line
  arrow(ctx, ex, ey, ex - 34 * Math.sin(s.L), ey - 34 * Math.cos(s.L), COLOR_MOVING);

  ctx.fillStyle = "#00d0ff";
  ctx.beginPath();
  ctx.arc(ex, ey, 6, 0, 2 * Math.PI);
  ctx.fill();

  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "#8a90aa";
  ctx.textAlign = "left";
  ctx.fillText("Top-down view: Earth's orbit (1 AU)", 10, 18);
  ctx.textAlign = "right";
  ctx.fillText("light from the star →", w - 10, 18);
  ctx.fillStyle = COLOR_MOVING;
  ctx.textAlign = "left";
  ctx.fillText(`v = ${p.vEarth.toFixed(1)} km/s`, 10, h - 10);
}

function fmtSpeed(kms) {
  if (kms < 1000) return kms.toFixed(1) + " km/s";
  const c = kms / C;
  if (c < 0.01) return Math.round(kms).toLocaleString() + " km/s";
  return Math.round(kms).toLocaleString() + " km/s (" + (c < 10 ? c.toFixed(2) : Math.round(c).toLocaleString()) + "× light)";
}

function update() {
  const p = readParams();
  const day = Number(tRange.value);
  const s = shifts(day, p);
  const kappaSec = p.kappa / ARCSEC;

  tVal.textContent = day;
  vVal.textContent = p.vEarth.toFixed(2);
  abVal.textContent = fmtArcsec(Math.hypot(s.abE, s.abN));
  pxVal.textContent = fmtArcsec(Math.hypot(s.pxE, s.pxN));
  dopVal.textContent = (s.doppler >= 0 ? "+" : "") + s.doppler.toFixed(1);
  abSize.textContent = kappaSec.toFixed(1);
  pxSize.textContent = fmtArcsec(p.parallax);

  const orbitSpeed = (2 * Math.PI * AU) / YEAR_S;
  // If Earth is still, the star must circle with radius d·tan(κ) once a year
  const starSpeed = (2 * Math.PI * p.ly * LY * Math.tan(p.kappa)) / YEAR_S;
  const lightLimitLy = (C * YEAR_S) / (2 * Math.PI * Math.tan(p.kappa)) / LY;

  vMeasured.textContent = p.vEarth.toFixed(2) + " km/s";
  vOrbit.textContent = orbitSpeed.toFixed(2) + " km/s";
  vStar.textContent = fmtSpeed(starSpeed);

  const name = starSelect.value === "custom" ? "This star" : STARS[starSelect.value].name;
  const match = Math.abs(p.vEarth - orbitSpeed) / orbitSpeed < 0.01;
  const lead = match
    ? "The two blue speeds agree: the shift is exactly what a 1 AU yearly orbit produces. "
    : "The blue speeds no longer agree, so this κ would not fit a 1 AU orbit. ";
  verdict.textContent =
    lead +
    (starSpeed > C
      ? `If Earth stood still, ${name} would have to race in a circle faster than light, in step with the Sun. Impossible, so Earth is the one moving.`
      : `If Earth stood still, ${name} would need its own circle, synced to the Sun, and any star beyond ${Math.round(lightLimitLy).toLocaleString()} ly would need to beat light speed. Pick Deneb or Andromeda.`);

  drawYearChart(chartAb, p, "abE", kappaSec, day);
  drawYearChart(chartPx, p, "pxE", p.parallax, day);
  drawSkyTrace(skyAb, p, "abE", "abN", kappaSec, day);
  drawSkyTrace(skyPx, p, "pxE", "pxN", p.parallax, day);
  drawOrbit(p, s);
}

starSelect.addEventListener("change", () => {
  if (starSelect.value !== "custom") {
    const star = STARS[starSelect.value];
    distInput.value = star.ly;
    beta = star.beta * DEG;
  }
  update();
});
distInput.addEventListener("input", () => {
  starSelect.value = "custom";
  update();
});
tRange.addEventListener("input", update);
kappaInput.addEventListener("input", update);
window.addEventListener("resize", update);

update();
