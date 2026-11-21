// Solara Bay — hud.js
// The dense HUD: mission card, police response panel, wanted stars, cash +
// rank/XP, weapon slots, crew ability cards, dialogue box, district card,
// health/armour, speed + vehicle + condition, radio line — and the minimap,
// drawn as real streets with district labels, a mission marker, police
// blips and the player arrow (not a bare grid).
import { WORLD, DISTRICTS, WEAPONS, CREW, RADIO, districtAt } from './config.js';
import { S } from './state.js';
import { currentMission, currentStage } from './missions.js';
import { policePanel } from './police.js';
import { fmtCash, fmtTime, clamp } from './util.js';

const $ = (id) => document.getElementById(id);

const WEAPON_ICONS = {
  fist: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="4" y="9" width="16" height="9" rx="3" fill="#f2b544"/><rect x="6" y="5" width="3.4" height="6" rx="1.5" fill="#f2b544"/><rect x="10.3" y="5" width="3.4" height="6" rx="1.5" fill="#f2b544"/><rect x="14.6" y="5" width="3.4" height="6" rx="1.5" fill="#f2b544"/></svg>',
  pistol: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 5h13v4H9v7H5v-7H3z" fill="#f2b544"/><rect x="15" y="5" width="6" height="2.6" fill="#f2b544"/></svg>',
  smg: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="8" width="18" height="4" fill="#f2b544"/><rect x="8" y="12" width="3" height="6" fill="#f2b544"/><rect x="16" y="9" width="5" height="2.4" fill="#f2b544"/></svg>',
  shotgun: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="10" width="20" height="3" fill="#f2b544"/><rect x="6" y="13" width="3" height="5" fill="#f2b544"/><rect x="14" y="13" width="3" height="4" fill="#f2b544"/></svg>',
};

export function buildHUD() {
  // weapons
  const wEl = $('weapons');
  wEl.innerHTML = WEAPONS.map((w) => `
    <div class="wslot" id="wslot-${w.slot}">
      <div class="wslot-num">${w.slot}</div>
      <div class="wslot-icon">${WEAPON_ICONS[w.icon]}</div>
      <div class="wslot-name">${w.name}</div>
      <div class="wslot-ammo" id="wammo-${w.slot}">${w.ammo === Infinity ? '∞' : w.ammo}</div>
    </div>`).join('');
  // crew cards (silhouette busts — CSS shapes, no faces)
  $('crew').innerHTML = CREW.map((c) => `
    <div class="crew-card" id="crew-${c.id}">
      <div class="crew-bust" style="--cc:${c.color}">
        <div class="bust-head"></div><div class="bust-body"></div>
      </div>
      <div class="crew-info"><div class="crew-ability">${c.ability}</div><div class="crew-desc">${c.desc}</div></div>
      <div class="crew-key">${c.key}</div>
    </div>`).join('');
}

function starRow(n) {
  let s = '';
  for (let i = 0; i < 5; i++) s += `<span class="star ${i < n ? 'lit' : ''}">★</span>`;
  return s;
}

export function setDialogue(name, role, text, secs = 6) {
  S.dialogue = { name, role, text, until: S.time + secs };
}

