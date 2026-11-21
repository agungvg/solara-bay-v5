// Solara Bay — actors.js
// People: sidewalk-locked pedestrians (they can never overlap a car — their
// lanes sit on the sidewalk strips, never on the asphalt), bright readable
// on-foot enemies with name tags + health bars, and the player figure.
// Every figure is faceless low-poly: no round head on a square body, no
// flat drawn faces anywhere.
import { WORLD } from './config.js';
import { rand, pick, clamp } from './util.js';

const THREE = window.THREE;

const SHIRTS = [0xe87aa0, 0x38b6d3, 0xf2b544, 0x7fb069, 0xb388f5, 0xe8542f, 0xd8d0c0, 0x4a90d9];
const PANTS = [0x2e3440, 0x4a3a2e, 0x3a4a5e, 0x5e4a3a];
const SKINS = [0xc98d64, 0x8a5a3b, 0xe0ac82, 0x6b4226];

// Faceless low-poly person: legs, torso, arms, plain head. No face.
export function makePerson(shirt, pants, skin, scale = 1) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.95 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.85 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), pantsMat);
  legL.position.set(-0.13, 0.4, 0); legL.castShadow = true;
  const legR = legL.clone(); legR.position.x = 0.13;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirtMat);
  torso.position.y = 1.16; torso.castShadow = true;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.16), shirtMat);
  armL.position.set(-0.4, 1.14, 0); armL.castShadow = true;
  const armR = armL.clone(); armR.position.x = 0.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skinMat);
  head.position.y = 1.72; head.castShadow = true;
  // hair cap — a flattened dark sphere, no face features
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.215, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 1 }));
  hair.position.y = 1.76;
  g.add(legL, legR, torso, armL, armR, head, hair);
  g.userData = { legL, legR, armL, armR };
  g.scale.setScalar(scale);
  return g;
}

// Name tag sprite: name + health bar, drawn on a canvas. Enemies read at a
// glance even at screenshot scale.
export function makeNameTag(name, hpColor = '#ff5544') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 72;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(2.6, 0.73, 1);
  function draw(hp) {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 72);
    g.fillStyle = 'rgba(10,12,18,0.72)';
    g.fillRect(8, 4, 240, 64);
    g.fillStyle = '#fff';
    g.font = 'bold 26px Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(name, 128, 34);
    g.fillStyle = '#333';
    g.fillRect(28, 46, 200, 12);
    g.fillStyle = hpColor;
    g.fillRect(28, 46, 200 * Math.max(0, hp), 12);
    tex.needsUpdate = true;
  }
  draw(1);
  sprite.userData.draw = draw;
  return sprite;
}

// Walkable block segments along one axis: a ped walks between two
// neighbouring cross-streets and reverses at the ends, so it NEVER steps
// onto asphalt — crossing an intersection would put it on the road.
const SEGMENTS = [[-151, -129], [-111, -89], [-71, -49], [-31, -9], [9, 31], [49, 71], [89, 111], [129, 151]];

export function segmentFor(t) {
  for (const [a, b] of SEGMENTS) if (t >= a && t <= b) return [a, b];
  // outside any segment (on a crossing): snap to the nearest segment
  let best = SEGMENTS[0], bd = 1e9;
  for (const [a, b] of SEGMENTS) {
    const d = t < a ? a - t : t - b;
    if (d < bd) { bd = d; best = [a, b]; }
  }
  return best;
}
export function spawnPedestrians(scene, rng, count) {
  const peds = [];
  const lanes = [];
  for (const x of WORLD.avenues) {
    for (const s of [-1, 1]) lanes.push({ axis: 'z', fixed: x + s * 7.5, from: -150, to: 150 });
  }
  for (const z of WORLD.streets) {
    for (const s of [-1, 1]) lanes.push({ axis: 'x', fixed: z + s * 7.5, from: -150, to: 150 });
  }
  for (let i = 0; i < count; i++) {
    const lane = pick(rng, lanes);
    const [segFrom, segTo] = pick(rng, SEGMENTS);
    const t = rand(rng, segFrom + 2, segTo - 2);
    const mesh = makePerson(pick(rng, SHIRTS), pick(rng, PANTS), pick(rng, SKINS), rand(rng, 0.92, 1.06));
    const ped = {
      mesh, lane, t, segFrom, segTo, dir: rng() < 0.5 ? 1 : -1,
      speed: rand(rng, 1.0, 1.9), phase: rand(rng, 0, 6),
      x: 0, z: 0,
    };
    scene.add(mesh);
    peds.push(ped);
  }
  return peds;
}

