// Solara Bay — main.js
// Bootstrap + game loop: renderer, arcade car physics, on-foot controls,
// camera, collisions, interactions, police/wanted orchestration, the title
// screen, and applyShot() which stages the four dossier frames.
import { WORLD, MISSIONS, RADIO, WEAPONS } from './config.js';
import { S, resetRun } from './state.js';
import { clamp, angleDiff, rand, pick } from './util.js';
import { buildWorld, setTimeOfDay, colliders } from './world.js';
import { makeCar, makeHelicopter, syncCar } from './vehicles.js';
import { makePerson, spawnPedestrians, updatePeds, spawnEnemies, updateEnemies, onRoad, segmentFor } from './actors.js';
import { spawnPolice, stagePolice, updatePolice, policePanel, spawnHeli, updateHeli, placeRoadblock, updateRoadblock } from './police.js';
import { initMissionMarkers, startMission, gotoStage, currentMission, currentStage, updateMissions, shootAt, ramHit, completeCurrentStage } from './missions.js';
import { buildHUD, updateHUD, setDialogue } from './hud.js';
import { initAudio, resumeAudio, updateAudio, blip, noiseBurst } from './audio.js';
import { keys, pressed, mouse, isDown, wasPressed, endFrame, bindInput, setScripted } from './input.js';
import { SHOTS, installDebugApi } from './shots.js';

const THREE = window.THREE;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const qs = new URLSearchParams(location.search);
const noShadow = qs.has('noshadow');
if (noShadow) {
  renderer.shadowMap.enabled = false;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

buildWorld(scene, S.rng);
initMissionMarkers(scene);
buildHUD();

// ---------- player ----------
const carMesh = makeCar({ body: 0xe8542f, sport: true, livery: 0x1a1a1a });
scene.add(carMesh);
S.car = { x: 40, z: 120, heading: Math.PI / 2, speed: 0, steer: 0, time: 0 };
const playerMesh = makePerson(0x2f6fd9, 0x2e3440, 0xc98d64, 1.02);
playerMesh.visible = false;
scene.add(playerMesh);
S.player = { x: 40, z: 118, heading: Math.PI / 2 };

// headlight spotlight for the player car (night driving)
const headlight = new THREE.SpotLight(0xffeeb0, 0, 55, 0.5, 0.5, 1.2);
headlight.position.set(2.2, 0.9, 0);
carMesh.add(headlight);
headlight.target.position.set(14, 0, 0);
carMesh.add(headlight.target);

// ---------- dynamic entity bookkeeping ----------
let trafficMeshes = [];
let stealCar = null; // parked GT for the steal stage
let ramCd = 0, policeHitCd = 0, wantedDecayT = 0;

function clearDynamics() {
  for (const t of trafficMeshes) scene.remove(t.mesh);
  trafficMeshes = [];
  for (const u of S.police) scene.remove(u.mesh);
  S.police = [];
  for (const p of S.peds) scene.remove(p.mesh);
  S.peds = [];
  // mission entities too — resetRun clears the arrays, so remove the meshes
  // here first or they would be orphaned in the scene
  for (const e of S.enemies) scene.remove(e.mesh);
  if (S.regent) scene.remove(S.regent.mesh);
  if (S.courier) scene.remove(S.courier.mesh);
  if (S.package) scene.remove(S.package.mesh);
  if (S.heli) { scene.remove(S.heli.mesh); S.heli = null; }
  if (S.roadblock) {
    scene.remove(S.roadblock.group);
    scene.remove(S.roadblock.flank1);
    scene.remove(S.roadblock.flank2);
    S.roadblock = null;
  }
  if (stealCar) { scene.remove(stealCar); stealCar = null; }
}

function spawnTraffic(list) {
  for (const t of list) {
    const mesh = makeCar({ body: t.color, taxi: t.kind === 'taxi', truck: t.kind === 'truck' });
    scene.add(mesh);
    const e = { mesh, x: t.x, z: t.z, heading: t.heading, speed: 9 + Math.random() * 4, steer: 0, time: 0, axis: Math.abs(Math.sin(t.heading)) < 0.5 ? 'z' : 'x' };
    trafficMeshes.push(e);
    S.traffic.push(e);
  }
}

function spawnStagedPeds(list) {
  for (const l of list) {
    const mesh = makePerson(pick(S.rng, [0xe87aa0, 0x38b6d3, 0xf2b544, 0x7fb069, 0xb388f5]), 0x2e3440, 0xc98d64);
    scene.add(mesh);
    const [segFrom, segTo] = segmentFor(l.t);
    const t = Math.max(segFrom + 1, Math.min(segTo - 1, l.t));
    S.peds.push({ mesh, lane: l, t, segFrom, segTo, dir: 1, speed: 1.2 + Math.random(), phase: Math.random() * 6, x: 0, z: 0 });
  }
}

function ensurePolice() {
  const want = S.wanted >= 5 ? 7 : S.wanted >= 4 ? 6 : S.wanted >= 3 ? 5 : S.wanted >= 2 ? 4 : S.wanted >= 1 ? 2 : 0;
  while (S.police.length < want) {
    const fresh = spawnPolice(scene, 1, S.wanted);
    const u = fresh[0];
    const a = Math.random() * Math.PI * 2;
    u.x = S.car.x + Math.sin(a) * 60;
    u.z = S.car.z + Math.cos(a) * 60;
    u.heading = Math.atan2(S.car.x - u.x, S.car.z - u.z);
    S.police.push(u);
  }
  while (S.police.length > want) {
    const u = S.police.pop();
    scene.remove(u.mesh);
  }
  if (S.wanted >= 3 && !S.heli) S.heli = spawnHeli(scene);
  if (S.wanted < 3 && S.heli) { scene.remove(S.heli.mesh); S.heli = null; }
  if (S.wanted >= 4 && S.inCar && S.roadblockAllowed && !S.roadblock) {
    S.roadblock = placeRoadblock(scene, S.car, null);
  }
}

// ---------- collisions ----------
function collideCircle(x, z, r) {
  // returns corrected {x,z} pushed out of building AABBs
  for (const c of colliders) {
    const cx = clamp(x, c.x0, c.x1), cz = clamp(z, c.z0, c.z1);
    const dx = x - cx, dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        z = cz + (dz / d) * r;
      } else {
        x += r;
      }
    }
  }
  return { x, z };
}

