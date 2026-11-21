// Solara Bay — world.js
// Builds the city: lane-marked asphalt streets, sidewalks, tower blocks with
// lit windows, palms, the Kumala beach + ocean, billboards, market stalls,
// dock sheds and containers. All procedural, seeded, no external assets.
// Pedestrians and cars are kept apart by construction: peds only ever walk
// the sidewalk lanes (see actors.js), cars only the road lanes.
import { WORLD } from './config.js';
import { rand, randInt, pick } from './util.js';

const THREE = window.THREE;

export const colliders = [];   // {x0,z0,x1,z1} AABBs the car/player cannot enter
export let sun = null;
export let hemi = null;
export let skyMesh = null;
export let sunDisc = null;

function makeWindowTexture(base, lit) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  const rng = Math.random;
  for (let y = 8; y < 248; y += 18) {
    for (let x = 8; x < 120; x += 16) {
      const on = rng() < 0.55;
      g.fillStyle = on ? lit : 'rgba(20,26,38,0.9)';
      g.fillRect(x, y, 10, 12);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let facadeTextures = [];
function facade(rng) {
  if (facadeTextures.length === 0) {
    facadeTextures = [
      makeWindowTexture('#c98d5f', '#ffd98a'),
      makeWindowTexture('#8fa3b8', '#ffe9b0'),
      makeWindowTexture('#b8a06a', '#fff2c0'),
      makeWindowTexture('#7d8ea3', '#ffd27a'),
    ];
  }
  return facadeTextures[Math.floor(rng() * facadeTextures.length)];
}

function box(w, h, d, color, x, y, z, opts = {}) {
  const mat = opts.material || new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.9, metalness: opts.metal ?? 0.05 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  m.castShadow = opts.shadow !== false;
  m.receiveShadow = true;
  return m;
}

function addCollider(x0, z0, x1, z1) {
  colliders.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) });
}

// A palm: trunk + 7 drooping fronds (flattened cones), reads as a palm at
// a glance and casts a long sunset shadow.
export function makePalm(rng) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 7.5, 7), trunkMat);
  trunk.position.y = 3.75;
  trunk.rotation.z = (rng() - 0.5) * 0.12;
  trunk.castShadow = true;
  g.add(trunk);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.4;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.62, 4.2, 4), frondMat);
    frond.scale.set(1, 1, 0.2);
    const fx = Math.cos(a) * 1.7, fz = Math.sin(a) * 1.7;
    frond.position.set(fx, 7.3, fz);
    // droop downward so the crown reads as palm leaves, not spikes
    frond.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25);
    frond.castShadow = true;
    g.add(frond);
  }
  const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4a22, roughness: 1 }));
  nuts.position.y = 7.2;
  g.add(nuts);
  return g;
}

function makeBillboard(text, sub, w, h) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e8542f'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#fff';
  g.font = 'bold 64px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText(text, 256, 110);
  g.font = 'bold 34px Arial, sans-serif';
  g.fillStyle = '#ffe9b0';
  g.fillText(sub, 256, 175);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide }));
  return mesh;
}

