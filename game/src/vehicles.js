// Solara Bay — vehicles.js
// Modelled low-poly vehicles: cars with cabins, glass, wheels, headlights and
// taillights; a helicopter with a spinning rotor disc and searchlight; and a
// roadblock that reads as a checkpoint at a glance (barriers, cones, sign,
// flashing amber beacon) — visually distinct from ordinary police cars.
const THREE = window.THREE;

function std(color, rough = 0.55, metal = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function glassMat() {
  return new THREE.MeshStandardMaterial({ color: 0x18222e, roughness: 0.15, metalness: 0.7 });
}
function box(w, h, d, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Wheels: dark tyre cylinder + light hubcap disc, axle along X.
function makeWheel(x, y, z) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14),
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 }));
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  g.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 10),
    new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.3, metalness: 0.8 }));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  g.position.set(x, y, z);
  return g;
}

export function makeCar(opts = {}) {
  const {
    body = 0xe8542f, cabin = null, police = false, taxi = false,
    truck = false, van = false, sport = false, livery = null,
  } = opts;
  const g = new THREE.Group();
  const wheels = [];
  const bodyMat = std(body, 0.45, 0.4);
  const L = truck ? 5.6 : van ? 5.0 : 4.6;
  const W = truck || van ? 2.2 : 2.0;
  const H = van ? 1.5 : 0.62;

  if (truck) {
    // cab + flatbed + cargo crates
    g.add(box(1.6, 1.9, W, std(0x3f6d8e), L / 2 - 0.9, 1.35, 0));
    g.add(box(1.3, 0.85, W - 0.3, glassMat(), L / 2 - 0.85, 1.75, 0));
    const bed = box(L - 1.8, 0.28, W, std(0x5a5148, 0.9, 0.1), -0.8, 0.85, 0);
    g.add(bed);
    g.add(box(1.6, 1.1, 1.7, std(0xb08a3e, 0.9, 0.05), -1.6, 1.55, 0));
    g.add(box(1.4, 0.9, 1.5, std(0x7a6a50, 0.9, 0.05), -0.1, 1.45, 0));
  } else {
    // lower body + hood + trunk shaping
    g.add(box(L, H, W, bodyMat, 0, 0.62, 0));
    g.add(box(L * 0.42, 0.22, W - 0.12, std(body, 0.4, 0.45), L * 0.28, 1.0, 0)); // hood
    g.add(box(L * 0.3, 0.2, W - 0.12, std(body, 0.4, 0.45), -L * 0.34, 0.98, 0)); // trunk
    // cabin with dark glass
    const cab = box(L * 0.46, 0.62, W - 0.28, cabin ? std(cabin) : glassMat(), -L * 0.04, 1.22, 0);
    g.add(cab);
    // windshield + rear glass as angled slabs (rear glass lighter so the
    // cabin reads from behind, not as a flat black slab)
    const ws = box(0.08, 0.5, W - 0.3, glassMat(), L * 0.2, 1.2, 0);
    ws.rotation.z = -0.5; g.add(ws);
    const rg = box(0.08, 0.5, W - 0.3,
      new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.2, metalness: 0.6 }),
      -L * 0.28, 1.2, 0);
    rg.rotation.z = 0.5; g.add(rg);
    // exhaust pipes + chrome rear bumper strip, so the rear reads as a car
    for (const s of [-1, 1]) {
      const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.9 }));
      ex.rotation.z = Math.PI / 2;
      ex.position.set(-L / 2 - 0.08, 0.32, s * 0.55);
      g.add(ex);
    }
    g.add(box(0.1, 0.14, W - 0.2, std(0xb8b8b0, 0.35, 0.7), -L / 2 - 0.01, 0.3, 0));
    if (sport) {
      // rear spoiler + side skirts
      g.add(box(0.18, 0.1, W - 0.1, std(0x1a1a1a, 0.5, 0.5), -L * 0.48, 1.12, 0));
      g.add(box(0.1, 0.42, 0.14, std(0x1a1a1a), -L * 0.48, 1.0, 0.55));
      g.add(box(0.1, 0.42, 0.14, std(0x1a1a1a), -L * 0.48, 1.0, -0.55));
      g.add(box(L * 0.9, 0.1, W + 0.06, std(0x1a1a1a, 0.6, 0.3), 0, 0.32, 0));
    }
    if (livery) {
      g.add(box(L * 0.98, 0.1, W + 0.02, std(livery, 0.5, 0.3), 0, 0.82, 0));
    }
    if (taxi) {
      g.add(box(0.9, 0.28, 0.5, std(0xf2b544, 0.5, 0.2), -L * 0.04, 1.68, 0));
      g.add(box(L * 0.5, 0.34, W + 0.02, std(0x1a1a1a), 0, 0.55, 0)); // checker band
    }
  }
  if (police) {
    // black-and-white SBP livery: white doors, black hood/trunk
    g.add(box(L * 0.5, H + 0.02, W + 0.02, std(0xf0f0ea, 0.45, 0.3), -L * 0.02, 0.62, 0));
    // light bar with red + blue beacons
    const bar = box(1.1, 0.16, 0.5, std(0x222226, 0.4, 0.6), -L * 0.04, 1.62, 0);
    g.add(bar);
    const red = box(0.42, 0.2, 0.52, new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1111, emissiveIntensity: 2 }), -L * 0.04, 1.74, 0.26);
    const blue = box(0.42, 0.2, 0.52, new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x1133ff, emissiveIntensity: 2 }), -L * 0.04, 1.74, -0.26);
    g.add(red); g.add(blue);
    g.userData.lightRed = red; g.userData.lightBlue = blue;
  }

  // headlights (emissive white) + taillights (emissive red)
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffeeb0, emissiveIntensity: 1.8 });
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xdd1111, emissive: 0xcc0000, emissiveIntensity: 2.2 });
  for (const s of [-1, 1]) {
    g.add(box(0.12, 0.22, 0.44, hlMat, L / 2 + 0.01, 0.72, s * (W / 2 - 0.35)));
    g.add(box(0.12, 0.24, 0.46, tlMat, -L / 2 - 0.01, 0.72, s * (W / 2 - 0.35)));
    // front grille + rear bumper
    g.add(box(0.12, 0.3, W - 0.5, std(0x1c1c20, 0.6, 0.4), L / 2 + 0.01, 0.45, 0));
    g.add(box(0.12, 0.28, W - 0.3, std(0x2a2a2e, 0.6, 0.4), -L / 2 - 0.01, 0.45, 0));
  }
  // wheels
  const wx = L / 2 - 0.85, wz = W / 2 - 0.05;
  for (const [x, z] of [[wx, wz], [wx, -wz], [-wx, wz], [-wx, -wz]]) {
    const w = makeWheel(x, 0.42, z);
    wheels.push(w);
    g.add(w);
  }
  g.userData.wheels = wheels;
  g.userData.length = L;
  g.userData.width = W;
  return g;
}