function roadblockHit(x, z) {
  if (!S.roadblock || S.roadblock.smashed) return false;
  const c = S.roadblock.collider;
  return x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1;
}

// ---------- car physics ----------
function updateCar(dt) {
  const c = S.car;
  const fwd = isDown('KeyW') || isDown('ArrowUp');
  const back = isDown('KeyS') || isDown('ArrowDown');
  const left = isDown('KeyA') || isDown('ArrowLeft');
  const right = isDown('KeyD') || isDown('ArrowRight');
  const maxSpeed = S.carCondition <= 0 ? 6 : 42;
  if (fwd) c.speed += 13 * dt;
  if (back) c.speed -= c.speed > 0.5 ? 20 * dt : 8 * dt;
  if (!fwd && !back) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 9 * dt);
  c.speed = clamp(c.speed, -10, maxSpeed);
  const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
  c.steer += (steerTarget - c.steer) * Math.min(1, dt * 8);
  const spd = Math.abs(c.speed);
  c.heading += c.steer * (c.speed >= 0 ? 1 : -1) * clamp(spd / 9, 0, 1) * 1.55 * dt;
  const nx = c.x + Math.sin(c.heading) * c.speed * dt;
  const nz = c.z + Math.cos(c.heading) * c.speed * dt;
  const before = { x: c.x, z: c.z };
  const fixed = collideCircle(nx, nz, 1.5);
  c.x = clamp(fixed.x, -158, 158);
  c.z = clamp(fixed.z, -158, 158);
  if ((fixed.x !== nx || fixed.z !== nz) && spd > 3) {
    // hit a building: stop, dent the car, shake the camera
    c.speed *= 0.35;
    S.carCondition = Math.max(0, S.carCondition - 1.2);
    S.shake = Math.max(S.shake, 0.35);
    noiseBurst(0.12, 0.08);
  }
  // roadblock barrier
  if (roadblockHit(c.x, c.z)) {
    if (spd > 14) {
      S.roadblock.smashed = true;
      scene.remove(S.roadblock.group);
      S.cash += 500;
      S.message = 'ROADBLOCK SMASHED  +$500';
      S.messageUntil = S.time + 3;
      S.wanted = Math.min(5, S.wanted + 1);
      noiseBurst(0.3, 0.16);
      S.shake = 0.7;
    } else {
      c.x = before.x; c.z = before.z;
      c.speed *= -0.25;
    }
  }
  // traffic bumps
  for (const t of trafficMeshes) {
    const d = Math.hypot(t.x - c.x, t.z - c.z);
    if (d < 3.4 && d > 0.01) {
      c.speed *= 0.92;
      t.x += ((t.x - c.x) / d) * 0.4;
      t.z += ((t.z - c.z) / d) * 0.4;
      S.carCondition = Math.max(0, S.carCondition - 0.4);
      S.shake = Math.max(S.shake, 0.2);
    }
  }
  // ram the regent / convoy lead
  ramCd -= dt;
  if (S.regent && ramCd <= 0) {
    const d = Math.hypot(S.regent.x - c.x, S.regent.z - c.z);
    if (d < 3.6 && spd > 4) {
      ramCd = 0.5;
      ramHit(S.regent);
      S.regent.x += Math.sin(c.heading) * 2.5;
      S.regent.z += Math.cos(c.heading) * 2.5;
      c.speed *= 0.45;
      noiseBurst(0.2, 0.14);
    }
  }
  // police ramming the player
  policeHitCd -= dt;
  if (policeHitCd <= 0) {
    for (const u of S.police) {
      const d = Math.hypot(u.x - c.x, u.z - c.z);
      if (d < 3.1) {
        policeHitCd = 0.6;
        c.speed *= 0.82;
        S.carCondition = Math.max(0, S.carCondition - 1.5);
        S.shake = Math.max(S.shake, 0.4);
        noiseBurst(0.15, 0.1);
        break;
      }
    }
  }
  c.time = S.time;
  S.speedKmh = Math.abs(c.speed) * 3.6;
  syncCar(carMesh, c, dt);
  // headlight only matters at night / dusk
  headlight.intensity = (S.debug.shotsMode === 'night' || S.debug.shotsMode === 'chase') ? 60 : 0;
}

