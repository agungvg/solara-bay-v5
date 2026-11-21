// Solara Bay — police.js
// SBP police response: named units with RAMMING / PURSUIT / FLANKING roles,
// live distances, a wanted level, the Osprey-1 helicopter, and the
// checkpoint roadblock that appears at wanted 4+.
import { WORLD, POLICE_NAMES } from './config.js';
import { clamp, angleDiff } from './util.js';
import { makeCar, makeHelicopter, makeRoadblock, syncCar } from './vehicles.js';
import { onRoad } from './actors.js';

const THREE = window.THREE;
const ROLES = ['RAMMING', 'PURSUIT', 'FLANKING'];

export function spawnPolice(scene, count, wanted) {
  const units = [];
  for (let i = 0; i < count; i++) {
    const mesh = makeCar({ body: 0x1c1c20, police: true });
    const u = {
      name: POLICE_NAMES[i % POLICE_NAMES.length],
      role: ROLES[i % ROLES.length],
      mesh, x: 0, z: 0, heading: 0, speed: 0, steer: 0, time: 0,
      maxSpeed: 26 + (i % 3) * 2,
      stuck: 0,
    };
    scene.add(mesh);
    units.push(u);
  }
  return units;
}

// Place units around the player: spread from behind to the front flanks,
// so several are visible in a chase-camera frame, not only in the mirror.
export function stagePolice(units, px, pz, heading) {
  units.forEach((u, i) => {
    const a = heading + Math.PI + (i - (units.length - 1) / 2) * 0.85;
    const d = 16 + i * 4.5;
    u.x = px + Math.sin(a) * d;
    u.z = pz + Math.cos(a) * d;
    u.heading = Math.atan2(px - u.x, pz - u.z);
    u.speed = 12 + i;
  });
}

function nearestRoadPoint(x, z) {
  // nearest point on any road centre line
  let best = null, bd = 1e9;
  for (const ax of WORLD.avenues) {
    const d = Math.abs(x - ax);
    if (d < bd) { bd = d; best = { x: ax, z }; }
  }
  for (const sz of WORLD.streets) {
    const d = Math.abs(z - sz);
    if (d < bd) { bd = d; best = { x, z: sz }; }
  }
  return best;
}

export function updatePolice(units, dt, time, player, colliders) {
  for (const u of units) {
    u.time = time;
    const dx = player.x - u.x, dz = player.z - u.z;
    const dist = Math.hypot(dx, dz);
    // target point: rammers aim at the player, flankers at an intercept ahead
    let tx = player.x, tz = player.z;
    if (u.role === 'FLANKING') {
      tx = player.x + Math.sin(player.heading) * 14;
      tz = player.z + Math.cos(player.heading) * 14;
    } else if (u.role === 'PURSUIT') {
      tx = player.x - Math.sin(player.heading) * 4;
      tz = player.z - Math.cos(player.heading) * 4;
    }
    const want = Math.atan2(tx - u.x, tz - u.z);
    const turn = clamp(angleDiff(u.heading, want), -1.6 * dt, 1.6 * dt);
    u.heading += turn;
    const targetSpeed = dist > 60 ? u.maxSpeed : dist > 18 ? u.maxSpeed * 0.85 : u.maxSpeed * 0.6;
    u.speed += clamp(targetSpeed - u.speed, -14 * dt, 8 * dt);
    const nx = u.x + Math.sin(u.heading) * u.speed * dt;
    const nz = u.z + Math.cos(u.heading) * u.speed * dt;
    // keep police on the road network: if the step leaves asphalt, slide
    // along the nearest road centre line instead of driving through blocks
    if (onRoad(nx, nz)) {
      u.x = nx; u.z = nz;
    } else {
      const p = nearestRoadPoint(nx, nz);
      const px2 = p.x, pz2 = p.z;
      if (Math.hypot(px2 - u.x, pz2 - u.z) < 3) { u.x = px2; u.z = pz2; }
      else { u.heading += 1.4 * dt; u.speed *= 0.7; }
    }
    u.x = clamp(u.x, -158, 158);
    u.z = clamp(u.z, -158, 158);
    u.steer = turn / Math.max(dt, 0.001) / 2;
    syncCar(u.mesh, u, dt);
  }
}

