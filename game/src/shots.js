// Solara Bay — shots.js
// Deterministic screenshot staging: each dossier shot is a fixed, staged
// scene (mission, stage, time of day, wanted, traffic, police, dialogue)
// so the cover, chase, foot and night frames are reproducible. Also the
// playtest staging (?shot=playtest) and the window.__SOLARA__ debug API the
// end-to-end playthrough driver uses.
import { S } from './state.js';
import { MIRA_LINES, DISPATCH_LINES } from './config.js';

// Every staged element is placed deliberately. Pedestrian lanes are always
// sidewalk lanes (axis 'z' at x = avenue +/- 7.5, or axis 'x' at z = street
// +/- 7.5) — a ped is never staged on asphalt, and the live peds never
// leave their lanes either (actors.js).
export const SHOTS = {
  cover: {
    mission: 2, stage: 1, preset: 'cover', wanted: 4,
    cash: 18450, xp: 3900, rank: 'FIXER',
    player: { x: -120, z: -10, heading: 0, speed: 31, inCar: true },
    police: 6, heli: true, roadblock: false,
    regent: { x: -120, z: 26, heading: 0 },
    traffic: [
      { x: -117, z: 10, heading: 0, color: 0xd8d0c0, kind: 'car' },
      { x: -123, z: 22, heading: Math.PI, color: 0x3f6d8e, kind: 'car' },
      { x: -117, z: 40, heading: 0, color: 0xf2b544, kind: 'taxi' },
      { x: -123, z: 58, heading: Math.PI, color: 0x7fb069, kind: 'car' },
      { x: -117, z: 76, heading: 0, color: 0x5a5a6e, kind: 'car' },
    ],
    peds: [
      { axis: 'z', fixed: -112.5, t: 4 }, { axis: 'z', fixed: -127.5, t: 30 },
      { axis: 'z', fixed: -112.5, t: 62 }, { axis: 'z', fixed: -127.5, t: -28 },
      { axis: 'z', fixed: -112.5, t: -40 },
    ],
    dialogue: { name: 'MIRA KESANG', role: 'Crew · Driver', text: MIRA_LINES[0] },
  },
  chase: {
    mission: 3, stage: 2, preset: 'chase', wanted: 5,
    cash: 19320, xp: 5100, rank: 'SHOT CALLER',
    player: { x: -40, z: 20, heading: 0, speed: 26, inCar: true },
    police: 7, heli: true, roadblock: true,
    traffic: [
      { x: -37, z: 42, heading: 0, color: 0xd8d0c0, kind: 'car' },
      { x: -43, z: 58, heading: Math.PI, color: 0xe8542f, kind: 'car' },
      { x: -37, z: 88, heading: 0, color: 0x3f6d8e, kind: 'car' },
      { x: -43, z: 104, heading: Math.PI, color: 0xf2b544, kind: 'taxi' },
    ],
    peds: [
      // east sidewalk: only the far ped (t:84) — the near one (t:34) stood
      // in a pursuit unit's path and read as ped/car overlap in the shot.
      { axis: 'z', fixed: -32.5, t: 84 },
      // west sidewalk: t:8 sits behind the camera; t:100 sits well clear of
      // the roadblock flank car parked at (-46, 58) — the old t:52 ped
      // walked that same strip.
      { axis: 'z', fixed: -47.5, t: 100 }, { axis: 'z', fixed: -47.5, t: 8 },
    ],
    dialogue: { name: 'CAPT. VANCE', role: 'SBP Dispatch', text: DISPATCH_LINES[0] },
  },
  foot: {
    mission: 1, stage: 1, preset: 'foot', wanted: 2,
    cash: 7270, xp: 1675, rank: 'WHEELMAN',
    player: { x: -60, z: -88, heading: Math.PI, speed: 0, inCar: false },
    police: 4, heli: false, roadblock: false,
    enemies: [
      { x: -68, z: -100 }, { x: -60, z: -100 }, { x: -52, z: -100 },
      { x: -68, z: -92 }, { x: -60, z: -92 },
    ],
    traffic: [],
    peds: [
      { axis: 'x', fixed: -72.5, t: -44 }, { axis: 'x', fixed: -87.5, t: -70 },
    ],
    dialogue: { name: 'MIRA KESANG', role: 'Crew · Driver', text: MIRA_LINES[1] },
  },
  night: {
    mission: 0, stage: 1, preset: 'night', wanted: 3,
    cash: 9860, xp: 2400, rank: 'WHEELMAN',
    player: { x: -120, z: 60, heading: 0, speed: 15, inCar: true },
    police: 5, heli: true, roadblock: false,
    traffic: [
      { x: -117, z: 82, heading: 0, color: 0xd8d0c0, kind: 'car' },
      { x: -123, z: 98, heading: Math.PI, color: 0x3f6d8e, kind: 'car' },
      { x: -117, z: 118, heading: 0, color: 0xe8542f, kind: 'car' },
      { x: -123, z: 134, heading: Math.PI, color: 0xf2b544, kind: 'taxi' },
      { x: -117, z: 148, heading: 0, color: 0x7fb069, kind: 'truck' },
    ],
    peds: [
      { axis: 'z', fixed: -112.5, t: 76 }, { axis: 'z', fixed: -127.5, t: 100 },
      { axis: 'z', fixed: -112.5, t: 124 }, { axis: 'z', fixed: -127.5, t: 52 },
    ],
    dialogue: { name: 'LIO TAN', role: 'Crew · Mechanic', text: MIRA_LINES[3] },
  },
  playtest: {
    mission: 0, stage: 0, preset: 'cover', wanted: 1,
    cash: 18450, xp: 3900, rank: 'FIXER',
    player: { x: 40, z: 120, heading: Math.PI / 2, speed: 0, inCar: true },
    police: 2, heli: false, roadblock: false,
    traffic: [],
    peds: [],
    dialogue: null,
  },
};

export function shotNames() { return Object.keys(SHOTS); }

export function installDebugApi(applyShot, helpers) {
  window.__SOLARA__ = {
    version: 'solara-bay-v5',
    shot: (name) => applyShot(name),
    state: () => helpers.snapshot(),
    setKeys: (map) => helpers.setKeys(map),
    press: (code) => helpers.press(code),
    gotoStage: (n) => helpers.gotoStage(n),
    startMission: (i) => helpers.startMission(i),
    pedRoadCheck: () => helpers.pedRoadCheck(),
    mission: () => ({ mission: S.missionIndex, stage: S.stageIndex, done: S.missionDone }),
  };
}