// ---------- on-foot ----------
function updateOnFoot(dt) {
  const p = S.player;
  // movement relative to camera heading (camera looks along player heading)
  const fwd = (isDown('KeyW') || isDown('ArrowUp') ? 1 : 0) - (isDown('KeyS') || isDown('ArrowDown') ? 1 : 0);
  const strafe = (isDown('KeyD') || isDown('ArrowRight') ? 1 : 0) - (isDown('KeyA') || isDown('ArrowLeft') ? 1 : 0);
  const sp = 5.2;
  // right vector for heading h is (-cos h, +sin h): facing +z, right is -x
  const mx = Math.sin(p.heading) * fwd - Math.cos(p.heading) * strafe;
  const mz = Math.cos(p.heading) * fwd + Math.sin(p.heading) * strafe;
  const ml = Math.hypot(mx, mz);
  if (ml > 0.01) {
    const nx = p.x + (mx / ml) * sp * dt;
    const nz = p.z + (mz / ml) * sp * dt;
    const fixed = collideCircle(nx, nz, 0.6);
    p.x = clamp(fixed.x, -158, 158);
    p.z = clamp(fixed.z, -158, 158);
    p.heading = Math.atan2(mx, mz);
  }
  // mouse steers the heading (right = turn right = heading decreases)
  p.heading -= (mouse.dx || 0) * 0.0028;
  playerMesh.position.set(p.x, 0, p.z);
  playerMesh.rotation.y = p.heading;
  const s = Math.sin(S.time * 9);
  playerMesh.userData.legL.rotation.x = ml > 0.01 ? s * 0.6 : 0;
  playerMesh.userData.legR.rotation.x = ml > 0.01 ? -s * 0.6 : 0;
  S.speedKmh = ml > 0.01 ? sp * 3.6 * 0.4 : 0;
  // shooting (mouse click or Space)
  if ((mouse.clicked || wasPressed('Space')) && S.mode === 'playing') {
    const w = WEAPONS[S.weaponSlot - 1];
    if (w.ammo === Infinity) {
      // fists: melee arc
      for (const e of S.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        if (d < 2.4) {
          if (damageEnemy(e, 0.5)) S.stageCount++;
          blip(220, 0.1, 0.06);
        }
      }
    } else if ((S.ammo[S.weaponSlot] ?? 0) > 0) {
      S.ammo[S.weaponSlot]--;
      S.stats.shots++;
      const dir = { x: Math.sin(p.heading), z: Math.cos(p.heading) };
      if (shootAt({ x: p.x, z: p.z }, dir)) S.stats.hits++;
      noiseBurst(0.09, 0.1);
      blip(1400, 0.05, 0.04);
      S.shake = Math.max(S.shake, 0.12);
    } else {
      blip(180, 0.12, 0.05); // dry click
    }
  }
}

