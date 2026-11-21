// Solara Bay — config.js
// All authored data for the game: districts, the 8 story missions, crew,
// vehicles, radio, police callsigns. Original names, written for v5.
export const WORLD = {
  half: 160,            // city spans -160..160 m on x and z
  avenues: [-120, -80, -40, 0, 40, 80, 120],   // north-south roads (x)
  streets: [-120, -80, -40, 0, 40, 80, 120],   // east-west roads (z)
  roadHalf: 6,          // half-width of the asphalt
  sidewalk: 3,          // sidewalk strip outside the asphalt
  beachX: -140,         // sand begins west of this x
};

export const DISTRICTS = [
  { name: 'KUMALA STRAND', sub: 'Strand Boulevard · Beachfront strip', x0: -160, z0: -160, x1: -96, z1: 160, color: '#e8c98a', grip: 58 },
  { name: 'OLD PASARU', sub: 'Pasar Lane · Night market', x0: -96, z0: -160, x1: -16, z1: -16, color: '#d9a05b', grip: 74 },
  { name: 'SOLARA HEIGHTS', sub: 'Tower Row · High-rise district', x0: -16, z0: -160, x1: 160, z1: -16, color: '#b7c4d6', grip: 41 },
  { name: 'MARINA', sub: 'Yacht Basin · Pier 9', x0: -96, z0: -16, x1: -16, z1: 64, color: '#7fb8c9', grip: 66 },
  { name: 'HARBOR', sub: 'Dock Sheds · Container yard', x0: -16, z0: 64, x1: 160, z1: 160, color: '#9a8f7a', grip: 33 },
  { name: 'PALM COURT', sub: 'Canal Row · Old town', x0: -96, z0: 64, x1: -16, z1: 160, color: '#c9b458', grip: 49 },
  { name: 'BANCO ROW', sub: 'Civic Centre · Bank district', x0: 64, z0: -16, x1: 160, z1: 64, color: '#aab8a0', grip: 52 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return DISTRICTS[0];
}

export const CREW = [
  { id: 'mira', name: 'MIRA KESANG', role: 'Crew · Driver', ability: 'SWAP PLATES', desc: 'Mira · Driver', key: 'Z', color: '#38b6d3', cooldown: 0 },
  { id: 'lio', name: 'LIO TAN', role: 'Crew · Mechanic', ability: 'QUICK FIX', desc: 'Lio · Mechanic', key: 'X', color: '#f2b544', cooldown: 0 },
  { id: 'kiki', name: 'KIKI', role: 'Crew · Lookout', ability: 'EYES OUT', desc: 'Kiki · Lookout', key: 'C', color: '#b388f5', cooldown: 0 },
];

export const DISPATCH_LINES = [
  'All units, suspect is southbound on the Strand. Osprey One has the light.',
  'Units be advised: suspect vehicle is a red GT, plates swapped, treat as armed.',
  'KITE-1, set the roadblock at Palm Court. Nobody gets through.',
  'Osprey One, keep the light on the suspect. Ground units, close the net.',
];

export const MIRA_LINES = [
  "He's making for Kumala Pier! Ram the Regent before it reaches the water!",
  'Two down the left aisle! I have got the stall side, Tomo.',
  'Punch it through the gap — the roadblock is only on the main drag!',
  'Package is warm, harbor lights are on. Bring it in slow, no sirens.',
];

export const WEAPONS = [
  { slot: 1, name: 'FISTS', icon: 'fist', ammo: Infinity },
  { slot: 2, name: '.38 REVOLVER', icon: 'pistol', ammo: 60 },
  { slot: 3, name: 'SMG', icon: 'smg', ammo: 90 },
  { slot: 4, name: '12G PUMP', icon: 'shotgun', ammo: 18 },
];

export const RADIO = [
  { station: 'OMBO 98.4', track: 'Tide Runner — Sol Mara' },
  { station: 'OMBO 98.4', track: 'Island Pop — Kala Sunset' },
  { station: 'SOL 101.2', track: 'Neon Palm — DJ Riko' },
  { station: 'SOL 101.2', track: 'Harbor Lights — The Tides' },
];

export const POLICE_NAMES = ['KITE-1', 'CORAL-48', 'CORAL-85', 'MARLIN-3', 'HERON-2', 'CORAL-43', 'TERN-5'];

// 8 story missions. Each stage: { text, kind, target:{x,z}, radius, ... }
// kind: drive | onfoot | collect | ram | escape | tail | photo | hold | shoot
export const MISSIONS = [
  {
    id: 1, chapter: 'CH.1 · LOW TIDE', name: 'HARBOR LIGHTS',
    brief: 'Collect the package from the dock shed',
    stages: [
      { text: 'Drive to the dock shed', kind: 'drive', target: { x: 100, z: 120 }, radius: 9 },
      { text: 'Grab the package on foot', kind: 'collect', target: { x: 104, z: 128 }, radius: 3.2 },
      { text: 'Deliver the package to the drop-off', kind: 'drive', target: { x: -40, z: 40 }, radius: 9 },
    ],
  },
  {
    id: 2, chapter: 'CH.2 · UNDERTOW', name: 'MARKET SQUEEZE',
    brief: 'Clear the aisles of Keron crew 0/5',
    stages: [
      { text: 'Reach Old Pasaru market', kind: 'drive', target: { x: -60, z: -80 }, radius: 9 },
      { text: 'Clear the aisles of Keron crew 0/5', kind: 'shoot', target: { x: -60, z: -100 }, radius: 16, count: 5 },
      { text: 'Get back to the car', kind: 'drive', target: { x: -40, z: -80 }, radius: 9 },
    ],
  },
  {
    id: 3, chapter: 'CH.3 · HIGH WATER', name: 'WRECK THE REGENT',
    brief: 'Wreck the Regent before it reaches the pier',
    stages: [
      { text: 'Find the Regent on Strand Blvd', kind: 'drive', target: { x: -120, z: -40 }, radius: 12 },
      { text: 'Wreck the Regent — ram it until it breaks', kind: 'ram', target: { x: -120, z: 20 }, radius: 20 },
      { text: 'Lose the heat', kind: 'escape', target: { x: 0, z: 0 }, radius: 30 },
    ],
  },
  {
    id: 4, chapter: 'CH.4 · SPRING TIDE', name: 'BANCO SOLARA',
    brief: 'Grab the satchel inside the lobby',
    stages: [
      { text: 'Reach the bank on Banco Row', kind: 'drive', target: { x: 100, z: 0 }, radius: 9 },
      { text: 'Grab the satchel inside the lobby', kind: 'collect', target: { x: 104, z: 4 }, radius: 3.2 },
      { text: 'Escape to the safehouse — roadblock ahead', kind: 'escape', target: { x: -80, z: 80 }, radius: 12 },
    ],
  },
  {
    id: 5, chapter: 'CH.5 · NEAP TIDE', name: 'NIGHT SHIFT',
    brief: 'Tail the courier van — do not get spotted',
    stages: [
      { text: 'Find the courier van near the marina', kind: 'drive', target: { x: -60, z: 40 }, radius: 12 },
      { text: 'Tail the van — stay close, stay unseen', kind: 'tail', target: { x: -60, z: 40 }, radius: 26 },
      { text: 'Photograph the handoff (press F)', kind: 'photo', target: { x: -40, z: 80 }, radius: 10 },
    ],
  },
  {
    id: 6, chapter: 'CH.6 · RIP CURRENT', name: 'TIDE RUNNER',
    brief: 'Steal the Rukan Pelo GT',
    stages: [
      { text: 'Steal the Rukan Pelo GT', kind: 'steal', target: { x: 40, z: -40 }, radius: 4 },
      { text: 'Outrun 6 units to the pier', kind: 'escape', target: { x: -120, z: 120 }, radius: 12 },
      { text: 'Deliver the car to the pier', kind: 'drive', target: { x: -128, z: 128 }, radius: 9 },
    ],
  },
  {
    id: 7, chapter: 'CH.7 · KING TIDE', name: 'STATIC',
    brief: 'Reach the radio mast on the roof',
    stages: [
      { text: 'Reach the radio mast', kind: 'drive', target: { x: 80, z: -80 }, radius: 9 },
      { text: 'Hold the roof — 60 seconds against the crew', kind: 'hold', target: { x: 80, z: -80 }, radius: 14, count: 60 },
      { text: 'Get clear of the tower', kind: 'escape', target: { x: 0, z: -120 }, radius: 12 },
    ],
  },
  {
    id: 8, chapter: 'CH.8 · SLACK WATER', name: 'SOLARA BAY',
    brief: 'Meet the crew at the marina',
    stages: [
      { text: 'Meet the crew at the marina', kind: 'drive', target: { x: -60, z: 40 }, radius: 9 },
      { text: 'Chase the Don’s convoy', kind: 'drive', target: { x: 40, z: 40 }, radius: 12 },
      { text: 'End the convoy — wreck the lead car', kind: 'ram', target: { x: 40, z: 40 }, radius: 20 },
    ],
  },
];

export const PLAYER = { name: 'TOMO', cashStart: 18450, rankStart: 'FIXER', xpStart: 3900, xpNext: 5000 };
