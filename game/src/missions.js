// Solara Bay — missions.js
// The 8-mission story engine: staged objectives (drive / collect / shoot /
// ram / escape / tail / photo / hold / steal), the objective beam, stage
// rewards, and mission-complete state the HUD and the playtest driver read.
import { MISSIONS } from './config.js';
import { S } from './state.js';
import { makeCar, syncCar } from './vehicles.js';
import { spawnEnemies, damageEnemy } from './actors.js';
import { clamp } from './util.js';

const THREE = window.THREE;

let beam = null;      // tall objective light beam
let ring = null;      // ground ring at the target
let sceneRef = null;

export function currentMission() { return MISSIONS[S.missionIndex]; }
export function currentStage() { return currentMission().stages[S.stageIndex]; }

export function initMissionMarkers(scene) {
  sceneRef = scene;
  beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 2.0, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc21f, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 30;
  beam.visible = false;
  scene.add(beam);
  ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc21f, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  ring.visible = false;
  scene.add(ring);
}

function clearStageEntities() {
  if (S.regent) { sceneRef.remove(S.regent.mesh); S.regent = null; }
  if (S.courier) { sceneRef.remove(S.courier.mesh); S.courier = null; }
  for (const e of S.enemies) sceneRef.remove(e.mesh);
  S.enemies = [];
  if (S.package) { sceneRef.remove(S.package.mesh); S.package = null; }
}

export function startMission(index) {
  clearStageEntities();
  S.missionIndex = index % MISSIONS.length;
  S.stageIndex = 0;
  S.missionDone = false;
  S.stageProgress = 0;
  S.stageCount = 0;
  setupStage();
  S.message = currentMission().name + ' — ' + currentMission().brief;
  S.messageUntil = S.time + 4;
}

export function gotoStage(n) {
  S.stageIndex = Math.max(0, Math.min(n, currentMission().stages.length - 1));
  setupStage();
}

export function setupStage() {
  const st = currentStage();
  S.stageProgress = 0;
  S.stageCount = 0;
  S.stageCountNeed = st.count || 0;
  S.objective = { x: st.target.x, z: st.target.z, radius: st.radius };
  if (beam) {
    beam.position.set(st.target.x, 30, st.target.z);
    beam.visible = st.kind !== 'ram' && st.kind !== 'tail';
    ring.position.set(st.target.x, 0.06, st.target.z);
    ring.visible = true;
  }
  if (st.kind === 'shoot') {
    // enemies stand in the front aisle in a line, all visible to the player
    const offs = [[-6, 6], [-3, 6], [0, 6], [3, 6], [6, 6]];
    const spots = [];
    for (let i = 0; i < st.count; i++) {
      const o = offs[i % offs.length];
      spots.push({ x: st.target.x + o[0], z: st.target.z + o[1], heading: 0 });
    }
    S.enemies = spawnEnemies(sceneRef, spots);
  }
  if (st.kind === 'ram') {
    const mesh = makeCar({ body: 0x8a1f2d, sport: true });
    sceneRef.add(mesh);
    S.regent = { mesh, x: st.target.x, z: st.target.z, heading: Math.PI / 2, speed: 14, hp: 1, steer: 0, time: 0 };
  }
  if (st.kind === 'tail' || st.kind === 'photo') {
    const mesh = makeCar({ body: 0xd8d0c0, van: true });
    sceneRef.add(mesh);
    S.courier = { mesh, x: st.target.x, z: st.target.z, heading: 0, speed: 9, pathT: 0, steer: 0, time: 0 };
  }
  if (st.kind === 'collect') {
    const pkg = new THREE.Group();
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xf2b544, roughness: 0.6 }));
    crate.position.y = 0.4; crate.castShadow = true;
    pkg.add(crate);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.2, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc21f, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    glow.position.y = 1.6;
    pkg.add(glow);
    pkg.position.set(st.target.x, 0, st.target.z);
    sceneRef.add(pkg);
    S.package = { mesh: pkg, x: st.target.x, z: st.target.z, taken: false };
  }
}

export function completeCurrentStage() {
  if (!S.missionDone) stageComplete();
}

function stageComplete() {
  const m = currentMission();
  const reward = 400 + S.stageIndex * 250;
  S.cash += reward;
  S.xp += 120;
  S.message = 'STAGE CLEAR  +$' + reward;
  S.messageUntil = S.time + 2.5;
  S.stageIndex++;
  if (S.stageIndex >= m.stages.length) {
    missionComplete();
  } else {
    setupStage();
  }
}

function missionComplete() {
  S.missionDone = true;
  S.missionCompleteAt = S.time;
  const bonus = 1500 + S.missionIndex * 400;
  S.cash += bonus;
  S.xp += 600;
  if (S.xp >= S.xpNext) { S.xp -= S.xpNext; S.xpNext += 1200; }
  S.message = 'MISSION COMPLETE — ' + currentMission().name + '  +$' + bonus;
  S.messageUntil = S.time + 5;
  if (beam) beam.visible = false;
  if (ring) ring.visible = false;
  S.objective = null;
  try {
    localStorage.setItem(S.saveKey, JSON.stringify({
      cash: S.cash, xp: S.xp, xpNext: S.xpNext, rank: S.rank,
      completed: S.missionIndex, at: Date.now(),
    }));
  } catch (e) { /* storage unavailable — ignore */ }
}