// ---------- interactions ----------
function tryEnterExit() {
  if (S.inCar) {
    S.inCar = false;
    S.player.x = S.car.x + Math.cos(S.car.heading) * 2.4;
    S.player.z = S.car.z - Math.sin(S.car.heading) * 2.4;
    S.player.heading = S.car.heading;
    playerMesh.visible = true;
    S.speedKmh = 0;
  } else {
    const d = Math.hypot(S.car.x - S.player.x, S.car.z - S.player.z);
    if (d < 4.5) {
      S.inCar = true;
      playerMesh.visible = false;
      S.car.heading = S.player.heading;
      blip(660, 0.07, 0.05);
    } else if (currentStage().kind === 'steal' && stealCar) {
      const sd = Math.hypot(stealCar.position.x - S.player.x, stealCar.position.z - S.player.z);
      if (sd < 4.5) {
        // steal the GT: it becomes the player car
        S.car.x = stealCar.position.x;
        S.car.z = stealCar.position.z;
        S.car.heading = S.player.heading;
        S.car.speed = 0;
        scene.remove(stealCar);
        stealCar = null;
        S.inCar = true;
        playerMesh.visible = false;
        S.carCondition = 96;
        completeCurrentStage();
        blip(880, 0.1, 0.06);
      }
    }
  }
}