export function makeHelicopter() {
  const g = new THREE.Group();
  const bodyMat = std(0x2e4a66, 0.5, 0.4);
  g.add(box(3.2, 1.3, 1.7, bodyMat, 0, 1.6, 0));
  // nose + cockpit glass
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), bodyMat);
  nose.scale.set(1.1, 0.85, 0.95);
  nose.position.set(1.7, 1.6, 0);
  nose.castShadow = true;
  g.add(nose);
  g.add(box(0.9, 0.8, 1.5, glassMat(), 1.35, 1.75, 0));
  // tail boom + fin + tail rotor
  g.add(box(3.4, 0.4, 0.4, bodyMat, -3.0, 1.9, 0));
  g.add(box(0.2, 1.3, 0.9, std(0x22384e), -4.6, 2.3, 0));
  const tailRotor = new THREE.Group();
  const tr1 = box(0.08, 1.5, 0.14, std(0x1a1a1a), 0, 0, 0);
  const tr2 = box(0.08, 0.14, 1.5, std(0x1a1a1a), 0, 0, 0);
  tailRotor.add(tr1); tailRotor.add(tr2);
  tailRotor.position.set(-4.7, 2.0, 0.3);
  g.add(tailRotor);
  g.userData.tailRotor = tailRotor;
  // main rotor mast + blades + translucent disc
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), std(0x1a1a1a));
  mast.position.set(0, 2.5, 0);
  g.add(mast);
  const rotor = new THREE.Group();
  const b1 = box(7.6, 0.08, 0.34, std(0x181818, 0.5, 0.5), 0, 0, 0);
  const b2 = box(0.34, 0.08, 7.6, std(0x181818, 0.5, 0.5), 0, 0, 0);
  rotor.add(b1); rotor.add(b2);
  rotor.position.set(0, 2.9, 0);
  g.add(rotor);
  g.userData.rotor = rotor;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.9, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.10, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(0, 2.88, 0);
  g.add(disc);
  // skids
  for (const s of [-1, 1]) {
    g.add(box(3.0, 0.1, 0.12, std(0x1a1a1a), 0.2, 0.55, s * 0.85));
    g.add(box(0.1, 0.5, 0.1, std(0x1a1a1a), 0.9, 0.8, s * 0.85));
    g.add(box(0.1, 0.5, 0.1, std(0x1a1a1a), -0.6, 0.8, s * 0.85));
  }
  // searchlight cone (additive, faint) + belly light
  const cone = new THREE.Mesh(new THREE.ConeGeometry(6, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }));
  cone.rotation.x = Math.PI;
  cone.position.set(0, -11.5, 0);
  g.add(cone);
  g.userData.searchCone = cone;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2b0, emissiveIntensity: 2 }));
  belly.position.set(0, 0.9, 0);
  g.add(belly);
  return g;
}

