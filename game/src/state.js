// Solara Bay — state.js
// The single shared game state object. Every module reads/writes this one
// object, so the HUD, missions, police and renderer can never disagree.
import { mulberry32 } from './util.js';

export const S = {
  seed: 1,
  rng: mulberry32(1),
  time: 0,               // seconds since boot
  clockMin: 16 * 60,     // in-world clock, minutes (16:00 sunset start)
  mode: 'title',         // title | playing | paused | complete
  missionIndex: 0,       // 0-based into MISSIONS
  stageIndex: 0,
  missionDone: false,
  missionCompleteAt: 0,
  cash: 18450,
  xp: 3900,
  xpNext: 5000,
  rank: 'FIXER',
  wanted: 4,
  health: 100,
  armour: 40,
  weaponSlot: 1,
  ammo: { 2: 60, 3: 90, 4: 18 },
  inCar: true,
  car: null,             // player car entity (see vehicles.js)
  player: null,          // on-foot entity {x,z,heading}
  speedKmh: 0,
  carCondition: 88,      // percent
  radioIndex: 0,
  dialogue: null,        // {name, role, text, until}
  objective: null,       // current stage target marker {x,z,radius}
  stageProgress: 0,      // 0..1 within current stage (ram/hold/shoot counts)
  stageCount: 0,
  stageCountNeed: 0,
  enemies: [],           // on-foot hostile entities
  peds: [],              // pedestrians (sidewalk-locked)
  traffic: [],           // traffic cars
  police: [],            // police units
  heli: null,            // helicopter entity
  roadblock: null,       // roadblock group {x,z,heading,active}
  roadblockAllowed: true, // shots may forbid the auto-roadblock (cover)
  regent: null,          // mission target car (ram missions)
  courier: null,         // mission target van (tail mission)
  package: null,         // collectable marker {x,z,taken}
  markers: [],           // world-space markers for the renderer
  message: '',           // transient centre message
  messageUntil: 0,
  stats: { shots: 0, hits: 0, rams: 0, arrests: 0 },
  debug: { shotsMode: null },  // 'cover' | 'chase' | 'foot' | 'night' | 'playtest'
  camera: { x: 0, y: 12, z: 0, lookX: 0, lookY: 0, lookZ: 0 },
  shake: 0,
  saveKey: 'solara-bay-v5-save',
};

export function resetRun(seed) {
  S.seed = seed;
  S.rng = mulberry32(seed);
  S.time = 0;
  S.missionIndex = 0;
  S.stageIndex = 0;
  S.missionDone = false;
  S.missionCompleteAt = 0;
  S.cash = 18450;
  S.xp = 3900;
  S.xpNext = 5000;
  S.rank = 'FIXER';
  S.wanted = 4;
  S.health = 100;
  S.armour = 40;
  S.weaponSlot = 1;
  S.ammo = { 2: 60, 3: 90, 4: 18 };
  S.inCar = true;
  S.speedKmh = 0;
  S.carCondition = 88;
  S.dialogue = null;
  S.stageProgress = 0;
  S.stageCount = 0;
  S.stageCountNeed = 0;
  S.enemies = [];
  S.peds = [];
  S.traffic = [];
  S.police = [];
  S.heli = null;
  S.roadblock = null;
  S.roadblockAllowed = true;
  S.regent = null;
  S.courier = null;
  S.package = null;
  S.markers = [];
  S.message = '';
  S.stats = { shots: 0, hits: 0, rams: 0, arrests: 0 };
}