function handleKeys() {
  if (wasPressed('KeyE')) tryEnterExit();
  if (wasPressed('KeyF') && currentStage().kind === 'photo') {
    const st = currentStage();
    const p = S.inCar ? S.car : S.player;
    if (Math.hypot(p.x - st.target.x, p.z - st.target.z) < st.radius + 4) {
      S.message = 'PHOTO SENT — THE HANDOFF IS ON FILM';
      S.messageUntil = S.time + 3;
      completeCurrentStage();
    }
  }
  if (wasPressed('KeyM')) {
    if (S.missionDone) {
      startMission(S.missionIndex + 1);
      setDialogue('MIRA KESANG', 'Crew · Driver', 'Next job is on the board, Tomo. ' + currentMission().brief);
    } else {
      S.message = 'FINISH THE CURRENT JOB FIRST (M)';
      S.messageUntil = S.time + 2;
    }
  }
  if (wasPressed('KeyR')) {
    S.radioIndex = (S.radioIndex + 1) % RADIO.length;
    blip(990, 0.06, 0.04);
  }
  for (let i = 1; i <= 4; i++) {
    if (wasPressed('Digit' + i)) { S.weaponSlot = i; blip(520 + i * 80, 0.05, 0.04); }
  }
  // crew abilities
  if (wasPressed('KeyZ')) {
    S.wanted = Math.max(0, S.wanted - 1);
    S.message = 'SWAP PLATES — WANTED DOWN TO ' + S.wanted + '★';
    S.messageUntil = S.time + 2.5;
    blip(760, 0.08, 0.05);
  }
  if (wasPressed('KeyX')) {
    S.carCondition = Math.min(100, S.carCondition + 25);
    S.message = 'QUICK FIX — CONDITION ' + Math.round(S.carCondition) + '%';
    S.messageUntil = S.time + 2.5;
    blip(620, 0.08, 0.05);
  }
  if (wasPressed('KeyC')) {
    S.message = 'EYES OUT — KIKI HAS THE ROOFTOPS COVERED';
    S.messageUntil = S.time + 2.5;
    blip(840, 0.08, 0.05);
  }
  if (wasPressed('KeyP') || wasPressed('Escape')) togglePause();
}