function playerPos() {
  return S.inCar ? { x: S.car.x, z: S.car.z } : { x: S.player.x, z: S.player.z };
}

export function updateMissions(dt) {
  if (S.mode !== 'playing' || S.missionDone) return;
  const st = currentStage();
  const p = playerPos();
  const d = Math.hypot(p.x - st.target.x, p.z - st.target.z);

  switch (st.kind) {
    case 'drive':
      S.stageProgress = clamp(1 - d / 120, 0, 1);
      if (d < st.radius) stageComplete();
      break;
    case 'collect': {
      if (!S.inCar && S.package && !S.package.taken && d < st.radius) {
        S.package.taken = true;
        sceneRef.remove(S.package.mesh);
        S.package = null;
        stageComplete();
      } else if (S.inCar && d < st.radius + 4) {
        S.message = 'GET OUT (E) AND GRAB IT ON FOOT';
        S.messageUntil = S.time + 1.2;
      }
      break;
    }
    case 'shoot':
      S.stageProgress = S.stageCount / Math.max(1, S.stageCountNeed);
      if (S.stageCount >= S.stageCountNeed) stageComplete();
      break;
    case 'ram': {
      if (S.regent) {
        // regent flees along the boulevard (heading h = travel (sin h, cos h))
        S.regent.x += Math.sin(S.regent.heading) * S.regent.speed * dt;
        S.regent.z += Math.cos(S.regent.heading) * S.regent.speed * dt;
        if (S.regent.z > 150 || S.regent.z < -150) S.regent.heading += Math.PI;
        S.regent.x = clamp(S.regent.x, -140, 140);
        S.regent.time = S.time;
        syncCar(S.regent.mesh, S.regent, dt);
        S.stageProgress = 1 - S.regent.hp;
        if (S.regent.hp <= 0) {
          sceneRef.remove(S.regent.mesh);
          S.regent = null;
          stageComplete();
        }
      }
      break;
    }
    case 'escape':
      if (d < st.radius) {
        S.wanted = Math.max(0, S.wanted - 2);
        stageComplete();
      }
      break;
    case 'tail': {
      if (S.courier) {
        // courier loops the marina block
        S.courier.pathT += dt;
        const t = S.courier.pathT * 0.12;
        S.courier.x = st.target.x + Math.sin(t) * 22;
        S.courier.z = st.target.z + Math.cos(t * 0.8) * 18;
        S.courier.heading = Math.atan2(Math.cos(t) * 22 * 0.12, -Math.sin(t * 0.8) * 18 * 0.8 * 0.12);
        S.courier.time = S.time;
        syncCar(S.courier.mesh, S.courier, dt);
        const cd = Math.hypot(p.x - S.courier.x, p.z - S.courier.z);
        if (cd < st.radius) {
          S.stageProgress += dt / 20;
          if (S.stageProgress >= 1) stageComplete();
        } else if (cd > 45) {
          S.stageProgress = Math.max(0, S.stageProgress - dt / 6);
          S.message = 'TOO FAR — CLOSE IN ON THE VAN';
          S.messageUntil = S.time + 1.2;
        }
      }
      break;
    }
    case 'photo':
      if (d < st.radius) {
        S.message = 'PRESS F TO PHOTOGRAPH THE HANDOFF';
        S.messageUntil = S.time + 1.0;
      }
      break;
    case 'hold':
      if (d < st.radius) {
        S.stageProgress += dt / st.count;
        if (S.stageProgress >= 1) stageComplete();
      }
      break;
    case 'steal':
      if (!S.inCar && d < st.radius) {
        S.message = 'PRESS E TO STEAL THE GT';
        S.messageUntil = S.time + 1.0;
      }
      break;
    default:
      break;
  }
  // pulse the ground ring
  if (ring && ring.visible) {
    const s = 1 + Math.sin(S.time * 3) * 0.08;
    ring.scale.set(s, s, 1);
  }
}

// Called from main.js when the player shoots: raycast-ish test against
// enemies in front of the camera. Returns true if an enemy was hit.
export function shootAt(origin, dir) {
  let best = null, bestD = 1e9;
  for (const e of S.enemies) {
    if (!e.alive) continue;
    const dx = e.x - origin.x, dz = e.z - origin.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 1 || along > 42) continue;
    const perp = Math.abs(dx * dir.z - dz * dir.x);
    if (perp < 1.4 && along < bestD) { best = e; bestD = along; }
  }
  if (best) {
    const killed = damageEnemy(best, 0.34);
    if (killed) S.stageCount++;
    return true;
  }
  return false;
}

// Ram damage: called when the player car hits the regent / convoy lead.
export function ramHit(target) {
  if (!target) return;
  target.hp -= 0.22;
  S.stats.rams++;
  S.shake = Math.max(S.shake, 0.5);
}