export function updatePeds(peds, dt, time) {
  for (const p of peds) {
    p.t += p.dir * p.speed * dt;
    if (p.t > p.segTo - 1) { p.t = p.segTo - 1; p.dir = -1; }
    if (p.t < p.segFrom + 1) { p.t = p.segFrom + 1; p.dir = 1; }
    if (p.lane.axis === 'z') { p.x = p.lane.fixed; p.z = p.t; }
    else { p.x = p.t; p.z = p.lane.fixed; }
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.lane.axis === 'z' ? (p.dir > 0 ? 0 : Math.PI) : (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    // walk bob + leg swing
    const s = Math.sin(time * 7 + p.phase);
    p.mesh.position.y = Math.abs(Math.cos(time * 7 + p.phase)) * 0.05;
    p.mesh.userData.legL.rotation.x = s * 0.5;
    p.mesh.userData.legR.rotation.x = -s * 0.5;
    p.mesh.userData.armL.rotation.x = -s * 0.4;
    p.mesh.userData.armR.rotation.x = s * 0.4;
  }
}

// True when (x,z) sits on asphalt — used by the glitch self-check.
export function onRoad(x, z) {
  for (const ax of WORLD.avenues) if (Math.abs(x - ax) < 6) return true;
  for (const sz of WORLD.streets) if (Math.abs(z - sz) < 6) return true;
  return false;
}

// --- ENEMIES --------------------------------------------------------------
// Bright jackets (orange / red / yellow), a pale rim stripe on the torso,
// name tag + health bar overhead, and a warm point light is NOT used (perf);
// readability comes from colour, size and the tag, plus the foot shot's
// bright late-afternoon sun and closer camera.
const ENEMY_JACKETS = [0xff5a1f, 0xe8282a, 0xffc21f, 0xff7a1f, 0xd21f4e];
export function spawnEnemies(scene, spots) {
  const enemies = [];
  const names = ['KERON-1', 'KERON-2', 'KERON-3', 'KERON-4', 'KERON-5', 'KERON-6'];
  spots.forEach((sp, i) => {
    const mesh = makePerson(ENEMY_JACKETS[i % ENEMY_JACKETS.length], 0x2e3440, [0xc98d64, 0xe0ac82][i % 2], 1.12);
    // bright rim stripe across the chest + back so the silhouette pops
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.55 }));
    rim.position.y = 1.32;
    mesh.add(rim);
    const tag = makeNameTag(names[i % names.length]);
    tag.position.y = 2.35;
    mesh.add(tag);
    mesh.position.set(sp.x, 0, sp.z);
    scene.add(mesh);
    enemies.push({
      mesh, tag, x: sp.x, z: sp.z, heading: sp.heading || 0,
      hp: 1, alive: true, speed: 2.4, attackCd: 0, name: names[i % names.length],
    });
  });
  return enemies;
}

export function updateEnemies(enemies, dt, time, playerPos, onDamagePlayer) {
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = playerPos.x - e.x, dz = playerPos.z - e.z;
    const d = Math.hypot(dx, dz);
    if (d < 26 && d > 1.6) {
      const vx = dx / d, vz = dz / d;
      e.x += vx * e.speed * dt;
      e.z += vz * e.speed * dt;
      e.heading = Math.atan2(vx, vz);
    }
    e.attackCd -= dt;
    if (d < 2.1 && e.attackCd <= 0) {
      e.attackCd = 1.1;
      onDamagePlayer(8);
      // lunge animation
      e.mesh.position.y = 0.12;
    } else {
      e.mesh.position.y = 0;
    }
    e.mesh.position.set(e.x, e.mesh.position.y, e.z);
    e.mesh.rotation.y = e.heading;
    const s = Math.sin(time * 8 + e.x);
    e.mesh.userData.legL.rotation.x = s * 0.55;
    e.mesh.userData.legR.rotation.x = -s * 0.55;
  }
}

export function damageEnemy(e, amount) {
  if (!e.alive) return false;
  e.hp -= amount;
  e.tag.userData.draw(Math.max(0, e.hp));
  if (e.hp <= 0) {
    e.alive = false;
    e.mesh.visible = false;
    return true;
  }
  return false;
}