// ---------- camera ----------
function updateCamera(dt) {
  const pos = S.inCar ? S.car : S.player;
  const hd = S.inCar ? S.car.heading : S.player.heading;
  const fx = Math.sin(hd), fz = Math.cos(hd);
  const dist = S.inCar ? 7.5 : 7.0;
  const height = S.inCar ? 3.2 : 3.0;
  const tx = pos.x - fx * dist, tz = pos.z - fz * dist;
  const k = Math.min(1, dt * 5);
  camera.position.x += (tx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (tz - camera.position.z) * k;
  S.shake = Math.max(0, S.shake - dt * 1.4);
  const shx = (Math.random() - 0.5) * S.shake * 0.5;
  const shy = (Math.random() - 0.5) * S.shake * 0.3;
  camera.lookAt(pos.x + fx * 9 + shx, 1.6 + shy, pos.z + fz * 9);
}

// ---------- traffic ----------
function updateTraffic(dt) {
  for (const t of trafficMeshes) {
    t.time = S.time;
    // slow down if the player car is right ahead
    const dx = S.car.x - t.x, dz = S.car.z - t.z;
    const ahead = dx * Math.sin(t.heading) + dz * Math.cos(t.heading);
    const dd = Math.hypot(dx, dz);
    const sp = (dd < 9 && ahead > 0) ? 3 : t.speed;
    t.x += Math.sin(t.heading) * sp * dt;
    t.z += Math.cos(t.heading) * sp * dt;
    if (t.axis === 'z') { if (t.z > 156) t.z = -156; if (t.z < -156) t.z = 156; }
    else { if (t.x > 156) t.x = -156; if (t.x < -156) t.x = 156; }
    syncCar(t.mesh, t, dt);
  }
}

// ---------- wanted decay ----------
function updateWanted(dt) {
  let nearest = 1e9;
  for (const u of S.police) nearest = Math.min(nearest, Math.hypot(u.x - S.car.x, u.z - S.car.z));
  if (nearest > 55 && S.wanted > 0) {
    wantedDecayT += dt;
    if (wantedDecayT > 10) { wantedDecayT = 0; S.wanted--; }
  } else wantedDecayT = 0;
}

// ---------- shots ----------
function applyShot(name) {
  const d = SHOTS[name];
  if (!d) return false;
  clearDynamics();
  resetRun({ cover: 11, chase: 22, foot: 33, night: 44, playtest: 7 }[name] || 1);
  S.debug.shotsMode = name;
  S.roadblockAllowed = !!d.roadblock;
  S.clockMin = setTimeOfDay(scene, d.preset);
  S.cash = d.cash; S.xp = d.xp; S.rank = d.rank; S.wanted = d.wanted;
  S.mode = 'playing';
  document.getElementById('title').style.display = 'none';
  startMission(d.mission);
  gotoStage(d.stage);
  // player
  S.car.x = d.player.x; S.car.z = d.player.z;
  S.car.heading = d.player.heading; S.car.speed = d.player.speed; S.car.steer = 0;
  S.inCar = d.player.inCar;
  playerMesh.visible = !d.player.inCar;
  if (!d.player.inCar) {
    S.player.x = d.player.x; S.player.z = d.player.z; S.player.heading = d.player.heading;
    // park the GT at the roadside behind the player
    S.car.x = d.player.x + 14; S.car.z = d.player.z + 6;
    S.car.heading = d.player.heading;
  }
  // stage-specific extras
  if (d.regent && S.regent) {
    S.regent.x = d.regent.x; S.regent.z = d.regent.z; S.regent.heading = d.regent.heading;
  }
  if (d.roadblock) S.roadblock = placeRoadblock(scene, S.car, null, 38);
  spawnTraffic(d.traffic || []);
  spawnStagedPeds(d.peds || []);
  // police + heli
  const units = spawnPolice(scene, d.police, d.wanted);
  S.police = units;
  stagePolice(units, S.car.x, S.car.z, S.car.heading);
  if (d.heli) {
    S.heli = spawnHeli(scene);
    // park the orbit ahead of the player so the heli + searchlight are in frame
    S.heli.angle = S.car.heading + 0.35;
  }
  if (d.dialogue) setDialogue(d.dialogue.name, d.dialogue.role, d.dialogue.text, 999);
  // camera snap behind the player for a stable first frame
  const hd = S.car.heading;
  camera.position.set(S.car.x - Math.sin(hd) * 7.5, 3.2, S.car.z - Math.cos(hd) * 7.5);
  S.message = '';
  S.messageUntil = 0;
  updateHUD();
  return true;
}

// ---------- title / pause ----------
function showTitle() {
  const t = document.getElementById('title');
  t.style.display = 'flex';
  S.mode = 'title';
}
function startGame() {
  initAudio(); resumeAudio();
  document.getElementById('title').style.display = 'none';
  S.mode = 'playing';
  const saved = loadSave();
  startMission(saved && saved.completed != null ? (saved.completed + 1) % MISSIONS.length : 0);
  setDialogue('MIRA KESANG', 'Crew · Driver', 'First job is on the board, Tomo. ' + currentMission().brief);
}
function togglePause() {
  if (S.mode === 'playing') { S.mode = 'paused'; document.getElementById('pause').style.display = 'flex'; }
  else if (S.mode === 'paused') { S.mode = 'playing'; document.getElementById('pause').style.display = 'none'; }
}
function loadSave() {
  try {
    const raw = localStorage.getItem(S.saveKey);
    if (!raw) return null;
    const s = JSON.parse(raw);
    S.cash = s.cash; S.xp = s.xp; S.xpNext = s.xpNext || 5000; S.rank = s.rank || 'FIXER';
    return s;
  } catch (e) { return null; }
}

// ---------- debug helpers ----------
function snapshot() {
  const p = S.inCar ? S.car : S.player;
  return {
    mode: S.mode, mission: S.missionIndex, stage: S.stageIndex, missionDone: S.missionDone,
    player: { x: +p.x.toFixed(2), z: +p.z.toFixed(2), heading: +p.heading.toFixed(3), speed: +S.speedKmh.toFixed(1), inCar: S.inCar },
    car: { x: +S.car.x.toFixed(2), z: +S.car.z.toFixed(2) },
    speedSigned: S.inCar ? +S.car.speed.toFixed(2) : 0,
    gameTime: +S.time.toFixed(2),
    objective: S.objective, wanted: S.wanted, cash: S.cash,
    enemiesAlive: S.enemies.filter((e) => e.alive).length,
    stageCount: S.stageCount, stageProgress: +S.stageProgress.toFixed(3),
    regentHp: S.regent ? +S.regent.hp.toFixed(2) : null,
    pedsOnRoad: S.peds.filter((pd) => onRoad(pd.x, pd.z)).length,
    police: S.police.length, roadblock: !!S.roadblock && !S.roadblock.smashed,
    errors: window.__SOLARA_ERRORS__ || [],
  };
}
window.__SOLARA_ERRORS__ = [];
window.addEventListener('error', (e) => {
  window.__SOLARA_ERRORS__.push(String(e.message || e.error));
});

// ---------- boot ----------
bindInput();
document.getElementById('play-btn').addEventListener('click', startGame);
document.getElementById('resume-btn').addEventListener('click', togglePause);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// free-roam setup for a plain load (no ?shot=)
function freeRoam() {
  S.peds = spawnPedestrians(scene, S.rng, 26);
  const units = spawnPolice(scene, 2, 1);
  S.police = units;
  stagePolice(units, S.car.x, S.car.z, S.car.heading);
  camera.position.set(S.car.x - 10, 5, S.car.z - 10);
  showTitle();
}

const params = new URLSearchParams(location.search);
const shotParam = params.get('shot');
const missionParam = parseInt(params.get('mission') || '0', 10);
if (shotParam && SHOTS[shotParam]) {
  applyShot(shotParam);
  if (shotParam === 'playtest' && !Number.isNaN(missionParam)) {
    startMission(missionParam);
  }
} else {
  loadSave();
  freeRoam();
}

installDebugApi(applyShot, {
  snapshot,
  setKeys: (map) => setScripted(map),
  press: (code) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  },
  gotoStage: (n) => gotoStage(n),
  startMission: (i) => startMission(i),
  pedRoadCheck: () => S.peds.filter((p) => onRoad(p.x, p.z)).map((p) => ({ x: +p.x.toFixed(1), z: +p.z.toFixed(1) })),
});