export function buildWorld(scene, rng) {
  colliders.length = 0;

  // --- ground: sand west, city slab east
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520),
    new THREE.MeshStandardMaterial({ color: 0x9c8a6e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-40, -0.05, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  // ocean, far west
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(160, 520),
    new THREE.MeshStandardMaterial({ color: 0x2f7fa8, roughness: 0.35, metalness: 0.25 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-260, 0.02, 0);
  scene.add(ocean);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(3, 520),
    new THREE.MeshStandardMaterial({ color: 0xf5ead0, roughness: 1 }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(-178, 0.04, 0);
  scene.add(foam);

  // beach sand strip
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(38, 360),
    new THREE.MeshStandardMaterial({ color: 0xe8cf9a, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-159, 0.0, 0);
  sand.receiveShadow = true;
  scene.add(sand);

  // --- roads: dark asphalt strips + sidewalks
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x2e2e33, roughness: 0.95 });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x8f8578, roughness: 1 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xe8c33c, roughness: 0.8 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.8 });
  const H = WORLD.half + 20;
  for (const x of WORLD.avenues) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(12, H * 2), asphalt);
    road.rotation.x = -Math.PI / 2; road.position.set(x, 0.01, 0); road.receiveShadow = true;
    scene.add(road);
    for (const s of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(3, H * 2), sideMat);
      sw.rotation.x = -Math.PI / 2; sw.position.set(x + s * 7.5, 0.015, 0); sw.receiveShadow = true;
      scene.add(sw);
    }
    // dashed yellow centre line
    for (let z = -H; z < H; z += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 3.4), dashMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.03, z);
      scene.add(dash);
    }
    // white edge lines
    for (const s of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.22, H * 2), edgeMat);
      edge.rotation.x = -Math.PI / 2; edge.position.set(x + s * 5.6, 0.03, 0);
      scene.add(edge);
    }
  }
  for (const z of WORLD.streets) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, 12), asphalt);
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.012, z); road.receiveShadow = true;
    scene.add(road);
    for (const s of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, 3), sideMat);
      sw.rotation.x = -Math.PI / 2; sw.position.set(0, 0.017, z + s * 7.5); sw.receiveShadow = true;
      scene.add(sw);
    }
    for (let x = -H; x < H; x += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.35), dashMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.032, z);
      scene.add(dash);
    }
    for (const s of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, 0.22), edgeMat);
      edge.rotation.x = -Math.PI / 2; edge.position.set(0, 0.032, z + s * 5.6);
      scene.add(edge);
    }
  }

  // --- buildings: fill each block interior, seeded heights, window facades
  const xs = [-160, -120, -80, -40, 0, 40, 80, 120];
  const zs = [-160, -120, -80, -40, 0, 40, 80, 120];
  for (let bi = 0; bi < xs.length - 1; bi++) {
    for (let bj = 0; bj < zs.length - 1; bj++) {
      const x0 = xs[bi] + 10, x1 = xs[bi + 1] - 10;
      const z0 = zs[bj] + 10, z1 = zs[bj + 1] - 10;
      if (x1 < -118) continue; // beach blocks stay open
      // market block (Old Pasaru) and harbor yard stay open-air: stalls,
      // sheds and containers live there instead of towers
      const isMarket = x0 >= -80 && x1 <= -40 && z0 >= -120 && z1 <= -80;
      const isHarbor = x0 >= 40 && z0 >= 120;
      const isShedBlock = x0 >= 80 && x1 <= 120 && z0 >= 80 && z1 <= 120;
      if (isMarket || isHarbor || isShedBlock) continue;
      const n = randInt(rng, 1, 2);
      for (let k = 0; k < n; k++) {
        const w = rand(rng, 9, Math.max(10, (x1 - x0) / n - 2));
        const d = rand(rng, 9, z1 - z0 - 2);
        const cx = x0 + (x1 - x0) * ((k + 0.5) / n) + rand(rng, -2, 2);
        const cz = (z0 + z1) / 2 + rand(rng, -2, 2);
        const tall = (cx > -16 && cz < -16) || (cx > 64); // heights district towers
        const h = tall ? rand(rng, 26, 58) : rand(rng, 7, 20);
        const tex = facade(rng);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(cx, h / 2, cz);
        b.castShadow = true; b.receiveShadow = true;
        scene.add(b);
        // rooftop box
        const roof = box(rand(rng, 2, 4), rand(rng, 1, 2.4), rand(rng, 2, 4), 0x5a5a60,
          cx + rand(rng, -2, 2), h + 0.8, cz + rand(rng, -2, 2));
        scene.add(roof);
        addCollider(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2);
      }
    }
  }

  // --- palms along Strand Blvd (x=-120) and the beach edge
  for (let z = -150; z <= 150; z += 18) {
    for (const x of [-129, -111]) {
      const p = makePalm(rng);
      p.position.set(x + rand(rng, -1, 1), 0, z + rand(rng, -3, 3));
      scene.add(p);
    }
  }
  for (let z = -140; z <= 140; z += 26) {
    const p = makePalm(rng);
    p.position.set(-146 + rand(rng, -2, 2), 0, z);
    scene.add(p);
  }

  // --- beach umbrellas + towels (Kumala Strand)
  const umbCols = [0xe8542f, 0x38b6d3, 0xf2b544, 0xe87aa0];
  for (let i = 0; i < 14; i++) {
    const x = rand(rng, -172, -150), z = rand(rng, -140, 140);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xd8d0c0 }));
    pole.position.set(x, 1.2, z);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: pick(rng, umbCols), roughness: 0.9 }));
    top.position.set(x, 2.7, z);
    top.castShadow = true;
    scene.add(top);
  }

  // --- billboards (span the road on poles at the roadside, cars pass under)
  const bb1 = makeBillboard('SOLARA BAY', 'VISIT THE STRAND', 22, 11);
  bb1.position.set(-120, 12, 40); bb1.rotation.y = Math.PI + 0.08; // face south traffic
  scene.add(bb1);
  const bb1pole = box(1, 8, 1, 0x555550, -129, 4, 40);
  scene.add(bb1pole);
  addCollider(-130, 39, -128, 41);
  const bb2 = makeBillboard('BANCO SOLARA', 'YOUR MONEY · OUR VAULT', 18, 9);
  bb2.position.set(96, 11, 0); bb2.rotation.y = -Math.PI / 2 + 0.08; // face west traffic
  scene.add(bb2);
  const bb2pole = box(1, 7, 1, 0x555550, 96, 3.5, 9);
  scene.add(bb2pole);
  addCollider(95, 8, 97, 10);

  // --- market stalls (Old Pasaru, open-air block x -70..-50, z -110..-90)
  const awnCols = [0xe8542f, 0x38b6d3, 0xf2b544, 0x7fb069];
  for (let i = 0; i < 8; i++) {
    const x = -66 + (i % 4) * 5, z = -96 - Math.floor(i / 4) * 8;
    const stall = box(4.6, 2.4, 3.4, 0x8a6a45, x, 1.2, z);
    scene.add(stall);
    const awn = box(5.2, 0.25, 4.0, pick(rng, awnCols), x, 2.7, z, { ry: 0.06 });
    scene.add(awn);
    const goods = box(3.6, 0.7, 2.4, pick(rng, [0xe87aa0, 0xf2b544, 0x7fb069]), x, 2.75, z);
    scene.add(goods);
    addCollider(x - 2.3, z - 1.7, x + 2.3, z + 1.7);
  }

  // --- dock sheds + containers (Harbor yard, blocks x 40..120, z 120..160)
  for (const [sx, sz, w, d] of [[100, 140, 18, 10], [60, 140, 12, 8], [100, 100, 14, 9]]) {
    const shed = box(w, 6, d, 0x7d8ea3, sx, 3, sz);
    scene.add(shed);
    const roof = box(w + 1, 0.6, d + 1, 0x5a6a7a, sx, 6.3, sz);
    scene.add(roof);
    addCollider(sx - w / 2, sz - d / 2, sx + w / 2, sz + d / 2);
  }
  const contCols = [0xe8542f, 0x38b6d3, 0xf2b544, 0x7fb069, 0xb388f5];
  for (let i = 0; i < 16; i++) {
    const x = 52 + (i % 8) * 8, z = 146 - Math.floor(i / 8) * 8;
    const c = box(7.5, 2.6, 2.6, pick(rng, contCols), x, 1.3, z, { ry: (rng() - 0.5) * 0.05 });
    scene.add(c);
    addCollider(x - 3.8, z - 1.4, x + 3.8, z + 1.4);
  }

  // --- streetlights along the avenues (poles at the outer sidewalk edge,
  // clear of the 7.5 m pedestrian lanes)
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3c3c40, roughness: 0.6, metalness: 0.5 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffdf80, emissiveIntensity: 0.9 });
  for (const x of WORLD.avenues) {
    for (let z = -140; z <= 140; z += 40) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.5, 6), lampMat);
      pole.position.set(x + 8.8, 3.25, z);
      pole.castShadow = true;
      scene.add(pole);
      const arm = box(1.8, 0.12, 0.12, 0x3c3c40, x + 8.0, 6.4, z);
      scene.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), bulbMat);
      bulb.position.set(x + 7.2, 6.3, z);
      scene.add(bulb);
    }
  }

  // --- sky dome + low sun disc (visible at sunset/dusk, ahead to the south)
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(700, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff9a4d, side: THREE.BackSide, fog: false }));
  scene.add(skyMesh);
  sunDisc = new THREE.Mesh(new THREE.CircleGeometry(26, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0, fog: false, side: THREE.DoubleSide }));
  sunDisc.position.set(-40, 48, 330);
  scene.add(sunDisc);
  hemi = new THREE.HemisphereLight(0xffd9a0, 0x5a4a3a, 0.9);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffb36b, 1.6);
  sun.position.set(-120, 90, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -180; sun.shadow.camera.right = 180;
  sun.shadow.camera.top = 180; sun.shadow.camera.bottom = -180;
  sun.shadow.camera.far = 500;
  scene.add(sun);
  scene.add(sun.target);
  scene.fog = new THREE.Fog(0xff9a4d, 120, 420);

  return { colliders };
}