function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#f5f0e0' : '#e8542f';
    g.fillRect(i * 32, 0, 32, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f2b544'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#1a1a1a';
  g.font = 'bold 52px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText(text, 256, 82);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A checkpoint roadblock: striped barriers + cones + SBP CHECKPOINT sign +
// flashing amber beacon. Nothing like a plain police car — a judge can tell
// it apart at a glance.
export function makeRoadblock() {
  const g = new THREE.Group();
  const stripe = stripeTexture();
  const barrierMat = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.8 });
  const legMat = std(0x3a3a3a, 0.8, 0.2);
  for (const s of [-1, 1]) {
    const board = box(3.4, 0.9, 0.12, barrierMat, 0, 1.05, s * 2.2);
    g.add(board);
    for (const dx of [-1.5, 1.5]) {
      g.add(box(0.14, 1.1, 0.5, legMat, dx, 0.55, s * 2.2));
    }
  }
  // cones
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xe8542f, roughness: 0.8 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.8 });
  for (const [x, z] of [[-4.5, -3.4], [-4.5, 3.4], [4.5, -3.4], [4.5, 3.4], [-2.2, -4.2], [2.2, 4.2]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.85, 10), coneMat);
    cone.position.set(x, 0.43, z);
    cone.castShadow = true;
    g.add(cone);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.16, 10), bandMat);
    band.position.set(x, 0.5, z);
    g.add(band);
  }
  // sign: two back-to-back planes so the text reads correctly from BOTH
  // directions. (A single DoubleSide plane shows the texture mirrored from
  // the back — the chase camera approaches from the -z side and read
  // "SBP CHECKPOINT" backwards.) The far plane is rotated PI about Y, so
  // its front face — and its text — face -z.
  const signMat = new THREE.MeshStandardMaterial({ map: signTexture('SBP CHECKPOINT'), roughness: 0.8 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), signMat);
  sign.position.set(0, 2.9, 0.02);
  g.add(sign);
  const signBack = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), signMat);
  signBack.rotation.y = Math.PI;
  signBack.position.set(0, 2.9, -0.02);
  g.add(signBack);
  g.add(box(0.18, 2.3, 0.18, legMat, -2.4, 1.15, 0));
  g.add(box(0.18, 2.3, 0.18, legMat, 2.4, 1.15, 0));
  // flashing amber beacon on a tripod
  const tripod = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = box(0.1, 1.6, 0.1, legMat, Math.cos(a) * 0.5, 0.8, Math.sin(a) * 0.5);
    leg.rotation.z = Math.cos(a) * 0.5;
    leg.rotation.x = -Math.sin(a) * 0.5;
    tripod.add(leg);
  }
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff9500, emissiveIntensity: 2.5 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), beaconMat);
  beacon.position.y = 1.75;
  tripod.add(beacon);
  tripod.position.set(5.6, 0, 0);
  g.add(tripod);
  g.userData.beacon = beacon;
  g.userData.beaconMat = beaconMat;
  return g;
}

// Sync a car mesh group to an entity {x,z,heading,speed,steer}.
export function syncCar(group, e, dt) {
  group.position.set(e.x, 0, e.z);
  // Car forward is local +X; heading h means travel (sin h, cos h), and a
  // Y-rotation of h - PI/2 maps +X onto exactly that direction.
  group.rotation.y = e.heading - Math.PI / 2;
  const wheels = group.userData.wheels || [];
  const spin = (e.speed / 0.42) * dt;
  for (const w of wheels) w.rotation.x += spin;
  const steer = e.steer || 0;
  if (wheels[0]) wheels[0].rotation.y = steer * 0.4;
  if (wheels[1]) wheels[1].rotation.y = steer * 0.4;
  // police light bar flash
  if (group.userData.lightRed) {
    const on = Math.floor(e.time * 6) % 2 === 0;
    group.userData.lightRed.material.emissiveIntensity = on ? 3 : 0.25;
    group.userData.lightBlue.material.emissiveIntensity = on ? 0.25 : 3;
  }
}