// Rows for the HUD police panel: name, role, live distance in metres.
export function policePanel(units, player) {
  return units.map((u) => ({
    name: u.name,
    role: u.role,
    dist: Math.round(Math.hypot(player.x - u.x, player.z - u.z)),
  })).sort((a, b) => a.dist - b.dist);
}

export function spawnHeli(scene) {
  const mesh = makeHelicopter();
  scene.add(mesh);
  return { mesh, x: 0, z: 0, y: 20, angle: 0, time: 0 };
}

export function updateHeli(heli, dt, time, player) {
  if (!heli) return;
  heli.angle += dt * 0.22;
  const R = 34;
  heli.x = player.x + Math.sin(heli.angle) * R;
  heli.z = player.z + Math.cos(heli.angle) * R;
  heli.y = 20 + Math.sin(time * 0.7) * 1.5;
  heli.mesh.position.set(heli.x, heli.y, heli.z);
  // Heli nose is local +X; face the player the same way cars do.
  heli.mesh.rotation.y = Math.atan2(player.x - heli.x, player.z - heli.z) - Math.PI / 2;
  heli.mesh.userData.rotor.rotation.y += dt * 22;
  heli.mesh.userData.tailRotor.rotation.x += dt * 30;
  // searchlight cone tracks the player
  const cone = heli.mesh.userData.searchCone;
  cone.lookAt(new THREE.Vector3(player.x - heli.x, -heli.y, player.z - heli.z));
  cone.rotateX(Math.PI / 2);
}

// Roadblock: spawns across the road ahead of the player, only at wanted 4+.
// Returns the group (or null). The group carries a collider the car hits.
export function placeRoadblock(scene, player, existing, dist = 55) {
  if (existing) scene.remove(existing.group);
  const ahead = dist;
  const bx = player.x + Math.sin(player.heading) * ahead;
  const bz = player.z + Math.cos(player.heading) * ahead;
  // snap to the nearest road so the barriers sit across the asphalt
  let bx2 = bx, bz2 = bz, ry = 0;
  let best = 1e9;
  for (const ax of WORLD.avenues) {
    const d = Math.abs(bx - ax);
    if (d < best) { best = d; bx2 = ax; bz2 = bz; ry = 0; }
  }
  for (const sz of WORLD.streets) {
    const d = Math.abs(bz - sz);
    if (d < best) { best = d; bx2 = bx; bz2 = sz; ry = Math.PI / 2; }
  }
  const group = makeRoadblock();
  group.position.set(bx2, 0, bz2);
  group.rotation.y = ry;
  scene.add(group);
  // two angled police cars flanking the barriers
  const flank1 = makeCar({ body: 0x1c1c20, police: true });
  flank1.position.set(bx2 + Math.cos(ry) * 6, 0, bz2 - Math.sin(ry) * 6);
  flank1.rotation.y = ry + 0.5;
  scene.add(flank1);
  const flank2 = makeCar({ body: 0x1c1c20, police: true });
  flank2.position.set(bx2 - Math.cos(ry) * 6, 0, bz2 + Math.sin(ry) * 6);
  flank2.rotation.y = ry - 0.5;
  scene.add(flank2);
  return {
    group, flank1, flank2, x: bx2, z: bz2, heading: ry,
    smashed: false, time: 0,
    collider: { x0: bx2 - 6, z0: bz2 - 6, x1: bx2 + 6, z1: bz2 + 6 },
  };
}

export function updateRoadblock(rb, dt, time) {
  if (!rb || rb.smashed) return;
  const on = Math.floor(time * 3.2) % 2 === 0;
  rb.group.userData.beaconMat.emissiveIntensity = on ? 3 : 0.3;
  rb.group.userData.beacon.scale.setScalar(on ? 1.25 : 1);
}