export function updateHUD() {
  const m = currentMission();
  const st = currentStage();
  // mission card
  $('m-chapter').textContent = m.chapter;
  $('m-stage').textContent = `STAGE ${S.stageIndex + 1}/${m.stages.length}`;
  $('m-name').textContent = m.name;
  $('m-obj').textContent = st ? st.text : 'Mission complete';
  const prog = st ? (st.kind === 'drive' || st.kind === 'tail' || st.kind === 'hold' || st.kind === 'ram' || st.kind === 'shoot'
    ? S.stageProgress : (S.stageIndex / m.stages.length)) : 1;
  $('m-bar').style.width = Math.round(clamp(prog, 0, 1) * 100) + '%';
  const next = m.stages[S.stageIndex + 1];
  $('m-next').textContent = next ? 'NEXT  ' + next.text : 'NEXT  Return to Mira';
  $('m-next').style.display = next || !S.missionDone ? 'block' : 'none';

  // police panel
  const rows = policePanel(S.police, S.inCar ? S.car : S.player);
  $('p-count').textContent = rows.length + ' UNITS';
  $('p-rows').innerHTML = rows.slice(0, 7).map((r) => `
    <div class="prow"><span class="pname">${r.name}</span>
    <span class="prole ${r.role.toLowerCase()}">${r.role}</span>
    <span class="pdist">${r.dist} m</span></div>`).join('');
  $('p-foot').textContent = S.heli ? 'AIR UNIT DEPLOYED · OSPREY-1 OVERHEAD'
    : (S.wanted > 0 ? 'UNITS RESPONDING' : 'NO ACTIVE PURSUIT');

  // cash / wanted / rank
  $('clock').textContent = fmtTime(S.clockMin);
  $('cash').textContent = fmtCash(S.cash);
  $('stars').innerHTML = starRow(S.wanted);
  $('rank').textContent = S.rank;
  $('xp').textContent = `${S.xp.toLocaleString()} / ${S.xpNext.toLocaleString()} XP`;
  $('xp-bar').style.width = Math.round((S.xp / S.xpNext) * 100) + '%';

  // weapons
  for (const w of WEAPONS) {
    const el = $('wslot-' + w.slot);
    if (el) el.classList.toggle('active', S.weaponSlot === w.slot);
    const am = $('wammo-' + w.slot);
    if (am) am.textContent = w.ammo === Infinity ? '∞' : (S.ammo[w.slot] ?? 0);
  }

  // district
  const pos = S.inCar ? S.car : S.player;
  const d = districtAt(pos.x, pos.z);
  $('d-name').textContent = d.name;
  $('d-sub').textContent = d.sub;
  $('d-grip').style.width = d.grip + '%';
  $('d-grip-label').textContent = 'GRIP ' + d.grip + '%';

  // health
  $('health-bar').style.width = S.health + '%';
  $('health-num').textContent = Math.round(S.health);
  $('armour-bar').style.width = S.armour + '%';
  $('armour-num').textContent = Math.round(S.armour);

  // speedo
  $('speed').textContent = Math.round(S.speedKmh);
  $('veh-name').textContent = S.inCar ? 'RUKAN PELO GT' : 'ON FOOT';
  $('veh-sub').textContent = S.inCar ? 'TUNE 3 · SPORTS' : 'WALKING · SOLARA BAY';
  $('cond-bar').style.width = S.carCondition + '%';
  $('cond-label').textContent = S.carCondition >= 80 ? '88% CLEAN' : Math.round(S.carCondition) + '% DENTED';
  $('radio').textContent = '♪ RADIO ' + RADIO[S.radioIndex].station + ' — ' + RADIO[S.radioIndex].track;

  // dialogue
  const dlg = $('dialogue');
  if (S.dialogue && S.time < S.dialogue.until) {
    dlg.style.display = 'flex';
    $('dlg-name').textContent = S.dialogue.name;
    $('dlg-role').textContent = S.dialogue.role;
    $('dlg-text').textContent = S.dialogue.text;
  } else {
    dlg.style.display = 'none';
  }

  // centre message
  const msg = $('message');
  if (S.message && S.time < S.messageUntil) {
    msg.style.display = 'block';
    msg.textContent = S.message;
  } else msg.style.display = 'none';

  // mission complete banner
  const mc = $('mission-complete');
  if (S.missionDone && S.time - S.missionCompleteAt < 5) {
    mc.style.display = 'block';
    mc.querySelector('.mc-title').textContent = 'MISSION COMPLETE';
    mc.querySelector('.mc-sub').textContent = m.name + ' — press M for the next job';
  } else mc.style.display = 'none';

  drawMinimap();
}