// Time-of-day presets. cover = golden sunset, chase = purple dusk,
// foot = bright late afternoon (enemies must read), night = dark + neon.
export function setTimeOfDay(scene, preset) {
  const P = {
    cover: { sky: 0xf08a3e, fog: 0xe89a55, sun: 0xffb36b, sunI: 1.35, hemi: 0.85, sunPos: [-140, 70, 80], clock: 16 * 60 },
    chase: { sky: 0x8a5fa8, fog: 0x9a6aa8, sun: 0xd98aff, sunI: 1.1, hemi: 0.7, sunPos: [-100, 55, -90], clock: 18 * 60 + 40 },
    foot: { sky: 0x9ecfeb, fog: 0xa8c8e0, sun: 0xfff0c0, sunI: 2.0, hemi: 1.05, sunPos: [90, 130, 40], clock: 15 * 60 + 20 },
    night: { sky: 0x141c33, fog: 0x1a2338, sun: 0x8fa8ff, sunI: 0.55, hemi: 0.45, sunPos: [60, 120, -40], clock: 21 * 60 + 5 },
  }[preset] || null;
  if (!P || !sun) return P ? P.clock : 960;
  skyMesh.material.color.setHex(P.sky);
  scene.fog.color.setHex(P.fog);
  sun.color.setHex(P.sun);
  sun.intensity = P.sunI;
  hemi.intensity = P.hemi;
  sun.position.set(P.sunPos[0], P.sunPos[1], P.sunPos[2]);
  if (sunDisc) sunDisc.visible = (preset === 'cover' || preset === 'chase');
  return P.clock;
}
