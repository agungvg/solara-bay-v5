// Solara Bay — util.js
// Small shared helpers: seeded random, clamps, angles, formatting.
// Written fresh for solara-bay-v5; no code reused from earlier versions.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function rand(rng, lo, hi) { return lo + rng() * (hi - lo); }
export function randInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }

// Shortest signed angle difference, radians.
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function fmtCash(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

export function fmtTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// Distance from point (px,pz) to segment (ax,az)-(bx,bz), in metres.
export function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (pz - az) * dz) / len2;
  t = clamp(t, 0, 1);
  const cx = ax + t * dx, cz = az + t * dz;
  return Math.hypot(px - cx, pz - cz);
}