// --- MINIMAP ---------------------------------------------------------------
// Real streets: district colour blocks, the beach + ocean, road lines on the
// same grid as the 3D city, labels, mission marker, police blips, player arrow.
let mm = null;
function drawMinimap() {
  const cv = $('minimap');
  if (!cv) return;
  if (!mm) mm = cv.getContext('2d');
  const g = mm, W = cv.width, H = cv.height;
  const map = (v) => ((v + WORLD.half) / (WORLD.half * 2)) * W;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#101c2e';
  g.fillRect(0, 0, W, H);
  // ocean + sand
  g.fillStyle = '#2f7fa8';
  g.fillRect(0, 0, map(-140), H);
  g.fillStyle = '#e8cf9a';
  g.fillRect(map(-140), 0, map(-120) - map(-140), H);
  // district blocks
  for (const d of DISTRICTS) {
    g.globalAlpha = 0.5;
    g.fillStyle = d.color;
    g.fillRect(map(d.x0), map(d.z0), map(d.x1) - map(d.x0), map(d.z1) - map(d.z0));
  }
  g.globalAlpha = 1;
  // streets
  g.strokeStyle = '#d8d8d0';
  g.lineWidth = 2;
  for (const x of WORLD.avenues) {
    g.beginPath(); g.moveTo(map(x), 0); g.lineTo(map(x), H); g.stroke();
  }
  for (const z of WORLD.streets) {
    g.beginPath(); g.moveTo(0, map(z)); g.lineTo(W, map(z)); g.stroke();
  }
  g.strokeStyle = 'rgba(232,195,60,0.7)';
  g.lineWidth = 1;
  for (const x of WORLD.avenues) {
    g.beginPath(); g.moveTo(map(x), 0); g.lineTo(map(x), H); g.stroke();
  }
  // district labels
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.font = 'bold 8px Arial';
  g.textAlign = 'left';
  g.fillText('KUMALA', map(-134), map(-140));
  g.fillText('STRAND', map(-134), map(-130));
  g.fillText('OLD PASARU', map(-92), map(-100));
  g.fillText('HEIGHTS', map(60), map(-100));
  g.fillText('HARBOR', map(70), map(120));
  g.fillText('MARINA', map(-92), map(20));
  // roadblock marker
  if (S.roadblock && !S.roadblock.smashed) {
    g.fillStyle = '#ff9500';
    g.beginPath(); g.arc(map(S.roadblock.x), map(S.roadblock.z), 5, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(map(S.roadblock.x), map(S.roadblock.z), 7, 0, 7); g.stroke();
  }
  // mission marker (pulsing diamond)
  if (S.objective) {
    const r = 4 + Math.sin(S.time * 4) * 1.5;
    g.fillStyle = '#ffc21f';
    g.beginPath();
    g.moveTo(map(S.objective.x), map(S.objective.z) - r - 2);
    g.lineTo(map(S.objective.x) + r, map(S.objective.z));
    g.lineTo(map(S.objective.x), map(S.objective.z) + r + 2);
    g.lineTo(map(S.objective.x) - r, map(S.objective.z));
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,194,31,0.8)';
    g.beginPath(); g.arc(map(S.objective.x), map(S.objective.z), r + 5, 0, 7); g.stroke();
  }
  // police blips
  const pos = S.inCar ? S.car : S.player;
  for (const u of S.police) {
    g.fillStyle = '#ff3344';
    g.beginPath(); g.arc(map(u.x), map(u.z), 3, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1;
    g.beginPath(); g.arc(map(u.x), map(u.z), 3, 0, 7); g.stroke();
  }
  // heli blip
  if (S.heli) {
    g.fillStyle = '#7fb8ff';
    g.beginPath(); g.arc(map(S.heli.x), map(S.heli.z), 3, 0, 7); g.fill();
  }
  // player arrow
  const px = map(pos.x), pz = map(pos.z);
  const hd = S.inCar ? S.car.heading : S.player.heading;
  g.save();
  g.translate(px, pz);
  // Arrow art points up (0,-1); travel on the map is (sin h, cos h), so
  // rotate by PI - h to point the arrow along the travel direction.
  g.rotate(Math.PI - hd);
  g.fillStyle = '#fff';
  g.strokeStyle = '#101c2e';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(0, 3); g.lineTo(-5, 6);
  g.closePath(); g.fill(); g.stroke();
  g.restore();
}