// ---------- main loop ----------
let last = performance.now();
function loop() {
  requestAnimationFrame(loop);
  // Use performance.now() directly, never the rAF timestamp argument:
  // headless Chromium's BeginFrame timestamps can run backwards under
  // SwiftShader, which once drove dt negative and the car in reverse.
  const now = performance.now();
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (S.mode === 'playing') {
    S.time += dt;
    S.clockMin += dt * 0.25;
    handleKeys();
    if (S.inCar) updateCar(dt);
    else updateOnFoot(dt);
    // steal-stage GT parked at the target
    const st = currentStage();
    if (st && st.kind === 'steal' && !stealCar && !S.missionDone) {
      stealCar = makeCar({ body: 0xe8542f, sport: true });
      stealCar.position.set(st.target.x, 0, st.target.z);
      stealCar.rotation.y = 0.6;
      scene.add(stealCar);
    }
    if (st && st.kind !== 'steal' && stealCar) { scene.remove(stealCar); stealCar = null; }
    updateTraffic(dt);
    updatePeds(S.peds, dt, S.time);
    updateEnemies(S.enemies, dt, S.time, S.inCar ? S.car : S.player, (dmg) => {
      if (S.armour > 0) S.armour = Math.max(0, S.armour - dmg);
      else S.health = Math.max(0, S.health - dmg);
      S.shake = Math.max(S.shake, 0.3);
    });
    updatePolice(S.police, dt, S.time, S.inCar ? S.car : S.player, colliders);
    if (S.heli) updateHeli(S.heli, dt, S.time, S.inCar ? S.car : S.player);
    if (S.roadblock) updateRoadblock(S.roadblock, dt, S.time);
    ensurePolice();
    updateWanted(dt);
    updateMissions(dt);
    updateCamera(dt);
    updateAudio(S.speedKmh, S.wanted, S.radioIndex, S.inCar);
  }
  updateHUD();
  renderer.render(scene, camera);
  endFrame();
}
requestAnimationFrame(loop);
